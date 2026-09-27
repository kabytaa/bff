import { z } from 'zod';

import { publicIdentifierSchema } from './auth';

export const CUSTOMER_DEVELOPMENT_GRANT_VERSION = 1 as const;
export const CUSTOMER_DEVELOPMENT_GRANT_TTL_SECONDS = 120 as const;
export const CUSTOMER_DEVELOPMENT_AUTH_PATH =
  '/v1/auth/transactions/development' as const;

export const customerDevelopmentCapabilitySchema = z.enum([
  'signup',
  'login_as',
  'ownership_transfer',
]);
export type CustomerDevelopmentCapability = z.infer<
  typeof customerDevelopmentCapabilitySchema
>;

const environmentKeySchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const personaIdSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const baseClaims = {
  iss: z.string().url(),
  aud: z.string().url(),
  sub: z.string().min(1).max(256),
  iat: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
  jti: publicIdentifierSchema,
  version: z.literal(CUSTOMER_DEVELOPMENT_GRANT_VERSION),
  lane: z.literal('development'),
  environmentKey: environmentKeySchema,
  transactionReference: publicIdentifierSchema,
};

export const customerDevelopmentGrantClaimsSchema = z.discriminatedUnion(
  'capability',
  [
    z
      .object({
        ...baseClaims,
        capability: z.literal('signup'),
        personaId: personaIdSchema,
        profile: z
          .object({
            verifiedEmail: z
              .string()
              .trim()
              .toLowerCase()
              .email()
              .max(320)
              .refine((value) => value.endsWith('.invalid'), {
                message: 'Development signup email must use .invalid',
              }),
            displayName: z.string().trim().min(1).max(120),
            pictureUrl: z.string().url().max(2_048).optional(),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...baseClaims,
        capability: z.literal('login_as'),
        userId: publicIdentifierSchema,
      })
      .strict(),
    z
      .object({
        ...baseClaims,
        capability: z.literal('ownership_transfer'),
        userId: publicIdentifierSchema,
      })
      .strict(),
  ],
);

export type CustomerDevelopmentGrantClaims = z.infer<
  typeof customerDevelopmentGrantClaimsSchema
>;

export function customerDevelopmentAudience(bffSiteUrl: string): string {
  const url = new URL(bffSiteUrl);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('Expected an exact HTTPS BFF site origin');
  }
  return new URL(CUSTOMER_DEVELOPMENT_AUTH_PATH, url.origin).href;
}
