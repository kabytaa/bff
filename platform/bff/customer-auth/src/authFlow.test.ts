import { describe, expect, it, vi } from 'vitest';
import type { CustomerAuthTransactionChallenge } from '@bff/contracts';

import {
  completeDevelopmentCustomerAuth,
  completeGoogleCustomerAuth,
  customerAuthLocation,
  CustomerAuthFlowError,
  loadCustomerAuthChallenge,
} from './authFlow';

const location = {
  environmentKey: 'example-development',
  reference: 'login_abcdefghijklmnop',
} as const;

const challenge: CustomerAuthTransactionChallenge = {
  ...location,
  purpose: 'login',
  enabledProviders: ['google'],
  providerNonce: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
  callbackUrl: 'https://api.example.tofler.app/_tofler/auth/callback',
  expiresAt: 1_800_000_000_000,
};

describe('customer auth flow', () => {
  it('reads only a valid environment and opaque transaction', () => {
    expect(
      customerAuthLocation(
        '?environment=example-development&transaction=login_abcdefghijklmnop',
      ),
    ).toEqual(location);
    expect(() =>
      customerAuthLocation(
        '?environment=Example&transaction=login_abcdefghijklmnop',
      ),
    ).toThrow(CustomerAuthFlowError);
    expect(() =>
      customerAuthLocation('?environment=example-development'),
    ).toThrow(CustomerAuthFlowError);
  });

  it('loads and binds the exact unexpired transaction challenge', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('/v1/auth/transactions?');
      return Promise.resolve(
        new Response(JSON.stringify(challenge), {
          headers: { 'content-type': 'application/json' },
        }),
      );
    });
    await expect(
      loadCustomerAuthChallenge({
        bffSiteUrl: 'https://example.convex.site',
        fetch: fetcher,
        location,
        now: 1_700_000_000_000,
      }),
    ).resolves.toEqual(challenge);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'https://example.convex.site/v1/auth/transactions?environment=example-development&transaction=login_abcdefghijklmnop',
    );
  });

  it('fails closed for an expired or mismatched challenge', async () => {
    for (const body of [
      { ...challenge, expiresAt: 1_600_000_000_000 },
      { ...challenge, environmentKey: 'other-development' },
    ]) {
      await expect(
        loadCustomerAuthChallenge({
          bffSiteUrl: 'https://example.convex.site',
          fetch: async () => new Response(JSON.stringify(body)),
          location,
          now: 1_700_000_000_000,
        }),
      ).rejects.toMatchObject({ retryable: false });
    }
  });

  it('preserves the safe public error and correlation reference', async () => {
    await expect(
      loadCustomerAuthChallenge({
        bffSiteUrl: 'https://example.convex.site',
        fetch: async () =>
          new Response(
            JSON.stringify({
              error: {
                code: 'RATE_LIMITED',
                message: 'Too many sign-in attempts. Try again later.',
                correlationId: 'error_abcdefghijklmnop',
              },
            }),
            { status: 429 },
          ),
        location,
      }),
    ).rejects.toMatchObject({
      message: 'Too many sign-in attempts. Try again later.',
      correlationId: 'error_abcdefghijklmnop',
      retryable: true,
    });
  });

  it('posts the synthetic Google credential and accepts an HTTPS callback', async () => {
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(init?.method).toBe('POST');
        expect(JSON.parse(String(init?.body))).toEqual({
          environmentKey: location.environmentKey,
          reference: location.reference,
          credential: 'header.payload.signature',
        });
        return new Response(
          JSON.stringify({
            redirectUrl:
              'https://api.example.tofler.app/_tofler/auth/callback?code=one&state=two',
          }),
        );
      },
    );
    await expect(
      completeGoogleCustomerAuth({
        bffSiteUrl: 'https://example.convex.site',
        challenge,
        credential: 'header.payload.signature',
        fetch: fetcher,
      }),
    ).resolves.toEqual(
      new URL(
        'https://api.example.tofler.app/_tofler/auth/callback?code=one&state=two',
      ),
    );
  });

  it('posts a development grant only to the protected completion endpoint', async () => {
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(init?.method).toBe('POST');
        expect(JSON.parse(String(init?.body))).toEqual({
          environmentKey: location.environmentKey,
          reference: location.reference,
          grant: 'signed.two-minute.grant',
        });
        return new Response(
          JSON.stringify({
            redirectUrl:
              'https://api.example.tofler.app/_tofler/auth/callback?code=one&state=two',
          }),
        );
      },
    );
    await expect(
      completeDevelopmentCustomerAuth({
        bffSiteUrl: 'https://example.convex.site',
        challenge,
        grant: 'signed.two-minute.grant',
        fetch: fetcher,
      }),
    ).resolves.toBeInstanceOf(URL);
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'https://example.convex.site/v1/auth/transactions/development',
    );
  });

  it('rejects unsafe, mismatched, or malformed completion destinations', async () => {
    for (const redirectUrl of [
      'http://api.example.test/callback?code=one&state=two',
      'https://attacker.example/_tofler/auth/callback?code=one&state=two',
      'https://api.example.tofler.app/_tofler/auth/callback?code=one',
      'https://api.example.tofler.app/_tofler/auth/callback?code=one&state=two&extra=three',
    ]) {
      await expect(
        completeGoogleCustomerAuth({
          bffSiteUrl: 'https://example.convex.site',
          challenge,
          credential: 'header.payload.signature',
          fetch: async () =>
            new Response(
              JSON.stringify({
                redirectUrl,
              }),
            ),
        }),
      ).rejects.toMatchObject({ retryable: false });
    }
  });
});
