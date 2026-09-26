import { v } from 'convex/values';

import { query } from './_generated/server';
import { isAllowedOperator, requireOperator } from './lib/authorization';
import {
  businessEnvironmentViewValidator,
  toBusinessEnvironmentView,
} from './lib/businessEnvironmentView';
import { getServiceVersion, SERVICE_NAME } from './lib/serviceMetadata';

export const currentOperator = query({
  args: {},
  returns: v.union(
    v.object({ authenticated: v.literal(false) }),
    v.object({
      authenticated: v.literal(true),
      email: v.union(v.string(), v.null()),
      emailVerified: v.boolean(),
      authorized: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { authenticated: false as const };
    }

    return {
      authenticated: true as const,
      email: identity.email ?? null,
      emailVerified: identity.emailVerified === true,
      authorized: isAllowedOperator(identity),
    };
  },
});

export const overview = query({
  args: {},
  returns: v.object({
    service: v.literal(SERVICE_NAME),
    version: v.string(),
    businessEnvironments: v.array(businessEnvironmentViewValidator),
  }),
  handler: async (ctx) => {
    await requireOperator(ctx);
    const environments = await ctx.db
      .query('businessEnvironments')
      .withIndex('by_key')
      .order('asc')
      .take(100);

    return {
      service: SERVICE_NAME,
      version: getServiceVersion(),
      businessEnvironments: environments.map(toBusinessEnvironmentView),
    };
  },
});
