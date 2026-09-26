import { z } from 'zod';

import {
  accountPermissionSchema,
  accountPolicyValuesSchema,
  accountRoleSchema,
  businessAccountPolicySchema,
  sessionPolicySchema,
} from './accountPolicy';

export const CUSTOMER_CONTEXT_VERSION = 1 as const;
export const CUSTOMER_AUTH_CONFIGURATION_VERSION = 1 as const;
export const CUSTOMER_AUTH_CALLBACK_PATH = '/_tofler/auth/callback' as const;

export const customerIdentityProviderSchema = z.enum(['google']);
export type CustomerIdentityProvider = z.infer<
  typeof customerIdentityProviderSchema
>;

export const publicIdentifierSchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

export function normalizeHttpsOrigin(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hostname.includes('*') ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.origin !== value
  ) {
    throw new Error('Expected an exact canonical HTTPS origin');
  }
  return url.origin;
}

export const httpsOriginSchema = z
  .string()
  .url()
  .transform((value, context) => {
    try {
      return normalizeHttpsOrigin(value);
    } catch {
      context.addIssue({
        code: 'custom',
        message: 'Expected an exact canonical HTTPS origin',
      });
      return z.NEVER;
    }
  });

export const relativeApplicationPathSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine((value) => value.startsWith('/') && !value.startsWith('//'), {
    message: 'Expected an application-relative path',
  })
  .refine((value) => {
    try {
      const parsed = new URL(value, 'https://relative.invalid');
      return parsed.origin === 'https://relative.invalid';
    } catch {
      return false;
    }
  }, 'Expected a valid application-relative path');

export const businessTransportConfigSchema = z
  .object({
    webOrigins: z.array(httpsOriginSchema).min(1).max(8),
    sessionAdapterBaseUrl: httpsOriginSchema,
    defaultPostLoginPath: relativeApplicationPathSchema,
  })
  .strict()
  .transform((config) => ({
    ...config,
    webOrigins: [...new Set(config.webOrigins)],
  }));

export type BusinessTransportConfig = z.infer<
  typeof businessTransportConfigSchema
>;

export const customerAuthConfigurationSchema = z
  .object({
    version: z.literal(CUSTOMER_AUTH_CONFIGURATION_VERSION),
    enabledProviders: z
      .array(customerIdentityProviderSchema)
      .min(1)
      .max(1)
      .refine((providers) => new Set(providers).size === providers.length, {
        message: 'enabledProviders must not contain duplicates',
      }),
    developmentAutomationEnabled: z.boolean(),
    transport: businessTransportConfigSchema,
    sessionPolicy: sessionPolicySchema,
    accountPolicy: businessAccountPolicySchema,
    accountDefaults: accountPolicyValuesSchema,
  })
  .strict();

export type CustomerAuthConfiguration = z.infer<
  typeof customerAuthConfigurationSchema
>;

export function deriveCustomerAuthCallbackUrl(
  sessionAdapterBaseUrl: string,
): string {
  const origin = normalizeHttpsOrigin(sessionAdapterBaseUrl);
  return new URL(CUSTOMER_AUTH_CALLBACK_PATH, origin).href;
}

export function customerAuthCallbackUrl(
  configuration: CustomerAuthConfiguration,
): string {
  return deriveCustomerAuthCallbackUrl(
    configuration.transport.sessionAdapterBaseUrl,
  );
}

const baseContextClaimsShape = {
  iss: z.string().url(),
  aud: z.string().min(1).max(512),
  sub: publicIdentifierSchema,
  iat: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
  jti: publicIdentifierSchema,
  version: z.literal(CUSTOMER_CONTEXT_VERSION),
  environmentKey: z.string().min(3).max(64),
  sessionId: publicIdentifierSchema,
};

export const onboardingContextClaimsSchema = z
  .object({
    ...baseContextClaimsShape,
    contextType: z.literal('onboarding'),
  })
  .strict()
  .refine((claims) => claims.iat < claims.exp, {
    message: 'iat must be earlier than exp',
    path: ['exp'],
  });

export const accountContextClaimsSchema = z
  .object({
    ...baseContextClaimsShape,
    contextType: z.literal('account'),
    accountId: publicIdentifierSchema,
    membershipId: publicIdentifierSchema,
    role: accountRoleSchema,
    permissions: z.array(accountPermissionSchema).max(16),
  })
  .strict()
  .refine((claims) => claims.iat < claims.exp, {
    message: 'iat must be earlier than exp',
    path: ['exp'],
  });

export const customerContextClaimsSchema = z.union([
  onboardingContextClaimsSchema,
  accountContextClaimsSchema,
]);

export type OnboardingContextClaims = z.infer<
  typeof onboardingContextClaimsSchema
>;
export type AccountContextClaims = z.infer<typeof accountContextClaimsSchema>;
export type CustomerContextClaims = z.infer<typeof customerContextClaimsSchema>;

export const customerAuthErrorCodeSchema = z.enum([
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'ONBOARDING_REQUIRED',
  'FORBIDDEN',
  'CAPACITY_CONFLICT',
  'CONFLICT',
  'INVALID_INPUT',
  'RATE_LIMITED',
  'RETRYABLE_UNAVAILABLE',
]);
export type CustomerAuthErrorCode = z.infer<typeof customerAuthErrorCodeSchema>;

export const customerAuthErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: customerAuthErrorCodeSchema,
        message: z.string().min(1).max(240),
        correlationId: publicIdentifierSchema,
      })
      .strict(),
  })
  .strict();

export type CustomerAuthErrorResponse = z.infer<
  typeof customerAuthErrorResponseSchema
>;
