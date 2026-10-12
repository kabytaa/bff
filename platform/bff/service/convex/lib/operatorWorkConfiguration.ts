import { v } from 'convex/values';

import {
  operatorWorkConfigurationSchema,
  type OperatorWorkConfiguration,
} from '@bff/contracts';
import { fail } from './errors';

export const safePropertiesValidator = v.record(
  v.string(),
  v.union(v.string(), v.number(), v.boolean()),
);
export const operationPropertyDescriptorValidator = v.object({
  name: v.string(),
  type: v.union(v.literal('string'), v.literal('number'), v.literal('boolean')),
  required: v.boolean(),
  maxLength: v.optional(v.number()),
  allowedValues: v.optional(v.array(v.string())),
});
export const operatorKnowledgeSelectionValidator = v.object({
  strategy: v.union(v.literal('inline'), v.literal('jev')),
  mandatorySkillKeys: v.array(v.string()),
});
export const operatorWorkConfigurationValidator = v.object({
  version: v.literal(1),
  enabled: v.boolean(),
  presentation: v.object({
    productName: v.string(),
    helpUrl: v.string(),
    contactEmail: v.string(),
    accentColor: v.optional(v.string()),
  }),
  support: v.object({
    botKey: v.string(),
    fromEmail: v.string(),
    fromName: v.string(),
    receivingAddress: v.string(),
    replyDomain: v.string(),
    receiptText: v.string(),
    surveyQuestion: v.string(),
  }),
  bots: v.array(
    v.object({
      key: v.string(),
      name: v.string(),
      version: v.number(),
      kind: v.union(v.literal('helper'), v.literal('support')),
      instructions: v.string(),
      skillKeys: v.array(v.string()),
      model: v.union(v.literal('qwen3-30b'), v.literal('gemma4-26b')),
      knowledgeSelection: v.optional(operatorKnowledgeSelectionValidator),
    }),
  ),
  skills: v.array(
    v.object({
      key: v.string(),
      version: v.number(),
      name: v.string(),
      whenToUse: v.string(),
      content: v.string(),
    }),
  ),
  events: v.array(
    v.object({
      name: v.string(),
      version: v.number(),
      label: v.string(),
      properties: v.array(operationPropertyDescriptorValidator),
    }),
  ),
  kpis: v.optional(
    v.array(
      v.object({
        key: v.string(),
        label: v.string(),
        description: v.string(),
        measure: v.union(
          v.literal('event_count'),
          v.literal('active_customers'),
        ),
        eventNames: v.array(v.string()),
      }),
    ),
  ),
  pageCapabilities: v.array(
    v.object({
      name: v.string(),
      description: v.string(),
      arguments: v.array(operationPropertyDescriptorValidator),
      result: v.array(operationPropertyDescriptorValidator),
      destination: v.optional(v.string()),
    }),
  ),
});

export function validateOperatorWorkConfiguration(
  input: OperatorWorkConfiguration,
): OperatorWorkConfiguration {
  const parsed = operatorWorkConfigurationSchema.safeParse(input);
  if (!parsed.success)
    return fail('VALIDATION_ERROR', 'Operator work configuration is invalid');
  return parsed.data;
}

export const supportStatusValidator = v.union(
  v.literal('open'),
  v.literal('waiting_for_customer'),
  v.literal('resolved'),
);
export const actorValidator = v.object({
  kind: v.union(
    v.literal('operator'),
    v.literal('customer'),
    v.literal('bot'),
    v.literal('system'),
  ),
  label: v.string(),
  issuer: v.optional(v.string()),
  subject: v.optional(v.string()),
  email: v.optional(v.string()),
});
export const emailEnvelopeValidator = v.object({
  from: v.string(),
  to: v.string(),
  replyTo: v.string(),
  subject: v.string(),
  text: v.string(),
  html: v.optional(v.string()),
  headers: v.array(v.object({ name: v.string(), value: v.string() })),
  feedbackUrl: v.optional(v.string()),
  attachmentIds: v.array(v.id('supportAttachments')),
});
export const draftValidator = v.object({
  pendingId: v.string(),
  fingerprint: v.string(),
  to: v.string(),
  from: v.string(),
  subject: v.string(),
  text: v.string(),
  state: v.union(v.literal('ready'), v.literal('needs_review')),
  updatedAt: v.number(),
  editor: actorValidator,
  sourceRunId: v.optional(v.id('botRuns')),
  configurationRevision: v.number(),
  staleReason: v.optional(v.string()),
  envelope: v.optional(emailEnvelopeValidator),
  closing: v.optional(v.boolean()),
  replyTokenHash: v.optional(v.string()),
  feedbackTokenHash: v.optional(v.string()),
});
export const entryKindValidator = v.union(
  v.literal('customer_message'),
  v.literal('operator_note'),
  v.literal('outgoing_reply'),
  v.literal('receipt'),
  v.literal('bot_answer'),
  v.literal('status_change'),
  v.literal('draft_changed'),
  v.literal('bot_diagnostic'),
  v.literal('tool_result'),
);
export const deliveryStateValidator = v.union(
  v.literal('queued'),
  v.literal('dispatching'),
  v.literal('accepted'),
  v.literal('delivered'),
  v.literal('failed'),
  v.literal('uncertain'),
  v.literal('cancelled'),
  v.literal('bounced'),
  v.literal('complained'),
);
export const runStateValidator = v.union(
  v.literal('queued'),
  v.literal('running'),
  v.literal('waiting_for_client'),
  v.literal('completed'),
  v.literal('failed'),
  v.literal('stale'),
);
export const attachmentStateValidator = v.union(
  v.literal('pending'),
  v.literal('processing'),
  v.literal('ready'),
  v.literal('blocked'),
);
export const feedbackRatingValidator = v.union(
  v.literal('yes'),
  v.literal('partly'),
  v.literal('no'),
);
