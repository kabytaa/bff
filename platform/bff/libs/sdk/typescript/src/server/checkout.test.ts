import { describe, expect, it } from 'vitest';

import { createBffCheckoutClient } from './checkout';

const request = {
  idempotencyKey: 'checkout_request_0000000001',
  offer: {
    key: 'studio',
    revision: 1,
    displayName: 'Studio',
    priceUsdCents: 1900,
    billing: 'monthly' as const,
  },
  grant: {
    offerKey: 'studio',
    offerRevision: 1,
    featureFlags: [{ key: 'team_access', enabled: true }],
    numericLimits: [{ key: 'maximum_active_projects', value: 100 }],
    unitGrants: [
      {
        unitType: 'ai_background_batch',
        allowance: 30,
        allocation: { kind: 'monthly' as const },
      },
    ],
  },
  accountPolicy: {
    seatLimit: 5,
    adminRoleEnabled: true,
    memberInvitationsEnabled: true,
  },
  returnUrl: 'https://tablecards-dev.tofler.app/settings',
};

describe('createBffCheckoutClient', () => {
  it('reads current checkout eligibility without exposing a Business service secret', async () => {
    const client = createBffCheckoutClient({
      bffBaseUrl: 'https://example.convex.site',
      environmentKey: 'example-production',
      serviceToken: 'synthetic-checkout-service-secret-0001',
      fetch: async (input, init) => {
        expect(String(input)).toBe(
          'https://example.convex.site/v1/checkouts/availability',
        );
        expect(init?.method).toBe('GET');
        expect(new Headers(init?.headers).get('authorization')).toBe(
          'Bearer synthetic-token',
        );
        expect(
          new Headers(init?.headers).has('x-tofler-service-authorization'),
        ).toBe(false);
        return Response.json({ available: false });
      },
    });
    expect(
      await client.getAvailability({ contextToken: 'synthetic-token' }),
    ).toEqual({ available: false });
  });
  it('sends an authenticated provider-neutral checkout request', async () => {
    const calls: { input: string; init?: RequestInit }[] = [];
    const client = createBffCheckoutClient({
      bffBaseUrl: 'https://quirky-stoat-199.convex.site',
      environmentKey: 'tablecards-development',
      serviceToken: 'checkout_service_secret_000000000001',
      fetch: async (input, init) => {
        calls.push({ input: String(input), init });
        return new Response(
          JSON.stringify({
            provider: 'mock',
            checkoutUrl:
              'https://auth-dev.tofler.app/checkout?environment=tablecards-development&checkout=checkout_reference_000001',
            expiresAt: 10_000,
          }),
          { status: 201 },
        );
      },
    });
    await expect(
      client.createCheckout(
        { contextToken: 'header.payload.signature' },
        request,
      ),
    ).resolves.toMatchObject({ provider: 'mock' });
    expect(calls[0]?.input).toBe(
      'https://quirky-stoat-199.convex.site/v1/checkouts',
    );
    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get('authorization')).toBe(
      'Bearer header.payload.signature',
    );
    expect(headers.get('x-tofler-environment')).toBe('tablecards-development');
    expect(headers.get('x-tofler-service-authorization')).toBe(
      'Bearer checkout_service_secret_000000000001',
    );
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual(request);
  });
});
