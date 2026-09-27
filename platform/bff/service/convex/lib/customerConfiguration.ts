import { v } from 'convex/values';

import {
  customerAuthCallbackUrl,
  customerAuthConfigurationSchema,
  type CustomerAuthConfiguration,
} from '@bff/contracts';

export const sessionPolicyValidator = v.object({
  idleSeconds: v.number(),
  absoluteSeconds: v.number(),
});

export const businessAccountPolicyValidator = v.object({
  createAccountOnFirstSignIn: v.boolean(),
  userAccountCreationEnabled: v.boolean(),
  maxAccountMembershipsPerUser: v.number(),
  maxOwnedAccountsPerUser: v.number(),
  ownershipTransferEnabled: v.boolean(),
});

export const accountPolicyValuesValidator = v.object({
  seatLimit: v.number(),
  adminRoleEnabled: v.boolean(),
  memberInvitationsEnabled: v.boolean(),
});

const customerAuthConfigurationV1Validator = v.object({
  version: v.literal(1),
  enabledProviders: v.array(v.literal('google')),
  developmentAutomationEnabled: v.boolean(),
  transport: v.object({
    webOrigins: v.array(v.string()),
    sessionAdapterBaseUrl: v.string(),
    defaultPostLoginPath: v.string(),
  }),
  sessionPolicy: sessionPolicyValidator,
  accountPolicy: businessAccountPolicyValidator,
  accountDefaults: accountPolicyValuesValidator,
});

export const customerAuthConfigurationValidator = v.object({
  version: v.literal(2),
  definitionRevision: v.number(),
  definitionFingerprint: v.string(),
  presentation: v.object({
    productName: v.string(),
    theme: v.union(v.literal('light'), v.literal('dark'), v.literal('system')),
    accentColor: v.string(),
  }),
  enabledProviders: v.array(v.literal('google')),
  developmentAutomationEnabled: v.boolean(),
  transport: v.object({
    webOrigins: v.array(v.string()),
    sessionAdapterBaseUrl: v.string(),
    defaultPostLoginPath: v.string(),
  }),
  sessionPolicy: sessionPolicyValidator,
  accountPolicy: businessAccountPolicyValidator,
  accountDefaults: accountPolicyValuesValidator,
});

const storedCustomerAuthConfigurationV1Validator = v.object({
  ...customerAuthConfigurationV1Validator.fields,
  callbackUrl: v.string(),
});

const storedCustomerAuthConfigurationV2Validator = v.object({
  ...customerAuthConfigurationValidator.fields,
  callbackUrl: v.string(),
});

export const storedCustomerAuthConfigurationValidator = v.union(
  storedCustomerAuthConfigurationV1Validator,
  storedCustomerAuthConfigurationV2Validator,
);

export function validateCustomerAuthConfiguration(
  input: CustomerAuthConfiguration,
) {
  const configuration = customerAuthConfigurationSchema.parse(input);
  return {
    ...configuration,
    callbackUrl: customerAuthCallbackUrl(configuration),
  };
}
