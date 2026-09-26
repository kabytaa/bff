import { HEALTH_SERVICE_NAME, parseHealthResponse } from '@bff/contracts';
import { httpRouter } from 'convex/server';

import { httpAction } from './_generated/server';
import { getServiceVersion } from './lib/serviceMetadata';

const http = httpRouter();

http.route({
  path: '/v1/health',
  method: 'GET',
  handler: httpAction(async () => {
    const body = parseHealthResponse({
      status: 'ok',
      service: HEALTH_SERVICE_NAME,
      version: getServiceVersion(),
    });

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
        'content-type': 'application/json; charset=utf-8',
      },
    });
  }),
});

export default http;
