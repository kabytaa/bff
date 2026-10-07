import { convexTest, type TestConvex } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { describe, expect, it } from 'vitest';

import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const accountId = 'account_abcdefghijklmnop';
const otherAccountId = 'account_otheraccount1234';
const userId = 'user_abcdefghijklmnop';
const issuer = 'https://auth-dev.tofler.app';

function identity(
  account = accountId,
  environmentKey = 'tablecards-development',
) {
  return {
    issuer,
    subject: userId,
    tokenIdentifier: `${issuer}|${userId}`,
    version: 1,
    environmentKey,
    sessionId: 'session_abcdefghijklmnop',
    contextType: 'account',
    accountId: account,
    membershipId: 'membership_abcdefghijklmnop',
    role: 'owner',
    permissions: ['account:read'],
  };
}

interface LibraryPage {
  page: {
    publicId: string;
    url?: string | null;
    artworkUrl?: string | null;
    nameFont?: string;
    nameSize?: string;
  }[];
  isDone: boolean;
  continueCursor: string;
}
const assetsPage = makeFunctionReference<
  'query',
  { paginationOpts: { cursor: string | null; numItems: number } },
  LibraryPage
>('assets:page');
const presetsPage = makeFunctionReference<
  'query',
  { paginationOpts: { cursor: string | null; numItems: number } },
  LibraryPage
>('designPresets:page');
const projectsPage = makeFunctionReference<
  'query',
  {
    state: 'active' | 'archived';
    paginationOpts: { cursor: string | null; numItems: number };
  },
  LibraryPage
>('projects:page');

async function seed(t: TestConvex<typeof schema>) {
  await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob([new Uint8Array([1])], { type: 'image/png' }),
    );
    for (const [account, count, prefix] of [
      [accountId, 130, 'own'],
      [otherAccountId, 3, 'other'],
    ] as const) {
      for (let index = 0; index < count; index += 1) {
        const assetId = await ctx.db.insert('designAssets', {
          publicId: `asset_${prefix}_${index}`,
          accountId: account,
          createdByUserId: userId,
          source: 'uploaded',
          storageId,
          mimeType: 'image/png',
          width: 100,
          height: 100,
          createdAt: index,
        });
        await ctx.db.insert('designPresets', {
          publicId: `preset_${prefix}_${index}`,
          accountId: account,
          createdByUserId: userId,
          assetId,
          displayName: `Preset ${index}`,
          nameColor: '#123456',
          namePosition: 'center',
          createdAt: index,
          updatedAt: count - index,
        });
      }
    }
  });
}

describe('account-scoped artwork metadata pagination', () => {
  it('discovers all 130 archived projects without leaking active or foreign rows', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (const [account, state, count] of [
        [accountId, 'archived', 130],
        [accountId, 'active', 3],
        [otherAccountId, 'archived', 3],
      ] as const) {
        for (let index = 0; index < count; index++)
          await ctx.db.insert('projects', {
            publicId: `${account}_${state}_${index}`,
            accountId: account,
            createdByUserId: userId,
            title: `Event ${index}`,
            state,
            designKind: 'predefined',
            designReference: 'minimal-ivory',
            guestCount: 2,
            revision: 1,
            createdAt: index,
            updatedAt: index,
          });
      }
    });
    const customer = t.withIdentity(identity());
    let cursor: string | null = null;
    const ids: string[] = [];
    for (let page = 0; page < 10; page++) {
      const result: LibraryPage = await customer.query(projectsPage, {
        state: 'archived',
        paginationOpts: { cursor, numItems: 1000 },
      });
      expect(result.page.length).toBeLessThanOrEqual(24);
      ids.push(...result.page.map((item) => item.publicId));
      cursor = result.continueCursor;
      if (result.isDone) break;
    }
    expect(ids).toEqual(
      Array.from(
        { length: 130 },
        (_, index) => `${accountId}_archived_${129 - index}`,
      ),
    );
    await expect(
      customer.query(projectsPage, {
        state: 'archived',
        paginationOpts: { cursor, numItems: 24 },
      }),
    ).resolves.toMatchObject({ page: [], isDone: true });
    const other = await t
      .withIdentity(identity(otherAccountId))
      .query(projectsPage, {
        state: 'archived',
        paginationOpts: { cursor: null, numItems: 24 },
      });
    expect(other.page).toHaveLength(3);
    expect(
      other.page.every((item) => item.publicId.startsWith(otherAccountId)),
    ).toBe(true);
    await expect(
      t.query(projectsPage, {
        state: 'archived',
        paginationOpts: { cursor: null, numItems: 24 },
      }),
    ).rejects.toThrow();
    await expect(
      t
        .withIdentity(identity(accountId, 'tablecards-production'))
        .query(projectsPage, {
          state: 'archived',
          paginationOpts: { cursor: null, numItems: 24 },
        }),
    ).rejects.toThrow();
  });
  for (const [label, reference, prefix, descending] of [
    ['assets', assetsPage, 'asset', true],
    ['presets', presetsPage, 'preset', false],
  ] as const) {
    it(`returns all 130 ${label} exactly once in indexed newest-first order and stops`, async () => {
      const t = convexTest(schema, modules);
      await seed(t);
      const customer = t.withIdentity(identity());
      const ids: string[] = [];
      const pageSizes: number[] = [];
      let cursor: string | null = null;
      for (let count = 0; count < 10; count += 1) {
        const result: LibraryPage = await customer.query(reference, {
          // The server fixes its own bounded size even for oversized callers.
          paginationOpts: { cursor, numItems: 1000 },
        });
        pageSizes.push(result.page.length);
        ids.push(...result.page.map((item) => item.publicId));
        for (const item of result.page) {
          expect(item).not.toHaveProperty('storageId');
          expect(item.url ?? item.artworkUrl).toMatch(
            /^\/v1\/files\/assets\/asset_own_\d+$/u,
          );
          if (label === 'presets') {
            expect(item).toMatchObject({
              nameFont: 'sans',
              nameSize: 'medium',
            });
          }
        }
        expect(result.continueCursor).not.toBe(cursor);
        cursor = result.continueCursor;
        if (result.isDone) break;
      }
      expect(pageSizes).toEqual([24, 24, 24, 24, 24, 10]);
      const expected = Array.from(
        { length: 130 },
        (_, index) => `${prefix}_own_${descending ? 129 - index : index}`,
      );
      expect(ids).toEqual(expected);
      expect(new Set(ids).size).toBe(130);
      await expect(
        customer.query(reference, {
          paginationOpts: { cursor, numItems: 24 },
        }),
      ).resolves.toMatchObject({ page: [], isDone: true });
    });

    it(`keeps ${label} cursors scoped to the authenticated account and handles an empty library`, async () => {
      const t = convexTest(schema, modules);
      await seed(t);
      const first = await t.withIdentity(identity()).query(reference, {
        paginationOpts: { cursor: null, numItems: 24 },
      });
      const other = t.withIdentity(identity(otherAccountId));
      const ownPage = await other.query(reference, {
        paginationOpts: { cursor: null, numItems: 24 },
      });
      expect(ownPage.page).toHaveLength(3);
      expect(ownPage.isDone).toBe(true);
      expect(
        ownPage.page.every((item) =>
          item.publicId.startsWith(`${prefix}_other_`),
        ),
      ).toBe(true);
      // Reusing a foreign cursor must not override the account index prefix.
      const replay = await other.query(reference, {
        paginationOpts: { cursor: first.continueCursor, numItems: 24 },
      });
      expect(
        replay.page.every((item) =>
          item.publicId.startsWith(`${prefix}_other_`),
        ),
      ).toBe(true);
      await expect(
        t.withIdentity(identity('account_empty12345678')).query(reference, {
          paginationOpts: { cursor: null, numItems: 24 },
        }),
      ).resolves.toMatchObject({ page: [], isDone: true });
    });

    it(`denies unauthenticated and wrong-environment ${label} pages`, async () => {
      const t = convexTest(schema, modules);
      const args = { paginationOpts: { cursor: null, numItems: 24 } };
      await expect(t.query(reference, args)).rejects.toThrow();
      await expect(
        t
          .withIdentity(identity(accountId, 'different-business'))
          .query(reference, args),
      ).rejects.toThrow();
    });
  }
});
