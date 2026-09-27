import { convexTest, type TestConvex } from 'convex-test';
import { describe, expect, it } from 'vitest';

import {
  CUSTOMER_AUTH_CONFIGURATION_VERSION,
  DEFAULT_ACCOUNT_POLICY,
  DEFAULT_BUSINESS_ACCOUNT_POLICY,
  DEFAULT_SESSION_POLICY,
  type CustomerAuthConfiguration,
} from '@bff/contracts';
import { internal } from './_generated/api';
import { sha256Base64Url } from './lib/customerCrypto';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
type TestBackend = TestConvex<typeof schema>;

function configuration(
  overrides: Partial<CustomerAuthConfiguration> = {},
): CustomerAuthConfiguration {
  return {
    version: CUSTOMER_AUTH_CONFIGURATION_VERSION,
    definitionRevision: 1,
    definitionFingerprint: 'fnv1a64:0000000000000000',
    presentation: {
      productName: 'Example',
      theme: 'system',
      accentColor: '#314EC6',
    },
    enabledProviders: ['google'],
    developmentAutomationEnabled: true,
    transport: {
      webOrigins: ['https://example.tofler.app'],
      sessionAdapterBaseUrl: 'https://example-backend.convex.site',
      defaultPostLoginPath: '/',
    },
    sessionPolicy: DEFAULT_SESSION_POLICY,
    accountPolicy: {
      ...DEFAULT_BUSINESS_ACCOUNT_POLICY,
      createAccountOnFirstSignIn: false,
      userAccountCreationEnabled: true,
      maxAccountMembershipsPerUser: 4,
      maxOwnedAccountsPerUser: 2,
      ...overrides.accountPolicy,
    },
    accountDefaults: {
      ...DEFAULT_ACCOUNT_POLICY,
      seatLimit: 3,
      adminRoleEnabled: true,
      memberInvitationsEnabled: true,
      ...overrides.accountDefaults,
    },
    ...overrides,
  };
}

async function configure(
  t: TestBackend,
  customerConfiguration = configuration(),
) {
  await t.mutation(internal.businessEnvironments.create, {
    key: 'example-development',
    businessName: 'Example',
    environmentName: 'Development',
  });
  await t.mutation(internal.businessEnvironments.configureCustomerAuth, {
    key: 'example-development',
    expectedRevision: 0,
    configuration: customerConfiguration,
  });
}

async function bootstrap(
  t: TestBackend,
  suffix: string,
  email = `customer-${suffix}@example.com`,
) {
  const padded = suffix.padStart(16, '0');
  const result = await t.mutation(internal.customerAuth.bootstrapCustomer, {
    environmentKey: 'example-development',
    provider: 'google',
    issuer: 'https://accounts.google.com',
    subject: `google-subject-${suffix}`,
    profile: {
      verifiedEmail: email,
      displayName: `Customer ${suffix}`,
    },
    candidates: {
      userPublicId: `user_${padded}`,
      accountPublicId: `auto_account_${padded}`,
      membershipPublicId: `auto_membership_${padded}`,
    },
    now: 1_000,
  });
  expect(result.kind).toBe('ok');
  return `user_${padded}`;
}

async function createAccount(t: TestBackend, ownerUserId: string) {
  return await t.mutation(internal.accounts.createForUser, {
    environmentKey: 'example-development',
    userPublicId: ownerUserId,
    displayName: 'Test Team',
    accountPublicId: 'account_test_team_0001',
    membershipPublicId: 'membership_owner_0001',
    now: 2_000,
  });
}

async function invitationHash(token: string) {
  return await sha256Base64Url(token);
}

describe('account and invitation lifecycle', () => {
  it('creates explicit accounts within both ownership caps and rolls back collisions', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await configure(t);
    const ownerUserId = await bootstrap(t, 'owner');

    expect(await createAccount(t, ownerUserId)).toMatchObject({
      kind: 'ok',
      account: {
        id: 'account_test_team_0001',
        displayName: 'Test Team',
        membership: { role: 'owner' },
        activeMemberCount: 1,
        reservedInvitationCount: 0,
      },
    });

    expect(
      await t.mutation(internal.accounts.createForUser, {
        environmentKey: 'example-development',
        userPublicId: ownerUserId,
        accountPublicId: 'account_second_team_01',
        membershipPublicId: 'membership_owner_0002',
        now: 2_100,
      }),
    ).toMatchObject({ kind: 'ok', account: { id: 'account_second_team_01' } });

    await expect(
      t.mutation(internal.accounts.createForUser, {
        environmentKey: 'example-development',
        userPublicId: ownerUserId,
        accountPublicId: 'account_third_team_001',
        membershipPublicId: 'membership_owner_0003',
        now: 2_200,
      }),
    ).rejects.toThrow(/CAPACITY_CONFLICT|capacity/u);

    const secondUserId = await bootstrap(t, 'second');
    const collision = await t.mutation(internal.accounts.createForUser, {
      environmentKey: 'example-development',
      userPublicId: secondUserId,
      accountPublicId: 'account_test_team_0001',
      membershipPublicId: 'membership_collision01',
      now: 2_300,
    });
    expect(collision).toEqual({
      kind: 'collision',
      field: 'accountPublicId',
    });
    expect(
      await t.run(async (ctx) => {
        const secondUser = (await ctx.db.query('businessUsers').collect()).find(
          (user) => user.publicId === secondUserId,
        );
        return {
          activeMembershipCount: secondUser?.activeMembershipCount,
          ownedAccountCount: secondUser?.ownedAccountCount,
        };
      }),
    ).toEqual({ activeMembershipCount: 0, ownedAccountCount: 0 });
  });

  it('reissues, accepts, authorizes, and revokes invitations without leaking seats', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await configure(t);
    const ownerUserId = await bootstrap(t, 'owner', 'owner@example.com');
    const memberUserId = await bootstrap(t, 'member', 'member@example.com');
    const otherUserId = await bootstrap(t, 'other', 'other@example.com');
    const created = await createAccount(t, ownerUserId);
    expect(created.kind).toBe('ok');

    const firstToken = 'first-invitation-token-abcdefghijklmnopqrstuvwxyz';
    const first = await t.mutation(internal.invitations.create, {
      environmentKey: 'example-development',
      accountPublicId: 'account_test_team_0001',
      actorUserPublicId: ownerUserId,
      recipientEmail: 'MEMBER@example.com',
      publicId: 'invitation_member_0001',
      tokenHash: await invitationHash(firstToken),
      now: 3_000,
    });
    expect(first).toMatchObject({
      kind: 'ok',
      invitation: {
        id: 'invitation_member_0001',
        recipientEmail: 'member@example.com',
        state: 'pending',
      },
    });

    const replacementToken =
      'replacement-invitation-token-abcdefghijklmnopqrstuvwxyz';
    const reissued = await t.mutation(internal.invitations.create, {
      environmentKey: 'example-development',
      accountPublicId: 'account_test_team_0001',
      actorUserPublicId: ownerUserId,
      recipientEmail: 'member@example.com',
      publicId: 'invitation_ignored_0002',
      tokenHash: await invitationHash(replacementToken),
      now: 4_000,
    });
    expect(reissued).toMatchObject({
      kind: 'ok',
      invitation: { id: 'invitation_member_0001' },
    });

    await expect(
      t.mutation(internal.invitations.accept, {
        environmentKey: 'example-development',
        userPublicId: otherUserId,
        tokenHash: await invitationHash(replacementToken),
        membershipPublicId: 'membership_wrong_user01',
        now: 5_000,
      }),
    ).rejects.toThrow(/FORBIDDEN|does not match/u);

    expect(
      await t.mutation(internal.invitations.accept, {
        environmentKey: 'example-development',
        userPublicId: memberUserId,
        tokenHash: await invitationHash(replacementToken),
        membershipPublicId: 'membership_member_0001',
        now: 6_000,
      }),
    ).toMatchObject({
      kind: 'ok',
      account: {
        id: 'account_test_team_0001',
        membership: { role: 'member' },
        activeMemberCount: 2,
        reservedInvitationCount: 0,
      },
    });

    const memberPage = await t.query(internal.memberships.listForAccount, {
      environmentKey: 'example-development',
      accountPublicId: 'account_test_team_0001',
      actorUserPublicId: memberUserId,
      paginationOpts: { numItems: 50, cursor: null },
    });
    expect(memberPage.page.map(({ role }) => role).sort()).toEqual([
      'member',
      'owner',
    ]);

    expect(
      await t.mutation(internal.invitations.accept, {
        environmentKey: 'example-development',
        userPublicId: memberUserId,
        tokenHash: await invitationHash(replacementToken),
        membershipPublicId: 'membership_replay_0001',
        now: 6_100,
      }),
    ).toMatchObject({
      kind: 'ok',
      account: {
        id: 'account_test_team_0001',
        membership: { id: 'membership_member_0001' },
      },
    });

    const admin = await t.mutation(internal.memberships.changeRole, {
      environmentKey: 'example-development',
      accountPublicId: 'account_test_team_0001',
      actorUserPublicId: ownerUserId,
      targetMembershipPublicId: 'membership_member_0001',
      role: 'admin',
      now: 7_000,
    });
    expect(admin.role).toBe('admin');

    await expect(
      t.mutation(internal.accounts.updatePolicyOverrides, {
        environmentKey: 'example-development',
        accountPublicId: 'account_test_team_0001',
        actorUserPublicId: ownerUserId,
        policyOverrides: { adminRoleEnabled: false },
        now: 7_100,
      }),
    ).rejects.toThrow(/CONFLICT|Admin roles/u);

    await expect(
      t.mutation(internal.accounts.updatePolicyOverrides, {
        environmentKey: 'example-development',
        accountPublicId: 'account_test_team_0001',
        actorUserPublicId: memberUserId,
        policyOverrides: { seatLimit: 3 },
        now: 7_200,
      }),
    ).rejects.toThrow(/FORBIDDEN|Only the Owner/u);

    const pendingToken = 'pending-invitation-token-abcdefghijklmnopqrstuvwxyz';
    const pending = await t.mutation(internal.invitations.create, {
      environmentKey: 'example-development',
      accountPublicId: 'account_test_team_0001',
      actorUserPublicId: memberUserId,
      recipientEmail: 'other@example.com',
      publicId: 'invitation_other_00001',
      tokenHash: await invitationHash(pendingToken),
      now: 8_000,
    });
    expect(pending.kind).toBe('ok');

    expect(
      await t.mutation(internal.invitations.revoke, {
        environmentKey: 'example-development',
        accountPublicId: 'account_test_team_0001',
        actorUserPublicId: memberUserId,
        invitationPublicId: 'invitation_other_00001',
        now: 9_000,
      }),
    ).toMatchObject({ state: 'revoked' });

    await expect(
      t.mutation(internal.memberships.remove, {
        environmentKey: 'example-development',
        accountPublicId: 'account_test_team_0001',
        actorUserPublicId: memberUserId,
        targetMembershipPublicId: 'membership_owner_0001',
        now: 10_000,
      }),
    ).rejects.toThrow(/FORBIDDEN|Owner/u);

    expect(
      await t.mutation(internal.memberships.remove, {
        environmentKey: 'example-development',
        accountPublicId: 'account_test_team_0001',
        actorUserPublicId: memberUserId,
        targetMembershipPublicId: 'membership_member_0001',
        now: 11_000,
      }),
    ).toMatchObject({
      removedMembershipId: 'membership_member_0001',
      activeMemberCount: 1,
    });
  });

  it('expires an invitation transactionally and releases its reserved seat', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    await configure(t);
    const ownerUserId = await bootstrap(t, 'owner', 'owner@example.com');
    const memberUserId = await bootstrap(t, 'member', 'member@example.com');
    await createAccount(t, ownerUserId);

    const token = 'expiring-invitation-token-abcdefghijklmnopqrstuvwxyz';
    const invitation = await t.mutation(internal.invitations.create, {
      environmentKey: 'example-development',
      accountPublicId: 'account_test_team_0001',
      actorUserPublicId: ownerUserId,
      recipientEmail: 'member@example.com',
      publicId: 'invitation_expiring01',
      tokenHash: await invitationHash(token),
      now: 1_000,
    });
    expect(invitation.kind).toBe('ok');

    expect(
      await t.mutation(internal.authCleanup.expirePendingInvitations, {
        now: 8 * 24 * 60 * 60 * 1_000,
      }),
    ).toEqual({ expired: 1 });
    await expect(
      t.mutation(internal.invitations.accept, {
        environmentKey: 'example-development',
        userPublicId: memberUserId,
        tokenHash: await invitationHash(token),
        membershipPublicId: 'membership_expired_001',
        now: 8 * 24 * 60 * 60 * 1_000,
      }),
    ).rejects.toThrow(/UNAUTHENTICATED|invalid/u);

    expect(
      await t.run(async (ctx) => {
        const account = (await ctx.db.query('accounts').collect()).find(
          (candidate) => candidate.publicId === 'account_test_team_0001',
        );
        const storedInvitation = (
          await ctx.db.query('accountInvitations').collect()
        ).find((candidate) => candidate.publicId === 'invitation_expiring01');
        return {
          reservedInvitationCount: account?.pendingInvitationCount,
          invitationState: storedInvitation?.state,
        };
      }),
    ).toEqual({
      reservedInvitationCount: 0,
      invitationState: 'expired',
    });
  });
});
