import { describe, expect, it } from 'vitest';

import {
  completeCustomerAuthResponseSchema,
  completeGoogleCustomerAuthRequestSchema,
  customerAuthTransactionChallengeSchema,
} from './auth';

const challenge = {
  reference: 'login_abcdefghijklmnop',
  environmentKey: 'example-development',
  purpose: 'login',
  enabledProviders: ['google'],
  providerNonce: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
  callbackUrl: 'https://api.example.tofler.app/_tofler/auth/callback',
  expiresAt: 1_800_000_000_000,
} as const;

describe('customer auth web contracts', () => {
  it('accepts the exact nonce-bound transaction challenge', () => {
    expect(customerAuthTransactionChallengeSchema.parse(challenge)).toEqual(
      challenge,
    );
  });

  it('rejects unknown challenge fields and malformed nonces', () => {
    expect(
      customerAuthTransactionChallengeSchema.safeParse({
        ...challenge,
        providerNonce: 'short',
      }).success,
    ).toBe(false);
    expect(
      customerAuthTransactionChallengeSchema.safeParse({
        ...challenge,
        callbackUrl: 'https://api.example.tofler.app/other-callback',
      }).success,
    ).toBe(false);
  });

  it('bounds the provider credential sent to BFF', () => {
    expect(
      completeGoogleCustomerAuthRequestSchema.parse({
        environmentKey: challenge.environmentKey,
        reference: challenge.reference,
        credential: 'header.payload.signature',
      }),
    ).toEqual({
      environmentKey: challenge.environmentKey,
      reference: challenge.reference,
      credential: 'header.payload.signature',
    });
  });

  it('accepts only credential-free HTTPS callback destinations', () => {
    expect(
      completeCustomerAuthResponseSchema.parse({
        redirectUrl:
          'https://api.example.tofler.app/_tofler/auth/callback?code=abc&state=def',
      }),
    ).toBeTruthy();
    for (const redirectUrl of [
      'http://api.example.test/callback',
      'https://user:password@api.example.test/callback',
      'javascript:alert(1)',
    ]) {
      expect(
        completeCustomerAuthResponseSchema.safeParse({ redirectUrl }).success,
      ).toBe(false);
    }
  });
});
