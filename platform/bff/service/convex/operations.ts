import {
  paginationOptsValidator,
  paginationResultValidator,
} from 'convex/server';
import { v } from 'convex/values';

import {
  OPERATOR_WORK_LIMITS,
  operatorWorkSeedSchema,
  validateOperationProperties,
} from '@bff/contracts';
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from './_generated/server';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { requireOperator } from './lib/authorization';
import {
  randomOpaqueSecret,
  randomPublicIdentifier,
  sha256Base64Url,
} from './lib/customerCrypto';
import { fail } from './lib/errors';
import {
  attachmentStateValidator,
  draftValidator,
  feedbackRatingValidator,
  operatorWorkConfigurationValidator,
  safePropertiesValidator,
  runStateValidator,
  supportStatusValidator,
  validateOperatorWorkConfiguration,
} from './lib/operatorWorkConfiguration';
import {
  appendEntry,
  boundedText,
  caseSummary,
  caseSummaryValidator,
  conversationById,
  coverage,
  coverageValidator,
  createDraft,
  deliveryRetryEligible,
  deliveryViewValidator,
  effectiveConfiguration,
  entryView,
  entryViewValidator,
  environmentByKey,
  supportConversation,
  systemActor,
  type OperationActor,
} from './lib/operationsCore';

const scopedConversationArgs = {
  environmentKey: v.string(),
  conversationId: v.id('conversations'),
};
const environmentViewValidator = v.object({
  key: v.string(),
  businessName: v.string(),
  environmentName: v.string(),
  enabled: v.boolean(),
});
const countsValidator = v.object({
  open: v.number(),
  waitingForCustomer: v.number(),
  resolved: v.number(),
  pendingDrafts: v.number(),
  deliveryExceptions: v.number(),
});
const businessEventViewValidator = v.object({
  id: v.id('businessEvents'),
  environmentKey: v.string(),
  name: v.string(),
  label: v.string(),
  version: v.number(),
  occurredAt: v.number(),
  properties: safePropertiesValidator,
  productReference: v.optional(v.string()),
});
function businessEventView(
  event: Doc<'businessEvents'>,
  environment: Doc<'businessEnvironments'>,
) {
  return {
    id: event._id,
    environmentKey: environment.key,
    name: event.name,
    label:
      environment.operatorWork?.events.find(
        (definition) =>
          definition.name === event.name &&
          definition.version === event.version,
      )?.label ?? event.name,
    version: event.version,
    occurredAt: event.occurredAt,
    properties: event.properties,
    ...(event.productReference
      ? { productReference: event.productReference }
      : {}),
  };
}

async function operatorActor(ctx: MutationCtx): Promise<OperationActor> {
  const identity = await requireOperator(ctx);
  return {
    kind: 'operator',
    label: identity.email ?? 'Development operator',
    issuer: identity.issuer,
    subject: identity.subject,
    ...(identity.email ? { email: identity.email } : {}),
  };
}

export const overview = query({
  args: { environmentKey: v.optional(v.string()) },
  returns: v.object({
    environments: v.array(environmentViewValidator),
    cases: v.array(caseSummaryValidator),
    longestWaiting: v.union(caseSummaryValidator, v.null()),
    counts: countsValidator,
    coverage: coverageValidator,
    businessKpis: v.array(
      v.object({
        environmentKey: v.string(),
        businessName: v.string(),
        environmentName: v.string(),
        windowStart: v.number(),
        windowEnd: v.number(),
        complete: v.boolean(),
        metrics: v.array(
          v.object({
            key: v.string(),
            label: v.string(),
            description: v.string(),
            value: v.number(),
            trend: v.array(
              v.object({
                startAt: v.number(),
                endAt: v.number(),
                value: v.number(),
              }),
            ),
          }),
        ),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const environment = args.environmentKey
      ? await environmentByKey(ctx, args.environmentKey)
      : null;
    const environments = environment
      ? [environment]
      : await ctx.db
          .query('businessEnvironments')
          .withIndex('by_key')
          .take(101);
    const windowEnd = Date.now();
    const windowStart = windowEnd - 7 * 24 * 60 * 60 * 1000;
    const kpiEnvironments = environments
      .slice(0, 100)
      .filter((business) => (business.operatorWork?.kpis?.length ?? 0) > 0);
    const recentEvents =
      kpiEnvironments.length === 0
        ? []
        : environment
          ? await ctx.db
              .query('businessEvents')
              .withIndex('by_environment_occurred_at', (index) =>
                index
                  .eq('environmentId', environment._id)
                  .gte('occurredAt', windowStart)
                  .lte('occurredAt', windowEnd),
              )
              .order('desc')
              .take(OPERATOR_WORK_LIMITS.kpiEvents + 1)
          : await ctx.db
              .query('businessEvents')
              .withIndex('by_occurred_at', (index) =>
                index
                  .gte('occurredAt', windowStart)
                  .lte('occurredAt', windowEnd),
              )
              .order('desc')
              .take(OPERATOR_WORK_LIMITS.kpiEvents + 1);
    // One bounded indexed sample for the complete overview, never one growing scan per KPI.
    // In all-Business scope, truncation conservatively marks every group incomplete.
    const kpiEvents = recentEvents.slice(0, OPERATOR_WORK_LIMITS.kpiEvents);
    const businessKpis = kpiEnvironments.map((business) => {
      const events = kpiEvents.filter(
        (event) => event.environmentId === business._id,
      );
      return {
        environmentKey: business.key,
        businessName: business.businessName,
        environmentName: business.environmentName,
        windowStart,
        windowEnd,
        complete: recentEvents.length <= OPERATOR_WORK_LIMITS.kpiEvents,
        metrics: (business.operatorWork?.kpis ?? []).map((definition) => {
          const matching = events.filter((event) =>
            definition.eventNames.includes(event.name),
          );
          const count = (sample: typeof matching) =>
            definition.measure === 'active_customers'
              ? new Set(
                  sample.flatMap((event) =>
                    event.userId ? [event.userId] : [],
                  ),
                ).size
              : sample.length;
          // Seven consecutive 24-hour buckets use the same rolling window and
          // bounded sample as the total. Distinct users are counted separately
          // for each bucket and for the window, never by summing daily uniques.
          const trend = Array.from({ length: 7 }, (_, index) => {
            const startAt = windowStart + index * 86_400_000;
            const endAt = startAt + 86_400_000;
            return {
              startAt,
              endAt,
              value: count(
                matching.filter(
                  (event) =>
                    event.occurredAt >= startAt &&
                    (index === 6
                      ? event.occurredAt <= endAt
                      : event.occurredAt < endAt),
                ),
              ),
            };
          });
          return {
            key: definition.key,
            label: definition.label,
            description: definition.description,
            value: count(matching),
            trend,
          };
        }),
      };
    });
    const conversations = environment
      ? await ctx.db
          .query('conversations')
          .withIndex('by_environment_kind_updated_at', (index) =>
            index.eq('environmentId', environment._id).eq('kind', 'support'),
          )
          .order('desc')
          .take(OPERATOR_WORK_LIMITS.overview + 1)
      : await ctx.db
          .query('conversations')
          .withIndex('by_kind_updated_at', (index) =>
            index.eq('kind', 'support'),
          )
          .order('desc')
          .take(OPERATOR_WORK_LIMITS.overview + 1);
    const cases = await Promise.all(
      conversations
        .slice(0, OPERATOR_WORK_LIMITS.overview)
        .map((conversation) =>
          caseSummary(ctx, conversation, environment ?? undefined),
        ),
    );
    const longestWaiting = environment
      ? await ctx.db
          .query('conversations')
          .withIndex('by_environment_kind_status_waiting', (index) =>
            index
              .eq('environmentId', environment._id)
              .eq('kind', 'support')
              .eq('status', 'open'),
          )
          .order('asc')
          .first()
      : await ctx.db
          .query('conversations')
          .withIndex('by_kind_status_waiting', (index) =>
            index.eq('kind', 'support').eq('status', 'open'),
          )
          .order('asc')
          .first();
    return {
      environments: environments.slice(0, 100).map((business) => ({
        key: business.key,
        businessName: business.businessName,
        environmentName: business.environmentName,
        enabled: business.operatorWork?.enabled ?? false,
      })),
      cases,
      longestWaiting: longestWaiting
        ? await caseSummary(ctx, longestWaiting, environment ?? undefined)
        : null,
      counts: {
        open: cases.filter((item) => item.status === 'open').length,
        waitingForCustomer: cases.filter(
          (item) => item.status === 'waiting_for_customer',
        ).length,
        resolved: cases.filter((item) => item.status === 'resolved').length,
        pendingDrafts: cases.filter((item) => item.draftPendingId).length,
        deliveryExceptions: cases.filter((item) => item.deliveryException)
          .length,
      },
      businessKpis,
      coverage: coverage(
        cases.length,
        OPERATOR_WORK_LIMITS.overview,
        conversations.length <= OPERATOR_WORK_LIMITS.overview &&
          environments.length <= 100,
        'Counts cover the bounded recent support sample, not all-time totals. No earlier history is invented.',
      ),
    };
  },
});

export const cases = query({
  args: {
    environmentKey: v.optional(v.string()),
    status: v.optional(supportStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(caseSummaryValidator),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    if (args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 50)
      return fail('VALIDATION_ERROR', 'Page size must be between 1 and 50');
    const environment = args.environmentKey
      ? await environmentByKey(ctx, args.environmentKey)
      : null;
    const page = environment
      ? args.status
        ? await ctx.db
            .query('conversations')
            .withIndex('by_environment_kind_status_waiting', (index) =>
              index
                .eq('environmentId', environment._id)
                .eq('kind', 'support')
                .eq('status', args.status),
            )
            .order('desc')
            .paginate(args.paginationOpts)
        : await ctx.db
            .query('conversations')
            .withIndex('by_environment_kind_updated_at', (index) =>
              index.eq('environmentId', environment._id).eq('kind', 'support'),
            )
            .order('desc')
            .paginate(args.paginationOpts)
      : args.status
        ? await ctx.db
            .query('conversations')
            .withIndex('by_kind_status_updated_at', (index) =>
              index.eq('kind', 'support').eq('status', args.status),
            )
            .order('desc')
            .paginate(args.paginationOpts)
        : await ctx.db
            .query('conversations')
            .withIndex('by_kind_updated_at', (index) =>
              index.eq('kind', 'support'),
            )
            .order('desc')
            .paginate(args.paginationOpts);
    return {
      ...page,
      page: await Promise.all(
        page.page.map((conversation) =>
          caseSummary(ctx, conversation, environment ?? undefined),
        ),
      ),
    };
  },
});

const attachmentViewValidator = v.object({
  id: v.id('supportAttachments'),
  entryId: v.id('conversationEntries'),
  name: v.string(),
  state: attachmentStateValidator,
  blockReason: v.optional(v.string()),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  byteSize: v.optional(v.number()),
});
const feedbackViewValidator = v.object({
  id: v.id('feedbackRecords'),
  answerEntryId: v.id('conversationEntries'),
  evidenceKind: v.union(
    v.literal('support'),
    v.literal('helper'),
    v.literal('general'),
  ),
  question: v.string(),
  rating: v.optional(feedbackRatingValidator),
  comment: v.optional(v.string()),
  invitedAt: v.optional(v.number()),
  submittedAt: v.optional(v.number()),
  activated: v.boolean(),
});
const linkedCustomerValidator = v.object({
  userId: v.optional(v.string()),
  accountId: v.optional(v.string()),
  displayName: v.optional(v.string()),
  verifiedEmail: v.optional(v.string()),
  accountName: v.optional(v.string()),
});

export const caseDetail = query({
  args: scopedConversationArgs,
  returns: v.object({
    conversation: caseSummaryValidator,
    draft: v.union(draftValidator, v.null()),
    entries: v.array(entryViewValidator),
    deliveries: v.array(deliveryViewValidator),
    attachments: v.array(attachmentViewValidator),
    feedback: v.array(feedbackViewValidator),
    customer: v.union(linkedCustomerValidator, v.null()),
    coverage: coverageValidator,
  }),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const environment = await environmentByKey(ctx, args.environmentKey);
    const conversation = await conversationById(
      ctx,
      environment,
      args.conversationId,
    );
    supportConversation(conversation);
    const [entries, deliveries, attachments, user, account] = await Promise.all(
      [
        ctx.db
          .query('conversationEntries')
          .withIndex('by_conversation_created_at', (index) =>
            index.eq('conversationId', conversation._id),
          )
          .order('desc')
          .take(101),
        ctx.db
          .query('emailDeliveries')
          .withIndex('by_conversation_created_at', (index) =>
            index.eq('conversationId', conversation._id),
          )
          .order('desc')
          .take(51),
        ctx.db
          .query('supportAttachments')
          .withIndex('by_conversation_entry', (index) =>
            index.eq('conversationId', conversation._id),
          )
          .take(51),
        conversation.userId
          ? ctx.db.get(conversation.userId)
          : Promise.resolve(null),
        conversation.accountId
          ? ctx.db.get(conversation.accountId)
          : Promise.resolve(null),
      ],
    );
    const deliveryViews = await Promise.all(
      deliveries.slice(0, 50).map(async (delivery) => {
        const entry = await ctx.db.get(delivery.entryId);
        if (
          !entry?.envelope ||
          entry.environmentId !== environment._id ||
          entry.conversationId !== conversation._id
        )
          return fail('CONFIGURATION_ERROR', 'Delivery envelope is invalid');
        return {
          id: delivery._id,
          entryId: delivery.entryId,
          state: delivery.state,
          purpose: delivery.purpose,
          attemptCount: delivery.attemptCount,
          createdAt: delivery.createdAt,
          updatedAt: delivery.updatedAt,
          retryEligible:
            !conversation.sendingProhibitedAt &&
            deliveryRetryEligible(delivery, Date.now()),
          mocked: delivery.mocked ?? false,
          envelope: entry.envelope,
          ...(delivery.error ? { errorMessage: delivery.error } : {}),
        };
      }),
    );
    const feedback = (
      await Promise.all(
        entries
          .slice(0, 100)
          .filter(
            (entry) =>
              entry.kind === 'outgoing_reply' || entry.kind === 'bot_answer',
          )
          .map((entry) =>
            ctx.db
              .query('feedbackRecords')
              .withIndex('by_answer_evidence_kind', (index) =>
                index.eq('answerEntryId', entry._id),
              )
              .take(3),
          ),
      )
    ).flat();
    if (
      (user && user.environmentId !== environment._id) ||
      (account && account.environmentId !== environment._id)
    )
      return fail('CONFIGURATION_ERROR', 'Linked customer scope is invalid');
    return {
      conversation: await caseSummary(ctx, conversation, environment),
      draft: conversation.currentDraft ?? null,
      entries: entries.slice(0, 100).reverse().map(entryView),
      deliveries: deliveryViews,
      attachments: attachments.slice(0, 50).map((attachment) => ({
        id: attachment._id,
        entryId: attachment.entryId,
        name: attachment.claimedName,
        state: attachment.state,
        ...(attachment.blockReason
          ? { blockReason: attachment.blockReason }
          : {}),
        ...(attachment.width !== undefined ? { width: attachment.width } : {}),
        ...(attachment.height !== undefined
          ? { height: attachment.height }
          : {}),
        ...(attachment.byteSize !== undefined
          ? { byteSize: attachment.byteSize }
          : {}),
      })),
      feedback: feedback.map((record) => ({
        id: record._id,
        answerEntryId: record.answerEntryId,
        evidenceKind: record.evidenceKind,
        question: record.question,
        activated: record.activatedAt !== undefined,
        ...(record.rating ? { rating: record.rating } : {}),
        ...(record.comment ? { comment: record.comment } : {}),
        ...(record.invitedAt !== undefined
          ? { invitedAt: record.invitedAt }
          : {}),
        ...(record.submittedAt !== undefined
          ? { submittedAt: record.submittedAt }
          : {}),
      })),
      customer:
        user || account
          ? {
              ...(user
                ? {
                    userId: user.publicId,
                    displayName: user.displayName,
                    verifiedEmail: user.verifiedEmail,
                  }
                : {}),
              ...(account
                ? {
                    accountId: account.publicId,
                    ...(account.displayName
                      ? { accountName: account.displayName }
                      : {}),
                  }
                : {}),
            }
          : null,
      coverage: coverage(
        Math.min(entries.length, 100),
        100,
        entries.length <= 100 &&
          deliveries.length <= 50 &&
          attachments.length <= 50,
        'Most recent conversation history and related evidence; earlier entries are available through history pagination',
      ),
    };
  },
});

export const caseHistory = query({
  args: { ...scopedConversationArgs, paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(entryViewValidator),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const environment = await environmentByKey(ctx, args.environmentKey);
    const conversation = await conversationById(
      ctx,
      environment,
      args.conversationId,
    );
    if (args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 50)
      return fail('VALIDATION_ERROR', 'Page size must be between 1 and 50');
    const page = await ctx.db
      .query('conversationEntries')
      .withIndex('by_conversation_created_at', (index) =>
        index.eq('conversationId', conversation._id),
      )
      .order('desc')
      .paginate(args.paginationOpts);
    return { ...page, page: page.page.map(entryView) };
  },
});

export const saveDraft = mutation({
  args: {
    ...scopedConversationArgs,
    pendingId: v.optional(v.string()),
    text: v.string(),
  },
  returns: draftValidator,
  handler: async (ctx, args) => {
    const actor = await operatorActor(ctx);
    const environment = await environmentByKey(ctx, args.environmentKey);
    const conversation = await conversationById(
      ctx,
      environment,
      args.conversationId,
    );
    supportConversation(conversation);
    if (args.pendingId !== conversation.currentDraft?.pendingId)
      return fail('CONFLICT', 'The draft changed; refresh before saving');
    const draft = await createDraft(
      ctx,
      environment,
      conversation,
      args.text,
      actor,
    );
    await appendEntry(ctx, conversation, {
      kind: 'draft_changed',
      text: 'Reply draft edited; a new exact Send decision is required',
      actor,
      visibility: 'internal',
    });
    return draft;
  },
});

export const addNote = mutation({
  args: {
    ...scopedConversationArgs,
    text: v.string(),
    referencedEntryId: v.optional(v.id('conversationEntries')),
  },
  returns: v.id('conversationEntries'),
  handler: async (ctx, args) => {
    const actor = await operatorActor(ctx);
    const environment = await environmentByKey(ctx, args.environmentKey);
    const conversation = await conversationById(
      ctx,
      environment,
      args.conversationId,
    );
    supportConversation(conversation);
    const entry = await appendEntry(ctx, conversation, {
      kind: 'operator_note',
      text: boundedText(args.text, 4_000),
      actor,
      visibility: 'internal',
      ...(args.referencedEntryId
        ? { referencedEntryId: args.referencedEntryId }
        : {}),
    });
    await ctx.db.patch(conversation._id, { updatedAt: Date.now() });
    return entry;
  },
});

export const setStatus = mutation({
  args: { ...scopedConversationArgs, status: supportStatusValidator },
  returns: v.object({ status: supportStatusValidator }),
  handler: async (ctx, args) => {
    const actor = await operatorActor(ctx);
    const environment = await environmentByKey(ctx, args.environmentKey);
    const conversation = await conversationById(
      ctx,
      environment,
      args.conversationId,
    );
    supportConversation(conversation);
    if (conversation.status !== args.status) {
      await ctx.db.patch(conversation._id, {
        status: args.status,
        waitingSince: args.status === 'open' ? Date.now() : undefined,
        updatedAt: Date.now(),
      });
      await appendEntry(ctx, conversation, {
        kind: 'status_change',
        text: `Status changed to ${args.status}`,
        actor,
        visibility: 'internal',
      });
    }
    return { status: args.status };
  },
});

const sendResultValidator = v.object({
  deliveryId: v.id('emailDeliveries'),
  entryId: v.id('conversationEntries'),
  state: v.literal('queued'),
});
export const prepareReply = mutation({
  args: {
    ...scopedConversationArgs,
    pendingId: v.string(),
    closing: v.optional(v.boolean()),
  },
  returns: draftValidator,
  handler: async (ctx, args) => {
    await operatorActor(ctx);
    const environment = await environmentByKey(ctx, args.environmentKey);
    const conversation = await conversationById(
      ctx,
      environment,
      args.conversationId,
    );
    supportConversation(conversation);
    const draft = conversation.currentDraft;
    if (!draft || draft.pendingId !== args.pendingId || draft.state !== 'ready')
      return fail(
        'CONFLICT',
        'The current draft needs fresh review before preview',
      );
    const configuration = effectiveConfiguration(environment);
    if (
      draft.configurationRevision !==
      (environment.operatorWorkConfigurationRevision ?? 0)
    )
      return fail(
        'CONFLICT',
        'Sender configuration changed; save and review the draft again',
      );
    const closing = args.closing ?? false;
    if (draft.envelope && draft.closing === closing) return draft;
    // Mail address normalization lowercases the local part; hash those same bytes.
    const replyToken = randomOpaqueSecret(24).toLowerCase();
    const feedbackToken = closing ? randomOpaqueSecret() : null;
    const surveyUrl = new URL(
      '/support/feedback',
      configuration.presentation.helpUrl,
    );
    if (feedbackToken) surveyUrl.searchParams.set('token', feedbackToken);
    const feedbackUrl = feedbackToken ? surveyUrl.href : undefined;
    const text = feedbackUrl
      ? `${draft.text}\n\n${configuration.support.surveyQuestion}\n${feedbackUrl}`
      : draft.text;
    const latestIncoming = conversation.latestCustomerEntryId
      ? await ctx.db.get(conversation.latestCustomerEntryId)
      : null;
    const envelope = {
      from: draft.from,
      to: draft.to,
      replyTo: `reply+${replyToken}@${configuration.support.replyDomain}`,
      subject: draft.subject,
      text,
      headers: latestIncoming?.internetMessageId
        ? [
            {
              name: 'In-Reply-To',
              value: latestIncoming.internetMessageId,
            },
            {
              name: 'References',
              value: latestIncoming.internetMessageId,
            },
          ]
        : [],
      attachmentIds: [],
      ...(feedbackUrl ? { feedbackUrl } : {}),
    };
    const prepared = {
      ...draft,
      pendingId: draft.envelope
        ? randomPublicIdentifier('pending')
        : draft.pendingId,
      envelope,
      closing,
      replyTokenHash: await sha256Base64Url(replyToken),
      ...(feedbackToken
        ? { feedbackTokenHash: await sha256Base64Url(feedbackToken) }
        : {}),
      fingerprint: await sha256Base64Url(JSON.stringify(envelope)),
    };
    await ctx.db.patch(conversation._id, { currentDraft: prepared });
    return prepared;
  },
});
export const sendReply = mutation({
  args: {
    ...scopedConversationArgs,
    pendingId: v.string(),
    closing: v.optional(v.boolean()),
  },
  returns: sendResultValidator,
  handler: async (ctx, args) => {
    const actor = await operatorActor(ctx);
    const environment = await environmentByKey(ctx, args.environmentKey);
    const conversation = await conversationById(
      ctx,
      environment,
      args.conversationId,
    );
    supportConversation(conversation);
    if (conversation.sendingProhibitedAt)
      return fail('FORBIDDEN', 'Sending is prohibited for this conversation');
    const duplicate = await ctx.db
      .query('emailDeliveries')
      .withIndex('by_environment_pending_id', (index) =>
        index
          .eq('environmentId', environment._id)
          .eq('pendingId', args.pendingId),
      )
      .unique();
    if (duplicate)
      return fail('CONFLICT', 'This exact draft already has a Send decision');
    const draft = conversation.currentDraft;
    if (!draft || draft.pendingId !== args.pendingId || draft.state !== 'ready')
      return fail(
        'CONFLICT',
        'The current draft needs fresh review before Send',
      );
    if (conversation.unstartedDeliveryId)
      return fail(
        'CONFLICT',
        'A previously approved reply is queued; wait for dispatch or a new customer message',
      );
    const configuration = effectiveConfiguration(environment);
    if (
      draft.configurationRevision !==
      (environment.operatorWorkConfigurationRevision ?? 0)
    )
      return fail(
        'CONFLICT',
        'Sender configuration changed; save and review the draft again',
      );
    if (
      !draft.envelope ||
      !draft.replyTokenHash ||
      draft.closing !== (args.closing ?? false)
    )
      return fail('CONFLICT', 'Preview the complete exact email before Send');
    const now = Date.now();
    const envelope = draft.envelope;
    const text = envelope.text;
    const entryId = await appendEntry(ctx, conversation, {
      kind: 'outgoing_reply',
      text,
      actor,
      visibility: 'customer',
      envelope,
    });
    const deliveryId = await ctx.db.insert('emailDeliveries', {
      environmentId: environment._id,
      conversationId: conversation._id,
      entryId,
      provider: 'resend',
      purpose: 'reply',
      payloadFingerprint: draft.fingerprint,
      idempotencyKey: randomPublicIdentifier('mail'),
      state: 'queued',
      attemptCount: 0,
      approver: actor,
      approvedAt: now,
      pendingId: draft.pendingId,
      ...(conversation.latestCustomerEntryId
        ? { triggerEntryId: conversation.latestCustomerEntryId }
        : {}),
      replyTokenHash: draft.replyTokenHash,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    });
    if (draft.feedbackTokenHash && draft.closing)
      await ctx.db.insert('feedbackRecords', {
        environmentId: environment._id,
        conversationId: conversation._id,
        answerEntryId: entryId,
        questionVersion: 1,
        question: configuration.support.surveyQuestion,
        evidenceKind: 'support',
        createdAt: now,
        invitedAt: now,
        tokenHash: draft.feedbackTokenHash,
        expiresAt: now + 30 * 24 * 60 * 60 * 1_000,
        deliveryId,
      });
    await ctx.db.patch(conversation._id, {
      unstartedDeliveryId: deliveryId,
      currentDraft: {
        ...draft,
        state: 'needs_review',
        staleReason: 'This exact reply is queued for dispatch',
      },
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.operationsMail.processDelivery, {
      deliveryId,
    });
    return { deliveryId, entryId, state: 'queued' as const };
  },
});

export const retryDelivery = mutation({
  args: {
    environmentKey: v.string(),
    conversationId: v.id('conversations'),
    deliveryId: v.id('emailDeliveries'),
  },
  returns: v.object({
    deliveryId: v.id('emailDeliveries'),
    state: v.literal('queued'),
  }),
  handler: async (ctx, args) => {
    const actor = await operatorActor(ctx);
    const environment = await environmentByKey(ctx, args.environmentKey);
    const conversation = await conversationById(
      ctx,
      environment,
      args.conversationId,
    );
    const delivery = await ctx.db.get(args.deliveryId);
    if (
      !delivery ||
      delivery.environmentId !== environment._id ||
      delivery.conversationId !== conversation._id
    )
      return fail('NOT_FOUND', 'Delivery was not found');
    if (
      conversation.sendingProhibitedAt ||
      !deliveryRetryEligible(delivery, Date.now())
    )
      return fail('CONFLICT', 'This delivery cannot be retried safely');
    await ctx.db.patch(delivery._id, {
      state: 'queued',
      nextAttemptAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.operationsMail.processDelivery, {
      deliveryId: delivery._id,
    });
    await appendEntry(ctx, conversation, {
      kind: 'bot_diagnostic',
      text: 'Operator requested retry of the same immutable email payload and idempotency key',
      actor,
      visibility: 'internal',
    });
    return { deliveryId: delivery._id, state: 'queued' as const };
  },
});

export const bots = query({
  args: { environmentKey: v.optional(v.string()) },
  returns: v.array(
    v.object({
      environmentKey: v.string(),
      businessName: v.string(),
      enabled: v.boolean(),
      configurationRevision: v.number(),
      bots: v.array(
        v.object({
          key: v.string(),
          name: v.string(),
          kind: v.union(v.literal('helper'), v.literal('support')),
          version: v.number(),
          model: v.string(),
          skills: v.array(
            v.object({
              key: v.string(),
              name: v.string(),
              whenToUse: v.string(),
              version: v.number(),
            }),
          ),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const environments = args.environmentKey
      ? [await environmentByKey(ctx, args.environmentKey)]
      : await ctx.db
          .query('businessEnvironments')
          .withIndex('by_key')
          .take(100);
    return environments.map((environment) => ({
      environmentKey: environment.key,
      businessName: environment.businessName,
      enabled: environment.operatorWork?.enabled ?? false,
      configurationRevision: environment.operatorWorkConfigurationRevision ?? 0,
      bots: (environment.operatorWork?.bots ?? []).map((bot) => ({
        key: bot.key,
        name: bot.name,
        kind: bot.kind,
        version: bot.version,
        model: bot.model,
        skills: (environment.operatorWork?.skills ?? [])
          .filter((skill) => bot.skillKeys.includes(skill.key))
          .map((skill) => ({
            key: skill.key,
            name: skill.name,
            whenToUse: skill.whenToUse,
            version: skill.version,
          })),
      })),
    }));
  },
});

export const activity = query({
  args: {
    environmentKey: v.optional(v.string()),
    userPublicId: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(businessEventViewValidator),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    if (args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 50)
      return fail('VALIDATION_ERROR', 'Page size must be between 1 and 50');
    const environment = args.environmentKey
      ? await environmentByKey(ctx, args.environmentKey)
      : null;
    if (args.userPublicId && !environment)
      return fail(
        'VALIDATION_ERROR',
        'Customer activity requires a Business environment',
      );
    const user =
      args.userPublicId && environment
        ? await ctx.db
            .query('businessUsers')
            .withIndex('by_environment_public_id', (index) =>
              index
                .eq('environmentId', environment._id)
                .eq('publicId', args.userPublicId!),
            )
            .unique()
        : null;
    if (args.userPublicId && !user)
      return fail(
        'NOT_FOUND',
        'Customer was not found in this Business environment',
      );
    const page =
      user && environment
        ? await ctx.db
            .query('businessEvents')
            .withIndex('by_environment_user_occurred_at', (index) =>
              index.eq('environmentId', environment._id).eq('userId', user._id),
            )
            .order('desc')
            .paginate(args.paginationOpts)
        : environment
          ? await ctx.db
              .query('businessEvents')
              .withIndex('by_environment_occurred_at', (index) =>
                index.eq('environmentId', environment._id),
              )
              .order('desc')
              .paginate(args.paginationOpts)
          : await ctx.db
              .query('businessEvents')
              .withIndex('by_occurred_at')
              .order('desc')
              .paginate(args.paginationOpts);
    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (event) => {
          const business =
            environment ?? (await ctx.db.get(event.environmentId));
          if (!business)
            return fail('CONFIGURATION_ERROR', 'Event environment is invalid');
          return businessEventView(event, business);
        }),
      ),
    };
  },
});

export const customerDetail = query({
  args: { environmentKey: v.string(), userPublicId: v.string() },
  returns: v.object({
    user: v.object({
      id: v.string(),
      displayName: v.string(),
      verifiedEmail: v.string(),
      isTestUser: v.boolean(),
      createdAt: v.number(),
    }),
    accounts: v.array(
      v.object({
        id: v.string(),
        displayName: v.string(),
        role: v.union(
          v.literal('owner'),
          v.literal('admin'),
          v.literal('member'),
        ),
        offerKey: v.union(v.string(), v.null()),
        featureFlags: v.array(
          v.object({ key: v.string(), enabled: v.boolean() }),
        ),
        numericLimits: v.array(
          v.object({ key: v.string(), value: v.number() }),
        ),
        unitBalances: v.array(
          v.object({
            unitType: v.string(),
            periodKey: v.string(),
            allowance: v.number(),
            reserved: v.number(),
            consumed: v.number(),
          }),
        ),
      }),
    ),
    cases: v.array(caseSummaryValidator),
    events: v.array(businessEventViewValidator),
    eventsComplete: v.boolean(),
    sessions: v.array(
      v.object({
        id: v.string(),
        createdAt: v.number(),
        lastSeenAt: v.number(),
        revoked: v.boolean(),
        expiresAt: v.number(),
      }),
    ),
    security: v.array(
      v.object({
        type: v.string(),
        occurredAt: v.number(),
        correlationId: v.string(),
      }),
    ),
    coverage: coverageValidator,
  }),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const environment = await environmentByKey(ctx, args.environmentKey);
    const user = await ctx.db
      .query('businessUsers')
      .withIndex('by_environment_public_id', (index) =>
        index
          .eq('environmentId', environment._id)
          .eq('publicId', args.userPublicId),
      )
      .unique();
    if (!user)
      return fail(
        'NOT_FOUND',
        'Customer was not found in this Business environment',
      );
    const [memberships, conversations, events, sessions, security] =
      await Promise.all([
        ctx.db
          .query('memberships')
          .withIndex('by_environment_user_account', (index) =>
            index.eq('environmentId', environment._id).eq('userId', user._id),
          )
          .take(21),
        ctx.db
          .query('conversations')
          .withIndex('by_environment_user_updated_at', (index) =>
            index.eq('environmentId', environment._id).eq('userId', user._id),
          )
          .order('desc')
          .take(51),
        ctx.db
          .query('businessEvents')
          .withIndex('by_environment_user_occurred_at', (index) =>
            index.eq('environmentId', environment._id).eq('userId', user._id),
          )
          .order('desc')
          .take(31),
        ctx.db
          .query('businessSessions')
          .withIndex('by_environment_user_created_at', (index) =>
            index.eq('environmentId', environment._id).eq('userId', user._id),
          )
          .order('desc')
          .take(11),
        ctx.db
          .query('securityEvents')
          .withIndex('by_environment_occurred_at', (index) =>
            index.eq('environmentId', environment._id),
          )
          .order('desc')
          .take(101),
      ]);
    let unitsTruncated = false;
    const accounts = await Promise.all(
      memberships.slice(0, 20).map(async (membership) => {
        const account = await ctx.db.get(membership.accountId);
        if (!account || account.environmentId !== environment._id)
          return fail(
            'CONFIGURATION_ERROR',
            'Customer membership scope is invalid',
          );
        const [grant, units] = await Promise.all([
          ctx.db
            .query('accountAccessGrants')
            .withIndex('by_environment_account', (index) =>
              index
                .eq('environmentId', environment._id)
                .eq('accountId', account._id),
            )
            .unique(),
          ctx.db
            .query('accountUnitBuckets')
            .withIndex('by_environment_account', (index) =>
              index
                .eq('environmentId', environment._id)
                .eq('accountId', account._id),
            )
            .take(21),
        ]);
        if (units.length > 20) unitsTruncated = true;
        return {
          id: account.publicId,
          displayName: account.displayName ?? 'Private workspace',
          role: membership.role,
          offerKey: grant?.offerKey ?? null,
          featureFlags: grant?.featureFlags ?? [],
          numericLimits: grant?.numericLimits ?? [],
          unitBalances: units.slice(0, 20).map((bucket) => ({
            unitType: bucket.unitType,
            periodKey: bucket.periodKey,
            allowance: bucket.allowance,
            reserved: bucket.reserved,
            consumed: bucket.consumed,
          })),
        };
      }),
    );
    return {
      user: {
        id: user.publicId,
        displayName: user.displayName,
        verifiedEmail: user.verifiedEmail,
        isTestUser: user.isTestUser === true,
        createdAt: user.createdAt,
      },
      accounts,
      cases: await Promise.all(
        conversations
          .slice(0, 50)
          .filter((conversation) => conversation.kind === 'support')
          .map((conversation) => caseSummary(ctx, conversation, environment)),
      ),
      events: events
        .slice(0, 30)
        .map((event) => businessEventView(event, environment)),
      eventsComplete: events.length <= 30,
      sessions: sessions.slice(0, 10).map((session) => ({
        id: session.publicId,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        revoked: session.revokedAt !== undefined,
        expiresAt: Math.min(session.idleExpiresAt, session.absoluteExpiresAt),
      })),
      security: security
        .slice(0, 100)
        .filter((event) => event.userId === user._id)
        .map((event) => ({
          type: event.type,
          occurredAt: event.occurredAt,
          correlationId: event.correlationId,
        })),
      coverage: coverage(
        Math.min(conversations.length, 50),
        50,
        memberships.length <= 20 &&
          conversations.length <= 50 &&
          events.length <= 30 &&
          sessions.length <= 10 &&
          security.length <= 100 &&
          !unitsTruncated,
        'Bounded linked records. Security covers only the most recent 100 environment events; missing or earlier evidence is unavailable, not zero.',
      ),
    };
  },
});

const runViewValidator = v.object({
  id: v.id('botRuns'),
  publicId: v.string(),
  conversationId: v.id('conversations'),
  environmentKey: v.string(),
  botKey: v.string(),
  botVersion: v.number(),
  configurationRevision: v.number(),
  model: v.string(),
  state: runStateValidator,
  startedAt: v.number(),
  updatedAt: v.number(),
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
  toolUsage: v.array(v.string()),
  error: v.optional(v.string()),
});
export const runs = query({
  args: {
    environmentKey: v.optional(v.string()),
    conversationId: v.optional(v.id('conversations')),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(runViewValidator),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    if (args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 50)
      return fail('VALIDATION_ERROR', 'Page size must be between 1 and 50');
    const environment = args.environmentKey
      ? await environmentByKey(ctx, args.environmentKey)
      : null;
    if (args.conversationId) {
      if (!environment)
        return fail(
          'VALIDATION_ERROR',
          'Conversation run history requires an explicit Business environment',
        );
      await conversationById(ctx, environment, args.conversationId);
    }
    const page = args.conversationId
      ? await ctx.db
          .query('botRuns')
          .withIndex('by_conversation_started_at', (index) =>
            index.eq(
              'conversationId',
              args.conversationId ??
                fail('VALIDATION_ERROR', 'Conversation is required'),
            ),
          )
          .order('desc')
          .paginate(args.paginationOpts)
      : environment
        ? await ctx.db
            .query('botRuns')
            .withIndex('by_environment_started_at', (index) =>
              index.eq('environmentId', environment._id),
            )
            .order('desc')
            .paginate(args.paginationOpts)
        : await ctx.db
            .query('botRuns')
            .withIndex('by_started_at')
            .order('desc')
            .paginate(args.paginationOpts);
    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (run) => {
          const business = environment ?? (await ctx.db.get(run.environmentId));
          if (!business || run.environmentId !== business._id)
            return fail('CONFIGURATION_ERROR', 'Run environment is invalid');
          return {
            id: run._id,
            publicId: run.publicId,
            conversationId: run.conversationId,
            environmentKey: business.key,
            botKey: run.botKey,
            botVersion: run.botVersion,
            configurationRevision: run.configurationRevision,
            model: run.model,
            state: run.state,
            startedAt: run.startedAt,
            updatedAt: run.updatedAt,
            attempts: run.attempts,
            toolUsage: run.toolUsage ?? [],
            ...(run.error ? { error: run.error } : {}),
          };
        }),
      ),
    };
  },
});

export const previewConfiguration = internalQuery({
  args: {
    environmentKey: v.string(),
    configuration: operatorWorkConfigurationValidator,
  },
  returns: v.object({
    environmentKey: v.string(),
    configuration: operatorWorkConfigurationValidator,
    currentRevision: v.number(),
    nextRevision: v.number(),
  }),
  handler: async (ctx, args) => {
    const environment = await environmentByKey(ctx, args.environmentKey);
    const configuration = validateOperatorWorkConfiguration(args.configuration);
    const receiving = await ctx.db
      .query('businessEnvironments')
      .withIndex('by_support_receiving_address', (index) =>
        index.eq(
          'operatorWork.support.receivingAddress',
          configuration.support.receivingAddress,
        ),
      )
      .take(2);
    const reply = await ctx.db
      .query('businessEnvironments')
      .withIndex('by_support_reply_domain', (index) =>
        index.eq(
          'operatorWork.support.replyDomain',
          configuration.support.replyDomain,
        ),
      )
      .take(2);
    if ([...receiving, ...reply].some((item) => item._id !== environment._id))
      return fail(
        'CONFLICT',
        'Mailbox or reply domain is registered to another Business environment',
      );
    const currentRevision = environment.operatorWorkConfigurationRevision ?? 0;
    return {
      environmentKey: environment.key,
      configuration,
      currentRevision,
      nextRevision: currentRevision + 1,
    };
  },
});
export const configure = internalMutation({
  args: {
    environmentKey: v.string(),
    expectedRevision: v.number(),
    configuration: operatorWorkConfigurationValidator,
  },
  returns: v.object({ environmentKey: v.string(), revision: v.number() }),
  handler: async (ctx, args) => {
    const environment = await environmentByKey(ctx, args.environmentKey);
    if (
      !Number.isSafeInteger(args.expectedRevision) ||
      args.expectedRevision !==
        (environment.operatorWorkConfigurationRevision ?? 0)
    )
      return fail('CONFLICT', 'Configuration changed; preview it again');
    const configuration = validateOperatorWorkConfiguration(args.configuration);
    const receiving = await ctx.db
      .query('businessEnvironments')
      .withIndex('by_support_receiving_address', (index) =>
        index.eq(
          'operatorWork.support.receivingAddress',
          configuration.support.receivingAddress,
        ),
      )
      .take(2);
    const reply = await ctx.db
      .query('businessEnvironments')
      .withIndex('by_support_reply_domain', (index) =>
        index.eq(
          'operatorWork.support.replyDomain',
          configuration.support.replyDomain,
        ),
      )
      .take(2);
    if ([...receiving, ...reply].some((item) => item._id !== environment._id))
      return fail(
        'CONFLICT',
        'Mailbox or reply domain is registered to another Business environment',
      );
    await ctx.db.patch(environment._id, {
      operatorWork: configuration,
      operatorWorkConfigurationRevision: args.expectedRevision + 1,
      updatedAt: Date.now(),
    });
    return {
      environmentKey: environment.key,
      revision: args.expectedRevision + 1,
    };
  },
});

export const seedDevelopment = internalMutation({
  args: { environmentKey: v.string(), payload: v.string() },
  returns: v.object({ created: v.number(), existing: v.number() }),
  handler: async (ctx, args) => {
    const environment = await environmentByKey(ctx, args.environmentKey);
    if (
      process.env.BFF_DEVELOPMENT_OPERATOR_WORK_ENABLED !== 'enabled' ||
      !environment.key.endsWith('-development')
    )
      return fail('FORBIDDEN', 'Synthetic seed is development-only');
    effectiveConfiguration(environment);
    if (args.payload.length > 500_000)
      return fail('VALIDATION_ERROR', 'Seed payload exceeds its bound');
    let parsed: ReturnType<typeof operatorWorkSeedSchema.parse>;
    try {
      parsed = operatorWorkSeedSchema.parse(JSON.parse(args.payload));
    } catch {
      return fail('VALIDATION_ERROR', 'Invalid synthetic seed payload');
    }
    let created = 0;
    let existing = 0;
    for (const item of parsed.cases) {
      const publicId = `conversation_seed_${item.key.replace(/[.]/g, '_')}`;
      if (
        await ctx.db
          .query('conversations')
          .withIndex('by_environment_public_id', (index) =>
            index.eq('environmentId', environment._id).eq('publicId', publicId),
          )
          .unique()
      ) {
        existing += 1;
        continue;
      }
      const user = item.userPublicId
        ? await ctx.db
            .query('businessUsers')
            .withIndex('by_environment_public_id', (index) =>
              index
                .eq('environmentId', environment._id)
                .eq('publicId', item.userPublicId ?? ''),
            )
            .unique()
        : null;
      const account = item.accountPublicId
        ? await ctx.db
            .query('accounts')
            .withIndex('by_environment_public_id', (index) =>
              index
                .eq('environmentId', environment._id)
                .eq('publicId', item.accountPublicId ?? ''),
            )
            .unique()
        : null;
      if ((item.userPublicId && !user) || (item.accountPublicId && !account))
        return fail('VALIDATION_ERROR', 'Seed customer linkage was not found');
      if (
        account &&
        (!user ||
          !(await ctx.db
            .query('memberships')
            .withIndex('by_environment_account_user', (index) =>
              index
                .eq('environmentId', environment._id)
                .eq('accountId', account._id)
                .eq('userId', user._id),
            )
            .unique()))
      )
        return fail(
          'FORBIDDEN',
          'Seed account linkage requires a current membership',
        );
      const id = await ctx.db.insert('conversations', {
        environmentId: environment._id,
        publicId,
        kind: 'support',
        botKey: effectiveConfiguration(environment).support.botKey,
        subject: item.subject,
        contactEmail: item.contactEmail,
        channel: 'seed',
        status: item.status,
        ...(item.status === 'open' ? { waitingSince: item.createdAt } : {}),
        ...(user ? { userId: user._id } : {}),
        ...(account ? { accountId: account._id } : {}),
        createdAt: item.createdAt,
        updatedAt: Math.max(
          item.createdAt,
          ...item.entries.map((entry) => entry.createdAt),
        ),
      });
      const conversation = await ctx.db.get(id);
      if (!conversation)
        return fail('CONFIGURATION_ERROR', 'Seed conversation is missing');
      for (const entry of item.entries) {
        const actor: OperationActor = {
          kind:
            entry.kind === 'customer_message'
              ? 'customer'
              : entry.kind === 'bot_answer'
                ? 'bot'
                : 'system',
          label: entry.actorLabel,
        };
        const envelope =
          entry.kind === 'outgoing_reply'
            ? {
                from: 'Synthetic development sender',
                to: item.contactEmail,
                replyTo:
                  effectiveConfiguration(environment).support.receivingAddress,
                subject: `Re: ${item.subject}`,
                text: entry.text,
                headers: [],
                attachmentIds: [],
              }
            : undefined;
        const entryId = await appendEntry(ctx, conversation, {
          kind: entry.kind,
          text: entry.text,
          actor,
          visibility: ['operator_note', 'status_change'].includes(entry.kind)
            ? 'internal'
            : 'customer',
          createdAt: entry.createdAt,
          ...(envelope ? { envelope } : {}),
        });
        if (entry.kind === 'customer_message')
          await ctx.db.patch(id, { latestCustomerEntryId: entryId });
        if (envelope && entry.deliveryState)
          await ctx.db.insert('emailDeliveries', {
            environmentId: environment._id,
            conversationId: id,
            entryId,
            provider: 'resend',
            purpose: 'reply',
            payloadFingerprint: await sha256Base64Url(JSON.stringify(envelope)),
            idempotencyKey: `seed_${item.key}_${entryId}`,
            state: entry.deliveryState,
            attemptCount: 1,
            mocked: true,
            retryable: entry.deliveryState === 'failed',
            approver: actor,
            approvedAt: entry.createdAt,
            replyTokenHash: await sha256Base64Url(`seed_${entryId}`),
            createdAt: entry.createdAt,
            updatedAt: entry.createdAt,
            ...(['failed', 'uncertain', 'bounced', 'complained'].includes(
              entry.deliveryState,
            )
              ? {
                  error:
                    'Synthetic development delivery evidence; no email was sent',
                }
              : {}),
          });
      }
      if (item.draft)
        await createDraft(
          ctx,
          environment,
          conversation,
          item.draft,
          systemActor,
        );
      created += 1;
    }
    // Event definitions are validated by the same generic ingestion implementation.
    for (const event of parsed.events ?? []) {
      const definition = effectiveConfiguration(environment).events.find(
        (item) => item.name === event.name && item.version === event.version,
      );
      if (!definition)
        return fail('VALIDATION_ERROR', 'Seed event is not registered');
      const deduplicationId = `seed_${event.key}`;
      let properties: typeof event.properties;
      try {
        properties = validateOperationProperties(
          definition.properties,
          event.properties,
        );
      } catch {
        return fail('VALIDATION_ERROR', 'Seed event properties are invalid');
      }
      if (
        !(await ctx.db
          .query('businessEvents')
          .withIndex('by_environment_deduplication', (index) =>
            index
              .eq('environmentId', environment._id)
              .eq('deduplicationId', deduplicationId),
          )
          .unique())
      )
        await ctx.db.insert('businessEvents', {
          environmentId: environment._id,
          deduplicationId,
          name: event.name,
          version: event.version,
          occurredAt: event.occurredAt,
          receivedAt: Date.now(),
          properties,
        });
    }
    return { created, existing };
  },
});
