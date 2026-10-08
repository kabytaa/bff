import { z } from 'zod';

import { publicIdentifierSchema } from './auth';

export const PRODUCT_ACCESS_VERSION = 1 as const;
export const UNIT_RESERVATION_TTL_SECONDS = 15 * 60;

export const productAccessKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u);

export const productAccessPeriodKeySchema = z
  .string()
  .min(1)
  .max(96)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u);

export const productAccessIdempotencyKeySchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u);

export const productFeatureFlagSchema = z
  .object({ key: productAccessKeySchema, enabled: z.boolean() })
  .strict();

export const productNumericLimitSchema = z
  .object({
    key: productAccessKeySchema,
    value: z.number().int().nonnegative().max(1_000_000_000),
  })
  .strict();

export const productUnitGrantSchema = z
  .object({
    unitType: productAccessKeySchema,
    periodKey: productAccessPeriodKeySchema,
    allowance: z.number().int().nonnegative().max(1_000_000_000),
  })
  .strict();

function boundedUniqueEntries<T extends { key: string }>(schema: z.ZodType<T>) {
  return z
    .array(schema)
    .max(64)
    .superRefine((entries, context) => {
      const keys = new Set<string>();
      for (const [index, entry] of entries.entries()) {
        if (keys.has(entry.key)) {
          context.addIssue({
            code: 'custom',
            message: 'Keys must be unique',
            path: [index, 'key'],
          });
        }
        keys.add(entry.key);
      }
    });
}

const featureFlagsSchema = boundedUniqueEntries(productFeatureFlagSchema);
const numericLimitsSchema = boundedUniqueEntries(productNumericLimitSchema);
const unitGrantsSchema = z
  .array(productUnitGrantSchema)
  .max(32)
  .superRefine((entries, context) => {
    const keys = new Set<string>();
    for (const [index, entry] of entries.entries()) {
      const key = `${entry.unitType}\u0000${entry.periodKey}`;
      if (keys.has(key)) {
        context.addIssue({
          code: 'custom',
          message: 'Unit grants must be unique by unit type and period',
          path: [index],
        });
      }
      keys.add(key);
    }
  });

const developmentProductUnitGrantSchema = z
  .object({
    unitType: productAccessKeySchema,
    allowance: z.number().int().nonnegative().max(1_000_000_000),
    allocation: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('monthly') }).strict(),
      z
        .object({
          kind: z.literal('fixed'),
          key: productAccessPeriodKeySchema,
        })
        .strict(),
    ]),
  })
  .strict();

const developmentProductUnitGrantsSchema = z
  .array(developmentProductUnitGrantSchema)
  .max(32)
  .superRefine((entries, context) => {
    const unitTypes = new Set<string>();
    for (const [index, entry] of entries.entries()) {
      if (unitTypes.has(entry.unitType)) {
        context.addIssue({
          code: 'custom',
          message: 'Development unit grants must be unique by unit type',
          path: [index, 'unitType'],
        });
      }
      unitTypes.add(entry.unitType);
    }
  });

export const productAccessSourceSchema = z.enum([
  'default',
  'development_mock',
  'provider',
]);

export const productAccessProjectionSchema = z
  .object({
    version: z.literal(PRODUCT_ACCESS_VERSION),
    accountId: publicIdentifierSchema,
    offerKey: productAccessKeySchema,
    offerRevision: z.number().int().positive().max(1_000_000),
    source: productAccessSourceSchema,
    featureFlags: featureFlagsSchema,
    numericLimits: numericLimitsSchema,
    unitGrants: unitGrantsSchema,
    effectiveAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

export type ProductAccessProjection = z.infer<
  typeof productAccessProjectionSchema
>;

export const developmentProductAccessGrantRequestSchema = z
  .object({
    offerKey: productAccessKeySchema,
    offerRevision: z.number().int().positive().max(1_000_000),
    featureFlags: featureFlagsSchema,
    numericLimits: numericLimitsSchema,
    unitGrants: developmentProductUnitGrantsSchema,
  })
  .strict();

export type DevelopmentProductAccessGrantRequest = z.infer<
  typeof developmentProductAccessGrantRequestSchema
>;

// Trusted Business backends initialize fixed Free allocations. This is not
// a browser-selected offer, a renewable subscription or an access replacement.
export const defaultProductAccessGrantRequestSchema = z
  .object({
    offerKey: productAccessKeySchema,
    offerRevision: z.number().int().positive().max(1_000_000),
    featureFlags: featureFlagsSchema,
    numericLimits: numericLimitsSchema,
    unitGrants: unitGrantsSchema.refine(
      (entries) =>
        new Set(entries.map((entry) => entry.unitType)).size === entries.length,
      { message: 'Default unit grants must be unique by unit type' },
    ),
  })
  .strict();

export type DefaultProductAccessGrantRequest = z.infer<
  typeof defaultProductAccessGrantRequestSchema
>;

export const unitBalanceRequestSchema = z
  .object({
    unitType: productAccessKeySchema,
  })
  .strict();

export type UnitBalanceRequest = z.infer<typeof unitBalanceRequestSchema>;

export const unitBalanceSchema = z
  .object({
    accountId: publicIdentifierSchema,
    unitType: productAccessKeySchema,
    periodKey: productAccessPeriodKeySchema,
    allowance: z.number().int().nonnegative(),
    reserved: z.number().int().nonnegative(),
    consumed: z.number().int().nonnegative(),
    available: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

export type UnitBalance = z.infer<typeof unitBalanceSchema>;

export const reserveUnitsRequestSchema = unitBalanceRequestSchema
  .extend({
    amount: z.number().int().positive().max(1_000_000),
    idempotencyKey: productAccessIdempotencyKeySchema,
  })
  .strict();

export type ReserveUnitsRequest = z.infer<typeof reserveUnitsRequestSchema>;

export const unitReservationStateSchema = z.enum([
  'reserved',
  'committed',
  'released',
  'expired',
]);

export const unitReservationSchema = z
  .object({
    id: publicIdentifierSchema,
    unitType: productAccessKeySchema,
    periodKey: productAccessPeriodKeySchema,
    amount: z.number().int().positive(),
    state: unitReservationStateSchema,
    expiresAt: z.number().int().nonnegative(),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

export type UnitReservation = z.infer<typeof unitReservationSchema>;

export const unitReservationResultSchema = z
  .object({
    reservation: unitReservationSchema,
    balance: unitBalanceSchema,
  })
  .strict();

export type UnitReservationResult = z.infer<typeof unitReservationResultSchema>;

export const transitionUnitReservationRequestSchema = z
  .object({
    reservationId: publicIdentifierSchema,
    idempotencyKey: productAccessIdempotencyKeySchema,
  })
  .strict();

export type TransitionUnitReservationRequest = z.infer<
  typeof transitionUnitReservationRequestSchema
>;

export const productAccessErrorCodeSchema = z.enum([
  'UNAUTHENTICATED',
  'ONBOARDING_REQUIRED',
  'FORBIDDEN',
  'CONFLICT',
  'INVALID_INPUT',
  'UNIT_EXHAUSTED',
  'RETRYABLE_UNAVAILABLE',
]);

export type ProductAccessErrorCode = z.infer<
  typeof productAccessErrorCodeSchema
>;

export const productAccessErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: productAccessErrorCodeSchema,
        message: z.string().min(1).max(240),
        correlationId: publicIdentifierSchema,
      })
      .strict(),
  })
  .strict();

export type ProductAccessErrorResponse = z.infer<
  typeof productAccessErrorResponseSchema
>;
