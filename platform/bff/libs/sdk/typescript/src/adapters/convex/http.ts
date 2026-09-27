import {
  httpActionGeneric,
  type HttpRouter,
  type PublicHttpAction,
} from 'convex/server';

import { createBffAuthServer, type BffAuthServerOptions } from '../../server';
import { CUSTOMER_SESSION_ADAPTER_ROUTES } from '../../routes';

/**
 * Creates one stateless Convex HTTP action for the Business-owned session
 * adapter routes. Register the returned action at each `/_tofler/auth/*`
 * route in the Business's `convex/http.ts`.
 *
 * Session state stays authoritative in BFF. The Business Convex deployment
 * owns only the host-scoped browser cookie and never needs a session table.
 */
export function createConvexBffAuthHttpAction(
  options: BffAuthServerOptions,
): PublicHttpAction {
  const server = createBffAuthServer(options);
  return httpActionGeneric(async (_ctx, request) => {
    return await server.handle(request);
  });
}

/**
 * Mounts the complete, fixed Business session-adapter surface on a Convex
 * router. Products should call this once instead of copying the protocol's
 * route table into their own `convex/http.ts`.
 */
export function mountConvexBffAuthRoutes(
  router: HttpRouter,
  options: BffAuthServerOptions,
): void {
  const handler = createConvexBffAuthHttpAction(options);
  for (const route of CUSTOMER_SESSION_ADAPTER_ROUTES) {
    router.route({ ...route, handler });
  }
}
