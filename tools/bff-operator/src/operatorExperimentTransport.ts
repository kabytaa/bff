import {
  estimatedModelCostUsd,
  reviewedTextModel,
} from '@bff/assistant/models';
import {
  buildKnowledgeSelectionInput,
  KNOWLEDGE_SELECTION_MODEL,
  KNOWLEDGE_SELECTION_PRICING,
  parseKnowledgeSelectionRequest,
} from '@bff/assistant/knowledge-selection';

const MAX_INPUT_TOKENS = 32_768;
const MAX_QUEUE_WAIT_MS = 45_000;
const RATE_LIMIT_COOLDOWN_MS = 60_000;

export type ExperimentTransportStatus =
  | 'completed'
  | 'provider_timeout'
  | 'queue_deadline'
  | 'cost_boundary'
  | 'stopped'
  | 'provider_error'
  | 'invalid_request';

export interface ExperimentTransportRecord {
  index: number;
  model: string;
  kind: 'answer' | 'knowledge-selection' | 'unknown';
  status: ExperimentTransportStatus;
  httpStatus?: number;
  providerCodes: string[];
  providerCodesHeaderPresent: boolean;
  waitMs: number;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  reservedUnknownCostUsd?: number;
}

export interface ExperimentTransportSnapshot {
  stopped: boolean;
  stopReason?:
    | 'maximum_calls'
    | 'failure_circuit'
    | 'cost_boundary'
    | 'durable_journal_failure';
  actualNetworkStarts: number;
  /** Interrupted legacy calls may not have reached a durable checkpoint. */
  unrecordedNetworkStartsUpperBound?: number;
  localRefusals: number;
  knownCostUsd: number;
  unknownReservedCostUsd: number;
  inFlightReservedCostUsd: number;
  queuePacingWaitMs: number;
  totalEstimatedCostUsd: number | null;
  nextStartAt: number;
  cooldownUntil: number;
  records: ExperimentTransportRecord[];
}

export interface ExperimentTransportOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  minimumIntervalMs?: number;
  requestTimeoutMs?: number;
  maximumCostUsd?: number;
  maximumCalls?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  /** Safe, sanitized checkpoint. Reservations for old in-flight work stay unknown. */
  recovery?: {
    snapshot: ExperimentTransportSnapshot;
    additionalUnknownReservedCostUsd: number;
    unrecordedNetworkStartsUpperBound: number;
  };
  /** Must durably persist before a request can reach the provider. */
  journal?: (entry: ExperimentTransportJournalEntry) => Promise<void>;
}

export type ExperimentTransportJournalEntry =
  | {
      event: 'network-start-reserved';
      recordedAt: number;
      index: number;
      model: string;
      kind: ExperimentTransportRecord['kind'];
      reservedCostUsd: number;
      waitMs: number;
    }
  | {
      event: 'network-completed';
      recordedAt: number;
      record: ExperimentTransportRecord;
    };

interface ClassifiedRequest {
  url: URL;
  request: Request;
  model: string;
  kind: ExperimentTransportRecord['kind'];
  outputCap: number;
  worstCaseCostUsd: number;
}

const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/**
 * Capped, paced transport for intentional evaluation runs. It is not an
 * authorization layer and does not retain prompts, answers, headers or errors.
 */
export function createExperimentTransport(
  options: ExperimentTransportOptions,
): {
  fetch: typeof globalThis.fetch;
  snapshot: () => ExperimentTransportSnapshot;
} {
  const base = new URL(options.baseUrl);
  if (
    base.protocol !== 'https:' ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    (base.pathname !== '/' && base.pathname !== '')
  ) {
    throw new TypeError('Experiment base URL must be an HTTPS origin');
  }
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const minimumIntervalMs = options.minimumIntervalMs ?? 3_500;
  const requestTimeoutMs = options.requestTimeoutMs ?? 25_000;
  const maximumCostUsd = options.maximumCostUsd ?? 2;
  const maximumCalls = options.maximumCalls ?? 4_000;
  for (const value of [minimumIntervalMs, requestTimeoutMs, maximumCalls]) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new TypeError('Invalid experiment transport limit');
    }
  }
  if (
    !Number.isFinite(maximumCostUsd) ||
    maximumCostUsd <= 0 ||
    maximumCostUsd > 2
  ) {
    throw new TypeError('Invalid experiment cost limit');
  }
  if (maximumCalls > 4_000 || requestTimeoutMs > 25_000) {
    throw new TypeError(
      'Experiment transport limits may not exceed reviewed maxima',
    );
  }

  const recovered = options.recovery;
  if (recovered) {
    const state = recovered.snapshot;
    const costs = [
      state.knownCostUsd,
      state.unknownReservedCostUsd,
      state.inFlightReservedCostUsd,
      recovered.additionalUnknownReservedCostUsd,
    ];
    if (
      state.stopped ||
      costs.some((value) => !Number.isFinite(value) || value < 0) ||
      !Number.isSafeInteger(state.actualNetworkStarts) ||
      state.actualNetworkStarts < 0 ||
      !Number.isSafeInteger(state.localRefusals) ||
      state.localRefusals < 0 ||
      !Number.isSafeInteger(recovered.unrecordedNetworkStartsUpperBound) ||
      recovered.unrecordedNetworkStartsUpperBound < 0 ||
      !Array.isArray(state.records) ||
      state.records.some(
        (record) => !Number.isSafeInteger(record.index) || record.index < 1,
      ) ||
      new Set(state.records.map(({ index }) => index)).size !==
        state.records.length ||
      costs.reduce((sum, value) => sum + value, 0) > maximumCostUsd ||
      state.actualNetworkStarts + recovered.unrecordedNetworkStartsUpperBound >
        maximumCalls
    )
      throw new TypeError('Invalid interrupted experiment recovery');
  }
  const records: ExperimentTransportRecord[] =
    recovered?.snapshot.records.map((record) => ({
      ...record,
      providerCodes: [...record.providerCodes],
    })) ?? [];
  let actualNetworkStarts = recovered?.snapshot.actualNetworkStarts ?? 0;
  const unrecordedNetworkStartsUpperBound =
    recovered?.unrecordedNetworkStartsUpperBound ?? 0;
  let localRefusals = recovered?.snapshot.localRefusals ?? 0;
  let knownCostUsd = recovered?.snapshot.knownCostUsd ?? 0;
  let unknownReservedCostUsd = recovered
    ? recovered.snapshot.unknownReservedCostUsd +
      recovered.snapshot.inFlightReservedCostUsd +
      recovered.additionalUnknownReservedCostUsd
    : 0;
  let inFlightReservedCostUsd = 0;
  let queuePacingWaitMs = recovered?.snapshot.queuePacingWaitMs ?? 0;
  let nextStartAt = recovered?.snapshot.nextStartAt ?? 0;
  let cooldownUntil = recovered?.snapshot.cooldownUntil ?? 0;
  let consecutiveFailures = 0;
  let stoppedReason: ExperimentTransportSnapshot['stopReason'];
  let nextRecordIndex =
    Math.max(
      actualNetworkStarts + localRefusals,
      ...records.map(({ index }) => index),
    ) + unrecordedNetworkStartsUpperBound;
  let journalFailed = false;
  // A short critical section serializes admissions/start times, not network IO.
  let admissionTail: Promise<void> = Promise.resolve();

  const snapshot = (): ExperimentTransportSnapshot => ({
    stopped:
      journalFailed ||
      stoppedReason !== undefined ||
      actualNetworkStarts + unrecordedNetworkStartsUpperBound >= maximumCalls,
    ...(stoppedReason
      ? { stopReason: stoppedReason }
      : actualNetworkStarts + unrecordedNetworkStartsUpperBound >= maximumCalls
        ? { stopReason: 'maximum_calls' as const }
        : {}),
    actualNetworkStarts,
    ...(unrecordedNetworkStartsUpperBound
      ? { unrecordedNetworkStartsUpperBound }
      : {}),
    localRefusals,
    knownCostUsd,
    unknownReservedCostUsd,
    inFlightReservedCostUsd,
    queuePacingWaitMs,
    totalEstimatedCostUsd:
      unknownReservedCostUsd > 0 || inFlightReservedCostUsd > 0
        ? null
        : knownCostUsd,
    nextStartAt,
    cooldownUntil,
    records: records.map((record) => ({
      ...record,
      providerCodes: [...record.providerCodes],
    })),
  });

  // Ordering the journal prevents overlapping append operations and makes a
  // failed write fail closed. No secret, prompt or provider response is retained.
  let journalTail = Promise.resolve();
  const journal = async (entry: ExperimentTransportJournalEntry) => {
    if (journalFailed)
      throw new Error('Experiment durable journal is unavailable');
    journalTail = journalTail.then(() => options.journal?.(entry));
    try {
      await journalTail;
    } catch {
      journalFailed = true;
      stoppedReason = 'durable_journal_failure';
      throw new Error('Experiment durable journal is unavailable');
    }
  };

  const refuse = (
    model: string,
    kind: ExperimentTransportRecord['kind'],
    status: ExperimentTransportStatus,
    waitMs = 0,
  ): Response => {
    localRefusals += 1;
    const index = ++nextRecordIndex;
    records.push({
      index,
      model,
      kind,
      status,
      providerCodes: [],
      providerCodesHeaderPresent: false,
      waitMs,
    });
    const httpStatus = status === 'invalid_request' ? 400 : 503;
    const response = Response.json(
      { error: { code: `LOCAL_${status.toUpperCase()}` } },
      { status: httpStatus },
    );
    response.headers.set('x-bff-experiment-record-index', String(index));
    return response;
  };

  const classify = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<ClassifiedRequest | Response> => {
    let request: Request;
    try {
      request = new Request(input, init);
    } catch {
      return refuse('unknown', 'unknown', 'invalid_request');
    }
    if (request.signal.aborted) {
      return refuse('unknown', 'unknown', 'queue_deadline');
    }
    const url = new URL(request.url);
    const route =
      url.pathname === '/v1/chat/completions'
        ? 'answer'
        : url.pathname === '/v1/knowledge-selection'
          ? 'knowledge-selection'
          : undefined;
    if (url.origin !== base.origin || !route || url.search || url.hash) {
      return refuse('unknown', 'unknown', 'invalid_request');
    }
    if (request.method !== 'POST') {
      return refuse('unknown', route, 'invalid_request');
    }
    let body: unknown;
    try {
      body = await request.clone().json();
    } catch {
      return refuse('unknown', route, 'invalid_request');
    }
    try {
      if (route === 'answer') {
        if (!body || typeof body !== 'object' || Array.isArray(body))
          throw new Error();
        const value = body as Record<string, unknown>;
        if (typeof value.model !== 'string') throw new Error();
        const model = reviewedTextModel(value.model);
        if (model.usage !== 'answer') throw new Error();
        const outputCap =
          value.max_tokens === undefined ? 1_200 : value.max_tokens;
        if (
          !Number.isSafeInteger(outputCap) ||
          (outputCap as number) < 1 ||
          (outputCap as number) > 1_200
        )
          throw new Error();
        const cost = estimatedModelCostUsd(
          model,
          MAX_INPUT_TOKENS,
          outputCap as number,
        );
        return {
          request,
          url,
          model: model.nativeId,
          kind: 'answer',
          outputCap: outputCap as number,
          worstCaseCostUsd: cost,
        };
      }
      const validated = parseKnowledgeSelectionRequest(body);
      const built = buildKnowledgeSelectionInput(validated);
      const sections = Object.keys(built.state.sections).length;
      const cost =
        (sections *
          MAX_INPUT_TOKENS *
          KNOWLEDGE_SELECTION_PRICING.inputUsdPerMillion) /
        1_000_000;
      return {
        request,
        url,
        model: KNOWLEDGE_SELECTION_MODEL,
        kind: 'knowledge-selection',
        outputCap: 0,
        worstCaseCostUsd: cost,
      };
    } catch {
      return refuse('unknown', route, 'invalid_request');
    }
  };

  const transportFetch: typeof globalThis.fetch = async (input, init) => {
    const classified = await classify(input, init);
    if (classified instanceof Response) return classified;
    if (classified.request.signal.aborted) {
      return refuse(classified.model, classified.kind, 'queue_deadline');
    }
    const enqueuedAt = now();
    let waitMs = 0;
    let recordIndex: number;

    let release!: () => void;
    const previous = admissionTail;
    admissionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      if (classified.request.signal.aborted) {
        return refuse(classified.model, classified.kind, 'queue_deadline');
      }
      if (stoppedReason || journalFailed)
        return refuse(classified.model, classified.kind, 'stopped');
      if (
        actualNetworkStarts + unrecordedNetworkStartsUpperBound >=
        maximumCalls
      ) {
        stoppedReason = 'maximum_calls';
        return refuse(classified.model, classified.kind, 'stopped');
      }
      for (;;) {
        if (classified.request.signal.aborted) {
          return refuse(
            classified.model,
            classified.kind,
            'queue_deadline',
            waitMs,
          );
        }
        const target = Math.max(nextStartAt, cooldownUntil);
        const delay = Math.max(0, target - now());
        const elapsed = now() - enqueuedAt;
        if (elapsed + delay > MAX_QUEUE_WAIT_MS) {
          return refuse(
            classified.model,
            classified.kind,
            'queue_deadline',
            Math.max(0, elapsed),
          );
        }
        if (delay > 0) {
          waitMs += delay;
          queuePacingWaitMs += delay;
          await sleep(delay);
          continue;
        }
        break;
      }
      if (stoppedReason || journalFailed)
        return refuse(classified.model, classified.kind, 'stopped', waitMs);
      if (classified.request.signal.aborted) {
        return refuse(
          classified.model,
          classified.kind,
          'queue_deadline',
          waitMs,
        );
      }
      if (
        actualNetworkStarts + unrecordedNetworkStartsUpperBound >=
        maximumCalls
      ) {
        stoppedReason = 'maximum_calls';
        return refuse(classified.model, classified.kind, 'stopped', waitMs);
      }
      if (
        knownCostUsd +
          unknownReservedCostUsd +
          inFlightReservedCostUsd +
          classified.worstCaseCostUsd >
        maximumCostUsd + 1e-12
      ) {
        stoppedReason = 'cost_boundary';
        return refuse(
          classified.model,
          classified.kind,
          'cost_boundary',
          waitMs,
        );
      }
      inFlightReservedCostUsd += classified.worstCaseCostUsd;
      actualNetworkStarts += 1;
      recordIndex = ++nextRecordIndex;
      await journal({
        event: 'network-start-reserved',
        recordedAt: now(),
        index: recordIndex,
        model: classified.model,
        kind: classified.kind,
        reservedCostUsd: classified.worstCaseCostUsd,
        waitMs,
      });
      // Journaling can take longer than a pacing interval. The next start must
      // remain spaced from the actual post-journal network admission, not from
      // the earlier reservation time.
      nextStartAt = now() + minimumIntervalMs;
    } finally {
      release();
    }

    const startedAt = now();
    const controller = new AbortController();
    const callerSignal = classified.request.signal;
    const onAbort = () => controller.abort(callerSignal.reason);
    if (callerSignal.aborted) onAbort();
    else callerSignal.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(
      () => controller.abort(new DOMException('Timeout', 'TimeoutError')),
      requestTimeoutMs,
    );
    let response: Response;
    let status: ExperimentTransportStatus = 'provider_error';
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let estimatedCostUsd: number | undefined;
    let reservedUnknown: number | undefined;
    let httpStatus: number | undefined;
    let providerCodes: string[] = [];
    let providerCodesHeaderPresent = false;
    try {
      const timedRequest = new Request(classified.request, {
        signal: controller.signal,
      });
      response = await fetchImpl(timedRequest);
      httpStatus = response.status;
      const codesHeader = response.headers.get('x-provider-error-codes');
      providerCodesHeaderPresent = codesHeader !== null;
      providerCodes =
        codesHeader
          ?.split(',')
          .map((code) => code.trim())
          .filter((code) => /^\d{3,5}$/.test(code))
          .slice(0, 8) ?? [];
      if (response.ok) {
        status = 'completed';
        consecutiveFailures = 0;
        try {
          const usage = (
            (await response.clone().json()) as {
              usage?: Record<string, unknown>;
            }
          ).usage;
          const inValue = usage?.prompt_tokens ?? usage?.input_tokens;
          const outValue = usage?.completion_tokens ?? usage?.output_tokens;
          if (
            Number.isSafeInteger(inValue) &&
            Number.isSafeInteger(outValue) &&
            (inValue as number) >= 0 &&
            (outValue as number) >= 0
          ) {
            inputTokens = inValue as number;
            outputTokens = outValue as number;
            estimatedCostUsd =
              classified.kind === 'answer'
                ? estimatedModelCostUsd(
                    reviewedTextModel(classified.model),
                    inputTokens,
                    outputTokens,
                  )
                : (inputTokens *
                    KNOWLEDGE_SELECTION_PRICING.inputUsdPerMillion +
                    outputTokens *
                      KNOWLEDGE_SELECTION_PRICING.outputUsdPerMillion) /
                  1_000_000;
          }
        } catch {
          // Missing/malformed usage is conservatively retained as unknown cost.
        }
      } else {
        consecutiveFailures += 1;
        if (response.status === 429)
          cooldownUntil = Math.max(
            cooldownUntil,
            now() + RATE_LIMIT_COOLDOWN_MS,
          );
      }
    } catch {
      const timedOut = controller.signal.aborted && !callerSignal.aborted;
      status = timedOut ? 'provider_timeout' : 'provider_error';
      consecutiveFailures += 1;
      response = Response.json(
        { error: { code: timedOut ? 'PROVIDER_TIMEOUT' : 'PROVIDER_ERROR' } },
        { status: timedOut ? 504 : 502 },
      );
    } finally {
      clearTimeout(timer);
      callerSignal.removeEventListener('abort', onAbort);
    }
    const latencyMs = Math.max(0, now() - startedAt);
    inFlightReservedCostUsd = Math.max(
      0,
      inFlightReservedCostUsd - classified.worstCaseCostUsd,
    );
    if (estimatedCostUsd === undefined || status !== 'completed') {
      unknownReservedCostUsd += classified.worstCaseCostUsd;
      reservedUnknown = classified.worstCaseCostUsd;
    } else {
      knownCostUsd += estimatedCostUsd;
    }
    const record: ExperimentTransportRecord = {
      index: recordIndex,
      model: classified.model,
      kind: classified.kind,
      status,
      ...(httpStatus === undefined ? {} : { httpStatus }),
      providerCodes,
      providerCodesHeaderPresent,
      waitMs,
      latencyMs,
      ...(inputTokens === undefined ? {} : { inputTokens, outputTokens }),
      ...(estimatedCostUsd === undefined ? {} : { estimatedCostUsd }),
      ...(reservedUnknown === undefined
        ? {}
        : { reservedUnknownCostUsd: reservedUnknown }),
    };
    // The completion is durable before a response/usage can be handed back to
    // the workflow. An unmatched reservation after a crash is unknown, not free.
    await journal({ event: 'network-completed', recordedAt: now(), record });
    records.push(record);
    if (consecutiveFailures >= 5) stoppedReason = 'failure_circuit';
    if (
      !stoppedReason &&
      knownCostUsd + unknownReservedCostUsd + inFlightReservedCostUsd >=
        maximumCostUsd
    ) {
      stoppedReason = 'cost_boundary';
    }
    const correlatedHeaders = new Headers(response.headers);
    correlatedHeaders.set('x-bff-experiment-record-index', String(recordIndex));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: correlatedHeaders,
    });
  };

  return { fetch: transportFetch, snapshot };
}
