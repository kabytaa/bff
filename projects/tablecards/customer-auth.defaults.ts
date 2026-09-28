import {
  DEFAULT_ACCOUNT_POLICY,
  DEFAULT_BUSINESS_ACCOUNT_POLICY,
  DEFAULT_SESSION_POLICY,
  defineCustomerAuthDefaults,
} from '@tofler/bff-auth/core';

/**
 * Product behavior shared by every TableCards deployment.
 *
 * Deployment URLs and development automation belong to the operator-supplied
 * environment transport configuration. Changing these code-owned defaults
 * requires an explicit compatible configuration apply.
 */
export const customerAuthDefaults = defineCustomerAuthDefaults({
  definitionRevision: 1,
  enabledProviders: ['google'],
  presentation: {
    productName: 'TableCards',
    theme: 'light',
    accentColor: '#C7583D',
  },
  defaultPostLoginPath: '/create',
  sessionPolicy: DEFAULT_SESSION_POLICY,
  accountPolicy: DEFAULT_BUSINESS_ACCOUNT_POLICY,
  accountDefaults: DEFAULT_ACCOUNT_POLICY,
});

export default customerAuthDefaults;
