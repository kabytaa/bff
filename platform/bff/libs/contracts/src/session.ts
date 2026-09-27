import { z } from 'zod';

import { currentCustomerViewSchema } from './accounts';

const issuedContextShape = {
  token: z
    .string()
    .min(1)
    .max(16 * 1024),
  expiresAt: z.number().int().positive(),
  customer: currentCustomerViewSchema,
};

export const customerSessionContextResponseSchema = z.discriminatedUnion(
  'status',
  [
    z
      .object({
        status: z.literal('onboarding_required'),
        ...issuedContextShape,
      })
      .strict(),
    z
      .object({
        status: z.literal('account_selection_required'),
        customer: currentCustomerViewSchema,
      })
      .strict(),
    z
      .object({
        status: z.literal('authenticated'),
        accountId: z.string().min(16).max(128),
        ...issuedContextShape,
      })
      .strict(),
  ],
);

export type CustomerSessionContextResponse = z.infer<
  typeof customerSessionContextResponseSchema
>;

export const customerSessionLogoutResponseSchema = z
  .object({ signedOut: z.boolean() })
  .strict();

export type CustomerSessionLogoutResponse = z.infer<
  typeof customerSessionLogoutResponseSchema
>;
