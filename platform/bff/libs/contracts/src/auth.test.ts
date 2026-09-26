import { describe, expect, it } from 'vitest';

import {
  CUSTOMER_AUTH_CONFIGURATION_VERSION,
  accountContextClaimsSchema,
  businessTransportConfigSchema,
  customerAuthCallbackUrl,
  customerAuthConfigurationSchema,
  customerContextClaimsSchema,
  deriveCustomerAuthCallbackUrl,
  onboardingContextClaimsSchema,
  relativeApplicationPathSchema,
} from './auth';
import {
  DEFAULT_ACCOUNT_POLICY,
  DEFAULT_BUSINESS_ACCOUNT_POLICY,
  DEFAULT_SESSION_POLICY,
} from './accountPolicy';

const baseClaims = {
  iss: 'https://auth-dev.tofler.app',
  aud: 'https://auth-dev.tofler.app/environments/example-development',
  sub: 'user_abcdefghijklmnop',
  iat: 1_000,
  exp: 1_600,
  jti: 'token_abcdefghijklmnop',
  version: 1 as const,
  environmentKey: 'example-development',
  sessionId: 'session_abcdefghijklmnop',
};

describe('customer authentication contracts', () => {
  const configuration = {
    version: CUSTOMER_AUTH_CONFIGURATION_VERSION,
    enabledProviders: ['google'],
    developmentAutomationEnabled: false,
    transport: {
      webOrigins: ['https://cards.example.com'],
      sessionAdapterBaseUrl: 'https://api.cards.example.com',
      defaultPostLoginPath: '/cards',
    },
    sessionPolicy: DEFAULT_SESSION_POLICY,
    accountPolicy: DEFAULT_BUSINESS_ACCOUNT_POLICY,
    accountDefaults: DEFAULT_ACCOUNT_POLICY,
  } as const;

  it('normalizes exact transport configuration and derives one callback', () => {
    expect(
      businessTransportConfigSchema.parse({
        webOrigins: [
          'https://example.tofler.app',
          'https://example.tofler.app',
        ],
        sessionAdapterBaseUrl: 'https://example-backend.convex.site',
        defaultPostLoginPath: '/accounts?selected=one',
      }),
    ).toEqual({
      webOrigins: ['https://example.tofler.app'],
      sessionAdapterBaseUrl: 'https://example-backend.convex.site',
      defaultPostLoginPath: '/accounts?selected=one',
    });
    expect(
      deriveCustomerAuthCallbackUrl('https://example-backend.convex.site'),
    ).toBe('https://example-backend.convex.site/_tofler/auth/callback');
  });

  it.each([
    'http://example.tofler.app',
    'https://example.tofler.app/',
    'https://example.tofler.app/path',
    'https://*.tofler.app',
    'https://example.tofler.app?query=yes',
  ])('rejects a non-canonical web origin: %s', (origin) => {
    expect(
      businessTransportConfigSchema.safeParse({
        webOrigins: [origin],
        sessionAdapterBaseUrl: 'https://example-backend.convex.site',
        defaultPostLoginPath: '/',
      }).success,
    ).toBe(false);
  });

  it.each(['/', '/settings', '/settings?tab=security'])(
    'accepts a relative application path: %s',
    (path) => {
      expect(relativeApplicationPathSchema.safeParse(path).success).toBe(true);
    },
  );

  it.each(['https://attacker.example', '//attacker.example', 'settings', ''])(
    'rejects an unsafe return destination: %s',
    (path) => {
      expect(relativeApplicationPathSchema.safeParse(path).success).toBe(false);
    },
  );

  it('keeps onboarding and account contexts distinct', () => {
    const onboarding = onboardingContextClaimsSchema.parse({
      ...baseClaims,
      contextType: 'onboarding',
    });
    expect(onboarding.contextType).toBe('onboarding');

    const account = accountContextClaimsSchema.parse({
      ...baseClaims,
      contextType: 'account',
      accountId: 'account_abcdefghijklmnop',
      membershipId: 'member_abcdefghijklmnop',
      role: 'owner',
      permissions: ['account:read', 'ownership:transfer'],
    });
    expect(account.contextType).toBe('account');
    expect(
      customerContextClaimsSchema.safeParse({
        ...onboarding,
        accountId: 'account_abcdefghijklmnop',
      }).success,
    ).toBe(false);
  });

  it('rejects a context whose issue time is not before its expiry', () => {
    expect(
      onboardingContextClaimsSchema.safeParse({
        ...baseClaims,
        iat: 1_600,
        exp: 1_600,
        contextType: 'onboarding',
      }).success,
    ).toBe(false);
  });

  it('validates a complete registration and derives its fixed callback', () => {
    const parsed = customerAuthConfigurationSchema.parse(configuration);

    expect(customerAuthCallbackUrl(parsed)).toBe(
      'https://api.cards.example.com/_tofler/auth/callback',
    );
  });

  it('rejects missing, duplicate, and unsupported providers', () => {
    for (const enabledProviders of [[], ['google', 'google'], ['github']]) {
      expect(
        customerAuthConfigurationSchema.safeParse({
          ...configuration,
          enabledProviders,
        }).success,
      ).toBe(false);
    }
  });
});
