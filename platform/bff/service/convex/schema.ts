import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

import { storedCustomerAuthConfigurationValidator } from './lib/customerConfiguration';
import {
  actorValidator,
  attachmentStateValidator,
  deliveryStateValidator,
  draftValidator,
  emailEnvelopeValidator,
  entryKindValidator,
  feedbackRatingValidator,
  operatorWorkConfigurationValidator,
  runStateValidator,
  safePropertiesValidator,
  supportStatusValidator,
} from './lib/operatorWorkConfiguration';

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
    operatorWork: v.optional(operatorWorkConfigurationValidator),
    operatorWorkConfigurationRevision: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_key', ['key'])
    .index('by_support_receiving_address', [
      'operatorWork.support.receivingAddress',
    ])
    .index('by_support_reply_domain', ['operatorWork.support.replyDomain']),
  conversations: defineTable({
    environmentId: v.id('businessEnvironments'),
    publicId: v.string(),
    kind: v.union(v.literal('helper'), v.literal('support')),
    botKey: v.string(),
    userId: v.optional(v.id('businessUsers')),
    accountId: v.optional(v.id('accounts')),
    anonymousHandleHash: v.optional(v.string()),
    subject: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    channel: v.optional(
      v.union(v.literal('web'), v.literal('email'), v.literal('seed')),
    ),
    status: v.optional(supportStatusValidator),
    waitingSince: v.optional(v.number()),
    currentDraft: v.optional(draftValidator),
    activeRunId: v.optional(v.id('botRuns')),
    latestCustomerEntryId: v.optional(v.id('conversationEntries')),
    unstartedDeliveryId: v.optional(v.id('emailDeliveries')),
    sendingProhibitedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_environment_public_id', ['environmentId', 'publicId'])
    .index('by_environment_kind_updated_at', [
      'environmentId',
      'kind',
      'updatedAt',
    ])
    .index('by_kind_updated_at', ['kind', 'updatedAt'])
    .index('by_environment_kind_status_waiting', [
      'environmentId',
      'kind',
      'status',
      'waitingSince',
    ])
    .index('by_kind_status_updated_at', ['kind', 'status', 'updatedAt'])
    .index('by_kind_status_waiting', ['kind', 'status', 'waitingSince'])
    .index('by_environment_user_updated_at', [
      'environmentId',
      'userId',
      'updatedAt',
    ])
    .index('by_environment_account_updated_at', [
      'environmentId',
      'accountId',
      'updatedAt',
    ])
    .index('by_environment_anonymous_hash', [
      'environmentId',
      'anonymousHandleHash',
    ]),
  conversationEntries: defineTable({
    environmentId: v.id('businessEnvironments'),
    conversationId: v.id('conversations'),
    publicId: v.string(),
    kind: entryKindValidator,
    visibility: v.union(v.literal('customer'), v.literal('internal')),
    actor: actorValidator,
    actorKey: v.string(),
    text: v.string(),
    createdAt: v.number(),
    idempotencyKey: v.optional(v.string()),
    referencedEntryId: v.optional(v.id('conversationEntries')),
    sourceRunId: v.optional(v.id('botRuns')),
    providerInboundMessageId: v.optional(v.string()),
    internetMessageId: v.optional(v.string()),
    envelope: v.optional(emailEnvelopeValidator),
  })
    .index('by_conversation_created_at', ['conversationId', 'createdAt'])
    .index('by_environment_inbound_message', [
      'environmentId',
      'providerInboundMessageId',
    ])
    .index('by_conversation_idempotency', ['conversationId', 'idempotencyKey'])
    .index('by_environment_actor_created_at', [
      'environmentId',
      'actorKey',
      'createdAt',
    ]),
  botRuns: defineTable({
    environmentId: v.id('businessEnvironments'),
    conversationId: v.id('conversations'),
    triggerEntryId: v.id('conversationEntries'),
    publicId: v.string(),
    botKey: v.string(),
    botVersion: v.number(),
    configurationRevision: v.number(),
    skillVersions: v.array(v.object({ key: v.string(), version: v.number() })),
    model: v.string(),
    state: runStateValidator,
    capturedDraftId: v.optional(v.string()),
    pageContext: v.optional(safePropertiesValidator),
    pageContextFingerprint: v.optional(v.string()),
    pendingClientTool: v.optional(
      v.object({
        callId: v.string(),
        name: v.string(),
        arguments: safePropertiesValidator,
        pageContextFingerprint: v.string(),
      }),
    ),
    clientToolResult: v.optional(safePropertiesValidator),
    attempts: v.array(
      v.object({
        id: v.string(),
        provider: v.string(),
        model: v.string(),
        outcome: v.union(
          v.literal('running'),
          v.literal('completed'),
          v.literal('failed'),
        ),
        startedAt: v.number(),
        completedAt: v.optional(v.number()),
        inputTokens: v.optional(v.number()),
        outputTokens: v.optional(v.number()),
        error: v.optional(v.string()),
      }),
    ),
    toolUsage: v.optional(v.array(v.string())),
    error: v.optional(v.string()),
    resultEntryId: v.optional(v.id('conversationEntries')),
    resultPendingId: v.optional(v.string()),
    startedAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_conversation_started_at', ['conversationId', 'startedAt'])
    .index('by_environment_started_at', ['environmentId', 'startedAt'])
    .index('by_started_at', ['startedAt'])
    .index('by_environment_state_updated_at', [
      'environmentId',
      'state',
      'updatedAt',
    ])
    .index('by_conversation_trigger', ['conversationId', 'triggerEntryId'])
    .index('by_environment_public_id', ['environmentId', 'publicId']),
  emailDeliveries: defineTable({
    environmentId: v.id('businessEnvironments'),
    conversationId: v.id('conversations'),
    entryId: v.id('conversationEntries'),
    provider: v.literal('resend'),
    purpose: v.union(v.literal('reply'), v.literal('receipt')),
    payloadFingerprint: v.string(),
    idempotencyKey: v.string(),
    state: deliveryStateValidator,
    attemptCount: v.number(),
    approver: actorValidator,
    approvedAt: v.number(),
    pendingId: v.optional(v.string()),
    triggerEntryId: v.optional(v.id('conversationEntries')),
    replyTokenHash: v.string(),
    providerMessageId: v.optional(v.string()),
    attemptedAt: v.optional(v.number()),
    nextAttemptAt: v.optional(v.number()),
    providerOccurredAt: v.optional(v.number()),
    mocked: v.optional(v.boolean()),
    retryable: v.optional(v.boolean()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_environment_entry', ['environmentId', 'entryId'])
    .index('by_conversation_created_at', ['conversationId', 'createdAt'])
    .index('by_provider_message', ['provider', 'providerMessageId'])
    .index('by_reply_token_hash', ['replyTokenHash'])
    .index('by_state_next_attempt_at', ['state', 'nextAttemptAt'])
    .index('by_environment_state_updated_at', [
      'environmentId',
      'state',
      'updatedAt',
    ])
    .index('by_environment_pending_id', ['environmentId', 'pendingId']),
  emailWebhookReceipts: defineTable({
    provider: v.literal('resend'),
    eventId: v.string(),
    eventType: v.string(),
    occurredAt: v.number(),
    receivedAt: v.number(),
    state: v.union(
      v.literal('pending'),
      v.literal('processed'),
      v.literal('unmatched'),
      v.literal('failed'),
    ),
    environmentId: v.optional(v.id('businessEnvironments')),
    conversationId: v.optional(v.id('conversations')),
    entryId: v.optional(v.id('conversationEntries')),
    deliveryId: v.optional(v.id('emailDeliveries')),
    providerMessageId: v.optional(v.string()),
    sender: v.optional(v.string()),
    recipients: v.array(v.string()),
    threadIds: v.array(v.string()),
    outcome: v.optional(v.string()),
    error: v.optional(v.string()),
    processingAttempts: v.optional(v.number()),
  })
    .index('by_provider_event', ['provider', 'eventId'])
    .index('by_state_received_at', ['state', 'receivedAt'])
    .index('by_provider_message', ['provider', 'providerMessageId']),
  supportAttachments: defineTable({
    environmentId: v.id('businessEnvironments'),
    conversationId: v.id('conversations'),
    entryId: v.id('conversationEntries'),
    providerAttachmentId: v.string(),
    claimedName: v.string(),
    claimedType: v.string(),
    claimedBytes: v.number(),
    state: attachmentStateValidator,
    blockReason: v.optional(v.string()),
    storageId: v.optional(v.id('_storage')),
    verifiedType: v.optional(
      v.union(v.literal('image/png'), v.literal('image/jpeg')),
    ),
    byteSize: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_entry_provider_attachment', ['entryId', 'providerAttachmentId'])
    .index('by_conversation_entry', ['conversationId', 'entryId'])
    .index('by_environment_state_updated_at', [
      'environmentId',
      'state',
      'updatedAt',
    ]),
  feedbackRecords: defineTable({
    environmentId: v.id('businessEnvironments'),
    conversationId: v.id('conversations'),
    answerEntryId: v.id('conversationEntries'),
    questionVersion: v.number(),
    question: v.string(),
    evidenceKind: v.union(
      v.literal('support'),
      v.literal('helper'),
      v.literal('general'),
    ),
    createdAt: v.number(),
    invitedAt: v.optional(v.number()),
    tokenHash: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    activatedAt: v.optional(v.number()),
    deliveryId: v.optional(v.id('emailDeliveries')),
    rating: v.optional(feedbackRatingValidator),
    comment: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
  })
    .index('by_answer_evidence_kind', ['answerEntryId', 'evidenceKind'])
    .index('by_token_hash', ['tokenHash'])
    .index('by_environment_submitted_at', ['environmentId', 'submittedAt'])
    .index('by_environment_invited_at', ['environmentId', 'invitedAt'])
    .index('by_delivery', ['deliveryId']),
  businessEvents: defineTable({
    environmentId: v.id('businessEnvironments'),
    deduplicationId: v.string(),
    name: v.string(),
    version: v.number(),
    occurredAt: v.number(),
    receivedAt: v.number(),
    properties: safePropertiesValidator,
    userId: v.optional(v.id('businessUsers')),
    accountId: v.optional(v.id('accounts')),
    productReference: v.optional(v.string()),
  })
    .index('by_environment_deduplication', ['environmentId', 'deduplicationId'])
    .index('by_environment_occurred_at', ['environmentId', 'occurredAt'])
    .index('by_occurred_at', ['occurredAt'])
    .index('by_environment_user_occurred_at', [
      'environmentId',
      'userId',
      'occurredAt',
    ])
    .index('by_environment_account_occurred_at', [
      'environmentId',
      'accountId',
      'occurredAt',
    ])
    .index('by_environment_name_occurred_at', [
      'environmentId',
      'name',
      'occurredAt',
    ]),
  customerConfigurationPreflights: defineTable({
    environmentId: v.id('businessEnvironments'),
    publicId: v.string(),
    configuration: storedCustomerAuthConfigurationValidator,
    expectedConfigurationRevision: v.number(),
    expectedAccountPolicyStateRevision: v.number(),
    compatible: v.boolean(),
    conflicts: v.array(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
    consumedAt: v.optional(v.number()),
    cleanupAt: v.number(),
  })
    .index('by_environment_public_id', ['environmentId', 'publicId'])
    .index('by_cleanup_at', ['cleanupAt']),
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
    intent: v.optional(
      v.union(v.literal('login'), v.literal('signup'), v.literal('continue')),
    ),
    status: v.union(
      v.literal('pending_provider'),
      v.literal('provider_completed'),
      v.literal('exchanged'),
    ),
    callbackUrl: v.string(),
    webOrigin: v.optional(v.string()),
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
    isTestUser: v.optional(v.boolean()),
    firstSignInProvisioningCompletedAt: v.number(),
    activeMembershipCount: v.number(),
    ownedAccountCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_environment_principal', ['environmentId', 'principalId'])
    .index('by_environment_verified_email', ['environmentId', 'verifiedEmail'])
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
  accountAccessGrants: defineTable({
    environmentId: v.id('businessEnvironments'),
    accountId: v.id('accounts'),
    offerKey: v.string(),
    offerRevision: v.number(),
    source: v.union(
      v.literal('default'),
      v.literal('development_mock'),
      v.literal('test_mock'),
      v.literal('provider'),
    ),
    featureFlags: v.array(v.object({ key: v.string(), enabled: v.boolean() })),
    numericLimits: v.array(v.object({ key: v.string(), value: v.number() })),
    unitGrants: v.array(
      v.object({
        unitType: v.string(),
        periodKey: v.string(),
        allowance: v.number(),
        renewal: v.optional(
          v.object({
            cadence: v.literal('monthly'),
            anchorAt: v.number(),
          }),
        ),
      }),
    ),
    updatedByUserId: v.id('businessUsers'),
    effectiveAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_environment_account', ['environmentId', 'accountId']),
  checkoutAttempts: defineTable({
    environmentId: v.id('businessEnvironments'),
    accountId: v.id('accounts'),
    userId: v.id('businessUsers'),
    publicReference: v.string(),
    idempotencyKey: v.string(),
    requestFingerprint: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('completed'),
      v.literal('cancelled'),
    ),
    returnUrl: v.string(),
    offer: v.object({
      key: v.string(),
      revision: v.number(),
      displayName: v.string(),
      priceUsdCents: v.number(),
      billing: v.union(v.literal('one_time'), v.literal('monthly')),
    }),
    grant: v.object({
      offerKey: v.string(),
      offerRevision: v.number(),
      featureFlags: v.array(
        v.object({ key: v.string(), enabled: v.boolean() }),
      ),
      numericLimits: v.array(v.object({ key: v.string(), value: v.number() })),
      unitGrants: v.array(
        v.object({
          unitType: v.string(),
          allowance: v.number(),
          allocation: v.union(
            v.object({ kind: v.literal('monthly') }),
            v.object({ kind: v.literal('fixed'), key: v.string() }),
          ),
        }),
      ),
    }),
    accountPolicy: v.object({
      seatLimit: v.number(),
      adminRoleEnabled: v.boolean(),
      memberInvitationsEnabled: v.boolean(),
    }),
    createdAt: v.number(),
    expiresAt: v.number(),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cleanupAt: v.number(),
  })
    .index('by_environment_reference', ['environmentId', 'publicReference'])
    .index('by_environment_account_idempotency', [
      'environmentId',
      'accountId',
      'idempotencyKey',
    ])
    .index('by_cleanup_at', ['cleanupAt']),
  accountUnitBuckets: defineTable({
    environmentId: v.id('businessEnvironments'),
    accountId: v.id('accounts'),
    unitType: v.string(),
    periodKey: v.string(),
    allowance: v.number(),
    reserved: v.number(),
    consumed: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_environment_account_unit_period', [
      'environmentId',
      'accountId',
      'unitType',
      'periodKey',
    ])
    .index('by_environment_account', ['environmentId', 'accountId']),
  accountUnitReservations: defineTable({
    environmentId: v.id('businessEnvironments'),
    accountId: v.id('accounts'),
    userId: v.id('businessUsers'),
    publicId: v.string(),
    idempotencyKey: v.string(),
    unitType: v.string(),
    periodKey: v.string(),
    amount: v.number(),
    state: v.union(
      v.literal('reserved'),
      v.literal('committed'),
      v.literal('released'),
      v.literal('expired'),
    ),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_environment_account_idempotency', [
      'environmentId',
      'accountId',
      'idempotencyKey',
    ])
    .index('by_environment_public_id', ['environmentId', 'publicId'])
    .index('by_state_expires_at', ['state', 'expiresAt']),
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
      v.literal('development_automation_used'),
      v.literal('customer_session_revoked'),
    ),
    automationCapability: v.optional(
      v.union(
        v.literal('signup'),
        v.literal('login_as'),
        v.literal('ownership_transfer'),
      ),
    ),
    automationTarget: v.optional(v.string()),
    grantIdHash: v.optional(v.string()),
    correlationId: v.string(),
    occurredAt: v.number(),
    cleanupAt: v.number(),
  })
    .index('by_environment_occurred_at', ['environmentId', 'occurredAt'])
    .index('by_cleanup_at', ['cleanupAt']),
});
