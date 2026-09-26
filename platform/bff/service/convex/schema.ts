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
  loginTransactions: defineTable({
    environmentId: v.id('businessEnvironments'),
    publicReference: v.string(),
    purpose: v.union(v.literal('login'), v.literal('ownership_transfer')),
    status: v.union(
      v.literal('pending_provider'),
      v.literal('provider_completed'),
      v.literal('exchanged'),
    ),
    callbackUrl: v.string(),
    returnPath: v.string(),
    state: v.string(),
    providerNonce: v.string(),
    pkceChallenge: v.string(),
    verifiedProvider: v.optional(
      v.union(v.literal('google'), v.literal('development')),
    ),
    verifiedPrincipalId: v.optional(v.id('authPrincipals')),
    verifiedUserId: v.optional(v.id('businessUsers')),
    providerAuthenticatedAt: v.optional(v.number()),
    handoffCodeHash: v.optional(v.string()),
    handoffCodeExpiresAt: v.optional(v.number()),
    providerCompletedAt: v.optional(v.number()),
    consumedAt: v.optional(v.number()),
    developmentGrantHash: v.optional(v.string()),
    transferBinding: v.optional(
      v.object({
        sessionId: v.id('businessSessions'),
        accountId: v.id('accounts'),
        targetMembershipId: v.id('memberships'),
      }),
    ),
    createdAt: v.number(),
    expiresAt: v.number(),
    cleanupAt: v.number(),
  })
    .index('by_environment_reference', ['environmentId', 'publicReference'])
    .index('by_environment_code_hash', ['environmentId', 'handoffCodeHash'])
    .index('by_development_grant_hash', ['developmentGrantHash'])
    .index('by_cleanup_at', ['cleanupAt']),
  businessSessions: defineTable({
    environmentId: v.id('businessEnvironments'),
    userId: v.id('businessUsers'),
    publicId: v.string(),
    handleHash: v.string(),
    provider: v.union(v.literal('google'), v.literal('development')),
    providerAuthenticatedAt: v.number(),
    createdAt: v.number(),
    lastSeenAt: v.number(),
    idleExpiresAt: v.number(),
    absoluteExpiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    revocationReason: v.optional(v.string()),
    cleanupAt: v.number(),
  })
    .index('by_handle_hash', ['handleHash'])
    .index('by_environment_public_id', ['environmentId', 'publicId'])
    .index('by_environment_user_created_at', [
      'environmentId',
      'userId',
      'createdAt',
    ])
    .index('by_cleanup_at', ['cleanupAt']),
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
  accountInvitations: defineTable({
    environmentId: v.id('businessEnvironments'),
    accountId: v.id('accounts'),
    inviterUserId: v.id('businessUsers'),
    publicId: v.string(),
    tokenHash: v.string(),
    recipientEmail: v.string(),
    state: v.union(
      v.literal('pending'),
      v.literal('accepted'),
      v.literal('revoked'),
      v.literal('expired'),
    ),
    expiresAt: v.number(),
    acceptedUserId: v.optional(v.id('businessUsers')),
    acceptedMembershipId: v.optional(v.id('memberships')),
    createdAt: v.number(),
    updatedAt: v.number(),
    cleanupAt: v.number(),
  })
    .index('by_environment_token_hash', ['environmentId', 'tokenHash'])
    .index('by_environment_public_id', ['environmentId', 'publicId'])
    .index('by_environment_account_recipient_state', [
      'environmentId',
      'accountId',
      'recipientEmail',
      'state',
    ])
    .index('by_environment_account_state_expires_at', [
      'environmentId',
      'accountId',
      'state',
      'expiresAt',
    ])
    .index('by_state_expires_at', ['state', 'expiresAt'])
    .index('by_cleanup_at', ['cleanupAt']),
  ownershipTransferProofs: defineTable({
    environmentId: v.id('businessEnvironments'),
    accountId: v.id('accounts'),
    sessionId: v.id('businessSessions'),
    currentOwnerMembershipId: v.id('memberships'),
    targetMembershipId: v.id('memberships'),
    publicId: v.string(),
    proofHash: v.string(),
    expiresAt: v.number(),
    consumedAt: v.optional(v.number()),
    auditId: v.optional(v.id('ownershipTransferAudits')),
    createdAt: v.number(),
    cleanupAt: v.number(),
  })
    .index('by_environment_proof_hash', ['environmentId', 'proofHash'])
    .index('by_environment_public_id', ['environmentId', 'publicId'])
    .index('by_cleanup_at', ['cleanupAt']),
  ownershipTransferAudits: defineTable({
    environmentId: v.id('businessEnvironments'),
    accountId: v.id('accounts'),
    sessionId: v.id('businessSessions'),
    proofId: v.id('ownershipTransferProofs'),
    previousOwnerUserId: v.id('businessUsers'),
    newOwnerUserId: v.id('businessUsers'),
    previousOwnerMembershipId: v.id('memberships'),
    newOwnerMembershipId: v.id('memberships'),
    accountPublicId: v.string(),
    sessionPublicId: v.string(),
    proofPublicId: v.string(),
    previousOwnerUserPublicId: v.string(),
    newOwnerUserPublicId: v.string(),
    previousOwnerMembershipPublicId: v.string(),
    newOwnerMembershipPublicId: v.string(),
    occurredAt: v.number(),
  })
    .index('by_environment_account_occurred_at', [
      'environmentId',
      'accountId',
      'occurredAt',
    ])
    .index('by_proof', ['proofId']),
  securityEvents: defineTable({
    environmentId: v.id('businessEnvironments'),
    userId: v.optional(v.id('businessUsers')),
    accountId: v.optional(v.id('accounts')),
    sessionId: v.optional(v.id('businessSessions')),
    type: v.union(
      v.literal('customer_login_succeeded'),
      v.literal('customer_logout'),
      v.literal('ownership_transferred'),
    ),
    correlationId: v.string(),
    occurredAt: v.number(),
    cleanupAt: v.number(),
  })
    .index('by_environment_occurred_at', ['environmentId', 'occurredAt'])
    .index('by_cleanup_at', ['cleanupAt']),
});
