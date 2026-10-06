import { ConvexError } from 'convex/values';

const SAFE_PRODUCT_ERROR_CODES = new Set([
  'CONFLICT',
  'ENTITLEMENT_REQUIRED',
  'INVALID_INPUT',
  'LIMIT_EXCEEDED',
  'NOT_FOUND',
  'PROVIDER_UNAVAILABLE',
  'AI_COMPLETION_PENDING',
]);

interface ProductErrorData {
  readonly code?: unknown;
  readonly message?: unknown;
}

function productErrorData(error: unknown): ProductErrorData | null {
  if (error instanceof ConvexError && typeof error.data === 'object') {
    return error.data as ProductErrorData;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'object' &&
    error.data !== null
  ) {
    return error.data as ProductErrorData;
  }
  return null;
}

export function safeProductMessage(error: unknown, fallback: string) {
  const data = productErrorData(error);
  if (
    typeof data?.code === 'string' &&
    SAFE_PRODUCT_ERROR_CODES.has(data.code) &&
    typeof data.message === 'string' &&
    data.message.length > 0 &&
    data.message.length <= 240
  ) {
    return data.message;
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (
      error.name !== 'ConvexError' &&
      message.length > 0 &&
      message.length <= 240 &&
      !/^\[CONVEX\b/u.test(message) &&
      !/Uncaught ConvexError|Server Error|Request ID:|\bat (?:async )?\w.*\(|\.tsx?:\d|https?:\/\//u.test(
        message,
      )
    ) {
      return message;
    }
  }
  return fallback;
}
