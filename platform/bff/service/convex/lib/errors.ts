import { ConvexError } from 'convex/values';

export type BffErrorCode =
  | 'CAPACITY_CONFLICT'
  | 'CONFIGURATION_ERROR'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'UNIT_EXHAUSTED'
  | 'UNAUTHENTICATED'
  | 'VALIDATION_ERROR';

export function fail(code: BffErrorCode, message: string): never {
  throw new ConvexError({ code, message });
}
