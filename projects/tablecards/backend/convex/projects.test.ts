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
  };
  maximumActiveProjects: number;
  maximumCards: number;
  allowUploadedDesigns: boolean;
  allowAiDesigns: boolean;
};

const saveAuthorized = makeFunctionReference<
  'mutation',
  SaveArgs,
  ProjectSummary
>('projects:saveAuthorized');
const list = makeFunctionReference<
  'query',
  Record<string, never>,
  ProjectSummary[]
>('projects:list');
const get = makeFunctionReference<
  'query',
  { projectId: string },
  (ProjectSummary & { guests: Guest[] }) | null
>('projects:get');

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
