import { v } from 'convex/values';

import type { Doc } from '../_generated/dataModel';
import { storedCustomerAuthConfigurationValidator } from './customerConfiguration';

export const businessEnvironmentViewValidator = v.object({
  id: v.id('businessEnvironments'),
  createdAt: v.number(),
  key: v.string(),
  businessName: v.string(),
  environmentName: v.string(),
  customerAuth: v.optional(storedCustomerAuthConfigurationValidator),
  customerAuthConfigurationRevision: v.number(),
  accountPolicyStateRevision: v.number(),
  updatedAt: v.number(),
});

export function toBusinessEnvironmentView(
  document: Doc<'businessEnvironments'>,
) {
  return {
    id: document._id,
    createdAt: document._creationTime,
    key: document.key,
    businessName: document.businessName,
    environmentName: document.environmentName,
    ...(document.customerAuth === undefined
      ? {}
      : { customerAuth: document.customerAuth }),
    customerAuthConfigurationRevision:
      document.customerAuthConfigurationRevision ?? 0,
    accountPolicyStateRevision: document.accountPolicyStateRevision ?? 0,
    updatedAt: document.updatedAt,
  };
}
