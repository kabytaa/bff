import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { describe, expect, it } from 'vitest';

import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const issuer = 'https://auth-dev.tofler.app';

type Guest = { name: string; table?: string; marker?: string };
type ProjectSummary = {
  publicId: string;
  title: string;
  state: 'active' | 'archived';
  designKind: 'predefined' | 'uploaded' | 'ai';
  designReference: string;
  guestCount: number;
  revision: number;
  createdAt: number;
  updatedAt: number;
  nameStyle?: ProjectNameStyle;
};
type ProjectNameStyle = {
  color: string;
  position: 'top' | 'center' | 'bottom';
  font: 'sans' | 'serif';
  size: 'small' | 'medium' | 'large';
};
type SaveArgs = {
  accountId: string;
  userId: string;
  projectId?: string;
  title: string;
  guests: Guest[];
  design: {
    kind: 'predefined' | 'uploaded' | 'ai';
    reference: string;
    nameStyle?: ProjectNameStyle;
  };
  maximumActiveProjects: number;
  maximumCards: number;
  allowUploadedDesigns: boolean;
  allowAiDesigns: boolean;
  allowPremiumDesigns: boolean;
};

const saveAuthorized = makeFunctionReference<
  'mutation',
  SaveArgs,
  ProjectSummary
>('projects:saveAuthorized');
const list = makeFunctionReference<
  'query',
  { state?: 'active' | 'archived' },
  ProjectSummary[]
>('projects:list');
const get = makeFunctionReference<
  'query',
  { projectId: string },
  (ProjectSummary & { guests: Guest[] }) | null
>('projects:get');
const archive = makeFunctionReference<'mutation', { projectId: string }, null>(
  'projects:archive',
);
const restoreAuthorized = makeFunctionReference<
  'mutation',
  {
    accountId: string;
    projectId: string;
    maximumActiveProjects: number;
    maximumCards: number;
    allowPremiumDesigns: boolean;
    allowUploadedDesigns: boolean;
    allowAiDesigns: boolean;
  },
  ProjectSummary
>('projects:restoreAuthorized');
const loadForDuplicate = makeFunctionReference<
  'query',
  { accountId: string; projectId: string },
  {
    title: string;
    guests: Guest[];
    design: {
      kind: 'predefined' | 'uploaded' | 'ai';
      reference: string;
      nameStyle?: ProjectNameStyle;
    };
  } | null
>('projects:loadForDuplicate');

function accountIdentity(accountId = 'account_abcdefghijklmnop') {
  return {
    tokenIdentifier: `${issuer}|user_abcdefghijklmnop`,
    issuer,
    subject: 'user_abcdefghijklmnop',
    version: 1,
    environmentKey: 'tablecards-development',
    sessionId: 'session_abcdefghijklmnop',
    contextType: 'account',
    accountId,
    membershipId: 'membership_abcdefghijklmnop',
    role: 'owner',
    permissions: ['account:read', 'members:read'],
  };
}

function saveArgs(overrides: Partial<SaveArgs> = {}): SaveArgs {
  return {
    accountId: 'account_abcdefghijklmnop',
    userId: 'user_abcdefghijklmnop',
    title: 'Dinner',
    guests: [
      { name: 'José', table: '4' },
      { name: 'José', marker: 'Vegan' },
      { name: 'Alexandria Montgomery-Worthington' },
    ],
    design: { kind: 'predefined' as const, reference: 'minimal-ivory' },
    maximumActiveProjects: 1,
    maximumCards: 25,
    allowUploadedDesigns: false,
    allowAiDesigns: false,
    allowPremiumDesigns: false,
    ...overrides,
  };
}

describe('TableCards projects', () => {
  it('preserves ordered duplicate guests and exposes only account-scoped data', async () => {
    const t = convexTest(schema, modules);
    const saved = await t.mutation(saveAuthorized, saveArgs());

    const account = t.withIdentity(accountIdentity());
    await expect(account.query(list, {})).resolves.toMatchObject([
      { publicId: saved.publicId, guestCount: 3 },
    ]);
    await expect(
      account.query(get, { projectId: saved.publicId }),
    ).resolves.toMatchObject({
      guests: [
        { name: 'José', table: '4' },
        { name: 'José', marker: 'Vegan' },
        { name: 'Alexandria Montgomery-Worthington' },
      ],
    });

    const other = t.withIdentity(accountIdentity('account_otheraccount1234'));
    await expect(other.query(list, {})).resolves.toEqual([]);
    await expect(
      other.query(get, { projectId: saved.publicId }),
    ).resolves.toBeNull();
  });

  it('enforces project, card and paid-design limits transactionally', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(saveAuthorized, saveArgs());
    await expect(
      t.mutation(saveAuthorized, saveArgs({ title: 'Second project' })),
    ).rejects.toThrow(/LIMIT_EXCEEDED|project limit/u);
    await expect(
      t.mutation(
        saveAuthorized,
        saveArgs({
          accountId: 'account_secondaccount123',
          guests: Array.from({ length: 26 }, (_, index) => ({
            name: `Guest ${index + 1}`,
          })),
        }),
      ),
    ).rejects.toThrow(/LIMIT_EXCEEDED|many cards/u);
    await expect(
      t.mutation(
        saveAuthorized,
        saveArgs({
          accountId: 'account_thirdaccount1234',
          design: { kind: 'uploaded', reference: 'asset_1234567890123456' },
        }),
      ),
    ).rejects.toThrow(/ENTITLEMENT_REQUIRED|paid offer/u);
    await expect(
      t.mutation(
        saveAuthorized,
        saveArgs({
          accountId: 'account_fourthaccount12',
          design: { kind: 'predefined', reference: 'rosewater-frame' },
        }),
      ),
    ).rejects.toThrow(/ENTITLEMENT_REQUIRED|paid offer/u);
  });

  it('archives, lists, restores and loads a scoped duplication source', async () => {
    const t = convexTest(schema, modules);
    const saved = await t.mutation(saveAuthorized, saveArgs());
    const account = t.withIdentity(accountIdentity());

    await account.mutation(archive, { projectId: saved.publicId });
    await expect(account.query(list, {})).resolves.toEqual([]);
    await expect(
      account.query(list, { state: 'archived' }),
    ).resolves.toMatchObject([{ publicId: saved.publicId, state: 'archived' }]);
    await expect(
      t.query(loadForDuplicate, {
        accountId: 'account_otheraccount1234',
        projectId: saved.publicId,
      }),
    ).resolves.toBeNull();
    const duplicationSource = await t.query(loadForDuplicate, {
      accountId: 'account_abcdefghijklmnop',
      projectId: saved.publicId,
    });
    expect(duplicationSource?.title).toBe('Dinner');
    expect(duplicationSource?.guests).toHaveLength(3);
    expect(duplicationSource?.guests[0]).toMatchObject({ name: 'José' });

    await expect(
      t.mutation(restoreAuthorized, {
        accountId: 'account_abcdefghijklmnop',
        projectId: saved.publicId,
        maximumActiveProjects: 1,
        maximumCards: 25,
        allowPremiumDesigns: false,
        allowUploadedDesigns: false,
        allowAiDesigns: false,
      }),
    ).resolves.toMatchObject({ publicId: saved.publicId, state: 'active' });
  });

  it('snapshots constrained preset typography with the project and duplication source', async () => {
    const t = convexTest(schema, modules);
    const nameStyle: ProjectNameStyle = {
      color: '#224466',
      position: 'bottom',
      font: 'serif',
      size: 'large',
    };
    const saved = await t.mutation(
      saveAuthorized,
      saveArgs({
        design: {
          kind: 'predefined',
          reference: 'minimal-ivory',
          nameStyle,
        },
      }),
    );
    expect(saved.nameStyle).toEqual(nameStyle);
    await expect(
      t.query(loadForDuplicate, {
        accountId: 'account_abcdefghijklmnop',
        projectId: saved.publicId,
      }),
    ).resolves.toMatchObject({ design: { nameStyle } });
  });

  it('keeps event-scoped artwork bound to the project that owns it', async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(
      saveAuthorized,
      saveArgs({ maximumActiveProjects: 2 }),
    );
    const second = await t.mutation(
      saveAuthorized,
      saveArgs({ title: 'Second event', maximumActiveProjects: 2 }),
    );
    const assetPublicId = 'asset_eventscoped123456';
    await t.run(async (ctx) => {
      const project = await ctx.db
        .query('projects')
        .withIndex('by_account_public_id', (query) =>
          query
            .eq('accountId', 'account_abcdefghijklmnop')
            .eq('publicId', first.publicId),
        )
        .unique();
      if (!project) throw new Error('Fixture project was not found');
      const storageId = await ctx.storage.store(
        new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
      );
      await ctx.db.insert('designAssets', {
        publicId: assetPublicId,
        accountId: 'account_abcdefghijklmnop',
        projectId: project._id,
        createdByUserId: 'user_abcdefghijklmnop',
        source: 'uploaded',
        storageId,
        mimeType: 'image/png',
        width: 1050,
        height: 600,
        createdAt: Date.now(),
      });
    });

    await expect(
      t.mutation(
        saveAuthorized,
        saveArgs({
          projectId: second.publicId,
          title: 'Second event',
          maximumActiveProjects: 2,
          allowUploadedDesigns: true,
          design: { kind: 'uploaded', reference: assetPublicId },
        }),
      ),
    ).rejects.toThrow(/FORBIDDEN|different event/u);
    await expect(
      t.mutation(
        saveAuthorized,
        saveArgs({
          projectId: first.publicId,
          maximumActiveProjects: 2,
          allowUploadedDesigns: true,
          design: { kind: 'uploaded', reference: assetPublicId },
        }),
      ),
    ).resolves.toMatchObject({
      publicId: first.publicId,
      designKind: 'uploaded',
    });
  });

  it('denies missing and wrong-environment identities', async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(list, {})).rejects.toThrow(
      /UNAUTHENTICATED|Authentication is required/u,
    );
    await expect(
      t
        .withIdentity({
          ...accountIdentity('account_abcdefghijklmnop'),
          environmentKey: 'other-development',
        })
        .query(list, {}),
    ).rejects.toThrow(/FORBIDDEN|not valid here/u);
  });
});
