import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

import { storedCustomerAuthConfigurationValidator } from './lib/customerConfiguration';

const accountRole = v.union(
  v.literal('owner'),
  v.literal('admin'),
  v.literal('member'),
);

const accountPolicyOverrides = v.object({
  seatLimit: v.optional(v.number()),
  adminRoleEnabled: v.optional(v.boolean()),
  memberInvitationsEnabled: v.optional(v.boolean()),
});

export default defineSchema({
  businessEnvironments: defineTable({
    key: v.string(),
    businessName: v.string(),
    environmentName: v.string(),
    customerAuth: v.optional(storedCustomerAuthConfigurationValidator),
    customerAuthConfigurationRevision: v.optional(v.number()),
    accountPolicyStateRevision: v.optional(v.number()),
    updatedAt: v.number(),
  }).index('by_key', ['key']),
  authPrincipals: defineTable({
    createdAt: v.number(),
  }),
  authIdentities: defineTable({
    principalId: v.id('authPrincipals'),
    provider: v.union(v.literal('google'), v.literal('development')),
    issuer: v.string(),
    subject: v.string(),
    createdAt: v.number(),
    lastAuthenticatedAt: v.number(),
  })
    .index('by_provider_issuer_subject', ['provider', 'issuer', 'subject'])
    .index('by_principal', ['principalId']),
  businessUsers: defineTable({
    environmentId: v.id('businessEnvironments'),
    principalId: v.id('authPrincipals'),
    publicId: v.string(),
    verifiedEmail: v.string(),
    displayName: v.string(),
    pictureUrl: v.optional(v.string()),
    firstSignInProvisioningCompletedAt: v.number(),
    activeMembershipCount: v.number(),
    ownedAccountCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_environment_principal', ['environmentId', 'principalId'])
    .index('by_environment_public_id', ['environmentId', 'publicId'])
    .index('by_environment', ['environmentId']),
  accounts: defineTable({
    environmentId: v.id('businessEnvironments'),
    publicId: v.string(),
    displayName: v.optional(v.string()),
    ownerUserId: v.id('businessUsers'),
    policyOverrides: v.optional(accountPolicyOverrides),
    activeMembershipCount: v.number(),
    pendingInvitationCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_environment_public_id', ['environmentId', 'publicId'])
    .index('by_environment_owner', ['environmentId', 'ownerUserId'])
    .index('by_environment', ['environmentId']),
  memberships: defineTable({
    environmentId: v.id('businessEnvironments'),
    accountId: v.id('accounts'),
    userId: v.id('businessUsers'),
    publicId: v.string(),
    role: accountRole,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_environment_account_user', [
      'environmentId',
      'accountId',
      'userId',
    ])
    .index('by_environment_user_account', [
      'environmentId',
      'userId',
      'accountId',
    ])
    .index('by_environment_account_role', [
      'environmentId',
      'accountId',
      'role',
    ])
    .index('by_environment_public_id', ['environmentId', 'publicId']),
});
