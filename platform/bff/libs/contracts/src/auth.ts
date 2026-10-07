import { z } from 'zod';

import {
  accountPermissionSchema,
  accountPolicyValuesSchema,
  accountRoleSchema,
  businessAccountPolicySchema,
  sessionPolicySchema,
} from './accountPolicy';

export const CUSTOMER_CONTEXT_VERSION = 1 as const;
export const CUSTOMER_AUTH_CONFIGURATION_VERSION = 2 as const;
export const CUSTOMER_AUTH_CALLBACK_PATH = '/_tofler/auth/callback' as const;
export const CUSTOMER_AUTH_CSRF_HEADER = 'X-Tofler-CSRF' as const;
export const CUSTOMER_AUTH_CSRF_HEADER_VALUE = '1' as const;

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

export const customerAuthThemeSchema = z.enum(['light', 'dark', 'system']);
export type CustomerAuthTheme = z.infer<typeof customerAuthThemeSchema>;

export const customerAuthPresentationSchema = z
  .object({
    productName: z.string().trim().min(1).max(80),
    theme: customerAuthThemeSchema,
    accentColor: z
      .string()
      .regex(/^#[0-9A-F]{6}$/u, 'Expected an uppercase #RRGGBB color'),
  })
  .strict();
export type CustomerAuthPresentation = z.infer<
  typeof customerAuthPresentationSchema
>;

export const customerAuthDefaultsSchema = z
  .object({
    definitionRevision: z.number().int().positive(),
    enabledProviders: z
      .array(customerIdentityProviderSchema)
      .min(1)
      .max(1)
      .refine((providers) => new Set(providers).size === providers.length, {
        message: 'enabledProviders must not contain duplicates',
      }),
    presentation: customerAuthPresentationSchema,
    defaultPostLoginPath: relativeApplicationPathSchema,
    sessionPolicy: sessionPolicySchema,
    accountPolicy: businessAccountPolicySchema,
    accountDefaults: accountPolicyValuesSchema,
  })
  .strict();
export type CustomerAuthDefaults = z.infer<typeof customerAuthDefaultsSchema>;

export const businessEnvironmentAuthConfigSchema = z
  .object({
    webOrigins: z.array(httpsOriginSchema).min(1).max(8),
    sessionAdapterBaseUrl: httpsOriginSchema,
    developmentAutomationEnabled: z.boolean(),
  })
  .strict();
export type BusinessEnvironmentAuthConfig = z.infer<
  typeof businessEnvironmentAuthConfigSchema
>;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/** A drift-detection fingerprint, not a cryptographic security primitive. */
export function fingerprintCustomerAuthDefaults(
  defaults: CustomerAuthDefaults,
): string {
  const source = canonicalJson(customerAuthDefaultsSchema.parse(defaults));
  let hash = 0xcbf29ce484222325n;
  for (const character of new TextEncoder().encode(source)) {
    hash ^= BigInt(character);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}

export function defineCustomerAuthDefaults(
  defaults: CustomerAuthDefaults,
): CustomerAuthDefaults {
  return customerAuthDefaultsSchema.parse(defaults);
}

export const customerAuthConfigurationSchema = z
  .object({
    version: z.literal(CUSTOMER_AUTH_CONFIGURATION_VERSION),
    definitionRevision: z.number().int().positive(),
    definitionFingerprint: z.string().regex(/^fnv1a64:[0-9a-f]{16}$/u),
    presentation: customerAuthPresentationSchema,
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

export const legacyCustomerAuthConfigurationSchema = z
  .object({
    version: z.literal(1),
    enabledProviders: z.array(customerIdentityProviderSchema).min(1).max(1),
    developmentAutomationEnabled: z.boolean(),
    transport: businessTransportConfigSchema,
    sessionPolicy: sessionPolicySchema,
    accountPolicy: businessAccountPolicySchema,
    accountDefaults: accountPolicyValuesSchema,
  })
  .strict();
export type LegacyCustomerAuthConfiguration = z.infer<
  typeof legacyCustomerAuthConfigurationSchema
>;

export function composeCustomerAuthConfiguration(
  rawDefaults: CustomerAuthDefaults,
  rawEnvironment: BusinessEnvironmentAuthConfig,
): CustomerAuthConfiguration {
  const defaults = customerAuthDefaultsSchema.parse(rawDefaults);
  const environment = businessEnvironmentAuthConfigSchema.parse(rawEnvironment);
  return customerAuthConfigurationSchema.parse({
    version: CUSTOMER_AUTH_CONFIGURATION_VERSION,
    definitionRevision: defaults.definitionRevision,
    definitionFingerprint: fingerprintCustomerAuthDefaults(defaults),
    presentation: defaults.presentation,
    enabledProviders: defaults.enabledProviders,
    developmentAutomationEnabled: environment.developmentAutomationEnabled,
    transport: {
      webOrigins: environment.webOrigins,
      sessionAdapterBaseUrl: environment.sessionAdapterBaseUrl,
      defaultPostLoginPath: defaults.defaultPostLoginPath,
    },
    sessionPolicy: defaults.sessionPolicy,
    accountPolicy: defaults.accountPolicy,
    accountDefaults: defaults.accountDefaults,
  });
}

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

export function customerContextAudience(
  issuer: string,
  environmentKey: string,
): string {
  const normalizedIssuer = normalizeHttpsOrigin(issuer);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(environmentKey)) {
    throw new Error('Environment key is invalid');
  }
  return `${normalizedIssuer}/environments/${environmentKey}`;
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
  'UNIT_EXHAUSTED',
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

export const customerAuthTransactionPurposeSchema = z.enum([
  'login',
  'ownership_transfer',
]);
export type CustomerAuthTransactionPurpose = z.infer<
  typeof customerAuthTransactionPurposeSchema
>;

export const customerAuthIntentSchema = z.enum(['login', 'signup', 'continue']);
export type CustomerAuthIntent = z.infer<typeof customerAuthIntentSchema>;

export const customerAuthTransactionChallengeSchema = z
  .object({
    reference: publicIdentifierSchema,
    environmentKey: z
      .string()
      .min(3)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    purpose: customerAuthTransactionPurposeSchema,
    intent: customerAuthIntentSchema,
    presentation: customerAuthPresentationSchema,
    environmentName: z.string().trim().min(1).max(80),
    returnUrl: z
      .string()
      .url()
      .refine((value) => new URL(value).protocol === 'https:', {
        message: 'Expected a secure return URL',
      }),
    enabledProviders: z.array(customerIdentityProviderSchema).min(1).max(1),
    providerNonce: z
      .string()
      .min(32)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/),
    callbackUrl: z
      .string()
      .url()
      .refine((value) => {
        const url = new URL(value);
        return (
          url.protocol === 'https:' &&
          url.username === '' &&
          url.password === '' &&
          url.pathname === CUSTOMER_AUTH_CALLBACK_PATH &&
          url.search === '' &&
          url.hash === ''
        );
      }, 'Expected the fixed secure customer callback URL'),
    expiresAt: z.number().int().positive(),
  })
  .strict();

export type CustomerAuthTransactionChallenge = z.infer<
  typeof customerAuthTransactionChallengeSchema
>;

export const completeGoogleCustomerAuthRequestSchema = z
  .object({
    environmentKey: z.string().min(3).max(64),
    reference: publicIdentifierSchema,
    credential: z
      .string()
      .min(1)
      .max(16 * 1024),
  })
  .strict();

export type CompleteGoogleCustomerAuthRequest = z.infer<
  typeof completeGoogleCustomerAuthRequestSchema
>;

export const completeCustomerAuthResponseSchema = z
  .object({
    redirectUrl: z
      .string()
      .url()
      .refine((value) => {
        const url = new URL(value);
        return (
          url.protocol === 'https:' &&
          url.username === '' &&
          url.password === ''
        );
      }, 'Expected a secure redirect URL'),
  })
  .strict();

export type CompleteCustomerAuthResponse = z.infer<
  typeof completeCustomerAuthResponseSchema
>;
