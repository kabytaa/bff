import { ConvexError } from 'convex/values';

export type BffErrorCode =
  | 'CONFIGURATION_ERROR'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'VALIDATION_ERROR';

export function fail(code: BffErrorCode, message: string): never {
  throw new ConvexError({ code, message });
}
