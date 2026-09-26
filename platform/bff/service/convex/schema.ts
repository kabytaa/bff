import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  businessEnvironments: defineTable({
    key: v.string(),
    businessName: v.string(),
    environmentName: v.string(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),
});
