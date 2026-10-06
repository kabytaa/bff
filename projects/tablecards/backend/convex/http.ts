import { httpRouter } from 'convex/server';

import { mountConvexBffAuthRoutes } from '@tofler/bff-auth/convex/server';
import { httpAction } from './_generated/server';
import { download, upload } from './files';
import {
  tablecardsCustomerSession,
  tablecardsServiceVersion,
} from './environment';

const http = httpRouter();
mountConvexBffAuthRoutes(http, tablecardsCustomerSession);

for (const method of ['POST', 'OPTIONS'] as const) {
  http.route({ path: '/v1/files/artwork', method, handler: upload });
}
for (const method of ['GET', 'OPTIONS'] as const) {
  for (const kind of ['assets', 'exports']) {
    http.route({ pathPrefix: `/v1/files/${kind}/`, method, handler: download });
  }
}

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
