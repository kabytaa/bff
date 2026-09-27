import {
  DEFAULT_ACCOUNT_POLICY,
  DEFAULT_BUSINESS_ACCOUNT_POLICY,
  DEFAULT_SESSION_POLICY,
  defineCustomerAuthDefaults,
} from '@tofler/bff-auth/core';

/**
 * Business behavior shared by every Example deployment.
 * Deployment URLs and development automation stay in operator-supplied
 * environment JSON; changing this file requires an explicit config apply.
 */
export const customerAuthDefaults = defineCustomerAuthDefaults({
  definitionRevision: 1,
  enabledProviders: ['google'],
  presentation: {
    productName: 'Example',
    theme: 'system',
    accentColor: '#314EC6',
  },
  defaultPostLoginPath: '/',
  sessionPolicy: DEFAULT_SESSION_POLICY,
  accountPolicy: DEFAULT_BUSINESS_ACCOUNT_POLICY,
  accountDefaults: DEFAULT_ACCOUNT_POLICY,
});

export default customerAuthDefaults;
