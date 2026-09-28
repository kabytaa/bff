import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const projectState = v.union(v.literal('active'), v.literal('archived'));
const designKind = v.union(
  v.literal('predefined'),
  v.literal('uploaded'),
  v.literal('ai'),
);
const guest = v.object({
  name: v.string(),
  table: v.optional(v.string()),
  marker: v.optional(v.string()),
});

export default defineSchema({
  projects: defineTable({
    publicId: v.string(),
    accountId: v.string(),
    createdByUserId: v.string(),
    title: v.string(),
    state: projectState,
    designKind,
    designReference: v.string(),
    guestCount: v.number(),
    revision: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_account_public_id', ['accountId', 'publicId'])
    .index('by_account_state_updated_at', ['accountId', 'state', 'updatedAt']),
  projectContents: defineTable({
    accountId: v.string(),
    projectId: v.id('projects'),
    revision: v.number(),
    guests: v.array(guest),
    updatedAt: v.number(),
  }).index('by_project_id', ['projectId']),
  designAssets: defineTable({
    publicId: v.string(),
    accountId: v.string(),
    projectId: v.optional(v.id('projects')),
    createdByUserId: v.string(),
    source: v.union(v.literal('uploaded'), v.literal('ai')),
    storageId: v.id('_storage'),
    mimeType: v.union(v.literal('image/png'), v.literal('image/jpeg')),
    width: v.number(),
    height: v.number(),
    createdAt: v.number(),
  })
    .index('by_account_public_id', ['accountId', 'publicId'])
    .index('by_account_project', ['accountId', 'projectId']),
  designPresets: defineTable({
    publicId: v.string(),
    accountId: v.string(),
    createdByUserId: v.string(),
    assetId: v.id('designAssets'),
    displayName: v.string(),
    nameColor: v.string(),
    namePosition: v.union(
      v.literal('top'),
      v.literal('center'),
      v.literal('bottom'),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_account_public_id', ['accountId', 'publicId']),
  projectExports: defineTable({
    publicId: v.string(),
    accountId: v.string(),
    projectId: v.id('projects'),
    requestedByUserId: v.string(),
    projectRevision: v.number(),
    layoutId: v.optional(
      v.union(v.literal('portrait_4'), v.literal('landscape_6')),
    ),
    status: v.union(
      v.literal('queued'),
      v.literal('generating'),
      v.literal('ready'),
      v.literal('failed'),
    ),
    storageId: v.optional(v.id('_storage')),
    pageCount: v.optional(v.number()),
    errorCode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_account_public_id', ['accountId', 'publicId'])
    .index('by_project_created_at', ['projectId', 'createdAt']),
  aiBatches: defineTable({
    publicId: v.string(),
    accountId: v.string(),
    projectId: v.optional(v.id('projects')),
    requestedByUserId: v.string(),
    idempotencyKey: v.string(),
    prompt: v.string(),
    status: v.union(
      v.literal('queued'),
      v.literal('generating'),
      v.literal('ready'),
      v.literal('failed'),
    ),
    unitReservationId: v.optional(v.string()),
    assetIds: v.array(v.id('designAssets')),
    errorCode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_account_public_id', ['accountId', 'publicId'])
    .index('by_account_idempotency_key', ['accountId', 'idempotencyKey']),
});
