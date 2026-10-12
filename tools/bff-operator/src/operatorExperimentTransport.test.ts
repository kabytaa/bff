import { describe, expect, it } from 'vitest';
import {
  estimatedModelCostUsd,
  reviewedAnswerModel,
} from '@bff/assistant/models';
import { createExperimentTransport } from './operatorExperimentTransport';
import type { ExperimentTransportSnapshot } from './operatorExperimentTransport';

const baseUrl = 'https://provider.example';
const answerUrl = `${baseUrl}/v1/chat/completions`;
const answerBody = (max_tokens = 1200) => ({
  model: reviewedAnswerModel('qwen3-30b').nativeId,
  max_tokens,
  messages: [{ role: 'user', content: 'private prompt must not be retained' }],
});
const response = (
  status = 200,
  usage = { prompt_tokens: 20, completion_tokens: 5 },
) =>
  Response.json(
    { choices: [{ message: { content: 'private answer' } }], usage },
    { status },
  );

describe('createExperimentTransport', () => {
  const checkpoint = (): ExperimentTransportSnapshot => ({
    stopped: false,
    actualNetworkStarts: 3,
    localRefusals: 0,
    knownCostUsd: 0.2,
    unknownReservedCostUsd: 0.1,
    inFlightReservedCostUsd: 0.03,
    queuePacingWaitMs: 100,
    totalEstimatedCostUsd: null,
    nextStartAt: 0,
    cooldownUntil: 0,
    records: [
      {
        index: 2,
        model: reviewedAnswerModel('qwen3-30b').nativeId,
        kind: 'answer',
        status: 'completed',
        providerCodes: [],
        providerCodesHeaderPresent: false,
        waitMs: 0,
        estimatedCostUsd: 0.2,
      },
    ],
  });

  it('retains known/unknown/in-flight legacy costs and prevents index reuse', async () => {
    const transport = createExperimentTransport({
      baseUrl,
      recovery: {
        snapshot: checkpoint(),
        additionalUnknownReservedCostUsd: 0.04,
        unrecordedNetworkStartsUpperBound: 24,
      },
      fetch: async () => response(),
    });
    expect(transport.snapshot()).toMatchObject({
      actualNetworkStarts: 3,
      unrecordedNetworkStartsUpperBound: 24,
      knownCostUsd: 0.2,
      inFlightReservedCostUsd: 0,
      totalEstimatedCostUsd: null,
      records: [{ index: 2 }],
    });
    expect(transport.snapshot().unknownReservedCostUsd).toBeCloseTo(0.17);
    const result = await transport.fetch(answerUrl, {
      method: 'POST',
      body: JSON.stringify(answerBody()),
    });
    expect(result.status).toBe(200);
    expect(result.headers.get('x-bff-experiment-record-index')).toBe('28');
    expect(transport.snapshot().actualNetworkStarts).toBe(4);
    expect(transport.snapshot().records).toHaveLength(2);
  });

  it('counts possible lost starts against the global call maximum without claiming them actual', async () => {
    let calls = 0;
    const transport = createExperimentTransport({
      baseUrl,
      maximumCalls: 27,
      recovery: {
        snapshot: checkpoint(),
        additionalUnknownReservedCostUsd: 0.04,
        unrecordedNetworkStartsUpperBound: 24,
      },
      fetch: async () => {
        calls++;
        return response();
      },
    });
    const result = await transport.fetch(answerUrl, {
      method: 'POST',
      body: JSON.stringify(answerBody()),
    });
    expect(result.status).toBe(503);
    expect(calls).toBe(0);
    expect(transport.snapshot()).toMatchObject({
      stopped: true,
      stopReason: 'maximum_calls',
      actualNetworkStarts: 3,
    });
  });

  it('enforces the original combined cost limit including recovery uncertainty', async () => {
    const worst = estimatedModelCostUsd(
      reviewedAnswerModel('qwen3-30b'),
      32768,
      1200,
    );
    let calls = 0;
    const state = checkpoint();
    state.knownCostUsd = 2 - 0.13 - worst / 2;
    const transport = createExperimentTransport({
      baseUrl,
      recovery: {
        snapshot: state,
        additionalUnknownReservedCostUsd: 0,
        unrecordedNetworkStartsUpperBound: 24,
      },
      fetch: async () => {
        calls++;
        return response();
      },
    });
    const result = await transport.fetch(answerUrl, {
      method: 'POST',
      body: JSON.stringify(answerBody()),
    });
    expect(result.status).toBe(503);
    expect(calls).toBe(0);
    expect(transport.snapshot().stopReason).toBe('cost_boundary');
  });

  it('rejects invalid or already stopped recovery seeds before requests', () => {
    expect(() =>
      createExperimentTransport({
        baseUrl,
        recovery: {
          snapshot: { ...checkpoint(), stopped: true },
          additionalUnknownReservedCostUsd: 0,
          unrecordedNetworkStartsUpperBound: 0,
        },
      }),
    ).toThrow('recovery');
    expect(() =>
      createExperimentTransport({
        baseUrl,
        recovery: {
          snapshot: checkpoint(),
          additionalUnknownReservedCostUsd: -1,
          unrecordedNetworkStartsUpperBound: 24,
        },
      }),
    ).toThrow('recovery');
  });

  it('persists a sanitized reservation before network and completion before response', async () => {
    const order: string[] = [];
    const entries: unknown[] = [];
    const transport = createExperimentTransport({
      baseUrl,
      journal: async (entry) => {
        order.push(entry.event);
        entries.push(entry);
      },
      fetch: async () => {
        order.push('network');
        return response();
      },
    });
    await transport.fetch(answerUrl, {
      method: 'POST',
      body: JSON.stringify(answerBody()),
      headers: { authorization: 'Bearer fake-private-secret' },
    });
    order.push('response');
    expect(order).toEqual([
      'network-start-reserved',
      'network',
      'network-completed',
      'response',
    ]);
    const serialized = JSON.stringify(entries);
    for (const secret of [
      'fake-private-secret',
      'private prompt',
      'private answer',
    ])
      expect(serialized).not.toContain(secret);
  });

  it('spaces actual starts even when the first durable reservation is slow', async () => {
    let clock = 0;
    let reservations = 0;
    const starts: number[] = [];
    const transport = createExperimentTransport({
      baseUrl,
      minimumIntervalMs: 400,
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
      journal: async (entry) => {
        if (entry.event === 'network-start-reserved' && ++reservations === 1)
          clock += 500;
      },
      fetch: async () => {
        starts.push(clock);
        return response();
      },
    });
    await Promise.all(
      [0, 1].map(() =>
        transport.fetch(answerUrl, {
          method: 'POST',
          body: JSON.stringify(answerBody()),
        }),
      ),
    );
    expect(starts).toEqual([500, 900]);
  });

  it('fails closed if the start cannot be persisted, without a provider call', async () => {
    let calls = 0;
    const transport = createExperimentTransport({
      baseUrl,
      journal: async () => {
        throw new Error('private disk details');
      },
      fetch: async () => {
        calls++;
        return response();
      },
    });
    await expect(
      transport.fetch(answerUrl, {
        method: 'POST',
        body: JSON.stringify(answerBody()),
      }),
    ).rejects.toThrow('durable journal is unavailable');
    expect(calls).toBe(0);
    expect(transport.snapshot().stopped).toBe(true);
    expect(transport.snapshot().inFlightReservedCostUsd).toBeGreaterThan(0);
    expect(
      (
        await transport.fetch(answerUrl, {
          method: 'POST',
          body: JSON.stringify(answerBody()),
        })
      ).status,
    ).toBe(503);
    expect(calls).toBe(0);
  });

  it('does not return an unjournaled completion and stops further admissions', async () => {
    let calls = 0;
    const durable: string[] = [];
    const transport = createExperimentTransport({
      baseUrl,
      journal: async (entry) => {
        if (entry.event === 'network-completed')
          throw new Error('disk unavailable');
        durable.push(entry.event);
      },
      fetch: async () => {
        calls++;
        return response();
      },
    });
    await expect(
      transport.fetch(answerUrl, {
        method: 'POST',
        body: JSON.stringify(answerBody()),
      }),
    ).rejects.toThrow('durable journal is unavailable');
    expect(calls).toBe(1);
    expect(durable).toEqual(['network-start-reserved']);
    expect(transport.snapshot()).toMatchObject({
      stopped: true,
      stopReason: 'durable_journal_failure',
      records: [],
    });
    expect(
      (
        await transport.fetch(answerUrl, {
          method: 'POST',
          body: JSON.stringify(answerBody()),
        })
      ).status,
    ).toBe(503);
    expect(calls).toBe(1);
  });

  it('shares request-start pacing across concurrent workflows and keeps records sanitized', async () => {
    let clock = 1_000;
    const starts: number[] = [];
    const transport = createExperimentTransport({
      baseUrl,
      minimumIntervalMs: 3_500,
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
      fetch: async () => {
        starts.push(clock);
        return response();
      },
    });
    const results = await Promise.all([
      transport.fetch(answerUrl, {
        method: 'POST',
        body: JSON.stringify(answerBody()),
        headers: { 'content-type': 'application/json' },
      }),
      transport.fetch(answerUrl, {
        method: 'POST',
        body: JSON.stringify(answerBody()),
        headers: { 'content-type': 'application/json' },
      }),
    ]);
    expect(starts).toEqual([1_000, 4_500]);
    expect(
      results.map((item) => item.headers.get('x-bff-experiment-record-index')),
    ).toEqual(['1', '2']);
    const state = transport.snapshot();
    expect(state.actualNetworkStarts).toBe(2);
    expect(state.records.map(({ status }) => status)).toEqual([
      'completed',
      'completed',
    ]);
    expect(JSON.stringify(state)).not.toContain('private prompt');
    expect(JSON.stringify(state)).not.toContain('private answer');
    expect(state.totalEstimatedCostUsd).not.toBeNull();
  });

  it('only admits the two exact provider paths and reviewed answer models/output caps', async () => {
    let calls = 0;
    const transport = createExperimentTransport({
      baseUrl,
      fetch: async () => {
        calls += 1;
        return response();
      },
    });
    const post = (url: string, body: unknown) =>
      transport.fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    const disallowed = await post(
      `${baseUrl}/v1/chat/completions/extra`,
      answerBody(),
    );
    expect(disallowed.status).toBe(400);
    expect(disallowed.headers.get('x-bff-experiment-record-index')).toBe('1');
    expect(
      (await post(answerUrl, { ...answerBody(), max_tokens: 1201 })).status,
    ).toBe(400);
    expect(
      (await post(answerUrl, { ...answerBody(), model: '@cf/unknown/model' }))
        .status,
    ).toBe(400);
    expect((await post(`${baseUrl}/v1/other`, answerBody())).status).toBe(400);
    expect(calls).toBe(0);
    expect(transport.snapshot().localRefusals).toBe(4);
  });

  it('refuses an already-aborted call locally and returns its record index', async () => {
    let calls = 0;
    const transport = createExperimentTransport({
      baseUrl,
      fetch: async () => {
        calls += 1;
        return response();
      },
    });
    const controller = new AbortController();
    controller.abort();
    const result = await transport.fetch(answerUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(answerBody()),
      signal: controller.signal,
    });
    expect(result.status).toBe(503);
    expect(result.headers.get('x-bff-experiment-record-index')).toBe('1');
    expect(calls).toBe(0);
    expect(transport.snapshot()).toMatchObject({
      actualNetworkStarts: 0,
      localRefusals: 1,
      records: [{ status: 'queue_deadline' }],
    });
  });

  it('stops at the conservative cost boundary before a network start', async () => {
    let calls = 0;
    const transport = createExperimentTransport({
      baseUrl,
      maximumCostUsd: 0.001,
      fetch: async () => {
        calls += 1;
        return response();
      },
    });
    const result = await transport.fetch(answerUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(answerBody()),
    });
    expect(result.status).toBe(503);
    expect(transport.snapshot()).toMatchObject({
      stopped: true,
      stopReason: 'cost_boundary',
      actualNetworkStarts: 0,
      localRefusals: 1,
    });
    expect(calls).toBe(0);
  });

  it('retains a worst-case reserve after transport errors and uses the 429 cooldown without retrying', async () => {
    let clock = 0;
    let calls = 0;
    const transport = createExperimentTransport({
      baseUrl,
      minimumIntervalMs: 1,
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
      fetch: async () => {
        calls += 1;
        return calls === 1 ? response(429) : response();
      },
    });
    const post = () =>
      transport.fetch(answerUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(answerBody()),
      });
    expect((await post()).status).toBe(429);
    expect(calls).toBe(1);
    expect(transport.snapshot()).toMatchObject({
      cooldownUntil: 60_000,
      totalEstimatedCostUsd: null,
    });
    expect(transport.snapshot().unknownReservedCostUsd).toBeGreaterThan(0);
    expect((await post()).status).toBe(503);
    expect(calls).toBe(1);
    expect(transport.snapshot().records.at(-1)?.status).toBe('queue_deadline');
    clock = 60_000;
    expect((await post()).status).toBe(200);
    expect(calls).toBe(2);
  });

  it('validates Jev requests and reserves their maximum section cost', async () => {
    let calls = 0;
    const transport = createExperimentTransport({
      baseUrl,
      fetch: async () => {
        calls += 1;
        return response();
      },
    });
    const result = await transport.fetch(`${baseUrl}/v1/knowledge-selection`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        question: 'Where is the guide?',
        skills: [
          { key: 'guide', name: 'Guide', whenToUse: 'For guide questions' },
        ],
      }),
    });
    expect(result.status).toBe(200);
    expect(calls).toBe(1);
    expect(transport.snapshot().records[0]).toMatchObject({
      kind: 'knowledge-selection',
      model: 'typesafe/jev',
      status: 'completed',
    });
  });
});
