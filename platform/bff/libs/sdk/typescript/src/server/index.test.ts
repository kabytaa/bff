import { describe, expect, it } from 'vitest';

import { isAllowedWebOrigin } from './index';

describe('isAllowedWebOrigin', () => {
  const transport = {
    webOrigins: ['https://example.tofler.app'],
    sessionAdapterBaseUrl: 'https://example-backend.convex.site',
    defaultPostLoginPath: '/',
  };

  it('requires an exact registered origin', () => {
    expect(isAllowedWebOrigin('https://example.tofler.app', transport)).toBe(
      true,
    );
    expect(isAllowedWebOrigin('https://other.tofler.app', transport)).toBe(
      false,
    );
    expect(isAllowedWebOrigin(null, transport)).toBe(false);
  });
});
