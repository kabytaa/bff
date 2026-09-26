import { v } from 'convex/values';

import type { Doc } from '../_generated/dataModel';

export const businessEnvironmentViewValidator = v.object({
  id: v.id('businessEnvironments'),
  createdAt: v.number(),
  key: v.string(),
  businessName: v.string(),
  environmentName: v.string(),
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
    updatedAt: document.updatedAt,
  };
}
