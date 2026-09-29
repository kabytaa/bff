import {
  createCheckoutRequestSchema,
  createCheckoutResponseSchema,
  productAccessErrorResponseSchema,
  type CreateCheckoutRequest,
  type CreateCheckoutResponse,
  type ProductAccessErrorCode,
} from '@bff/contracts';

const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_CONTEXT_TOKEN_BYTES = 16 * 1024;

export interface BffCheckoutClientOptions {
  readonly bffBaseUrl: string;
  readonly environmentKey: string;
  readonly serviceToken: string;
  readonly fetch?: typeof fetch;
  readonly timeoutMilliseconds?: number;
}

export interface BffCheckoutRequestContext {
  readonly contextToken: string;
}

export interface BffCheckoutClient {
  createCheckout(
    context: BffCheckoutRequestContext,
    request: CreateCheckoutRequest,
  ): Promise<CreateCheckoutResponse>;
}

export class BffCheckoutError extends Error {
  public constructor(
    public readonly code: ProductAccessErrorCode,
    public readonly status: number,
    public readonly correlationId?: string,
  ) {
    super(code);
    this.name = 'BffCheckoutError';
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

async function readBoundedJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
    throw new Error('BFF response is too large');
  }
  return JSON.parse(text) as unknown;
}

export function createBffCheckoutClient(
  options: BffCheckoutClientOptions,
): BffCheckoutClient {
  const baseUrl = canonicalOrigin(options.bffBaseUrl);
  const environmentKey = options.environmentKey;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(environmentKey)) {
    throw new Error('environmentKey is invalid');
  }
  const serviceToken = options.serviceToken;
  if (serviceToken.length < 32 || serviceToken.length > 256) {
    throw new Error('serviceToken is invalid');
  }
  const fetchImplementation = options.fetch ?? fetch;
  const timeoutMilliseconds = options.timeoutMilliseconds ?? 10_000;

  return {
    createCheckout: async (context, request) => {
      if (
        context.contextToken.length === 0 ||
        new TextEncoder().encode(context.contextToken).byteLength >
          MAX_CONTEXT_TOKEN_BYTES
      ) {
        throw new Error('contextToken is invalid');
      }
      try {
        const response = await fetchImplementation(`${baseUrl}/v1/checkouts`, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${context.contextToken}`,
            'content-type': 'application/json; charset=utf-8',
            'x-tofler-environment': environmentKey,
            'x-tofler-service-authorization': `Bearer ${serviceToken}`,
          },
          body: JSON.stringify(createCheckoutRequestSchema.parse(request)),
          signal: AbortSignal.timeout(timeoutMilliseconds),
        });
        const body = await readBoundedJson(response);
        if (!response.ok) {
          const parsed = productAccessErrorResponseSchema.safeParse(body);
          if (parsed.success) {
            throw new BffCheckoutError(
              parsed.data.error.code,
              response.status,
              parsed.data.error.correlationId,
            );
          }
          throw new BffCheckoutError('RETRYABLE_UNAVAILABLE', response.status);
        }
        const parsed = createCheckoutResponseSchema.safeParse(body);
        if (!parsed.success) {
          throw new BffCheckoutError('RETRYABLE_UNAVAILABLE', 503);
        }
        return parsed.data;
      } catch (error) {
        if (error instanceof BffCheckoutError) throw error;
        throw new BffCheckoutError('RETRYABLE_UNAVAILABLE', 503);
      }
    },
  };
}
