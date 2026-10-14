import { z } from 'zod';

import { publicIdentifierSchema, relativeApplicationPathSchema } from './auth';

export const OPERATOR_WORK_CONFIGURATION_VERSION = 1 as const;
export const OPERATOR_WORK_MODEL_KEYS = ['qwen3-30b', 'gemma4-26b'] as const;
export const OPERATOR_WORK_LIMITS = {
  text: 12_000,
  note: 4_000,
  configurationBytes: 180_000,
  history: 100,
  overview: 200,
  kpiEvents: 500,
  attachments: 3,
  attachmentBytes: 5 * 1024 * 1024,
  attachmentPixels: 20_000_000,
  previewWidth: 1_600,
  runAttempts: 3,
} as const;

export const operationKeySchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z][a-z0-9_.-]*$/);
export const supportStatusSchema = z.enum([
  'open',
  'waiting_for_customer',
  'resolved',
]);
export type SupportStatus = z.infer<typeof supportStatusSchema>;
export const feedbackRatingSchema = z.enum(['yes', 'partly', 'no']);
export type FeedbackRating = z.infer<typeof feedbackRatingSchema>;
export const operationTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(OPERATOR_WORK_LIMITS.text);
export const operationEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(254);
const safeHeader = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => !/[\r\n]/.test(value));
const versionSchema = z.number().int().min(1).max(1_000_000);
export const safePropertyValueSchema = z.union([
  z.string().max(2_000),
  z.number().finite(),
  z.boolean(),
]);
export const safePropertiesSchema = z
  .record(operationKeySchema, safePropertyValueSchema)
  .refine((value) => Object.keys(value).length <= 20, 'Too many properties');
export type SafeProperties = z.infer<typeof safePropertiesSchema>;

export const operationPropertyDescriptorSchema = z
  .object({
    name: operationKeySchema,
    type: z.enum(['string', 'number', 'boolean']),
    required: z.boolean(),
    maxLength: z.number().int().min(1).max(2_000).optional(),
    allowedValues: z.array(z.string().max(120)).max(30).optional(),
  })
  .strict();
export type OperationPropertyDescriptor = z.infer<
  typeof operationPropertyDescriptorSchema
>;

const descriptors = z
  .array(operationPropertyDescriptorSchema)
  .max(20)
  .refine(
    (values) => new Set(values.map((item) => item.name)).size === values.length,
    'Duplicate property name',
  );
export const operatorWorkConfigurationSchema = z
  .object({
    version: z.literal(OPERATOR_WORK_CONFIGURATION_VERSION),
    enabled: z.boolean(),
    presentation: z
      .object({
        productName: safeHeader,
        helpUrl: z
          .string()
          .url()
          .max(2_048)
          .refine((value) => new URL(value).protocol === 'https:'),
        contactEmail: operationEmailSchema,
        accentColor: z
          .string()
          .regex(/^#[a-fA-F0-9]{6}$/)
          .optional(),
      })
      .strict(),
    support: z
      .object({
        botKey: operationKeySchema,
        fromEmail: operationEmailSchema,
        fromName: safeHeader,
        receivingAddress: operationEmailSchema,
        replyDomain: z
          .string()
          .min(3)
          .max(253)
          .regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/),
        receiptText: operationTextSchema,
        surveyQuestion: z.string().trim().min(1).max(500),
      })
      .strict(),
    bots: z
      .array(
        z
          .object({
            key: operationKeySchema,
            name: safeHeader,
            version: versionSchema,
            kind: z.enum(['helper', 'support']),
            instructions: z.string().trim().min(1).max(20_000),
            skillKeys: z.array(operationKeySchema).max(20),
            model: z.enum(OPERATOR_WORK_MODEL_KEYS),
            knowledgeSelection: z
              .object({
                strategy: z.enum(['inline', 'jev']),
                mandatorySkillKeys: z.array(operationKeySchema).max(20),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .min(1)
      .max(10),
    skills: z
      .array(
        z
          .object({
            key: operationKeySchema,
            version: versionSchema,
            name: safeHeader,
            whenToUse: z.string().trim().min(1).max(1_000),
            content: z.string().trim().min(1).max(20_000),
          })
          .strict(),
      )
      .max(30),
    events: z
      .array(
        z
          .object({
            name: operationKeySchema,
            version: versionSchema,
            label: safeHeader,
            properties: descriptors,
          })
          .strict(),
      )
      .max(40),
    kpis: z
      .array(
        z
          .object({
            key: operationKeySchema,
            label: safeHeader,
            description: z.string().trim().min(1).max(500),
            measure: z.enum(['event_count', 'active_customers']),
            eventNames: z.array(operationKeySchema).min(1).max(10),
          })
          .strict(),
      )
      .max(6)
      .optional(),
    pageCapabilities: z
      .array(
        z
          .object({
            name: operationKeySchema,
            description: z.string().trim().min(1).max(1_000),
            arguments: descriptors,
            result: descriptors,
            destination: relativeApplicationPathSchema.optional(),
          })
          .strict(),
      )
      .max(20),
  })
  .strict()
  .superRefine((configuration, ctx) => {
    for (const [field, keys] of [
      ['bots', configuration.bots.map((item) => item.key)],
      ['skills', configuration.skills.map((item) => item.key)],
      ['kpis', (configuration.kpis ?? []).map((item) => item.key)],
      [
        'events',
        configuration.events.map((item) => `${item.name}:${item.version}`),
      ],
      [
        'pageCapabilities',
        configuration.pageCapabilities.map((item) => item.name),
      ],
    ] as const) {
      if (new Set(keys).size !== keys.length)
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: 'Duplicate definition',
        });
    }
    const supportBot = configuration.bots.find(
      (bot) => bot.key === configuration.support.botKey,
    );
    if (supportBot?.kind !== 'support')
      ctx.addIssue({
        code: 'custom',
        path: ['support', 'botKey'],
        message: 'A registered support bot is required',
      });
    const assignedSkills = new Set(
      configuration.skills.map((skill) => skill.key),
    );
    const eventNames = new Set(configuration.events.map((event) => event.name));
    for (const kpi of configuration.kpis ?? []) {
      if (
        new Set(kpi.eventNames).size !== kpi.eventNames.length ||
        kpi.eventNames.some((name) => !eventNames.has(name))
      )
        ctx.addIssue({
          code: 'custom',
          path: ['kpis'],
          message: 'KPI events must be registered and unique',
        });
    }
    for (const bot of configuration.bots) {
      if (
        new Set(bot.skillKeys).size !== bot.skillKeys.length ||
        bot.skillKeys.some((key) => !assignedSkills.has(key))
      )
        ctx.addIssue({
          code: 'custom',
          path: ['bots'],
          message: 'Assigned skills must be registered and unique',
        });
      const mandatoryKeys = bot.knowledgeSelection?.mandatorySkillKeys ?? [];
      if (
        bot.knowledgeSelection?.strategy === 'jev' &&
        (bot.skillKeys.length > 16 || mandatoryKeys.length > 16)
      )
        ctx.addIssue({
          code: 'custom',
          path: ['bots'],
          message: 'Jev supports at most 16 assigned knowledge sections',
        });
      if (
        new Set(mandatoryKeys).size !== mandatoryKeys.length ||
        mandatoryKeys.some((key) => !bot.skillKeys.includes(key))
      )
        ctx.addIssue({
          code: 'custom',
          path: ['bots'],
          message:
            'Mandatory knowledge must be assigned to this bot and unique',
        });
    }
    if (
      new TextEncoder().encode(JSON.stringify(configuration)).byteLength >
      OPERATOR_WORK_LIMITS.configurationBytes
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Configuration exceeds the byte limit',
      });
  });
export type OperatorWorkConfiguration = z.infer<
  typeof operatorWorkConfigurationSchema
>;

export function validateOperationProperties(
  descriptors: readonly OperationPropertyDescriptor[],
  input: unknown,
): SafeProperties {
  const properties = safePropertiesSchema.parse(input);
  const registered = new Map(
    descriptors.map((descriptor) => [descriptor.name, descriptor]),
  );
  for (const name of Object.keys(properties))
    if (!registered.has(name)) throw new Error(`Unregistered property ${name}`);
  for (const descriptor of descriptors) {
    const value = properties[descriptor.name];
    if (value === undefined) {
      if (descriptor.required)
        throw new Error(`Required property ${descriptor.name}`);
      continue;
    }
    if (typeof value !== descriptor.type)
      throw new Error(`Invalid property type ${descriptor.name}`);
    if (
      typeof value === 'string' &&
      (value.length > (descriptor.maxLength ?? 2_000) ||
        (descriptor.allowedValues !== undefined &&
          !descriptor.allowedValues.includes(value)))
    )
      throw new Error(`Invalid property value ${descriptor.name}`);
  }
  return properties;
}

export const contactRequestSchema = z
  .object({
    subject: z.string().trim().min(1).max(200),
    text: operationTextSchema,
    idempotencyKey: publicIdentifierSchema,
    helperConversationId: publicIdentifierSchema.optional(),
  })
  .strict();
export const helperTurnRequestSchema = z
  .object({
    conversationId: publicIdentifierSchema.optional(),
    anonymousHandle: z.string().min(32).max(128).optional(),
    text: operationTextSchema,
    idempotencyKey: publicIdentifierSchema,
    pageContext: safePropertiesSchema.optional(),
  })
  .strict();
export const clientToolResultSchema = z
  .object({
    conversationId: publicIdentifierSchema,
    runId: publicIdentifierSchema,
    callId: z.string().min(1).max(128),
    name: operationKeySchema,
    pageContextFingerprint: z.string().min(1).max(128),
    result: safePropertiesSchema,
  })
  .strict();

export const operatorWorkSeedSchema = z
  .object({
    cases: z
      .array(
        z
          .object({
            key: operationKeySchema,
            subject: z.string().min(1).max(200),
            contactEmail: operationEmailSchema,
            status: supportStatusSchema,
            userPublicId: publicIdentifierSchema.optional(),
            accountPublicId: publicIdentifierSchema.optional(),
            createdAt: z.number().int().positive(),
            entries: z
              .array(
                z
                  .object({
                    kind: z.enum([
                      'customer_message',
                      'operator_note',
                      'outgoing_reply',
                      'bot_answer',
                      'status_change',
                    ]),
                    text: operationTextSchema,
                    actorLabel: safeHeader,
                    createdAt: z.number().int().positive(),
                    deliveryState: z
                      .enum([
                        'accepted',
                        'delivered',
                        'failed',
                        'uncertain',
                        'bounced',
                        'complained',
                      ])
                      .optional(),
                  })
                  .strict(),
              )
              .min(1)
              .max(30),
            draft: operationTextSchema.optional(),
          })
          .strict(),
      )
      .max(50),
    events: z
      .array(
        z
          .object({
            key: operationKeySchema,
            name: operationKeySchema,
            version: versionSchema,
            occurredAt: z.number().int().positive(),
            properties: safePropertiesSchema,
          })
          .strict(),
      )
      .max(100)
      .optional(),
  })
  .strict();
export type OperatorWorkSeed = z.infer<typeof operatorWorkSeedSchema>;
