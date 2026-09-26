import { HEALTH_SERVICE_NAME, parseHealthResponse } from '@bff/contracts';
import { httpRouter } from 'convex/server';

import { httpAction } from './_generated/server';
import { getServiceVersion } from './lib/serviceMetadata';
import {
  publicCustomerJwks,
  readCustomerSigningConfiguration,
} from './lib/customerCrypto';
import {
  completeGoogleLoginHandler,
  currentCustomerHandler,
  customerAuthOptionsHandler,
  exchangeLoginHandler,
  issueContextHandler,
  logoutHandler,
  readLoginChallengeHandler,
  startLoginHandler,
} from './lib/customerHttp';

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

http.route({
  path: '/v1/auth/transactions',
  method: 'POST',
  handler: httpAction(startLoginHandler),
});

http.route({
  path: '/v1/auth/transactions',
  method: 'GET',
  handler: httpAction(readLoginChallengeHandler),
});

http.route({
  path: '/v1/auth/transactions/google',
  method: 'POST',
  handler: httpAction(completeGoogleLoginHandler),
});

http.route({
  path: '/v1/auth/transactions/google',
  method: 'OPTIONS',
  handler: httpAction(async (_ctx, request) =>
    customerAuthOptionsHandler(request),
  ),
});

http.route({
  path: '/v1/auth/exchange',
  method: 'POST',
  handler: httpAction(exchangeLoginHandler),
});

http.route({
  path: '/v1/auth/session/context',
  method: 'POST',
  handler: httpAction(issueContextHandler),
});

http.route({
  path: '/v1/auth/session/logout',
  method: 'POST',
  handler: httpAction(logoutHandler),
});

http.route({
  path: '/v1/me',
  method: 'GET',
  handler: httpAction(currentCustomerHandler),
});

http.route({
  path: '/v1/auth/jwks',
  method: 'GET',
  handler: httpAction(async () => {
    try {
      const body = publicCustomerJwks(readCustomerSigningConfiguration());
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: {
          'access-control-allow-origin': '*',
          'cache-control': 'public, max-age=300, stale-while-revalidate=60',
          'content-type': 'application/json; charset=utf-8',
          'referrer-policy': 'no-referrer',
        },
      });
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: 'RETRYABLE_UNAVAILABLE',
            message: 'Customer authentication is unavailable.',
          },
        }),
        {
          status: 503,
          headers: {
            'cache-control': 'no-store',
            'content-type': 'application/json; charset=utf-8',
            'referrer-policy': 'no-referrer',
          },
        },
      );
    }
  }),
});

export default http;
