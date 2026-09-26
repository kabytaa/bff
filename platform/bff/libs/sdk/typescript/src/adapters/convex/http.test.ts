import { describe, expect, it } from 'vitest';

import { createConvexBffAuthHttpAction } from './http';

describe('createConvexBffAuthHttpAction', () => {
  it('wraps the portable Request/Response router without Business session storage', async () => {
    const action = createConvexBffAuthHttpAction({
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
    });

    expect(action.isHttp).toBe(true);
  });
});
