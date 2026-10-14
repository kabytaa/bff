import { v, type Infer } from 'convex/values';

import {
  operationTextSchema,
  publicIdentifierSchema,
  type OperatorWorkConfiguration,
} from '@bff/contracts';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { randomPublicIdentifier, sha256Base64Url } from './customerCrypto';
import { fail } from './errors';
import {
  actorValidator,
  draftValidator,
  emailEnvelopeValidator,
  entryKindValidator,
  deliveryStateValidator,
  supportStatusValidator,
} from './operatorWorkConfiguration';
import { validateBusinessEnvironmentKey } from './businessEnvironment';

export type OperationsCtx = QueryCtx | MutationCtx;
export type OperationActor = Infer<typeof actorValidator>;
export const systemActor: OperationActor = { kind: 'system', label: 'System' };

export function boundedText(value: string, maximum = 12_000): string {
  const text = operationTextSchema.safeParse(value);
  if (!text.success || text.data.length > maximum)
    return fail(
      'VALIDATION_ERROR',
      'Text is empty or exceeds the permitted length',
    );
  return text.data;
}
export function identifier(value: string): string {
  const result = publicIdentifierSchema.safeParse(value);
  if (!result.success)
    return fail('VALIDATION_ERROR', 'A valid public identifier is required');
  return result.data;
}
export async function environmentByKey(ctx: OperationsCtx, key: string) {
  const environment = await ctx.db
    .query('businessEnvironments')
    .withIndex('by_key', (query) =>
      query.eq('key', validateBusinessEnvironmentKey(key)),
    )
    .unique();
  if (!environment)
    return fail('NOT_FOUND', 'Business environment was not found');
  return environment;
}
export function effectiveConfiguration(
  environment: Doc<'businessEnvironments'>,
): OperatorWorkConfiguration {
  if (!environment.operatorWork?.enabled)
    return fail(
      'CONFIGURATION_ERROR',
      'Operator work is not enabled for this Business environment',
    );
  return environment.operatorWork;
}
export async function conversationById(
  ctx: OperationsCtx,
  environment: Doc<'businessEnvironments'>,
  id: Id<'conversations'>,
) {
  const conversation = await ctx.db.get(id);
  if (!conversation || conversation.environmentId !== environment._id)
    return fail(
      'NOT_FOUND',
      'Conversation was not found in this Business environment',
    );
  return conversation;
}
export async function conversationByPublicId(
  ctx: OperationsCtx,
  environment: Doc<'businessEnvironments'>,
  publicId: string,
) {
  const conversation = await ctx.db
    .query('conversations')
    .withIndex('by_environment_public_id', (query) =>
      query
        .eq('environmentId', environment._id)
        .eq('publicId', identifier(publicId)),
    )
    .unique();
  if (!conversation) return fail('NOT_FOUND', 'Conversation was not found');
  return conversation;
}
export function supportConversation(conversation: Doc<'conversations'>) {
  if (
    conversation.kind !== 'support' ||
    !conversation.subject ||
    !conversation.contactEmail ||
    !conversation.status
  )
    return fail('VALIDATION_ERROR', 'A support conversation is required');
  return conversation;
}
export async function appendEntry(
  ctx: MutationCtx,
  conversation: Doc<'conversations'>,
  input: {
    kind: Infer<typeof entryKindValidator>;
    text: string;
    actor: OperationActor;
    visibility: 'customer' | 'internal';
    createdAt?: number;
    referencedEntryId?: Id<'conversationEntries'>;
    sourceRunId?: Id<'botRuns'>;
    idempotencyKey?: string;
    providerInboundMessageId?: string;
    internetMessageId?: string;
    envelope?: Infer<typeof emailEnvelopeValidator>;
  },
) {
  if (input.referencedEntryId) {
    const referenced = await ctx.db.get(input.referencedEntryId);
    if (
      !referenced ||
      referenced.conversationId !== conversation._id ||
      referenced.environmentId !== conversation.environmentId
    )
      return fail(
        'FORBIDDEN',
        'Referenced message is outside this conversation',
      );
  }
  return await ctx.db.insert('conversationEntries', {
    environmentId: conversation.environmentId,
    conversationId: conversation._id,
    publicId: randomPublicIdentifier('entry'),
    actorKey: `${input.actor.kind}:${input.actor.issuer ?? ''}:${input.actor.subject ?? input.actor.label}`,
    ...input,
    createdAt: input.createdAt ?? Date.now(),
  });
}
export async function createDraft(
  ctx: MutationCtx,
  environment: Doc<'businessEnvironments'>,
  conversation: Doc<'conversations'>,
  text: string,
  actor: OperationActor,
  sourceRunId?: Id<'botRuns'>,
) {
  supportConversation(conversation);
  const configuration = effectiveConfiguration(environment);
  const draft = {
    pendingId: randomPublicIdentifier('pending'),
    to:
      conversation.contactEmail ??
      fail('VALIDATION_ERROR', 'Contact email is required'),
    from: `${configuration.support.fromName} <${configuration.support.fromEmail}>`,
    subject: `Re: ${conversation.subject}`,
    text: boundedText(text),
    state: 'ready' as const,
    updatedAt: Date.now(),
    editor: actor,
    configurationRevision: environment.operatorWorkConfigurationRevision ?? 0,
    ...(sourceRunId ? { sourceRunId } : {}),
  };
  const result = {
    ...draft,
    fingerprint: await sha256Base64Url(JSON.stringify(draft)),
  };
  await ctx.db.patch(conversation._id, {
    currentDraft: result,
    updatedAt: draft.updatedAt,
  });
  return result;
}
export async function invalidateUnstartedSend(
  ctx: MutationCtx,
  conversation: Doc<'conversations'>,
  now: number,
) {
  if (conversation.unstartedDeliveryId) {
    const delivery = await ctx.db.get(conversation.unstartedDeliveryId);
    if (
      delivery &&
      delivery.conversationId === conversation._id &&
      delivery.state === 'queued'
    ) {
      await ctx.db.patch(delivery._id, {
        state: 'cancelled',
        nextAttemptAt: undefined,
        error: 'A new customer message requires fresh review',
        updatedAt: now,
      });
    }
  }
  if (conversation.activeRunId) {
    const run = await ctx.db.get(conversation.activeRunId);
    if (run && !['completed', 'failed', 'stale'].includes(run.state))
      await ctx.db.patch(run._id, {
        state: 'stale',
        error: 'A newer customer message superseded this run',
        updatedAt: now,
      });
  }
  await ctx.db.patch(conversation._id, {
    unstartedDeliveryId: undefined,
    activeRunId: undefined,
    ...(conversation.currentDraft
      ? {
          currentDraft: {
            ...conversation.currentDraft,
            pendingId: randomPublicIdentifier('pending'),
            state: 'needs_review' as const,
            staleReason: 'A new customer message arrived',
            updatedAt: now,
          },
        }
      : {}),
    ...(conversation.kind === 'support'
      ? {
          status: 'open' as const,
          waitingSince:
            conversation.status === 'open'
              ? (conversation.waitingSince ?? now)
              : now,
        }
      : {}),
    updatedAt: now,
  });
}

export const coverageValidator = v.object({
  complete: v.boolean(),
  limit: v.number(),
  sampled: v.number(),
  description: v.string(),
});
export function coverage(
  sampled: number,
  limit: number,
  complete: boolean,
  description = 'Bounded recent evidence; unavailable earlier periods are not zero activity',
) {
  return { sampled, limit, complete, description };
}
export const caseSummaryValidator = v.object({
  id: v.id('conversations'),
  publicId: v.string(),
  environmentKey: v.string(),
  businessName: v.string(),
  subject: v.string(),
  contactEmail: v.string(),
  status: supportStatusValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  waitingSince: v.optional(v.number()),
  draftPendingId: v.optional(v.string()),
  draftState: v.optional(
    v.union(v.literal('ready'), v.literal('needs_review')),
  ),
  deliveryException: v.optional(v.string()),
  displayName: v.optional(v.string()),
});
export async function caseSummary(
  ctx: OperationsCtx,
  conversation: Doc<'conversations'>,
  environment?: Doc<'businessEnvironments'>,
) {
  supportConversation(conversation);
  const business =
    environment ?? (await ctx.db.get(conversation.environmentId));
  if (!business)
    return fail(
      'CONFIGURATION_ERROR',
      'Conversation Business environment is invalid',
    );
  const latestDelivery = await ctx.db
    .query('emailDeliveries')
    .withIndex('by_conversation_created_at', (query) =>
      query.eq('conversationId', conversation._id),
    )
    .order('desc')
    .first();
  const user = conversation.userId
    ? await ctx.db.get(conversation.userId)
    : null;
  return {
    id: conversation._id,
    publicId: conversation.publicId,
    environmentKey: business.key,
    businessName: business.businessName,
    subject:
      conversation.subject ??
      fail('CONFIGURATION_ERROR', 'Support subject is missing'),
    contactEmail:
      conversation.contactEmail ??
      fail('CONFIGURATION_ERROR', 'Support contact is missing'),
    status:
      conversation.status ??
      fail('CONFIGURATION_ERROR', 'Support status is missing'),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    ...(conversation.waitingSince !== undefined
      ? { waitingSince: conversation.waitingSince }
      : {}),
    ...(conversation.currentDraft
      ? {
          draftPendingId: conversation.currentDraft.pendingId,
          draftState: conversation.currentDraft.state,
        }
      : {}),
    ...(latestDelivery &&
    ['failed', 'uncertain', 'bounced', 'complained'].includes(
      latestDelivery.state,
    )
      ? { deliveryException: latestDelivery.error ?? latestDelivery.state }
      : {}),
    ...(user && user.environmentId === business._id
      ? { displayName: user.displayName }
      : {}),
  };
}
export const entryViewValidator = v.object({
  id: v.id('conversationEntries'),
  publicId: v.string(),
  kind: entryKindValidator,
  visibility: v.union(v.literal('customer'), v.literal('internal')),
  text: v.string(),
  actor: actorValidator,
  actorLabel: v.string(),
  createdAt: v.number(),
  referencedEntryId: v.optional(v.id('conversationEntries')),
  envelope: v.optional(emailEnvelopeValidator),
});
export function entryView(entry: Doc<'conversationEntries'>) {
  return {
    id: entry._id,
    publicId: entry.publicId,
    kind: entry.kind,
    visibility: entry.visibility,
    text: entry.text,
    actor: entry.actor,
    actorLabel: entry.actor.label,
    createdAt: entry.createdAt,
    ...(entry.referencedEntryId
      ? { referencedEntryId: entry.referencedEntryId }
      : {}),
    ...(entry.envelope ? { envelope: entry.envelope } : {}),
  };
}
export const deliveryViewValidator = v.object({
  id: v.id('emailDeliveries'),
  entryId: v.id('conversationEntries'),
  state: deliveryStateValidator,
  purpose: v.union(v.literal('reply'), v.literal('receipt')),
  attemptCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
  errorMessage: v.optional(v.string()),
  retryEligible: v.boolean(),
  mocked: v.boolean(),
  envelope: emailEnvelopeValidator,
});
export function deliveryRetryEligible(
  delivery: Doc<'emailDeliveries'>,
  now: number,
) {
  return (
    delivery.state === 'failed' &&
    delivery.retryable === true &&
    delivery.attemptCount < 3 &&
    now - delivery.createdAt < 23 * 60 * 60 * 1_000 &&
    delivery.error !== 'Sending is prohibited for this conversation'
  );
}
export { draftValidator };
