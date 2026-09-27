import { describe, expect, it } from 'vitest';

import {
  customerSessionContextResponseSchema,
  customerSessionLogoutResponseSchema,
} from './session';

const account = {
  id: 'account_abcdefghijklmnop',
  displayName: 'Example',
  membership: {
    id: 'membership_abcdefghijklmnop',
    accountId: 'account_abcdefghijklmnop',
    userId: 'user_abcdefghijklmnop',
    role: 'owner' as const,
    createdAt: 1,
    updatedAt: 1,
  },
  policy: {
    values: {
      seatLimit: 1,
      adminRoleEnabled: false,
      memberInvitationsEnabled: false,
    },
    sources: {
      seatLimit: 'business_default' as const,
      adminRoleEnabled: 'business_default' as const,
      memberInvitationsEnabled: 'business_default' as const,
    },
  },
  activeMemberCount: 1,
  reservedInvitationCount: 0,
  createdAt: 1,
  updatedAt: 1,
};

const customer = {
  user: {
    id: 'user_abcdefghijklmnop',
    environmentKey: 'example-development',
    verifiedEmail: 'owner@example.com',
    displayName: 'Owner',
    createdAt: 1,
    updatedAt: 1,
  },
  accounts: [account],
};

describe('customer session contracts', () => {
  it.each([
    {
      status: 'onboarding_required',
      token: 'signed-token',
      expiresAt: 1_600,
      customer: { ...customer, accounts: [] },
    },
    {
      status: 'account_selection_required',
      customer,
    },
    {
      status: 'authenticated',
      accountId: account.id,
      token: 'signed-token',
      expiresAt: 1_600,
      customer,
    },
  ])('accepts the $status response shape', (response) => {
    expect(customerSessionContextResponseSchema.parse(response)).toEqual(
      response,
    );
  });

  it('rejects an account-selection response that leaks a token', () => {
    expect(
      customerSessionContextResponseSchema.safeParse({
        status: 'account_selection_required',
        customer,
        token: 'must-not-be-present',
      }).success,
    ).toBe(false);
  });

  it('accepts an explicit logout result', () => {
    expect(
      customerSessionLogoutResponseSchema.parse({ signedOut: true }),
    ).toEqual({ signedOut: true });
  });
});
