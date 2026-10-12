import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { internalAction, type MutationCtx } from './_generated/server';
import { tablecardsCustomerSession } from './environment';

const eventName = v.union(
  v.literal('project.saved'),
  v.literal('pdf.export_completed'),
  v.literal('pdf.export_failed'),
  v.literal('ai.batch_completed'),
  v.literal('ai.batch_failed'),
);
type Outcome = {
  name:
    | 'project.saved'
    | 'pdf.export_completed'
    | 'pdf.export_failed'
    | 'ai.batch_completed'
    | 'ai.batch_failed';
  deduplicationId: string;
  occurredAt: number;
  productReference: string;
  userPublicId: string;
  accountPublicId: string;
  properties: Record<string, string | number | boolean>;
};
type Delivery = Outcome & { attempt: number };
const deliverReference = makeFunctionReference<'action', Delivery, null>(
  'operationEvents:deliver',
);

function eventSecret() {
  return process.env.TABLECARDS_OPERATIONS_EVENT_SECRET?.trim() ?? '';
}

// No titles, guest names, prompts, images, storage IDs or raw provider errors.
export function outcomeReason(code: string) {
  return /^[A-Z][A-Z0-9_]{0,79}$/u.test(code) ? code : 'OPERATION_FAILED';
}

export async function queueOperationOutcome(
  ctx: MutationCtx,
  outcome: Outcome,
) {
  if (eventSecret().length < 32) return;
  try {
    await ctx.scheduler.runAfter(0, deliverReference, {
      ...outcome,
      attempt: 1,
    });
  } catch {
    // Reporting is ancillary: never roll back a successful customer operation.
    console.error('TableCards operation outcome could not be queued.');
  }
}

export const deliver = internalAction({
  args: {
    name: eventName,
    deduplicationId: v.string(),
    occurredAt: v.number(),
    productReference: v.string(),
    userPublicId: v.string(),
    accountPublicId: v.string(),
    properties: v.record(
      v.string(),
      v.union(v.string(), v.number(), v.boolean()),
    ),
    attempt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const secret = eventSecret();
    if (
      secret.length < 32 ||
      !Number.isInteger(args.attempt) ||
      args.attempt < 1 ||
      args.attempt > 3
    )
      return null;
    let endpoint: URL;
    try {
      endpoint = new URL(
        '/v1/operations/events',
        tablecardsCustomerSession.bffBaseUrl,
      );
      const base = new URL(tablecardsCustomerSession.bffBaseUrl);
      if (
        base.protocol !== 'https:' ||
        base.username ||
        base.password ||
        base.pathname !== '/' ||
        base.search ||
        base.hash
      )
        return null;
    } catch {
      return null;
    }
    const { attempt, ...outcome } = args;
    let retryable: boolean;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${secret}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ...outcome,
          version: 1,
          environmentKey: tablecardsCustomerSession.environmentKey,
        }),
        signal: AbortSignal.timeout(10_000),
        redirect: 'error',
      });
      retryable = response.status === 429 || response.status >= 500;
      await response.body?.cancel();
      if (response.ok) return null;
    } catch {
      retryable = true;
    }
    if (retryable && attempt < 3) {
      await ctx.scheduler.runAfter(30_000, deliverReference, {
        ...args,
        attempt: attempt + 1,
      });
    } else {
      console.error(
        'TableCards operation outcome reporting stopped without changing product state.',
      );
    }
    return null;
  },
});
