import { ConvexError } from 'convex/values';

export type TableCardsErrorCode =
  | 'CONFLICT'
  | 'ENTITLEMENT_REQUIRED'
  | 'FORBIDDEN'
  | 'INVALID_INPUT'
  | 'LIMIT_EXCEEDED'
  | 'NOT_FOUND'
  | 'PROVIDER_UNAVAILABLE';

export function fail(code: TableCardsErrorCode, message: string): never {
  throw new ConvexError({ code, message });
}
