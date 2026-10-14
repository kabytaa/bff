import { v } from 'convex/values';

import {
  OPERATOR_WORK_LIMITS,
  operationEmailSchema,
  safePropertiesSchema,
  validateOperationProperties,
} from '@bff/contracts';
import type { Doc, Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import { resolveAccountContext } from './productAccess';
import {
  randomOpaqueSecret,
  randomPublicIdentifier,
  sha256Base64Url,
} from './lib/customerCrypto';
import { fail } from './lib/errors';
import {
  attachmentStateValidator,
  emailEnvelopeValidator,
  feedbackRatingValidator,
  operatorKnowledgeSelectionValidator,
  runStateValidator,
  safePropertiesValidator,
} from './lib/operatorWorkConfiguration';
import {
  appendEntry,
  boundedText,
  conversationByPublicId,
  createDraft,
  effectiveConfiguration,
  entryView,
  entryViewValidator,
  environmentByKey,
  identifier,
  invalidateUnstartedSend,
  systemActor,
  type OperationsCtx,
} from './lib/operationsCore';
import { isSupportServiceSender } from './lib/operationsMailRouting';

const customerIdentityArgs = {
  userPublicId: v.optional(v.string()),
  accountPublicId: v.optional(v.string()),
  membershipPublicId: v.optional(v.string()),
};
const incomingAttachmentValidator = v.object({
  providerAttachmentId: v.string(),
  name: v.string(),
  contentType: v.string(),
  byteSize: v.number(),
});
type IncomingAttachment = {
  providerAttachmentId: string;
  name: string;
  contentType: string;
  byteSize: number;
};
const helperAccessArgs = {
  environmentKey: v.string(),
  conversationPublicId: v.string(),
  anonymousHandleHash: v.optional(v.string()),
  ...customerIdentityArgs,
};
const botCustomerFactsValidator = v.object({
  signedIn: v.boolean(),
  accountSelected: v.boolean(),
  displayName: v.optional(v.string()),
  accountName: v.optional(v.string()),
  offerKey: v.optional(v.string()),
  featureFlags: v.optional(
    v.array(v.object({ key: v.string(), enabled: v.boolean() })),
  ),
  numericLimits: v.optional(
    v.array(v.object({ key: v.string(), value: v.number() })),
  ),
  unitBalances: v.optional(
    v.array(
      v.object({
        unitType: v.string(),
        periodKey: v.string(),
        allowance: v.number(),
        remaining: v.number(),
      }),
    ),
  ),
});

async function currentBotCustomerFacts(
  ctx: OperationsCtx,
  conversation: Doc<'conversations'>,
) {
  if (!conversation.userId) return { signedIn: false, accountSelected: false };
  const user = await ctx.db.get(conversation.userId);
  if (!user || user.environmentId !== conversation.environmentId)
    return fail('CONFIGURATION_ERROR', 'Bot customer scope mismatch');
  if (!conversation.accountId)
    return {
      signedIn: true,
      accountSelected: false,
      displayName: user.displayName,
    };
  const account = await ctx.db.get(conversation.accountId);
  if (!account || account.environmentId !== conversation.environmentId)
    return fail('CONFIGURATION_ERROR', 'Bot account scope mismatch');
  const membership = await ctx.db
    .query('memberships')
    .withIndex('by_environment_account_user', (index) =>
      index
        .eq('environmentId', conversation.environmentId)
        .eq('accountId', account._id)
        .eq('userId', user._id),
    )
    .unique();
  if (!membership)
    return {
      signedIn: true,
      accountSelected: false,
      displayName: user.displayName,
    };
  const [grant, buckets] = await Promise.all([
    ctx.db
      .query('accountAccessGrants')
      .withIndex('by_environment_account', (index) =>
        index
          .eq('environmentId', conversation.environmentId)
          .eq('accountId', account._id),
      )
      .unique(),
    ctx.db
      .query('accountUnitBuckets')
      .withIndex('by_environment_account', (index) =>
        index
          .eq('environmentId', conversation.environmentId)
          .eq('accountId', account._id),
      )
      .take(20),
  ]);
  return {
    signedIn: true,
    accountSelected: true,
    displayName: user.displayName,
    ...(account.displayName ? { accountName: account.displayName } : {}),
    ...(grant
      ? {
          offerKey: grant.offerKey,
          featureFlags: grant.featureFlags,
          numericLimits: grant.numericLimits,
        }
      : {}),
    unitBalances: buckets.map((bucket) => ({
      unitType: bucket.unitType,
      periodKey: bucket.periodKey,
      allowance: bucket.allowance,
      remaining: Math.max(
        0,
        bucket.allowance - bucket.reserved - bucket.consumed,
      ),
    })),
  };
}

async function verifiedCustomer(
  ctx: OperationsCtx,
  environment: Doc<'businessEnvironments'>,
  args: {
    userPublicId?: string;
    accountPublicId?: string;
    membershipPublicId?: string;
  },
) {
  if (!args.userPublicId) {
    if (args.accountPublicId || args.membershipPublicId)
      return fail('FORBIDDEN', 'Account linkage requires a verified customer');
    return { user: null, account: null };
  }
  if (args.accountPublicId) {
    if (!args.membershipPublicId)
      return fail('FORBIDDEN', 'Account linkage requires a current membership');
    const resolved = await resolveAccountContext(ctx, {
      environmentKey: environment.key,
      userPublicId: args.userPublicId,
      accountPublicId: args.accountPublicId,
      membershipPublicId: args.membershipPublicId,
    });
    return { user: resolved.user, account: resolved.account };
  }
  if (args.membershipPublicId)
    return fail('FORBIDDEN', 'A membership requires account context');
  const user = await ctx.db
    .query('businessUsers')
    .withIndex('by_environment_public_id', (index) =>
      index
        .eq('environmentId', environment._id)
        .eq('publicId', args.userPublicId ?? ''),
    )
    .unique();
  if (!user)
    return fail(
      'FORBIDDEN',
      'Verified customer was not found in this environment',
    );
  return { user, account: null };
}

async function helperAccess(
  ctx: OperationsCtx,
  args: {
    environmentKey: string;
    conversationPublicId: string;
    anonymousHandleHash?: string;
    userPublicId?: string;
    accountPublicId?: string;
    membershipPublicId?: string;
  },
) {
  const environment = await environmentByKey(ctx, args.environmentKey);
  effectiveConfiguration(environment);
  const conversation = await conversationByPublicId(
    ctx,
    environment,
    args.conversationPublicId,
  );
  if (conversation.kind !== 'helper')
    return fail(
      'FORBIDDEN',
      'Customer helper access does not grant support access',
    );
  const customer = await verifiedCustomer(ctx, environment, args);
  if (conversation.userId) {
    if (
      !customer.user ||
      customer.user._id !== conversation.userId ||
      customer.account?._id !== conversation.accountId
    )
      return fail(
        'FORBIDDEN',
        'This helper belongs to another customer or account context',
      );
  } else if (
    !args.anonymousHandleHash ||
    conversation.anonymousHandleHash !== args.anonymousHandleHash ||
    customer.user
  ) {
    return fail(
      'FORBIDDEN',
      'A matching anonymous helper capability is required',
    );
  }
  return { environment, conversation, ...customer };
}

async function queueRun(
  ctx: MutationCtx,
  environment: Doc<'businessEnvironments'>,
  conversation: Doc<'conversations'>,
  triggerEntryId: Id<'conversationEntries'>,
  pageContext?: Record<string, string | number | boolean>,
) {
  // A follow-up invalidates approval, not the operator's existing work. Never
  // automatically replace a retained support draft with another model answer.
  if (conversation.kind === 'support' && conversation.currentDraft) {
    await ctx.db.patch(conversation._id, {
      latestCustomerEntryId: triggerEntryId,
      activeRunId: undefined,
      updatedAt: Date.now(),
    });
    return null;
  }
  const configuration = effectiveConfiguration(environment);
  const bot = configuration.bots.find(
    (item) =>
      item.key === conversation.botKey && item.kind === conversation.kind,
  );
  if (!bot)
    return fail('CONFIGURATION_ERROR', 'Conversation bot is not registered');
  const now = Date.now();
  const runId = await ctx.db.insert('botRuns', {
    environmentId: environment._id,
    conversationId: conversation._id,
    triggerEntryId,
    publicId: randomPublicIdentifier('run'),
    botKey: bot.key,
    botVersion: bot.version,
    configurationRevision: environment.operatorWorkConfigurationRevision ?? 0,
    skillVersions: configuration.skills
      .filter((skill) => bot.skillKeys.includes(skill.key))
      .map((skill) => ({ key: skill.key, version: skill.version })),
    model: bot.model,
    state: 'queued',
    attempts: [],
    ...(conversation.currentDraft
      ? { capturedDraftId: conversation.currentDraft.pendingId }
      : {}),
    ...(pageContext
      ? {
          pageContext,
          pageContextFingerprint: await sha256Base64Url(
            JSON.stringify(pageContext),
          ),
        }
      : {}),
    startedAt: now,
    updatedAt: now,
  });
  await ctx.db.patch(conversation._id, {
    activeRunId: runId,
    latestCustomerEntryId: triggerEntryId,
    updatedAt: now,
  });
  if (conversation.kind === 'support')
    await ctx.scheduler.runAfter(0, internal.operationsRuntime.processRun, {
      runId,
    });
  return runId;
}

async function queueReceipt(
  ctx: MutationCtx,
  environment: Doc<'businessEnvironments'>,
  conversation: Doc<'conversations'>,
) {
  const configuration = effectiveConfiguration(environment);
  const now = Date.now();
  // Mail address normalization lowercases the local part; hash those same bytes.
  const replyToken = randomOpaqueSecret(24).toLowerCase();
  const envelope = {
    from: `${configuration.support.fromName} <${configuration.support.fromEmail}>`,
    to:
      conversation.contactEmail ??
      fail('CONFIGURATION_ERROR', 'Receipt contact is missing'),
    replyTo: `reply+${replyToken}@${configuration.support.replyDomain}`,
    subject: `Re: ${conversation.subject}`,
    text: configuration.support.receiptText,
    headers: [
      { name: 'Auto-Submitted', value: 'auto-replied' },
      { name: 'X-Auto-Response-Suppress', value: 'All' },
    ],
    attachmentIds: [],
  };
  const entryId = await appendEntry(ctx, conversation, {
    kind: 'receipt',
    text: envelope.text,
    actor: systemActor,
    visibility: 'customer',
    envelope,
  });
  const deliveryId = await ctx.db.insert('emailDeliveries', {
    environmentId: environment._id,
    conversationId: conversation._id,
    entryId,
    provider: 'resend',
    purpose: 'receipt',
    payloadFingerprint: await sha256Base64Url(JSON.stringify(envelope)),
    idempotencyKey: randomPublicIdentifier('receipt'),
    state: 'queued',
    attemptCount: 0,
    approver: systemActor,
    approvedAt: now,
    replyTokenHash: await sha256Base64Url(replyToken),
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.scheduler.runAfter(0, internal.operationsMail.processDelivery, {
    deliveryId,
  });
  return deliveryId;
}

export const intakeContact = internalMutation({
  args: {
    environmentKey: v.string(),
    userPublicId: v.string(),
    accountPublicId: v.optional(v.string()),
    membershipPublicId: v.optional(v.string()),
    subject: v.string(),
    text: v.string(),
    idempotencyKey: v.string(),
    helperConversationPublicId: v.optional(v.string()),
  },
  returns: v.object({
    conversationId: v.id('conversations'),
    publicId: v.string(),
    entryId: v.id('conversationEntries'),
    runId: v.union(v.id('botRuns'), v.null()),
    receiptDeliveryId: v.union(v.id('emailDeliveries'), v.null()),
    duplicate: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const environment = await environmentByKey(ctx, args.environmentKey);
    const configuration = effectiveConfiguration(environment);
    const customer = await verifiedCustomer(ctx, environment, args);
    if (!customer.user)
      return fail(
        'UNAUTHENTICATED',
        'Contact form requires a verified signed-in customer',
      );
    const subject = boundedText(args.subject, 200);
    if (/[\r\n]/.test(subject))
      return fail(
        'VALIDATION_ERROR',
        'Subject cannot contain mail header delimiters',
      );
    const text = boundedText(args.text);
    const publicId = `conversation_${await sha256Base64Url(identifier(args.idempotencyKey))}`;
    const existing = await ctx.db
      .query('conversations')
      .withIndex('by_environment_public_id', (index) =>
        index.eq('environmentId', environment._id).eq('publicId', publicId),
      )
      .unique();
    if (existing) {
      const entry = await ctx.db
        .query('conversationEntries')
        .withIndex('by_conversation_idempotency', (index) =>
          index
            .eq('conversationId', existing._id)
            .eq('idempotencyKey', args.idempotencyKey),
        )
        .unique();
      if (
        !entry ||
        existing.userId !== customer.user._id ||
        existing.accountId !== customer.account?._id ||
        existing.subject !== subject ||
        entry.text !== text
      )
        return fail(
          'CONFLICT',
          'Contact idempotency key was used for different content or context',
        );
      return {
        conversationId: existing._id,
        publicId: existing.publicId,
        entryId: entry._id,
        runId: existing.activeRunId ?? null,
        receiptDeliveryId: null,
        duplicate: true,
      };
    }
    const now = Date.now();
    const id = await ctx.db.insert('conversations', {
      environmentId: environment._id,
      publicId,
      kind: 'support',
      botKey: configuration.support.botKey,
      userId: customer.user._id,
      ...(customer.account ? { accountId: customer.account._id } : {}),
      subject,
      contactEmail: customer.user.verifiedEmail,
      channel: 'web',
      status: 'open',
      waitingSince: now,
      createdAt: now,
      updatedAt: now,
    });
    const conversation = await ctx.db.get(id);
    if (!conversation)
      return fail('CONFIGURATION_ERROR', 'Contact conversation is missing');
    const entryId = await appendEntry(ctx, conversation, {
      kind: 'customer_message',
      text,
      actor: { kind: 'customer', label: customer.user.displayName },
      visibility: 'customer',
      idempotencyKey: identifier(args.idempotencyKey),
    });
    if (args.helperConversationPublicId) {
      const helper = await helperAccess(ctx, {
        ...args,
        conversationPublicId: args.helperConversationPublicId,
      });
      const entries = await ctx.db
        .query('conversationEntries')
        .withIndex('by_conversation_created_at', (index) =>
          index.eq('conversationId', helper.conversation._id),
        )
        .order('desc')
        .take(20);
      // An explicit handoff copies only visible text, with a bounded size, into the same support history.
      const excerpt = entries
        .reverse()
        .filter(
          (entry) =>
            entry.visibility === 'customer' &&
            ['customer_message', 'bot_answer'].includes(entry.kind),
        )
        .map((entry) => `${entry.actor.label}: ${entry.text}`)
        .join('\n')
        .slice(0, 12_000);
      if (excerpt)
        await appendEntry(ctx, conversation, {
          kind: 'customer_message',
          text: `Customer-approved helper handoff:\n${excerpt}`.slice(
            0,
            12_000,
          ),
          actor: { kind: 'customer', label: customer.user.displayName },
          visibility: 'customer',
          referencedEntryId: entryId,
        });
    }
    const runId = await queueRun(ctx, environment, conversation, entryId);
    const receiptDeliveryId = await queueReceipt(
      ctx,
      environment,
      conversation,
    );
    return {
      conversationId: id,
      publicId,
      entryId,
      runId,
      receiptDeliveryId,
      duplicate: false,
    };
  },
});

export const helperTurn = internalMutation({
  args: {
    environmentKey: v.string(),
    conversationPublicId: v.optional(v.string()),
    anonymousHandleHash: v.optional(v.string()),
    ...customerIdentityArgs,
    text: v.string(),
    idempotencyKey: v.string(),
    pageContext: v.optional(safePropertiesValidator),
  },
  returns: v.object({
    conversationId: v.id('conversations'),
    publicId: v.string(),
    runId: v.union(v.id('botRuns'), v.null()),
    entryId: v.id('conversationEntries'),
    duplicate: v.boolean(),
    savedAnswer: v.optional(
      v.object({
        text: v.string(),
        messageId: v.string(),
        mocked: v.boolean(),
      }),
    ),
    savedClientTool: v.optional(
      v.object({
        messageId: v.string(),
        mocked: v.boolean(),
        toolCallId: v.string(),
        toolName: v.string(),
        input: safePropertiesValidator,
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const environment = await environmentByKey(ctx, args.environmentKey);
    const configuration = effectiveConfiguration(environment);
    const text = boundedText(args.text);
    const idempotencyKey = identifier(args.idempotencyKey);
    const customer = await verifiedCustomer(ctx, environment, args);
    if (
      !customer.user &&
      (!args.anonymousHandleHash ||
        !/^[a-zA-Z0-9_-]{43}$/.test(args.anonymousHandleHash))
    )
      return fail(
        'FORBIDDEN',
        'An opaque hashed anonymous capability is required',
      );
    let pageContext: Record<string, string | number | boolean> | undefined;
    if (args.pageContext) {
      const parsed = safePropertiesSchema.safeParse(args.pageContext);
      if (!parsed.success)
        return fail('VALIDATION_ERROR', 'Page context exceeds its safe bounds');
      pageContext = parsed.data;
    }
    let conversation: Doc<'conversations'>;
    if (args.conversationPublicId)
      conversation = (
        await helperAccess(ctx, {
          ...args,
          conversationPublicId: args.conversationPublicId,
        })
      ).conversation;
    else {
      const bot = configuration.bots.find((item) => item.kind === 'helper');
      if (!bot) return fail('CONFIGURATION_ERROR', 'Helper is not registered');
      const publicId = `conversation_${await sha256Base64Url(`${customer.user?._id ?? args.anonymousHandleHash}:${idempotencyKey}`)}`;
      const existing = await ctx.db
        .query('conversations')
        .withIndex('by_environment_public_id', (index) =>
          index.eq('environmentId', environment._id).eq('publicId', publicId),
        )
        .unique();
      if (existing)
        conversation = (
          await helperAccess(ctx, { ...args, conversationPublicId: publicId })
        ).conversation;
      else {
        const id = await ctx.db.insert('conversations', {
          environmentId: environment._id,
          publicId,
          kind: 'helper',
          botKey: bot.key,
          ...(customer.user
            ? { userId: customer.user._id }
            : { anonymousHandleHash: args.anonymousHandleHash }),
          ...(customer.account ? { accountId: customer.account._id } : {}),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        conversation =
          (await ctx.db.get(id)) ??
          fail('CONFIGURATION_ERROR', 'Helper conversation is missing');
      }
    }
    const duplicate = await ctx.db
      .query('conversationEntries')
      .withIndex('by_conversation_idempotency', (index) =>
        index
          .eq('conversationId', conversation._id)
          .eq('idempotencyKey', idempotencyKey),
      )
      .unique();
    if (duplicate) {
      if (duplicate.text !== text)
        return fail(
          'CONFLICT',
          'Helper turn key was already used for different text',
        );
      // A transport retry belongs to this exact question, never to whichever
      // run happens to be active now. Authorization above still applies.
      const run = await ctx.db
        .query('botRuns')
        .withIndex('by_conversation_trigger', (index) =>
          index
            .eq('conversationId', conversation._id)
            .eq('triggerEntryId', duplicate._id),
        )
        .unique();
      if (
        !run ||
        conversation.latestCustomerEntryId !== duplicate._id ||
        run.pageContextFingerprint !==
          (pageContext
            ? await sha256Base64Url(JSON.stringify(pageContext))
            : undefined)
      )
        return fail('CONFLICT', 'The question or page has changed');
      let savedAnswer;
      let savedClientTool;
      let runId: Id<'botRuns'> | null = null;
      if (run.state === 'completed' && run.resultEntryId) {
        const answer = await ctx.db.get(run.resultEntryId);
        if (
          !answer ||
          answer.environmentId !== environment._id ||
          answer.conversationId !== conversation._id ||
          answer.sourceRunId !== run._id ||
          answer.kind !== 'bot_answer' ||
          answer.visibility !== 'customer'
        )
          return fail('CONFIGURATION_ERROR', 'Saved helper answer is missing');
        savedAnswer = {
          text: answer.text,
          messageId: answer.publicId,
          mocked: run.attempts.at(-1)?.provider === 'development-mock',
        };
      } else if (
        run.state === 'waiting_for_client' &&
        run.pendingClientTool &&
        conversation.activeRunId === run._id &&
        run.configurationRevision ===
          (environment.operatorWorkConfigurationRevision ?? 0) &&
        run.attempts.length < OPERATOR_WORK_LIMITS.runAttempts
      ) {
        // The response or its browser continuation may have been lost. Replay
        // the saved request for this exact authorized question, without a new
        // model attempt or accepting a result outside the current checkpoint.
        savedClientTool = {
          messageId: run.publicId,
          mocked: run.attempts.at(-1)?.provider === 'development-mock',
          toolCallId: run.pendingClientTool.callId,
          toolName: run.pendingClientTool.name,
          input: run.pendingClientTool.arguments,
        };
      } else if (
        run.state === 'failed' &&
        conversation.activeRunId === run._id &&
        run.configurationRevision ===
          (environment.operatorWorkConfigurationRevision ?? 0) &&
        run.attempts.length < OPERATOR_WORK_LIMITS.runAttempts
      ) {
        // Only an explicit customer retry requeues a failed run. Keep its
        // original ID/evidence and the existing three-attempt ceiling.
        await ctx.db.patch(run._id, {
          state: 'queued',
          error: undefined,
          updatedAt: Date.now(),
        });
        runId = run._id;
      }
      return {
        conversationId: conversation._id,
        publicId: conversation.publicId,
        runId,
        entryId: duplicate._id,
        duplicate: true,
        ...(savedAnswer ? { savedAnswer } : {}),
        ...(savedClientTool ? { savedClientTool } : {}),
      };
    }
    await invalidateUnstartedSend(ctx, conversation, Date.now());
    const entryId = await appendEntry(ctx, conversation, {
      kind: 'customer_message',
      text,
      actor: {
        kind: 'customer',
        label: customer.user?.displayName ?? 'Visitor',
      },
      visibility: 'customer',
      idempotencyKey,
    });
    const refreshed =
      (await ctx.db.get(conversation._id)) ??
      fail('CONFIGURATION_ERROR', 'Helper is missing');
    const runId = await queueRun(
      ctx,
      environment,
      refreshed,
      entryId,
      pageContext,
    );
    return {
      conversationId: conversation._id,
      publicId: conversation.publicId,
      runId,
      entryId,
      duplicate: false,
    };
  },
});

export const helperHistory = internalQuery({
  args: helperAccessArgs,
  returns: v.object({
    publicId: v.string(),
    entries: v.array(entryViewValidator),
    truncated: v.boolean(),
    activeRun: v.union(
      v.object({
        publicId: v.string(),
        state: runStateValidator,
        error: v.optional(v.string()),
        pendingClientTool: v.optional(
          v.object({
            callId: v.string(),
            name: v.string(),
            arguments: safePropertiesValidator,
            pageContextFingerprint: v.string(),
          }),
        ),
      }),
      v.null(),
    ),
  }),
  handler: async (ctx, args) => {
    const { conversation } = await helperAccess(ctx, args);
    const entries = await ctx.db
      .query('conversationEntries')
      .withIndex('by_conversation_created_at', (index) =>
        index.eq('conversationId', conversation._id),
      )
      .order('desc')
      .take(101);
    const run = conversation.activeRunId
      ? await ctx.db.get(conversation.activeRunId)
      : null;
    return {
      publicId: conversation.publicId,
      entries: entries
        .slice(0, 100)
        .reverse()
        .filter(
          (entry) =>
            entry.visibility === 'customer' &&
            ['customer_message', 'bot_answer'].includes(entry.kind),
        )
        .map(entryView),
      truncated: entries.length > 100,
      activeRun: run
        ? {
            publicId: run.publicId,
            state: run.state,
            ...(run.error ? { error: run.error } : {}),
            ...(run.pendingClientTool
              ? { pendingClientTool: run.pendingClientTool }
              : {}),
          }
        : null,
    };
  },
});

const runContextValidator = v.object({
  runId: v.id('botRuns'),
  publicId: v.string(),
  state: runStateValidator,
  conversationId: v.id('conversations'),
  conversationPublicId: v.string(),
  environmentKey: v.string(),
  kind: v.union(v.literal('helper'), v.literal('support')),
  botKey: v.string(),
  botVersion: v.number(),
  model: v.string(),
  configurationRevision: v.number(),
  instructions: v.string(),
  knowledgeSelection: v.optional(operatorKnowledgeSelectionValidator),
  skills: v.array(
    v.object({
      key: v.string(),
      name: v.string(),
      whenToUse: v.string(),
      version: v.number(),
    }),
  ),
  entries: v.array(
    v.object({ kind: v.string(), text: v.string(), actorLabel: v.string() }),
  ),
  attempts: v.number(),
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
  capabilities: v.array(
    v.object({
      name: v.string(),
      description: v.string(),
      arguments: v.array(
        v.object({
          name: v.string(),
          type: v.union(
            v.literal('string'),
            v.literal('number'),
            v.literal('boolean'),
          ),
          required: v.boolean(),
          maxLength: v.optional(v.number()),
          allowedValues: v.optional(v.array(v.string())),
        }),
      ),
      result: v.array(
        v.object({
          name: v.string(),
          type: v.union(
            v.literal('string'),
            v.literal('number'),
            v.literal('boolean'),
          ),
          required: v.boolean(),
          maxLength: v.optional(v.number()),
          allowedValues: v.optional(v.array(v.string())),
        }),
      ),
      destination: v.optional(v.string()),
    }),
  ),
  customerFacts: botCustomerFactsValidator,
});

export const runContext = internalQuery({
  args: { runId: v.id('botRuns') },
  returns: runContextValidator,
  handler: async (ctx, args) => {
    const run =
      (await ctx.db.get(args.runId)) ??
      fail('NOT_FOUND', 'Bot run was not found');
    const environment =
      (await ctx.db.get(run.environmentId)) ??
      fail('CONFIGURATION_ERROR', 'Bot environment is missing');
    const configuration = effectiveConfiguration(environment);
    const conversation =
      (await ctx.db.get(run.conversationId)) ??
      fail('CONFIGURATION_ERROR', 'Bot conversation is missing');
    if (conversation.environmentId !== environment._id)
      return fail(
        'CONFIGURATION_ERROR',
        'Bot conversation environment mismatch',
      );
    const bot = configuration.bots.find(
      (item) => item.key === run.botKey && item.version === run.botVersion,
    );
    if (
      !bot ||
      run.configurationRevision !==
        (environment.operatorWorkConfigurationRevision ?? 0)
    )
      return fail('CONFLICT', 'Bot configuration changed');
    const entries = await ctx.db
      .query('conversationEntries')
      .withIndex('by_conversation_created_at', (index) =>
        index.eq('conversationId', conversation._id),
      )
      .order('desc')
      .take(100);
    const publicEntries = [];
    for (const entry of entries.reverse()) {
      if (
        entry.visibility !== 'customer' ||
        !['customer_message', 'bot_answer', 'outgoing_reply'].includes(
          entry.kind,
        )
      )
        continue;
      if (entry.kind === 'outgoing_reply') {
        const delivery = await ctx.db
          .query('emailDeliveries')
          .withIndex('by_environment_entry', (index) =>
            index.eq('environmentId', environment._id).eq('entryId', entry._id),
          )
          .unique();
        if (!delivery || !['accepted', 'delivered'].includes(delivery.state))
          continue;
      }
      publicEntries.push({
        kind: entry.kind,
        text: entry.text,
        actorLabel: entry.actor.label,
      });
    }
    return {
      runId: run._id,
      publicId: run.publicId,
      state: run.state,
      conversationId: conversation._id,
      conversationPublicId: conversation.publicId,
      environmentKey: environment.key,
      kind: conversation.kind,
      botKey: bot.key,
      botVersion: bot.version,
      model: run.model,
      configurationRevision: run.configurationRevision,
      instructions: bot.instructions,
      ...(bot.knowledgeSelection
        ? { knowledgeSelection: bot.knowledgeSelection }
        : {}),
      skills: configuration.skills
        .filter((skill) => bot.skillKeys.includes(skill.key))
        .map((skill) => ({
          key: skill.key,
          name: skill.name,
          whenToUse: skill.whenToUse,
          version: skill.version,
        })),
      entries: publicEntries,
      attempts: run.attempts.length,
      ...(run.pageContext ? { pageContext: run.pageContext } : {}),
      ...(run.pageContextFingerprint
        ? { pageContextFingerprint: run.pageContextFingerprint }
        : {}),
      ...(run.pendingClientTool
        ? { pendingClientTool: run.pendingClientTool }
        : {}),
      ...(run.clientToolResult
        ? { clientToolResult: run.clientToolResult }
        : {}),
      capabilities:
        conversation.kind === 'helper' ? configuration.pageCapabilities : [],
      customerFacts: await currentBotCustomerFacts(ctx, conversation),
    };
  },
});

export const assignedSkill = internalQuery({
  args: { runId: v.id('botRuns'), key: v.string() },
  returns: v.object({
    key: v.string(),
    name: v.string(),
    version: v.number(),
    content: v.string(),
  }),
  handler: async (ctx, args) => {
    const run =
      (await ctx.db.get(args.runId)) ?? fail('NOT_FOUND', 'Run was not found');
    const environment =
      (await ctx.db.get(run.environmentId)) ??
      fail('NOT_FOUND', 'Environment was not found');
    const configuration = effectiveConfiguration(environment);
    if (
      run.configurationRevision !==
      (environment.operatorWorkConfigurationRevision ?? 0)
    )
      return fail('CONFLICT', 'Skill configuration changed');
    const assigned = run.skillVersions.find((skill) => skill.key === args.key);
    const skill = configuration.skills.find(
      (item) =>
        item.key === assigned?.key && item.version === assigned?.version,
    );
    if (!skill)
      return fail('FORBIDDEN', 'Only assigned reviewed skills may be loaded');
    return {
      key: skill.key,
      name: skill.name,
      version: skill.version,
      content: skill.content,
    };
  },
});

export const claimRun = internalMutation({
  args: { runId: v.id('botRuns'), provider: v.string() },
  returns: v.union(v.object({ attemptId: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (
      !run ||
      run.state !== 'queued' ||
      run.attempts.length >= OPERATOR_WORK_LIMITS.runAttempts
    )
      return null;
    const conversation = await ctx.db.get(run.conversationId);
    if (
      !conversation ||
      conversation.activeRunId !== run._id ||
      conversation.latestCustomerEntryId !== run.triggerEntryId
    ) {
      await ctx.db.patch(run._id, { state: 'stale', updatedAt: Date.now() });
      return null;
    }
    const attemptId = randomPublicIdentifier('attempt');
    await ctx.db.patch(run._id, {
      state: 'running',
      attempts: [
        ...run.attempts,
        {
          id: attemptId,
          provider: boundedText(args.provider, 80),
          model: run.model,
          outcome: 'running',
          startedAt: Date.now(),
        },
      ],
      updatedAt: Date.now(),
    });
    return { attemptId };
  },
});

function validateRunEvidence(args: {
  inputTokens?: number;
  outputTokens?: number;
  toolUsage?: string[];
}) {
  if (
    args.toolUsage &&
    (args.toolUsage.length > 30 ||
      args.toolUsage.some((name) => name.length > 100))
  )
    return fail('VALIDATION_ERROR', 'Tool usage evidence exceeds bounds');
  for (const tokens of [args.inputTokens, args.outputTokens])
    if (
      tokens !== undefined &&
      (!Number.isSafeInteger(tokens) || tokens < 0 || tokens > 1_000_000)
    )
      return fail('VALIDATION_ERROR', 'Invalid token usage');
}

function mergeRunEvidence(previous: string[] = [], current: string[] = []) {
  const evidence = [...new Set([...previous, ...current])];
  // Keep the attempt-qualified selector counts even when optional diagnostics
  // overflow. A resumed run must not collapse two paid selections into one.
  const prioritized = [
    ...evidence.filter((item) => item.startsWith('selection_calls:')),
    ...evidence.filter((item) => !item.startsWith('selection_calls:')),
  ];
  return evidence.length > 30
    ? [...prioritized.slice(0, 29), 'tool_usage:truncated']
    : evidence;
}

export const completeRun = internalMutation({
  args: {
    runId: v.id('botRuns'),
    attemptId: v.string(),
    text: v.string(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    toolUsage: v.optional(v.array(v.string())),
  },
  returns: v.object({
    applied: v.boolean(),
    entryId: v.union(v.id('conversationEntries'), v.null()),
    entryPublicId: v.union(v.string(), v.null()),
    pendingId: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const run =
      (await ctx.db.get(args.runId)) ?? fail('NOT_FOUND', 'Run was not found');
    if (run.state === 'completed')
      return {
        applied: false,
        entryId: run.resultEntryId ?? null,
        entryPublicId: run.resultEntryId
          ? ((await ctx.db.get(run.resultEntryId))?.publicId ?? null)
          : null,
        pendingId: run.resultPendingId ?? null,
      };
    const attempt = run.attempts.find((item) => item.id === args.attemptId);
    if (!attempt || attempt.outcome !== 'running' || run.state !== 'running')
      return {
        applied: false,
        entryId: null,
        entryPublicId: null,
        pendingId: null,
      };
    const text = boundedText(args.text);
    validateRunEvidence(args);
    const conversation =
      (await ctx.db.get(run.conversationId)) ??
      fail('CONFIGURATION_ERROR', 'Run conversation is missing');
    const environment =
      (await ctx.db.get(run.environmentId)) ??
      fail('CONFIGURATION_ERROR', 'Run environment is missing');
    const attempts = run.attempts.map((item) =>
      item.id === args.attemptId
        ? {
            ...item,
            outcome: 'completed' as const,
            completedAt: Date.now(),
            ...(args.inputTokens !== undefined
              ? { inputTokens: args.inputTokens }
              : {}),
            ...(args.outputTokens !== undefined
              ? { outputTokens: args.outputTokens }
              : {}),
          }
        : item,
    );
    if (
      conversation.activeRunId !== run._id ||
      conversation.latestCustomerEntryId !== run.triggerEntryId ||
      conversation.currentDraft?.pendingId !== run.capturedDraftId ||
      run.configurationRevision !==
        (environment.operatorWorkConfigurationRevision ?? 0) ||
      !environment.operatorWork?.enabled ||
      (conversation.kind === 'support' &&
        conversation.currentDraft?.editor.kind === 'operator')
    ) {
      await ctx.db.patch(run._id, {
        state: 'stale',
        attempts,
        error: 'New message, operator edit or configuration superseded the run',
        updatedAt: Date.now(),
      });
      if (conversation.activeRunId === run._id)
        await ctx.db.patch(conversation._id, { activeRunId: undefined });
      return {
        applied: false,
        entryId: null,
        entryPublicId: null,
        pendingId: null,
      };
    }
    let entryId: Id<'conversationEntries'> | null = null;
    let pendingId: string | null = null;
    const actor = {
      kind: 'bot' as const,
      label:
        effectiveConfiguration(environment).bots.find(
          (bot) => bot.key === run.botKey,
        )?.name ?? run.botKey,
    };
    if (conversation.kind === 'support')
      pendingId = (
        await createDraft(ctx, environment, conversation, text, actor, run._id)
      ).pendingId;
    else
      entryId = await appendEntry(ctx, conversation, {
        kind: 'bot_answer',
        text,
        actor,
        visibility: 'customer',
        sourceRunId: run._id,
      });
    await ctx.db.patch(run._id, {
      state: 'completed',
      attempts,
      ...(args.toolUsage
        ? { toolUsage: mergeRunEvidence(run.toolUsage, args.toolUsage) }
        : {}),
      ...(entryId ? { resultEntryId: entryId } : {}),
      ...(pendingId ? { resultPendingId: pendingId } : {}),
      updatedAt: Date.now(),
    });
    await ctx.db.patch(conversation._id, {
      activeRunId: undefined,
      updatedAt: Date.now(),
    });
    return {
      applied: true,
      entryId,
      entryPublicId: entryId
        ? ((await ctx.db.get(entryId))?.publicId ?? null)
        : null,
      pendingId,
    };
  },
});

export const failRun = internalMutation({
  args: {
    runId: v.id('botRuns'),
    attemptId: v.optional(v.string()),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || ['completed', 'failed', 'stale'].includes(run.state))
      return null;
    if (
      args.attemptId &&
      !run.attempts.some(
        (item) => item.id === args.attemptId && item.outcome === 'running',
      )
    )
      return null;
    const error = boundedText(args.error, 500);
    await ctx.db.patch(run._id, {
      state: 'failed',
      error,
      attempts: run.attempts.map((attempt) =>
        attempt.id === args.attemptId
          ? { ...attempt, outcome: 'failed', completedAt: Date.now(), error }
          : attempt,
      ),
      updatedAt: Date.now(),
    });
    const conversation = await ctx.db.get(run.conversationId);
    if (conversation && conversation.activeRunId === run._id) {
      // Retain the failed active-run reference so the customer sees temporary unavailability.
      await appendEntry(ctx, conversation, {
        kind: 'bot_diagnostic',
        text: error,
        actor: systemActor,
        visibility: 'internal',
        sourceRunId: run._id,
      });
    }
    return null;
  },
});

export const pauseClientTool = internalMutation({
  args: {
    runId: v.id('botRuns'),
    attemptId: v.string(),
    callId: v.string(),
    name: v.string(),
    arguments: safePropertiesValidator,
    pageContextFingerprint: v.string(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    toolUsage: v.optional(v.array(v.string())),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const run =
      (await ctx.db.get(args.runId)) ?? fail('NOT_FOUND', 'Run was not found');
    const conversation =
      (await ctx.db.get(run.conversationId)) ??
      fail('NOT_FOUND', 'Conversation was not found');
    if (
      conversation.kind !== 'helper' ||
      run.state !== 'running' ||
      conversation.activeRunId !== run._id ||
      conversation.latestCustomerEntryId !== run.triggerEntryId ||
      !run.attempts.some(
        (attempt) =>
          attempt.id === args.attemptId && attempt.outcome === 'running',
      )
    )
      return false;
    const environment =
      (await ctx.db.get(run.environmentId)) ??
      fail('NOT_FOUND', 'Environment was not found');
    if (
      run.configurationRevision !==
      (environment.operatorWorkConfigurationRevision ?? 0)
    )
      return false;
    const capability = effectiveConfiguration(
      environment,
    ).pageCapabilities.find((item) => item.name === args.name);
    if (
      !capability ||
      !run.pageContextFingerprint ||
      args.pageContextFingerprint !== run.pageContextFingerprint
    )
      return fail(
        'FORBIDDEN',
        'Client capability or page context was not registered',
      );
    let argumentsValue: typeof args.arguments;
    try {
      argumentsValue = validateOperationProperties(
        capability.arguments,
        args.arguments,
      );
    } catch {
      return fail('VALIDATION_ERROR', 'Client tool arguments are invalid');
    }
    if (!args.callId || args.callId.length > 128)
      return fail('VALIDATION_ERROR', 'Client call ID exceeds bounds');
    validateRunEvidence(args);
    await ctx.db.patch(run._id, {
      state: 'waiting_for_client',
      pendingClientTool: {
        callId: args.callId,
        name: args.name,
        arguments: argumentsValue,
        pageContextFingerprint: args.pageContextFingerprint,
      },
      clientToolResult: undefined,
      ...(args.toolUsage
        ? { toolUsage: mergeRunEvidence(run.toolUsage, args.toolUsage) }
        : {}),
      attempts: run.attempts.map((attempt) =>
        attempt.id === args.attemptId
          ? {
              ...attempt,
              outcome: 'completed',
              completedAt: Date.now(),
              ...(args.inputTokens !== undefined
                ? { inputTokens: args.inputTokens }
                : {}),
              ...(args.outputTokens !== undefined
                ? { outputTokens: args.outputTokens }
                : {}),
            }
          : attempt,
      ),
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const resumeClientTool = internalMutation({
  args: {
    ...helperAccessArgs,
    runPublicId: v.string(),
    callId: v.string(),
    name: v.string(),
    pageContextFingerprint: v.string(),
    result: safePropertiesValidator,
  },
  returns: v.id('botRuns'),
  handler: async (ctx, args) => {
    const { environment, conversation } = await helperAccess(ctx, args);
    const run = await ctx.db
      .query('botRuns')
      .withIndex('by_environment_public_id', (index) =>
        index
          .eq('environmentId', environment._id)
          .eq('publicId', identifier(args.runPublicId)),
      )
      .unique();
    if (
      !run ||
      run.conversationId !== conversation._id ||
      conversation.activeRunId !== run._id ||
      conversation.latestCustomerEntryId !== run.triggerEntryId ||
      run.state !== 'waiting_for_client' ||
      run.pendingClientTool?.callId !== args.callId ||
      run.pendingClientTool.name !== args.name ||
      run.pendingClientTool.pageContextFingerprint !==
        args.pageContextFingerprint ||
      run.configurationRevision !==
        (environment.operatorWorkConfigurationRevision ?? 0) ||
      run.attempts.length >= OPERATOR_WORK_LIMITS.runAttempts
    )
      return fail(
        'CONFLICT',
        'No matching current client-tool checkpoint remains',
      );
    const capability = effectiveConfiguration(
      environment,
    ).pageCapabilities.find((item) => item.name === args.name);
    if (!capability)
      return fail('FORBIDDEN', 'Client capability is not registered');
    let result: typeof args.result;
    try {
      result = validateOperationProperties(capability.result, args.result);
    } catch {
      return fail('VALIDATION_ERROR', 'Client tool result is invalid');
    }
    await ctx.db.patch(run._id, {
      state: 'queued',
      clientToolResult: result,
      updatedAt: Date.now(),
    });
    return run._id;
  },
});

const deliveryContextValidator = v.object({
  deliveryId: v.id('emailDeliveries'),
  environmentKey: v.string(),
  conversationId: v.id('conversations'),
  entryId: v.id('conversationEntries'),
  state: v.string(),
  purpose: v.union(v.literal('reply'), v.literal('receipt')),
  idempotencyKey: v.string(),
  payloadFingerprint: v.string(),
  attemptCount: v.number(),
  createdAt: v.number(),
  envelope: emailEnvelopeValidator,
});
async function deliveryContextValue(
  ctx: QueryCtx | MutationCtx,
  delivery: Doc<'emailDeliveries'>,
) {
  const environment =
    (await ctx.db.get(delivery.environmentId)) ??
    fail('NOT_FOUND', 'Delivery environment was not found');
  const entry = await ctx.db.get(delivery.entryId);
  if (
    !entry?.envelope ||
    entry.environmentId !== environment._id ||
    entry.conversationId !== delivery.conversationId
  )
    return fail('CONFIGURATION_ERROR', 'Frozen delivery envelope is invalid');
  return {
    deliveryId: delivery._id,
    environmentKey: environment.key,
    conversationId: delivery.conversationId,
    entryId: delivery.entryId,
    state: delivery.state,
    purpose: delivery.purpose,
    idempotencyKey: delivery.idempotencyKey,
    payloadFingerprint: delivery.payloadFingerprint,
    attemptCount: delivery.attemptCount,
    createdAt: delivery.createdAt,
    envelope: entry.envelope,
  };
}
export const deliveryContext = internalQuery({
  args: { deliveryId: v.id('emailDeliveries') },
  returns: deliveryContextValidator,
  handler: async (ctx, args) =>
    await deliveryContextValue(
      ctx,
      (await ctx.db.get(args.deliveryId)) ??
        fail('NOT_FOUND', 'Delivery was not found'),
    ),
});
export const claimDelivery = internalMutation({
  args: { deliveryId: v.id('emailDeliveries') },
  returns: v.union(deliveryContextValidator, v.null()),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (
      !delivery ||
      delivery.state !== 'queued' ||
      delivery.attemptCount >= 3 ||
      (delivery.nextAttemptAt !== undefined &&
        delivery.nextAttemptAt > Date.now())
    )
      return null;
    const conversation = await ctx.db.get(delivery.conversationId);
    if (!conversation || conversation.environmentId !== delivery.environmentId)
      return fail('CONFIGURATION_ERROR', 'Delivery conversation is invalid');
    const latestIncoming = conversation.latestCustomerEntryId
      ? await ctx.db.get(conversation.latestCustomerEntryId)
      : null;
    if (
      conversation.sendingProhibitedAt ||
      (delivery.purpose === 'reply' &&
        (delivery.triggerEntryId !== conversation.latestCustomerEntryId ||
          (latestIncoming &&
            latestIncoming.createdAt > delivery.approvedAt))) ||
      (delivery.attemptCount === 0 &&
        delivery.purpose === 'reply' &&
        conversation.unstartedDeliveryId !== delivery._id) ||
      Date.now() - delivery.createdAt >= 23 * 60 * 60 * 1_000
    ) {
      await ctx.db.patch(delivery._id, {
        state: 'cancelled',
        error: conversation.sendingProhibitedAt
          ? 'Sending is prohibited for this conversation'
          : 'Unstarted authority was revoked or retry window expired',
        nextAttemptAt: undefined,
        updatedAt: Date.now(),
      });
      return null;
    }
    await ctx.db.patch(delivery._id, {
      state: 'dispatching',
      attemptCount: delivery.attemptCount + 1,
      attemptedAt: Date.now(),
      nextAttemptAt: undefined,
      updatedAt: Date.now(),
    });
    if (conversation.unstartedDeliveryId === delivery._id)
      await ctx.db.patch(conversation._id, {
        unstartedDeliveryId: undefined,
        ...(conversation.currentDraft?.pendingId === delivery.pendingId
          ? { currentDraft: undefined }
          : {}),
        updatedAt: Date.now(),
      });
    return await deliveryContextValue(ctx, {
      ...delivery,
      state: 'dispatching',
      attemptCount: delivery.attemptCount + 1,
    });
  },
});

export const recordDeliveryResult = internalMutation({
  args: {
    deliveryId: v.id('emailDeliveries'),
    attemptCount: v.number(),
    state: v.union(
      v.literal('accepted'),
      v.literal('failed'),
      v.literal('uncertain'),
    ),
    providerMessageId: v.optional(v.string()),
    error: v.optional(v.string()),
    mocked: v.optional(v.boolean()),
    retryable: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (
      !delivery ||
      delivery.attemptCount !== args.attemptCount ||
      !['dispatching', 'accepted', 'delivered'].includes(delivery.state)
    )
      return null;
    if (
      args.providerMessageId &&
      (args.providerMessageId.length > 200 ||
        /[\r\n]/.test(args.providerMessageId))
    )
      return fail('VALIDATION_ERROR', 'Provider message ID is invalid');
    if (
      delivery.state === 'delivered' ||
      (delivery.state === 'accepted' && args.state !== 'accepted')
    )
      return null;
    if (
      args.mocked &&
      process.env.BFF_DEVELOPMENT_OPERATOR_WORK_ENABLED !== 'enabled'
    )
      return fail('FORBIDDEN', 'Mocked delivery evidence is development-only');
    await ctx.db.patch(delivery._id, {
      state: args.state,
      ...(args.providerMessageId
        ? { providerMessageId: args.providerMessageId }
        : {}),
      mocked: args.mocked ?? false,
      retryable: args.state === 'failed' && args.retryable === true,
      error: args.error ? boundedText(args.error, 500) : undefined,
      updatedAt: Date.now(),
    });
    if (
      args.state === 'failed' &&
      args.retryable === true &&
      delivery.attemptCount < 3 &&
      Date.now() - delivery.createdAt < 23 * 60 * 60 * 1_000
    ) {
      const conversation = await ctx.db.get(delivery.conversationId);
      if (
        !conversation ||
        conversation.sendingProhibitedAt ||
        (delivery.purpose === 'reply' &&
          (delivery.triggerEntryId !== conversation.latestCustomerEntryId ||
            (conversation.unstartedDeliveryId !== undefined &&
              conversation.unstartedDeliveryId !== delivery._id)))
      )
        return null;
      const delay = delivery.attemptCount === 1 ? 30_000 : 120_000;
      await ctx.db.patch(delivery._id, {
        state: 'queued',
        nextAttemptAt: Date.now() + delay,
      });
      if (delivery.purpose === 'reply')
        await ctx.db.patch(delivery.conversationId, {
          unstartedDeliveryId: delivery._id,
        });
      await ctx.scheduler.runAfter(
        delay,
        internal.operationsMail.processDelivery,
        { deliveryId: delivery._id },
      );
    }
    if (args.state === 'accepted') await activateFeedback(ctx, delivery._id);
    if (args.providerMessageId) {
      // A verified callback can race the HTTP send response. Reconcile retained
      // evidence in this same transaction once its opaque provider ID is bound.
      const receipts = await ctx.db
        .query('emailWebhookReceipts')
        .withIndex('by_provider_message', (index) =>
          index
            .eq('provider', 'resend')
            .eq('providerMessageId', args.providerMessageId),
        )
        .take(100);
      for (const receipt of receipts)
        if (
          receipt.state !== 'processed' &&
          receipt.eventType !== 'email.received'
        )
          await applyDeliveryWebhook(ctx, receipt._id);
    }
    return null;
  },
});

async function activateFeedback(
  ctx: MutationCtx,
  deliveryId: Id<'emailDeliveries'>,
) {
  const feedback = await ctx.db
    .query('feedbackRecords')
    .withIndex('by_delivery', (index) => index.eq('deliveryId', deliveryId))
    .take(2);
  for (const record of feedback)
    if (record.activatedAt === undefined)
      await ctx.db.patch(record._id, { activatedAt: Date.now() });
}

export const recordWebhook = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    occurredAt: v.number(),
    providerMessageId: v.optional(v.string()),
    sender: v.optional(v.string()),
    recipients: v.array(v.string()),
    threadIds: v.array(v.string()),
  },
  returns: v.object({
    receiptId: v.id('emailWebhookReceipts'),
    duplicate: v.boolean(),
  }),
  handler: async (ctx, args) => {
    if (
      args.eventId.length < 1 ||
      args.eventId.length > 200 ||
      args.eventType.length > 80 ||
      !Number.isFinite(args.occurredAt) ||
      args.occurredAt < 0 ||
      args.recipients.length > 10 ||
      args.threadIds.length > 20 ||
      [
        ...args.recipients,
        ...args.threadIds,
        args.providerMessageId ?? '',
        args.sender ?? '',
      ].some((value) => value.length > 300 || /[\r\n]/.test(value))
    )
      return fail(
        'VALIDATION_ERROR',
        'Webhook normalized evidence exceeds bounds',
      );
    const existing = await ctx.db
      .query('emailWebhookReceipts')
      .withIndex('by_provider_event', (index) =>
        index.eq('provider', 'resend').eq('eventId', args.eventId),
      )
      .unique();
    if (existing) return { receiptId: existing._id, duplicate: true };
    const receiptId = await ctx.db.insert('emailWebhookReceipts', {
      provider: 'resend',
      ...args,
      receivedAt: Date.now(),
      state: 'pending',
    });
    await ctx.scheduler.runAfter(0, internal.operationsMail.processWebhook, {
      receiptId,
    });
    return { receiptId, duplicate: false };
  },
});

export const webhookContext = internalQuery({
  args: { receiptId: v.id('emailWebhookReceipts') },
  returns: v.object({
    id: v.id('emailWebhookReceipts'),
    eventType: v.string(),
    providerMessageId: v.union(v.string(), v.null()),
    state: v.string(),
    occurredAt: v.number(),
    sender: v.union(v.string(), v.null()),
    recipients: v.array(v.string()),
    threadIds: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const receipt =
      (await ctx.db.get(args.receiptId)) ??
      fail('NOT_FOUND', 'Webhook receipt was not found');
    return {
      id: receipt._id,
      eventType: receipt.eventType,
      providerMessageId: receipt.providerMessageId ?? null,
      state: receipt.state,
      occurredAt: receipt.occurredAt,
      sender: receipt.sender ?? null,
      recipients: receipt.recipients,
      threadIds: receipt.threadIds,
    };
  },
});

export const markWebhookFailure = internalMutation({
  args: {
    receiptId: v.id('emailWebhookReceipts'),
    error: v.string(),
    retryable: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.state === 'processed') return null;
    const processingAttempts = (receipt.processingAttempts ?? 0) + 1;
    await ctx.db.patch(receipt._id, {
      state: 'failed',
      error: boundedText(args.error, 500),
      processingAttempts,
    });
    if (args.retryable !== false && processingAttempts < 3)
      await ctx.scheduler.runAfter(
        processingAttempts === 1 ? 30_000 : 120_000,
        internal.operationsMail.processWebhook,
        { receiptId: receipt._id },
      );
    return null;
  },
});

export const publicConfiguration = internalQuery({
  args: { environmentKey: v.string() },
  returns: v.object({
    enabled: v.boolean(),
    productName: v.string(),
    contactEmail: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const environment = await environmentByKey(ctx, args.environmentKey);
    return {
      enabled: environment.operatorWork?.enabled ?? false,
      productName:
        environment.operatorWork?.presentation.productName ??
        environment.businessName,
      contactEmail: environment.operatorWork?.presentation.contactEmail ?? null,
    };
  },
});

export const pendingHelper = internalQuery({
  args: helperAccessArgs,
  returns: v.object({
    conversationId: v.id('conversations'),
    runPublicId: v.union(v.string(), v.null()),
    runId: v.union(v.id('botRuns'), v.null()),
    pageKey: v.union(v.string(), v.null()),
    pendingClientTool: v.union(
      v.object({
        callId: v.string(),
        name: v.string(),
        arguments: safePropertiesValidator,
        pageContextFingerprint: v.string(),
      }),
      v.null(),
    ),
  }),
  handler: async (ctx, args) => {
    const { conversation } = await helperAccess(ctx, args);
    const run = conversation.activeRunId
      ? await ctx.db.get(conversation.activeRunId)
      : null;
    return {
      conversationId: conversation._id,
      runPublicId: run?.publicId ?? null,
      runId: run?._id ?? null,
      pageKey:
        typeof run?.pageContext?.key === 'string' ? run.pageContext.key : null,
      pendingClientTool:
        run?.state === 'waiting_for_client'
          ? (run.pendingClientTool ?? null)
          : null,
    };
  },
});

export const processDeliveryWebhook = internalMutation({
  args: { receiptId: v.id('emailWebhookReceipts') },
  returns: v.object({ matched: v.boolean(), state: v.string() }),
  handler: async (ctx, args) => await applyDeliveryWebhook(ctx, args.receiptId),
});

async function applyDeliveryWebhook(
  ctx: MutationCtx,
  receiptId: Id<'emailWebhookReceipts'>,
) {
  const receipt =
    (await ctx.db.get(receiptId)) ??
    fail('NOT_FOUND', 'Webhook receipt was not found');
  if (receipt.state === 'processed')
    return { matched: true, state: receipt.outcome ?? 'processed' };
  const delivery = receipt.providerMessageId
    ? await ctx.db
        .query('emailDeliveries')
        .withIndex('by_provider_message', (index) =>
          index
            .eq('provider', 'resend')
            .eq('providerMessageId', receipt.providerMessageId ?? ''),
        )
        .unique()
    : null;
  if (!delivery) {
    await ctx.db.patch(receipt._id, {
      state: 'unmatched',
      outcome: 'No known outgoing delivery',
    });
    return { matched: false, state: 'unmatched' };
  }
  const outcomes = {
    'email.sent': 'accepted',
    'email.delivered': 'delivered',
    'email.delivery_delayed': 'accepted',
    'email.failed': 'failed',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
  } as const;
  const state = outcomes[receipt.eventType as keyof typeof outcomes];
  if (!state) {
    await ctx.db.patch(receipt._id, {
      state: 'processed',
      outcome: 'Ignored unsupported verified event',
      environmentId: delivery.environmentId,
      conversationId: delivery.conversationId,
      deliveryId: delivery._id,
      entryId: delivery.entryId,
    });
    return { matched: true, state: delivery.state };
  }
  const rank = {
    queued: 0,
    dispatching: 1,
    uncertain: 1,
    failed: 5,
    cancelled: 3,
    accepted: 3,
    delivered: 4,
    bounced: 6,
    complained: 7,
  };
  const shouldUpdate =
    state === 'complained' ||
    (receipt.occurredAt >= (delivery.providerOccurredAt ?? 0) &&
      rank[state] >= rank[delivery.state]);
  if (shouldUpdate) {
    await ctx.db.patch(delivery._id, {
      state,
      providerOccurredAt: Math.max(
        receipt.occurredAt,
        delivery.providerOccurredAt ?? 0,
      ),
      nextAttemptAt: undefined,
      retryable: false,
      ...(['bounced', 'complained', 'failed'].includes(state)
        ? { error: `Verified provider outcome: ${state}` }
        : { error: undefined }),
      updatedAt: Date.now(),
    });
    if (state === 'complained' || state === 'bounced')
      await ctx.db.patch(delivery.conversationId, {
        sendingProhibitedAt: Date.now(),
        updatedAt: Date.now(),
      });
    if (state === 'accepted' || state === 'delivered')
      await activateFeedback(ctx, delivery._id);
  }
  await ctx.db.patch(receipt._id, {
    state: 'processed',
    outcome: shouldUpdate
      ? state
      : 'Older or non-progressing event retained without state regression',
    environmentId: delivery.environmentId,
    conversationId: delivery.conversationId,
    entryId: delivery.entryId,
    deliveryId: delivery._id,
  });
  return { matched: true, state: shouldUpdate ? state : delivery.state };
}

export const receiveEmail = internalMutation({
  args: {
    receiptId: v.id('emailWebhookReceipts'),
    providerInboundMessageId: v.string(),
    internetMessageId: v.optional(v.string()),
    sender: v.string(),
    recipients: v.array(v.string()),
    subject: v.string(),
    text: v.string(),
    replyTokenHash: v.optional(v.string()),
    automated: v.optional(v.boolean()),
    attachments: v.optional(v.array(incomingAttachmentValidator)),
  },
  returns: v.object({
    conversationId: v.union(v.id('conversations'), v.null()),
    entryId: v.union(v.id('conversationEntries'), v.null()),
    runId: v.union(v.id('botRuns'), v.null()),
    receiptDeliveryId: v.union(v.id('emailDeliveries'), v.null()),
    duplicate: v.boolean(),
    matched: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const receipt =
      (await ctx.db.get(args.receiptId)) ??
      fail('NOT_FOUND', 'Verified receipt was not found');
    if (
      receipt.eventType !== 'email.received' ||
      receipt.providerMessageId !== args.providerInboundMessageId
    )
      return fail(
        'FORBIDDEN',
        'Received content does not match the verified callback',
      );
    if (args.automated) {
      await ctx.db.patch(receipt._id, {
        state: 'processed',
        outcome: 'Automated mail loop suppressed',
      });
      return {
        conversationId: null,
        entryId: null,
        runId: null,
        receiptDeliveryId: null,
        duplicate: false,
        matched: false,
      };
    }
    const sender = operationEmailSchema.safeParse(args.sender);
    if (
      !sender.success ||
      args.recipients.length > 10 ||
      args.providerInboundMessageId.length > 200 ||
      /[\r\n]/.test(args.providerInboundMessageId)
    )
      return fail('VALIDATION_ERROR', 'Inbound mail addressing is invalid');
    const recipients = args.recipients.map((recipient) =>
      operationEmailSchema.safeParse(recipient),
    );
    if (recipients.some((result) => !result.success))
      return fail('VALIDATION_ERROR', 'Inbound recipient is invalid');
    const addresses = recipients.map((result) => result.data ?? '');
    const delivery = args.replyTokenHash
      ? await ctx.db
          .query('emailDeliveries')
          .withIndex('by_reply_token_hash', (index) =>
            index.eq('replyTokenHash', args.replyTokenHash ?? ''),
          )
          .unique()
      : null;
    let environment: Doc<'businessEnvironments'> | null = null;
    let conversation: Doc<'conversations'> | null = null;
    if (delivery) {
      environment = await ctx.db.get(delivery.environmentId);
      conversation = await ctx.db.get(delivery.conversationId);
      const entry = await ctx.db.get(delivery.entryId);
      if (
        !environment?.operatorWork?.enabled ||
        !conversation ||
        conversation.environmentId !== environment._id ||
        !entry?.envelope ||
        !addresses.includes(entry.envelope.replyTo.toLowerCase()) ||
        sender.data !== conversation.contactEmail
      ) {
        await ctx.db.patch(receipt._id, {
          state: 'unmatched',
          outcome:
            'Reply-token addressing or sender did not match its registered conversation',
        });
        return {
          conversationId: null,
          entryId: null,
          runId: null,
          receiptDeliveryId: null,
          duplicate: false,
          matched: false,
        };
      }
    } else if (!args.replyTokenHash) {
      const matches = (
        await Promise.all(
          addresses.map((address) =>
            ctx.db
              .query('businessEnvironments')
              .withIndex('by_support_receiving_address', (index) =>
                index.eq('operatorWork.support.receivingAddress', address),
              )
              .take(2),
          ),
        )
      )
        .flat()
        .filter((business) => business.operatorWork?.enabled);
      const unique = new Map(
        matches.map((business) => [business._id, business]),
      );
      if (unique.size === 1) environment = [...unique.values()][0] ?? null;
    }
    if (!environment) {
      await ctx.db.patch(receipt._id, {
        state: 'unmatched',
        outcome: 'No unique registered Business mailbox matched',
      });
      return {
        conversationId: null,
        entryId: null,
        runId: null,
        receiptDeliveryId: null,
        duplicate: false,
        matched: false,
      };
    }
    if (
      isSupportServiceSender(
        sender.data,
        effectiveConfiguration(environment).support,
      )
    ) {
      await ctx.db.patch(receipt._id, {
        state: 'processed',
        outcome: 'Service sender mail loop suppressed',
      });
      return {
        conversationId: null,
        entryId: null,
        runId: null,
        receiptDeliveryId: null,
        duplicate: false,
        matched: false,
      };
    }
    const duplicate = await ctx.db
      .query('conversationEntries')
      .withIndex('by_environment_inbound_message', (index) =>
        index
          .eq('environmentId', environment._id)
          .eq('providerInboundMessageId', args.providerInboundMessageId),
      )
      .unique();
    if (duplicate) {
      await ctx.db.patch(receipt._id, {
        state: 'processed',
        environmentId: environment._id,
        conversationId: duplicate.conversationId,
        entryId: duplicate._id,
        outcome: 'Duplicate incoming message',
      });
      return {
        conversationId: duplicate.conversationId,
        entryId: duplicate._id,
        runId: null,
        receiptDeliveryId: null,
        duplicate: true,
        matched: true,
      };
    }
    const text = boundedText(args.text);
    const subject = boundedText(args.subject, 200);
    if (/[\r\n]/.test(subject))
      return fail(
        'VALIDATION_ERROR',
        'Mail subject has unsafe header delimiters',
      );
    let isNew = false;
    if (!conversation) {
      const id = await ctx.db.insert('conversations', {
        environmentId: environment._id,
        publicId: randomPublicIdentifier('conversation'),
        kind: 'support',
        botKey: effectiveConfiguration(environment).support.botKey,
        subject,
        contactEmail: sender.data,
        channel: 'email',
        status: 'open',
        waitingSince: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      conversation =
        (await ctx.db.get(id)) ??
        fail('CONFIGURATION_ERROR', 'Inbound conversation is missing');
      isNew = true;
    } else await invalidateUnstartedSend(ctx, conversation, Date.now());
    if (
      args.internetMessageId !== undefined &&
      (args.internetMessageId.length > 1000 ||
        !/^<[^<>\s@]+@[^<>\s@]+>$/u.test(args.internetMessageId) ||
        /[^\x21-\x7e]/u.test(args.internetMessageId))
    )
      return fail('VALIDATION_ERROR', 'SMTP Message-ID is invalid');
    const entryId = await appendEntry(ctx, conversation, {
      kind: 'customer_message',
      text,
      actor: { kind: 'customer', label: sender.data },
      visibility: 'customer',
      providerInboundMessageId: args.providerInboundMessageId,
      ...(args.internetMessageId
        ? { internetMessageId: args.internetMessageId }
        : {}),
    });
    const refreshed =
      (await ctx.db.get(conversation._id)) ??
      fail('CONFIGURATION_ERROR', 'Inbound conversation is missing');
    const runId = await queueRun(ctx, environment, refreshed, entryId);
    const receiptDeliveryId = isNew
      ? await queueReceipt(ctx, environment, refreshed)
      : null;
    await registerIncomingAttachments(ctx, {
      entryId,
      attachments: args.attachments ?? [],
    });
    await ctx.db.patch(receipt._id, {
      state: 'processed',
      environmentId: environment._id,
      conversationId: conversation._id,
      entryId,
      outcome: isNew
        ? 'New email-only support conversation'
        : 'Correlated follow-up reopened the same conversation',
    });
    return {
      conversationId: conversation._id,
      entryId,
      runId,
      receiptDeliveryId,
      duplicate: false,
      matched: true,
    };
  },
});

export const registerAttachments = internalMutation({
  args: {
    entryId: v.id('conversationEntries'),
    attachments: v.array(incomingAttachmentValidator),
  },
  returns: v.array(v.id('supportAttachments')),
  handler: async (ctx, args) => await registerIncomingAttachments(ctx, args),
});

async function registerIncomingAttachments(
  ctx: MutationCtx,
  args: {
    entryId: Id<'conversationEntries'>;
    attachments: IncomingAttachment[];
  },
) {
  const entry =
    (await ctx.db.get(args.entryId)) ??
    fail('NOT_FOUND', 'Attachment entry was not found');
  const conversation = await ctx.db.get(entry.conversationId);
  if (
    !conversation ||
    conversation.kind !== 'support' ||
    entry.kind !== 'customer_message'
  )
    return fail('FORBIDDEN', 'Attachments require a customer support message');
  if (args.attachments.length > 20)
    return fail('VALIDATION_ERROR', 'Too many attachment metadata records');
  const existing = await ctx.db
    .query('supportAttachments')
    .withIndex('by_conversation_entry', (index) =>
      index.eq('conversationId', conversation._id).eq('entryId', entry._id),
    )
    .take(21);
  let allowedCount = existing.filter(
    (attachment) => attachment.state !== 'blocked',
  ).length;
  let allowedBytes = existing
    .filter((attachment) => attachment.state !== 'blocked')
    .reduce((sum, attachment) => sum + attachment.claimedBytes, 0);
  const ids: Id<'supportAttachments'>[] = [];
  for (const attachment of args.attachments) {
    if (
      !attachment.providerAttachmentId ||
      attachment.providerAttachmentId.length > 200 ||
      attachment.name.length > 200 ||
      attachment.contentType.length > 100 ||
      !Number.isSafeInteger(attachment.byteSize) ||
      attachment.byteSize < 0
    )
      return fail('VALIDATION_ERROR', 'Attachment metadata is invalid');
    const duplicate = await ctx.db
      .query('supportAttachments')
      .withIndex('by_entry_provider_attachment', (index) =>
        index
          .eq('entryId', entry._id)
          .eq('providerAttachmentId', attachment.providerAttachmentId),
      )
      .unique();
    if (duplicate) {
      ids.push(duplicate._id);
      continue;
    }
    const blockReason = !['image/png', 'image/jpeg'].includes(
      attachment.contentType,
    )
      ? 'Only PNG/JPEG screenshots are supported'
      : attachment.byteSize > OPERATOR_WORK_LIMITS.attachmentBytes
        ? 'Screenshot exceeds 5 MiB'
        : allowedCount >= OPERATOR_WORK_LIMITS.attachments ||
            allowedBytes + attachment.byteSize >
              OPERATOR_WORK_LIMITS.attachments *
                OPERATOR_WORK_LIMITS.attachmentBytes
          ? 'At most three screenshots and 15 MiB per message are accepted'
          : undefined;
    if (!blockReason) {
      allowedCount += 1;
      allowedBytes += attachment.byteSize;
    }
    const attachmentId = await ctx.db.insert('supportAttachments', {
      environmentId: entry.environmentId,
      conversationId: conversation._id,
      entryId: entry._id,
      providerAttachmentId: attachment.providerAttachmentId,
      claimedName: attachment.name,
      claimedType: attachment.contentType,
      claimedBytes: attachment.byteSize,
      state: blockReason ? 'blocked' : 'pending',
      ...(blockReason ? { blockReason } : {}),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    ids.push(attachmentId);
    if (!blockReason)
      await ctx.scheduler.runAfter(
        0,
        internal.operationsMail.processAttachment,
        { attachmentId },
      );
  }
  return ids;
}
export const attachmentContext = internalQuery({
  args: { attachmentId: v.id('supportAttachments') },
  returns: v.object({
    attachmentId: v.id('supportAttachments'),
    providerAttachmentId: v.string(),
    providerInboundMessageId: v.string(),
    claimedBytes: v.number(),
    claimedType: v.string(),
    state: attachmentStateValidator,
  }),
  handler: async (ctx, args) => {
    const attachment =
      (await ctx.db.get(args.attachmentId)) ??
      fail('NOT_FOUND', 'Attachment was not found');
    const entry = await ctx.db.get(attachment.entryId);
    if (!entry?.providerInboundMessageId)
      return fail(
        'CONFIGURATION_ERROR',
        'Provider attachment message is missing',
      );
    return {
      attachmentId: attachment._id,
      providerAttachmentId: attachment.providerAttachmentId,
      providerInboundMessageId: entry.providerInboundMessageId,
      claimedBytes: attachment.claimedBytes,
      claimedType: attachment.claimedType,
      state: attachment.state,
    };
  },
});
export const claimAttachment = internalMutation({
  args: { attachmentId: v.id('supportAttachments') },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment || attachment.state !== 'pending') return false;
    await ctx.db.patch(attachment._id, {
      state: 'processing',
      updatedAt: Date.now(),
    });
    return true;
  },
});
export const completeAttachment = internalMutation({
  args: {
    attachmentId: v.id('supportAttachments'),
    storageId: v.optional(v.id('_storage')),
    verifiedType: v.optional(
      v.union(v.literal('image/png'), v.literal('image/jpeg')),
    ),
    byteSize: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    blockReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attachment =
      (await ctx.db.get(args.attachmentId)) ??
      fail('NOT_FOUND', 'Attachment was not found');
    if (attachment.state !== 'processing') return null;
    if (args.blockReason) {
      await ctx.db.patch(attachment._id, {
        state: 'blocked',
        blockReason: boundedText(args.blockReason, 500),
        updatedAt: Date.now(),
      });
      return null;
    }
    if (
      !args.storageId ||
      !args.verifiedType ||
      !args.byteSize ||
      !args.width ||
      !args.height ||
      ![args.byteSize, args.width, args.height].every(
        (value) => Number.isSafeInteger(value) && value > 0,
      ) ||
      args.byteSize > OPERATOR_WORK_LIMITS.attachmentBytes ||
      Math.max(args.width, args.height) > OPERATOR_WORK_LIMITS.previewWidth ||
      args.width * args.height > OPERATOR_WORK_LIMITS.attachmentPixels
    )
      return fail(
        'VALIDATION_ERROR',
        'Regenerated preview metadata exceeds bounds',
      );
    const metadata = await ctx.db.system.get(args.storageId);
    if (
      !metadata ||
      metadata.size !== args.byteSize ||
      metadata.contentType !== args.verifiedType
    )
      return fail(
        'VALIDATION_ERROR',
        'Private stored preview metadata does not match',
      );
    await ctx.db.patch(attachment._id, {
      state: 'ready',
      storageId: args.storageId,
      verifiedType: args.verifiedType,
      byteSize: args.byteSize,
      width: args.width,
      height: args.height,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const survey = internalQuery({
  args: { environmentKey: v.string(), tokenHash: v.string() },
  returns: v.union(
    v.object({
      productName: v.string(),
      question: v.string(),
      rating: v.union(feedbackRatingValidator, v.null()),
      submitted: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const environment = await environmentByKey(ctx, args.environmentKey);
    const feedback = await ctx.db
      .query('feedbackRecords')
      .withIndex('by_token_hash', (index) =>
        index.eq('tokenHash', args.tokenHash),
      )
      .unique();
    if (
      !feedback ||
      feedback.environmentId !== environment._id ||
      !feedback.activatedAt ||
      !feedback.expiresAt ||
      feedback.expiresAt <= Date.now()
    )
      return null;
    const delivery = feedback.deliveryId
      ? await ctx.db.get(feedback.deliveryId)
      : null;
    if (!delivery || !['accepted', 'delivered'].includes(delivery.state))
      return null;
    return {
      productName:
        environment.operatorWork?.presentation.productName ??
        environment.businessName,
      question: feedback.question,
      rating: feedback.rating ?? null,
      submitted: feedback.submittedAt !== undefined,
    };
  },
});
export const submitSurvey = internalMutation({
  args: {
    environmentKey: v.string(),
    tokenHash: v.string(),
    rating: feedbackRatingValidator,
    comment: v.optional(v.string()),
  },
  returns: v.object({ submitted: v.literal(true) }),
  handler: async (ctx, args) => {
    const environment = await environmentByKey(ctx, args.environmentKey);
    const feedback = await ctx.db
      .query('feedbackRecords')
      .withIndex('by_token_hash', (index) =>
        index.eq('tokenHash', args.tokenHash),
      )
      .unique();
    if (
      !feedback ||
      feedback.environmentId !== environment._id ||
      !feedback.activatedAt ||
      !feedback.expiresAt ||
      feedback.expiresAt <= Date.now()
    )
      return fail(
        'FORBIDDEN',
        'Survey invitation is not active or has expired',
      );
    const delivery = feedback.deliveryId
      ? await ctx.db.get(feedback.deliveryId)
      : null;
    if (!delivery || !['accepted', 'delivered'].includes(delivery.state))
      return fail('FORBIDDEN', 'Survey answer email has no send evidence');
    await ctx.db.patch(feedback._id, {
      rating: args.rating,
      comment: args.comment?.trim()
        ? boundedText(args.comment, 2_000)
        : undefined,
      submittedAt: Date.now(),
    });
    return { submitted: true as const };
  },
});
export const submitHelperFeedback = internalMutation({
  args: {
    ...helperAccessArgs,
    answerPublicId: v.string(),
    rating: feedbackRatingValidator,
    comment: v.optional(v.string()),
  },
  returns: v.id('feedbackRecords'),
  handler: async (ctx, args) => {
    const { environment, conversation } = await helperAccess(ctx, args);
    const entries = await ctx.db
      .query('conversationEntries')
      .withIndex('by_conversation_created_at', (index) =>
        index.eq('conversationId', conversation._id),
      )
      .order('desc')
      .take(100);
    const answer = entries.find(
      (entry) =>
        entry.publicId === args.answerPublicId &&
        entry.kind === 'bot_answer' &&
        entry.visibility === 'customer',
    );
    if (!answer)
      return fail(
        'FORBIDDEN',
        'Feedback answer is not in the authorized recent helper history',
      );
    const existing = await ctx.db
      .query('feedbackRecords')
      .withIndex('by_answer_evidence_kind', (index) =>
        index.eq('answerEntryId', answer._id).eq('evidenceKind', 'helper'),
      )
      .unique();
    const response = {
      rating: args.rating,
      ...(args.comment?.trim()
        ? { comment: boundedText(args.comment, 2_000) }
        : {}),
      submittedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...response,
        comment: response.comment,
      });
      return existing._id;
    }
    return await ctx.db.insert('feedbackRecords', {
      environmentId: environment._id,
      conversationId: conversation._id,
      answerEntryId: answer._id,
      questionVersion: 1,
      question: effectiveConfiguration(environment).support.surveyQuestion,
      evidenceKind: 'helper',
      createdAt: Date.now(),
      ...response,
    });
  },
});

export const ingestEvent = internalMutation({
  args: {
    environmentKey: v.string(),
    deduplicationId: v.string(),
    name: v.string(),
    version: v.number(),
    occurredAt: v.number(),
    properties: safePropertiesValidator,
    productReference: v.optional(v.string()),
    ...customerIdentityArgs,
  },
  returns: v.object({
    eventId: v.id('businessEvents'),
    duplicate: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const environment = await environmentByKey(ctx, args.environmentKey);
    const configuration = effectiveConfiguration(environment);
    if (
      !args.deduplicationId ||
      args.deduplicationId.length > 128 ||
      !Number.isSafeInteger(args.occurredAt) ||
      args.occurredAt < 0 ||
      args.occurredAt > Date.now() + 5 * 60_000 ||
      (args.productReference && args.productReference.length > 128)
    )
      return fail('VALIDATION_ERROR', 'Business event envelope is invalid');
    const definition = configuration.events.find(
      (item) => item.name === args.name && item.version === args.version,
    );
    if (!definition)
      return fail('FORBIDDEN', 'Business event definition is not registered');
    let properties: typeof args.properties;
    try {
      properties = validateOperationProperties(
        definition.properties,
        args.properties,
      );
    } catch {
      return fail('VALIDATION_ERROR', 'Business event properties are invalid');
    }
    // Only this service-authorized event path derives current membership from
    // trusted Business job identities. Browser helper/contact claims stay exact.
    let membershipPublicId = args.membershipPublicId;
    if (args.userPublicId && args.accountPublicId && !membershipPublicId) {
      const [user, account] = await Promise.all([
        ctx.db
          .query('businessUsers')
          .withIndex('by_environment_public_id', (index) =>
            index
              .eq('environmentId', environment._id)
              .eq('publicId', args.userPublicId!),
          )
          .unique(),
        ctx.db
          .query('accounts')
          .withIndex('by_environment_public_id', (index) =>
            index
              .eq('environmentId', environment._id)
              .eq('publicId', args.accountPublicId!),
          )
          .unique(),
      ]);
      if (!user || !account)
        return fail('FORBIDDEN', 'Event customer scope is not current');
      const membership = await ctx.db
        .query('memberships')
        .withIndex('by_environment_account_user', (index) =>
          index
            .eq('environmentId', environment._id)
            .eq('accountId', account._id)
            .eq('userId', user._id),
        )
        .unique();
      if (!membership)
        return fail('FORBIDDEN', 'Event membership is not current');
      membershipPublicId = membership.publicId;
    }
    const customer = await verifiedCustomer(ctx, environment, {
      ...args,
      membershipPublicId,
    });
    const existing = await ctx.db
      .query('businessEvents')
      .withIndex('by_environment_deduplication', (index) =>
        index
          .eq('environmentId', environment._id)
          .eq('deduplicationId', args.deduplicationId),
      )
      .unique();
    if (existing) {
      if (
        existing.name !== args.name ||
        existing.version !== args.version ||
        existing.userId !== customer.user?._id ||
        existing.accountId !== customer.account?._id ||
        existing.productReference !== args.productReference ||
        JSON.stringify(existing.properties) !== JSON.stringify(properties)
      )
        return fail(
          'CONFLICT',
          'Event idempotency key was reused for different evidence',
        );
      return { eventId: existing._id, duplicate: true };
    }
    return {
      eventId: await ctx.db.insert('businessEvents', {
        environmentId: environment._id,
        deduplicationId: args.deduplicationId,
        name: args.name,
        version: args.version,
        occurredAt: args.occurredAt,
        receivedAt: Date.now(),
        properties,
        ...(customer.user ? { userId: customer.user._id } : {}),
        ...(customer.account ? { accountId: customer.account._id } : {}),
        ...(args.productReference
          ? { productReference: args.productReference }
          : {}),
      }),
      duplicate: false,
    };
  },
});
