import {
  defaultProductAccessGrantRequestSchema,
  developmentProductAccessGrantRequestSchema,
  productAccessErrorResponseSchema,
  productAccessProjectionSchema,
  reserveUnitsRequestSchema,
  transitionUnitReservationRequestSchema,
  unitBalanceRequestSchema,
  unitBalanceSchema,
  unitReservationResultSchema,
  type DevelopmentProductAccessGrantRequest,
  type DefaultProductAccessGrantRequest,
  type ProductAccessErrorCode,
  type ProductAccessProjection,
  type ReserveUnitsRequest,
  type TransitionUnitReservationRequest,
  type UnitBalance,
  type UnitBalanceRequest,
  type UnitReservationResult,
} from '@bff/contracts';
import type { ZodType } from 'zod';

const DEFAULT_TIMEOUT_MILLISECONDS = 10_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_CONTEXT_TOKEN_BYTES = 16 * 1024;

export interface BffProductAccessClientOptions {
  readonly bffBaseUrl: string;
  readonly environmentKey: string;
  readonly fetch?: typeof fetch;
  readonly timeoutMilliseconds?: number;
}

export interface BffProductAccessRequestContext {
  readonly contextToken: string;
}

export interface BffProductAccessClient {
  ensureDefaultAccess(
    context: BffProductAccessRequestContext & { readonly serviceToken: string },
    request: DefaultProductAccessGrantRequest,
  ): Promise<ProductAccessProjection>;
  getAccess(
    context: BffProductAccessRequestContext,
  ): Promise<ProductAccessProjection>;
  getUnitBalance(
    context: BffProductAccessRequestContext,
    request: UnitBalanceRequest,
  ): Promise<UnitBalance>;
  reserveUnits(
    context: BffProductAccessRequestContext,
    request: ReserveUnitsRequest,
  ): Promise<UnitReservationResult>;
  commitUnits(
    context: BffProductAccessRequestContext,
    request: TransitionUnitReservationRequest,
  ): Promise<UnitReservationResult>;
  releaseUnits(
    context: BffProductAccessRequestContext,
    request: TransitionUnitReservationRequest,
  ): Promise<UnitReservationResult>;
  setDevelopmentAccess(
    context: BffProductAccessRequestContext,
    request: DevelopmentProductAccessGrantRequest,
  ): Promise<ProductAccessProjection>;
}

export class BffProductAccessError extends Error {
  public constructor(
    public readonly code: ProductAccessErrorCode,
    public readonly status: number,
    public readonly correlationId?: string,
  ) {
    super(code);
    this.name = 'BffProductAccessError';
  }
}

function canonicalOrigin(value: string): string {
  const parsed = new URL(value);
  if (
    parsed.protocol !== 'https:' ||
    parsed.origin !== value ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error('bffBaseUrl must be a canonical HTTPS origin');
  }
  return parsed.origin;
}

function environmentKey(value: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value) || value.length > 64) {
    throw new Error('environmentKey is invalid');
  }
  return value;
}

function contextToken(context: BffProductAccessRequestContext): string {
  const token = context.contextToken;
  if (
    token.length === 0 ||
    new TextEncoder().encode(token).byteLength > MAX_CONTEXT_TOKEN_BYTES
  ) {
    throw new Error('contextToken is invalid');
  }
  return token;
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error('BFF response is too large');
  }
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error('BFF response is too large');
      }
      chunks.push(value);
    }
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(body)) as unknown;
}

export function createBffProductAccessClient(
  options: BffProductAccessClientOptions,
): BffProductAccessClient {
  const baseUrl = canonicalOrigin(options.bffBaseUrl);
  const environment = environmentKey(options.environmentKey);
  const fetchImplementation = options.fetch ?? fetch;
  const timeoutMilliseconds =
    options.timeoutMilliseconds ?? DEFAULT_TIMEOUT_MILLISECONDS;
  if (!Number.isInteger(timeoutMilliseconds) || timeoutMilliseconds < 100) {
    throw new Error('timeoutMilliseconds is invalid');
  }

  async function request<T>({
    context,
    path,
    method = 'GET',
    body,
    responseSchema,
    serviceToken,
  }: {
    readonly context: BffProductAccessRequestContext;
    readonly path: string;
    readonly method?: 'GET' | 'POST';
    readonly body?: unknown;
    readonly responseSchema: ZodType<T>;
    readonly serviceToken?: string;
  }): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);
    try {
      const response = await fetchImplementation(`${baseUrl}${path}`, {
        method,
        cache: 'no-store',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${contextToken(context)}`,
          'x-tofler-environment': environment,
          ...(serviceToken === undefined
            ? {}
            : { 'x-tofler-service-authorization': `Bearer ${serviceToken}` }),
          ...(body === undefined
            ? {}
            : { 'content-type': 'application/json; charset=utf-8' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      const parsed = await readBoundedJson(response);
      if (!response.ok) {
        const error = productAccessErrorResponseSchema.safeParse(parsed);
        if (error.success) {
          throw new BffProductAccessError(
            error.data.error.code,
            response.status,
            error.data.error.correlationId,
          );
        }
        throw new BffProductAccessError(
          'RETRYABLE_UNAVAILABLE',
          response.status,
        );
      }
      const result = responseSchema.safeParse(parsed);
      if (!result.success) {
        throw new BffProductAccessError('RETRYABLE_UNAVAILABLE', 503);
      }
      return result.data;
    } catch (error) {
      if (error instanceof BffProductAccessError) throw error;
      throw new BffProductAccessError('RETRYABLE_UNAVAILABLE', 503);
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    ensureDefaultAccess: async (context, input) => {
      if (!/^[\x21-\x7e]{32,256}$/u.test(context.serviceToken)) {
        throw new Error('serviceToken is invalid');
      }
      return await request({
        context,
        path: '/v1/product-access/default',
        method: 'POST',
        body: defaultProductAccessGrantRequestSchema.parse(input),
        responseSchema: productAccessProjectionSchema,
        serviceToken: context.serviceToken,
      });
    },
    getAccess: async (context) =>
      await request({
        context,
        path: '/v1/product-access',
        responseSchema: productAccessProjectionSchema,
      }),
    getUnitBalance: async (context, input) => {
      const parsed = unitBalanceRequestSchema.parse(input);
      const search = new URLSearchParams({
        unitType: parsed.unitType,
      });
      return await request({
        context,
        path: `/v1/product-access/units?${search.toString()}`,
        responseSchema: unitBalanceSchema,
      });
    },
    reserveUnits: async (context, input) =>
      await request({
        context,
        path: '/v1/product-access/units/reserve',
        method: 'POST',
        body: reserveUnitsRequestSchema.parse(input),
        responseSchema: unitReservationResultSchema,
      }),
    commitUnits: async (context, input) =>
      await request({
        context,
        path: '/v1/product-access/units/commit',
        method: 'POST',
        body: transitionUnitReservationRequestSchema.parse(input),
        responseSchema: unitReservationResultSchema,
      }),
    releaseUnits: async (context, input) =>
      await request({
        context,
        path: '/v1/product-access/units/release',
        method: 'POST',
        body: transitionUnitReservationRequestSchema.parse(input),
        responseSchema: unitReservationResultSchema,
      }),
    setDevelopmentAccess: async (context, input) =>
      await request({
        context,
        path: '/v1/product-access/development',
        method: 'POST',
        body: developmentProductAccessGrantRequestSchema.parse(input),
        responseSchema: productAccessProjectionSchema,
      }),
  };
}
