import { describe, expect, it } from 'vitest';

import {
  businessAccountPolicySchema,
  DEFAULT_ACCOUNT_POLICY,
  DEFAULT_BUSINESS_ACCOUNT_POLICY,
  DEFAULT_SESSION_POLICY,
  permissionsForRole,
  sessionPolicySchema,
} from './accountPolicy';

describe('customer account policy', () => {
  it('accepts all four account-creation combinations', () => {
    for (const createAccountOnFirstSignIn of [false, true]) {
      for (const userAccountCreationEnabled of [false, true]) {
        expect(
          businessAccountPolicySchema.safeParse({
            ...DEFAULT_BUSINESS_ACCOUNT_POLICY,
            createAccountOnFirstSignIn,
            userAccountCreationEnabled,
          }).success,
        ).toBe(true);
      }
    }
  });

  it('requires the ownership cap to fit inside total memberships', () => {
    expect(
      businessAccountPolicySchema.safeParse({
        ...DEFAULT_BUSINESS_ACCOUNT_POLICY,
        maxAccountMembershipsPerUser: 1,
        maxOwnedAccountsPerUser: 2,
      }).success,
    ).toBe(false);
  });

  it('accepts the default session policy and rejects invalid bounds', () => {
    expect(sessionPolicySchema.parse(DEFAULT_SESSION_POLICY)).toEqual(
      DEFAULT_SESSION_POLICY,
    );
    expect(
      sessionPolicySchema.safeParse({
        idleSeconds: 15 * 60,
        absoluteSeconds: 60 * 60,
      }).success,
    ).toBe(true);
    expect(
      sessionPolicySchema.safeParse({
        idleSeconds: 2 * 60 * 60,
        absoluteSeconds: 60 * 60,
      }).success,
    ).toBe(false);
  });

  it('keeps fixed administration permissions separate from account limits', () => {
    expect(DEFAULT_ACCOUNT_POLICY).toEqual({
      seatLimit: 1,
      adminRoleEnabled: false,
      memberInvitationsEnabled: false,
    });
    expect(permissionsForRole('owner')).toContain('ownership:transfer');
    expect(permissionsForRole('admin')).not.toContain('ownership:transfer');
    expect(permissionsForRole('member')).not.toContain('members:manage');
  });
});
