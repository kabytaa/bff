import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { describe, expect, it } from 'vitest';

import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const issuer = 'https://auth-dev.tofler.app';
const accountId = 'account_abcdefghijklmnop';

function identity(requestedAccountId = accountId) {
  return {
    tokenIdentifier: `${issuer}|user_abcdefghijklmnop`,
    issuer,
    subject: 'user_abcdefghijklmnop',
    version: 1,
    environmentKey: 'tablecards-development',
    sessionId: 'session_abcdefghijklmnop',
    contextType: 'account',
    accountId: requestedAccountId,
    membershipId: 'membership_abcdefghijklmnop',
    role: 'owner',
    permissions: ['account:read', 'members:read'],
  };
}

const createPreset = makeFunctionReference<
  'mutation',
  {
    accountId: string;
    userId: string;
    assetPublicId: string;
    displayName: string;
    nameColor: string;
    namePosition: 'top' | 'center' | 'bottom';
    nameFont: 'sans' | 'serif';
    nameSize: 'small' | 'medium' | 'large';
  },
  string
>('designPresets:createAuthorized');
const updatePreset = makeFunctionReference<
  'mutation',
  {
    accountId: string;
    presetId: string;
    displayName: string;
    nameColor: string;
    namePosition: 'top' | 'center' | 'bottom';
    nameFont: 'sans' | 'serif';
    nameSize: 'small' | 'medium' | 'large';
  },
  null
>('designPresets:updateAuthorized');
const deletePreset = makeFunctionReference<
  'mutation',
  { accountId: string; presetId: string },
  null
>('designPresets:deleteAuthorized');
const listPresets = makeFunctionReference<
  'query',
  Record<string, never>,
  readonly { publicId: string; displayName: string; nameFont: string }[]
>('designPresets:list');

describe('TableCards reusable design presets', () => {
  it('keeps constrained presets account scoped through create, update and delete', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(
        new Blob(['image'], { type: 'image/png' }),
      );
      await ctx.db.insert('designAssets', {
        publicId: 'asset_abcdefghijklmnop',
        accountId,
        createdByUserId: 'user_abcdefghijklmnop',
        source: 'uploaded',
        storageId,
        mimeType: 'image/png',
        width: 1400,
        height: 800,
        createdAt: Date.now(),
      });
    });
    const presetId = await t.mutation(createPreset, {
      accountId,
      userId: 'user_abcdefghijklmnop',
      assetPublicId: 'asset_abcdefghijklmnop',
      displayName: 'Botanical',
      nameColor: '#223322',
      namePosition: 'center',
      nameFont: 'serif',
      nameSize: 'medium',
    });
    await expect(
      t.withIdentity(identity()).query(listPresets, {}),
    ).resolves.toMatchObject([
      { publicId: presetId, displayName: 'Botanical', nameFont: 'serif' },
    ]);
    await expect(
      t
        .withIdentity(identity('account_otheraccount1234'))
        .query(listPresets, {}),
    ).resolves.toEqual([]);
    await t.mutation(updatePreset, {
      accountId,
      presetId,
      displayName: 'Modern botanical',
      nameColor: '#112233',
      namePosition: 'bottom',
      nameFont: 'sans',
      nameSize: 'large',
    });
    await expect(
      t.withIdentity(identity()).query(listPresets, {}),
    ).resolves.toMatchObject([
      { displayName: 'Modern botanical', nameFont: 'sans' },
    ]);
    await t.mutation(deletePreset, { accountId, presetId });
    await expect(
      t.withIdentity(identity()).query(listPresets, {}),
    ).resolves.toEqual([]);
  });

  it('rejects invalid style values before persistence', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(createPreset, {
        accountId,
        userId: 'user_abcdefghijklmnop',
        assetPublicId: 'asset_missingasset1234',
        displayName: 'Broken',
        nameColor: 'green',
        namePosition: 'center',
        nameFont: 'sans',
        nameSize: 'medium',
      }),
    ).rejects.toThrow(/INVALID_INPUT|hex color/u);
  });
});
