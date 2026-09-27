/**
 * The complete public route surface owned by a Business session adapter.
 * Runtime adapters and opaque gateways consume this dependency-free manifest
 * so a protocol route cannot be added in one layer and omitted from another.
 */
export const CUSTOMER_SESSION_ADAPTER_ROUTES = [
  { path: '/_tofler/auth/login', method: 'GET' },
  { path: '/_tofler/auth/callback', method: 'GET' },
  { path: '/_tofler/auth/context', method: 'POST' },
  { path: '/_tofler/auth/context', method: 'OPTIONS' },
  { path: '/_tofler/auth/logout', method: 'POST' },
  { path: '/_tofler/auth/logout', method: 'OPTIONS' },
  { path: '/_tofler/auth/transfer/start', method: 'POST' },
  { path: '/_tofler/auth/transfer/start', method: 'OPTIONS' },
] as const;

export type CustomerSessionAdapterRoute =
  (typeof CUSTOMER_SESSION_ADAPTER_ROUTES)[number];
