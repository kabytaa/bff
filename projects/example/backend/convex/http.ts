import { httpRouter } from 'convex/server';

import {
  mountConvexBffAuthRoutes,
  withBffAccountHttpAction,
} from '@tofler/bff-auth/convex/server';
import { httpAction } from './_generated/server';
import {
  exampleCustomerAuth,
  exampleCustomerSession,
  exampleServiceVersion,
} from './environment';

const http = httpRouter();
mountConvexBffAuthRoutes(http, exampleCustomerSession);

http.route({
  path: '/v1/health',
  method: 'GET',
  handler: httpAction(async () =>
    Response.json(
      {
        status: 'ok',
        service: 'business-factory-example',
        version: exampleServiceVersion(),
      },
      {
        headers: {
          'access-control-allow-origin': '*',
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      },
    ),
  ),
});

const protectedContext = withBffAccountHttpAction(
  {
    ...exampleCustomerAuth,
    webOrigins: exampleCustomerSession.transport.webOrigins,
    allowedMethods: ['GET'],
  },
  async (_ctx, _request, auth) =>
    Response.json({
      userId: auth.userId,
      accountId: auth.accountId,
      role: auth.role,
    }),
);

http.route({
  path: '/v1/context',
  method: 'GET',
  handler: httpAction(protectedContext),
});

http.route({
  path: '/v1/context',
  method: 'OPTIONS',
  handler: httpAction(protectedContext),
});

export default http;
