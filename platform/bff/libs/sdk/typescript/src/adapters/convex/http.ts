import { httpActionGeneric, type PublicHttpAction } from 'convex/server';

import { createBffAuthServer, type BffAuthServerOptions } from '../../server';

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
