import { describe, expect, it } from 'vitest';
import { httpRouter } from 'convex/server';

import {
  createConvexBffAuthHttpAction,
  mountConvexBffAuthRoutes,
} from './http';

const options = {
  bffBaseUrl: 'https://bff-dev.tofler.tech',
  environmentKey: 'example-development',
  transport: {
    webOrigins: ['https://example.tofler.app'],
    sessionAdapterBaseUrl: 'https://example-backend.convex.site',
    defaultPostLoginPath: '/',
  },
  fetch: async () => {
    throw new Error('Unexpected fetch');
  },
};

describe('createConvexBffAuthHttpAction', () => {
  it('wraps the portable Request/Response router without Business session storage', async () => {
    const action = createConvexBffAuthHttpAction(options);

    expect(action.isHttp).toBe(true);
  });

  it('mounts the complete fixed route contract without Business boilerplate', () => {
    const router = httpRouter();

    mountConvexBffAuthRoutes(router, options);

    expect(
      router
        .getRoutes()
        .map(([path, method]) => ({ path, method }))
        .sort((left, right) =>
          `${left.path}:${left.method}`.localeCompare(
            `${right.path}:${right.method}`,
          ),
        ),
    ).toEqual([
      { path: '/_tofler/auth/callback', method: 'GET' },
      { path: '/_tofler/auth/context', method: 'OPTIONS' },
      { path: '/_tofler/auth/context', method: 'POST' },
      { path: '/_tofler/auth/login', method: 'GET' },
      { path: '/_tofler/auth/logout', method: 'OPTIONS' },
      { path: '/_tofler/auth/logout', method: 'POST' },
      { path: '/_tofler/auth/transfer/start', method: 'OPTIONS' },
      { path: '/_tofler/auth/transfer/start', method: 'POST' },
    ]);
  });
});
