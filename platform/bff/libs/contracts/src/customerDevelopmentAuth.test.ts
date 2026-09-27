import { describe, expect, it } from 'vitest';

import {
  customerDevelopmentAudience,
  customerDevelopmentGrantClaimsSchema,
} from './customerDevelopmentAuth';

const base = {
  iss: 'https://customer-development-auth.tofler.tech',
  aud: 'https://example.convex.site/v1/auth/transactions/development',
  sub: 'business-factory-customer-auth-automation',
  iat: 1_700_000_000,
  exp: 1_700_000_120,
  jti: 'grant_abcdefghijklmnop',
  version: 1,
  lane: 'development',
  environmentKey: 'example-development',
  transactionReference: 'login_abcdefghijklmnop',
} as const;

describe('customer development auth contracts', () => {
  it('derives the exact deployment-bound audience', () => {
    expect(customerDevelopmentAudience('https://example.convex.site')).toBe(
      'https://example.convex.site/v1/auth/transactions/development',
    );
    expect(() => customerDevelopmentAudience('http://localhost:3211')).toThrow(
      /HTTPS/,
    );
  });

  it('accepts safe deterministic signup and exact login-as grants', () => {
    expect(
      customerDevelopmentGrantClaimsSchema.parse({
        ...base,
        capability: 'signup',
        personaId: 'alice-one',
        profile: {
          verifiedEmail: 'alice@example.invalid',
          displayName: 'Alice One',
        },
      }),
    ).toBeTruthy();
    expect(
      customerDevelopmentGrantClaimsSchema.parse({
        ...base,
        capability: 'login_as',
        userId: 'user_abcdefghijklmnop',
      }),
    ).toBeTruthy();
  });

  it('rejects production lanes and real signup addresses', () => {
    expect(
      customerDevelopmentGrantClaimsSchema.safeParse({
        ...base,
        lane: 'production',
        capability: 'login_as',
        userId: 'user_abcdefghijklmnop',
      }).success,
    ).toBe(false);
    expect(
      customerDevelopmentGrantClaimsSchema.safeParse({
        ...base,
        capability: 'signup',
        personaId: 'alice-one',
        profile: {
          verifiedEmail: 'alice@example.com',
          displayName: 'Alice One',
        },
      }).success,
    ).toBe(false);
  });
});
