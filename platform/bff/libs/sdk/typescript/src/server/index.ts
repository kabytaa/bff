import type { BusinessTransportConfig } from '../core';

export const BFF_SESSION_COOKIE_NAME = '__Host-tofler-session' as const;
export const BFF_CSRF_HEADER = 'X-Tofler-CSRF' as const;

export interface BffAuthServerOptions {
  readonly bffBaseUrl: string;
  readonly environmentKey: string;
  readonly transport: BusinessTransportConfig;
  readonly fetch?: typeof fetch;
}

export function isAllowedWebOrigin(
  origin: string | null,
  transport: BusinessTransportConfig,
): boolean {
  return origin !== null && transport.webOrigins.includes(origin);
}
