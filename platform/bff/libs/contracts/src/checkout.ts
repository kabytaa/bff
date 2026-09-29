import { z } from 'zod';

import { accountPolicyValuesSchema } from './accountPolicy';
import { customerAuthPresentationSchema, publicIdentifierSchema } from './auth';
import {
  developmentProductAccessGrantRequestSchema,
  productAccessIdempotencyKeySchema,
  productAccessKeySchema,
} from './productAccess';

export const CHECKOUT_VERSION = 1 as const;
export const MOCK_CHECKOUT_TTL_SECONDS = 15 * 60;

export const checkoutOfferSchema = z
  .object({
    key: productAccessKeySchema,
    revision: z.number().int().positive().max(1_000_000),
    displayName: z.string().trim().min(1).max(120),
    priceUsdCents: z.number().int().positive().max(100_000_000),
    billing: z.enum(['one_time', 'monthly']),
  })
  .strict();

export const checkoutReturnUrlSchema = z
  .string()
  .url()
  .max(2_048)
  .superRefine((value, context) => {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) {
      context.addIssue({
        code: 'custom',
        message: 'Checkout return URL must be an HTTPS URL without credentials',
      });
    }
  });

export const createCheckoutRequestSchema = z
  .object({
    idempotencyKey: productAccessIdempotencyKeySchema,
    offer: checkoutOfferSchema,
    grant: developmentProductAccessGrantRequestSchema,
    accountPolicy: accountPolicyValuesSchema,
    returnUrl: checkoutReturnUrlSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.offer.key !== value.grant.offerKey ||
      value.offer.revision !== value.grant.offerRevision
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Offer and grant must identify the same revision',
        path: ['grant'],
      });
    }
  });

export type CreateCheckoutRequest = z.infer<typeof createCheckoutRequestSchema>;

export const checkoutProviderSchema = z.enum(['mock', 'paddle']);

export const createCheckoutResponseSchema = z
  .object({
    provider: checkoutProviderSchema,
    checkoutUrl: z.string().url(),
    expiresAt: z.number().int().positive(),
  })
  .strict();

export type CreateCheckoutResponse = z.infer<
  typeof createCheckoutResponseSchema
>;

export const checkoutStateSchema = z.enum([
  'pending',
  'completed',
  'cancelled',
]);

export const checkoutChallengeSchema = z
  .object({
    version: z.literal(CHECKOUT_VERSION),
    environmentKey: z.string().min(3).max(64),
    reference: publicIdentifierSchema,
    presentation: customerAuthPresentationSchema,
    offer: checkoutOfferSchema,
    state: checkoutStateSchema,
    expiresAt: z.number().int().positive(),
  })
  .strict();

export type CheckoutChallenge = z.infer<typeof checkoutChallengeSchema>;

export const transitionCheckoutRequestSchema = z
  .object({
    environmentKey: z.string().min(3).max(64),
    reference: publicIdentifierSchema,
  })
  .strict();

export const transitionCheckoutResponseSchema = z
  .object({ redirectUrl: checkoutReturnUrlSchema })
  .strict();

export type TransitionCheckoutResponse = z.infer<
  typeof transitionCheckoutResponseSchema
>;
