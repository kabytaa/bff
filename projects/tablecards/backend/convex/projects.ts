import { v } from 'convex/values';

import { getDesignDefinition } from '@tablecards/core';
import {
  withBffAccountMutation,
  withBffAccountQuery,
} from '@tofler/bff-auth/convex/server';
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { tablecardsCustomerAuth } from './environment';
import { fail } from './lib/productErrors';
import { createPublicId } from './lib/publicIds';

const MAX_TITLE_LENGTH = 120;
const MAX_NAME_LENGTH = 120;
const MAX_AUXILIARY_LENGTH = 40;
const MAX_DESIGN_REFERENCE_LENGTH = 128;

const designKind = v.union(
  v.literal('predefined'),
  v.literal('uploaded'),
  v.literal('ai'),
);
const projectState = v.union(v.literal('active'), v.literal('archived'));
const guest = v.object({
  name: v.string(),
  table: v.optional(v.string()),
  marker: v.optional(v.string()),
});
const nameStyle = v.object({
  color: v.string(),
  position: v.union(v.literal('top'), v.literal('center'), v.literal('bottom')),
  font: v.union(v.literal('sans'), v.literal('serif')),
  size: v.union(v.literal('small'), v.literal('medium'), v.literal('large')),
});
type ProjectNameStyle = {
  color: string;
  position: 'top' | 'center' | 'bottom';
  font: 'sans' | 'serif';
  size: 'small' | 'medium' | 'large';
};
const projectSummary = v.object({
  publicId: v.string(),
  title: v.string(),
  state: v.union(v.literal('active'), v.literal('archived')),
  designKind,
  designReference: v.string(),
  nameStyle: v.optional(nameStyle),
  guestCount: v.number(),
  revision: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

function validateText(
  value: string,
  field: string,
  maximum: number,
  required: boolean,
): void {
  if ((required && value.trim().length === 0) || value.length > maximum) {
    fail('INVALID_INPUT', `${field} is not valid`);
  }
}

function validateGuests(
  guests: readonly {
    readonly name: string;
    readonly table?: string;
    readonly marker?: string;
  }[],
): void {
  if (guests.length === 0 || guests.length > 500) {
    fail('INVALID_INPUT', 'A project must contain between 1 and 500 cards');
  }
  for (const row of guests) {
    validateText(row.name, 'Guest name', MAX_NAME_LENGTH, true);
    if (row.table !== undefined) {
      validateText(row.table, 'Table', MAX_AUXILIARY_LENGTH, false);
    }
    if (row.marker !== undefined) {
      validateText(row.marker, 'Marker', MAX_AUXILIARY_LENGTH, false);
    }
  }
}

export const list = query({
  args: { state: v.optional(projectState) },
  returns: v.array(projectSummary),
  handler: withBffAccountQuery(
    tablecardsCustomerAuth,
    async (ctx, args: { state?: 'active' | 'archived' }, auth) => {
      const projects = await ctx.db
        .query('projects')
        .withIndex('by_account_state_updated_at', (q) =>
          q.eq('accountId', auth.accountId).eq('state', args.state ?? 'active'),
        )
        .order('desc')
        .take(101);
      return projects.map((project) => ({
        publicId: project.publicId,
        title: project.title,
        state: project.state,
        designKind: project.designKind,
        designReference: project.designReference,
        ...(project.nameStyle === undefined
          ? {}
          : { nameStyle: project.nameStyle }),
        guestCount: project.guestCount,
        revision: project.revision,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }));
    },
  ),
});

export const get = query({
  args: { projectId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      ...projectSummary.fields,
      guests: v.array(guest),
    }),
  ),
  handler: withBffAccountQuery(
    tablecardsCustomerAuth,
    async (ctx, args: { projectId: string }, auth) => {
      const project = await ctx.db
        .query('projects')
        .withIndex('by_account_public_id', (q) =>
          q.eq('accountId', auth.accountId).eq('publicId', args.projectId),
        )
        .unique();
      if (!project) return null;
      const contents = await ctx.db
        .query('projectContents')
        .withIndex('by_project_id', (q) => q.eq('projectId', project._id))
        .unique();
      if (!contents || contents.accountId !== auth.accountId) {
        fail('NOT_FOUND', 'The project contents are unavailable');
      }
      return {
        publicId: project.publicId,
        title: project.title,
        state: project.state,
        designKind: project.designKind,
        designReference: project.designReference,
        ...(project.nameStyle === undefined
          ? {}
          : { nameStyle: project.nameStyle }),
        guestCount: project.guestCount,
        revision: project.revision,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        guests: contents.guests,
      };
    },
  ),
});

export const saveAuthorized = internalMutation({
  args: {
    accountId: v.string(),
    userId: v.string(),
    projectId: v.optional(v.string()),
    title: v.string(),
    guests: v.array(guest),
    design: v.object({
      kind: designKind,
      reference: v.string(),
      nameStyle: v.optional(nameStyle),
    }),
    maximumActiveProjects: v.number(),
    maximumCards: v.number(),
    allowUploadedDesigns: v.boolean(),
    allowAiDesigns: v.boolean(),
    allowPremiumDesigns: v.boolean(),
  },
  returns: projectSummary,
  handler: async (ctx, args) => {
    validateText(args.title, 'Project title', MAX_TITLE_LENGTH, true);
    validateText(
      args.design.reference,
      'Design reference',
      MAX_DESIGN_REFERENCE_LENGTH,
      true,
    );
    validateGuests(args.guests);
    if (
      !Number.isSafeInteger(args.maximumCards) ||
      args.maximumCards < 1 ||
      args.guests.length > args.maximumCards
    ) {
      fail('LIMIT_EXCEEDED', 'This offer does not support that many cards');
    }
    if (args.design.kind === 'uploaded' && !args.allowUploadedDesigns) {
      fail('ENTITLEMENT_REQUIRED', 'Uploaded artwork requires a paid offer');
    }
    if (args.design.kind === 'ai' && !args.allowAiDesigns) {
      fail('ENTITLEMENT_REQUIRED', 'AI artwork is not available');
    }
    if (args.design.kind === 'predefined') {
      let definition: ReturnType<typeof getDesignDefinition>;
      try {
        definition = getDesignDefinition(args.design.reference);
      } catch {
        fail('INVALID_INPUT', 'The predefined design is not available');
      }
      if (definition.tier === 'premium' && !args.allowPremiumDesigns) {
        fail(
          'ENTITLEMENT_REQUIRED',
          'The selected design requires a paid offer',
        );
      }
    } else {
      const asset = await ctx.db
        .query('designAssets')
        .withIndex('by_account_public_id', (queryBuilder) =>
          queryBuilder
            .eq('accountId', args.accountId)
            .eq('publicId', args.design.reference),
        )
        .unique();
      if (!asset || asset.source !== args.design.kind) {
        fail('NOT_FOUND', 'The selected background artwork was not found');
      }
      if (asset.projectId !== undefined) {
        const requestedProject = args.projectId
          ? await ctx.db
              .query('projects')
              .withIndex('by_account_public_id', (queryBuilder) =>
                queryBuilder
                  .eq('accountId', args.accountId)
                  .eq('publicId', args.projectId as string),
              )
              .unique()
          : null;
        if (!requestedProject || requestedProject._id !== asset.projectId) {
          fail('FORBIDDEN', 'This artwork belongs to a different event');
        }
      }
    }
    if (
      args.design.nameStyle !== undefined &&
      !/^#[0-9a-f]{6}$/iu.test(args.design.nameStyle.color)
    ) {
      fail('INVALID_INPUT', 'The name color is not valid');
    }

    const now = Date.now();
    const requestedProjectId = args.projectId;
    const existing = requestedProjectId
      ? await ctx.db
          .query('projects')
          .withIndex('by_account_public_id', (q) =>
            q
              .eq('accountId', args.accountId)
              .eq('publicId', requestedProjectId),
          )
          .unique()
      : null;
    if (requestedProjectId && !existing) {
      fail('NOT_FOUND', 'The project was not found');
    }
    if (!existing) {
      if (
        !Number.isSafeInteger(args.maximumActiveProjects) ||
        args.maximumActiveProjects < 1
      ) {
        fail('ENTITLEMENT_REQUIRED', 'Project creation is unavailable');
      }
      const active = await ctx.db
        .query('projects')
        .withIndex('by_account_state_updated_at', (q) =>
          q.eq('accountId', args.accountId).eq('state', 'active'),
        )
        .take(args.maximumActiveProjects);
      if (active.length >= args.maximumActiveProjects) {
        fail('LIMIT_EXCEEDED', 'The active project limit has been reached');
      }
    }

    const revision = (existing?.revision ?? 0) + 1;
    const projectId = existing?._id
      ? existing._id
      : await ctx.db.insert('projects', {
          publicId: createPublicId('project'),
          accountId: args.accountId,
          createdByUserId: args.userId,
          title: args.title,
          state: 'active',
          designKind: args.design.kind,
          designReference: args.design.reference,
          ...(args.design.nameStyle === undefined
            ? {}
            : { nameStyle: args.design.nameStyle }),
          guestCount: args.guests.length,
          revision,
          createdAt: now,
          updatedAt: now,
        });
    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        designKind: args.design.kind,
        designReference: args.design.reference,
        nameStyle: args.design.nameStyle,
        guestCount: args.guests.length,
        revision,
        updatedAt: now,
      });
    }
    const contents = await ctx.db
      .query('projectContents')
      .withIndex('by_project_id', (q) => q.eq('projectId', projectId))
      .unique();
    if (contents) {
      await ctx.db.patch(contents._id, {
        revision,
        guests: args.guests,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('projectContents', {
        accountId: args.accountId,
        projectId,
        revision,
        guests: args.guests,
        updatedAt: now,
      });
    }
    const saved = await ctx.db.get(projectId);
    if (!saved) fail('CONFLICT', 'The project could not be saved');
    return {
      publicId: saved.publicId,
      title: saved.title,
      state: saved.state,
      designKind: saved.designKind,
      designReference: saved.designReference,
      ...(saved.nameStyle === undefined ? {} : { nameStyle: saved.nameStyle }),
      guestCount: saved.guestCount,
      revision: saved.revision,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  },
});

export const loadForDuplicate = internalQuery({
  args: { accountId: v.string(), projectId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      title: v.string(),
      guests: v.array(guest),
      design: v.object({
        kind: designKind,
        reference: v.string(),
        nameStyle: v.optional(nameStyle),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query('projects')
      .withIndex('by_account_public_id', (queryBuilder) =>
        queryBuilder
          .eq('accountId', args.accountId)
          .eq('publicId', args.projectId),
      )
      .unique();
    if (!project) return null;
    const contents = await ctx.db
      .query('projectContents')
      .withIndex('by_project_id', (queryBuilder) =>
        queryBuilder.eq('projectId', project._id),
      )
      .unique();
    if (!contents || contents.accountId !== args.accountId) return null;
    return {
      title: project.title,
      guests: contents.guests,
      design: {
        kind: project.designKind,
        reference: project.designReference,
        ...(project.nameStyle === undefined
          ? {}
          : { nameStyle: project.nameStyle as ProjectNameStyle }),
      },
    };
  },
});

export const restoreAuthorized = internalMutation({
  args: {
    accountId: v.string(),
    projectId: v.string(),
    maximumActiveProjects: v.number(),
    maximumCards: v.number(),
    allowPremiumDesigns: v.boolean(),
    allowUploadedDesigns: v.boolean(),
    allowAiDesigns: v.boolean(),
  },
  returns: projectSummary,
  handler: async (ctx, args) => {
    if (
      !Number.isSafeInteger(args.maximumActiveProjects) ||
      args.maximumActiveProjects < 1
    ) {
      fail('ENTITLEMENT_REQUIRED', 'Project restoration is unavailable');
    }
    const project = await ctx.db
      .query('projects')
      .withIndex('by_account_public_id', (queryBuilder) =>
        queryBuilder
          .eq('accountId', args.accountId)
          .eq('publicId', args.projectId),
      )
      .unique();
    if (!project || project.state !== 'archived') {
      fail('NOT_FOUND', 'The archived project was not found');
    }
    if (project.guestCount > args.maximumCards) {
      fail('LIMIT_EXCEEDED', 'This offer does not support that many cards');
    }
    if (
      project.designKind === 'predefined' &&
      getDesignDefinition(project.designReference).tier === 'premium' &&
      !args.allowPremiumDesigns
    ) {
      fail('ENTITLEMENT_REQUIRED', 'The selected design requires a paid offer');
    }
    if (project.designKind === 'uploaded' && !args.allowUploadedDesigns) {
      fail('ENTITLEMENT_REQUIRED', 'Uploaded artwork requires a paid offer');
    }
    if (project.designKind === 'ai' && !args.allowAiDesigns) {
      fail('ENTITLEMENT_REQUIRED', 'AI artwork is not available');
    }
    const active = await ctx.db
      .query('projects')
      .withIndex('by_account_state_updated_at', (queryBuilder) =>
        queryBuilder.eq('accountId', args.accountId).eq('state', 'active'),
      )
      .take(args.maximumActiveProjects);
    if (active.length >= args.maximumActiveProjects) {
      fail('LIMIT_EXCEEDED', 'The active project limit has been reached');
    }
    const updatedAt = Date.now();
    await ctx.db.patch(project._id, { state: 'active', updatedAt });
    return {
      publicId: project.publicId,
      title: project.title,
      state: 'active' as const,
      designKind: project.designKind,
      designReference: project.designReference,
      ...(project.nameStyle === undefined
        ? {}
        : { nameStyle: project.nameStyle }),
      guestCount: project.guestCount,
      revision: project.revision,
      createdAt: project.createdAt,
      updatedAt,
    };
  },
});

export const archive = mutation({
  args: { projectId: v.string() },
  returns: v.null(),
  handler: withBffAccountMutation(
    tablecardsCustomerAuth,
    async (ctx, args: { projectId: string }, auth) => {
      const project = await ctx.db
        .query('projects')
        .withIndex('by_account_public_id', (q) =>
          q.eq('accountId', auth.accountId).eq('publicId', args.projectId),
        )
        .unique();
      if (!project) fail('NOT_FOUND', 'The project was not found');
      await ctx.db.patch(project._id, {
        state: 'archived',
        updatedAt: Date.now(),
      });
      return null;
    },
  ),
});
