import { httpRouter } from 'convex/server';

import {
  createConvexBffAuthHttpAction,
  withBffAccountHttpAction,
} from '@tofler/bff-auth/convex/server';
import { httpAction } from './_generated/server';
import { exampleCustomerAuth, exampleCustomerSession } from './environment';

const http = httpRouter();
const sessionAdapter = createConvexBffAuthHttpAction(exampleCustomerSession);

for (const route of [
  { path: '/_tofler/auth/login', method: 'GET' },
  { path: '/_tofler/auth/callback', method: 'GET' },
  { path: '/_tofler/auth/context', method: 'POST' },
  { path: '/_tofler/auth/context', method: 'OPTIONS' },
  { path: '/_tofler/auth/logout', method: 'POST' },
  { path: '/_tofler/auth/logout', method: 'OPTIONS' },
  { path: '/_tofler/auth/transfer/start', method: 'POST' },
  { path: '/_tofler/auth/transfer/start', method: 'OPTIONS' },
] as const) {
  http.route({ ...route, handler: sessionAdapter });
}

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get('origin');
  return origin && exampleCustomerSession.transport.webOrigins.includes(origin)
    ? origin
    : null;
}

function protectedHeaders(origin: string) {
  return {
    'access-control-allow-origin': origin,
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'referrer-policy': 'no-referrer',
    vary: 'Origin',
    'x-content-type-options': 'nosniff',
  } as const;
}

const protectedContext = withBffAccountHttpAction(
  exampleCustomerAuth,
  async (_ctx, request, auth) => {
    const origin = allowedOrigin(request);
    if (!origin) {
      return Response.json(
        { error: { code: 'FORBIDDEN', message: 'Origin is not allowed' } },
        { status: 403 },
      );
    }
    return Response.json(
      {
        userId: auth.userId,
        sessionId: auth.sessionId,
        accountId: auth.accountId,
        membershipId: auth.membershipId,
        role: auth.role,
        permissions: [...auth.permissions],
      },
      { headers: protectedHeaders(origin) },
    );
  },
);

http.route({
  path: '/v1/context',
  method: 'GET',
  handler: httpAction(protectedContext),
});

http.route({
  path: '/v1/context',
  method: 'OPTIONS',
  handler: httpAction(async (_ctx, request) => {
    const origin = allowedOrigin(request);
    if (!origin) {
      return Response.json(
        { error: { code: 'FORBIDDEN', message: 'Origin is not allowed' } },
        { status: 403 },
      );
    }
    return new Response(null, {
      status: 204,
      headers: {
        ...protectedHeaders(origin),
        'access-control-allow-headers': 'Authorization',
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-max-age': '600',
      },
    });
  }),
});

export default http;
