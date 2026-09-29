import { httpRouter } from 'convex/server';

import { mountConvexBffAuthRoutes } from '@tofler/bff-auth/convex/server';
import { httpAction } from './_generated/server';
import {
  tablecardsCustomerSession,
  tablecardsServiceVersion,
} from './environment';

const http = httpRouter();
mountConvexBffAuthRoutes(http, tablecardsCustomerSession);

http.route({
  path: '/v1/health',
  method: 'GET',
  handler: httpAction(async () =>
    Response.json(
      {
        status: 'ok',
        service: 'tablecards-backend',
        version: tablecardsServiceVersion(),
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

export default http;
