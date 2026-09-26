import { v } from 'convex/values';

import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import {
  validateBusinessEnvironmentKey,
  validateDisplayName,
} from './lib/businessEnvironment';
import {
  businessEnvironmentViewValidator,
  toBusinessEnvironmentView,
} from './lib/businessEnvironmentView';
import { fail } from './lib/errors';

async function findByKey(ctx: QueryCtx | MutationCtx, key: string) {
  return await ctx.db
    .query('businessEnvironments')
    .withIndex('by_key', (query) => query.eq('key', key))
    .unique();
}

export const create = internalMutation({
  args: {
    key: v.string(),
    businessName: v.string(),
    environmentName: v.string(),
  },
  returns: businessEnvironmentViewValidator,
  handler: async (ctx, args) => {
    const key = validateBusinessEnvironmentKey(args.key);
    const businessName = validateDisplayName('businessName', args.businessName);
    const environmentName = validateDisplayName(
      'environmentName',
      args.environmentName,
    );

    if (await findByKey(ctx, key)) {
      return fail('CONFLICT', `Business environment ${key} already exists`);
    }

    const now = Date.now();
    const id = await ctx.db.insert('businessEnvironments', {
      key,
      businessName,
      environmentName,
      updatedAt: now,
    });
    const created = await ctx.db.get(id);

    if (!created) {
      return fail('NOT_FOUND', 'Created Business environment was not found');
    }

    return toBusinessEnvironmentView(created);
  },
});

export const inspect = internalQuery({
  args: { key: v.string() },
  returns: businessEnvironmentViewValidator,
  handler: async (ctx, args) => {
    const key = validateBusinessEnvironmentKey(args.key);
    const document = await findByKey(ctx, key);

    if (!document) {
      return fail('NOT_FOUND', `Business environment ${key} was not found`);
    }

    return toBusinessEnvironmentView(document);
  },
});

export const list = internalQuery({
  args: {},
  returns: v.array(businessEnvironmentViewValidator),
  handler: async (ctx) => {
    const documents = await ctx.db
      .query('businessEnvironments')
      .withIndex('by_key')
      .order('asc')
      .take(100);

    return documents.map(toBusinessEnvironmentView);
  },
});

export const update = internalMutation({
  args: {
    key: v.string(),
    businessName: v.optional(v.string()),
    environmentName: v.optional(v.string()),
  },
  returns: businessEnvironmentViewValidator,
  handler: async (ctx, args) => {
    const key = validateBusinessEnvironmentKey(args.key);
    const existing = await findByKey(ctx, key);

    if (!existing) {
      return fail('NOT_FOUND', `Business environment ${key} was not found`);
    }

    if (args.businessName === undefined && args.environmentName === undefined) {
      return fail('VALIDATION_ERROR', 'At least one display name is required');
    }

    const businessName =
      args.businessName === undefined
        ? existing.businessName
        : validateDisplayName('businessName', args.businessName);
    const environmentName =
      args.environmentName === undefined
        ? existing.environmentName
        : validateDisplayName('environmentName', args.environmentName);

    await ctx.db.patch(existing._id, {
      businessName,
      environmentName,
      updatedAt: Math.max(Date.now(), existing.updatedAt + 1),
    });
    const updated = await ctx.db.get(existing._id);

    if (!updated) {
      return fail('NOT_FOUND', `Business environment ${key} was not found`);
    }

    return toBusinessEnvironmentView(updated);
  },
});
