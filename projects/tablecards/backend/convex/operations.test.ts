import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { describe, expect, it } from 'vitest';

import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const issuer = 'https://auth-dev.tofler.app';
const accountId = 'account_abcdefghijklmnop';
const userId = 'user_abcdefghijklmnop';

function identity(requestedAccountId = accountId) {
  return {
    tokenIdentifier: `${issuer}|${userId}`,
    issuer,
    subject: userId,
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

const saveProject = makeFunctionReference<
  'mutation',
  {
    accountId: string;
    userId: string;
    title: string;
    guests: { name: string }[];
    design: { kind: 'predefined'; reference: string };
    maximumActiveProjects: number;
    maximumCards: number;
    allowUploadedDesigns: boolean;
    allowAiDesigns: boolean;
  },
  { publicId: string }
>('projects:saveAuthorized');
const createExport = makeFunctionReference<
  'mutation',
  {
    accountId: string;
    userId: string;
    projectId: string;
    maximumCards: number;
    premiumDesigns: boolean;
    allowUploadedDesigns: boolean;
    allowAiDesigns: boolean;
    layoutId: 'landscape_6' | 'portrait_4';
  },
  { publicId: string; status: string; created: boolean }
>('exportState:create');
const loadExport = makeFunctionReference<
  'mutation',
  { accountId: string; exportId: string },
  { title: string; guests: { name: string }[] }
>('exportState:load');
const failExport = makeFunctionReference<
  'mutation',
  { accountId: string; exportId: string; errorCode: string },
  null
>('exportState:failExport');
const getExport = makeFunctionReference<
  'query',
  { exportId: string },
  { status: string; errorCode?: string } | null
>('exportState:get');
const startAi = makeFunctionReference<
  'mutation',
  {
    accountId: string;
    userId: string;
    prompt: string;
    idempotencyKey: string;
  },
  { publicId: string; status: string; created: boolean }
>('aiState:start');
const markAiGenerating = makeFunctionReference<
  'mutation',
  { accountId: string; batchId: string; reservationId: string },
  null
>('aiState:markGenerating');
const completeAi = makeFunctionReference<
  'mutation',
  {
    accountId: string;
    userId: string;
    batchId: string;
    assets: [];
  },
  null
>('aiState:complete');
const failAi = makeFunctionReference<
  'mutation',
  { accountId: string; batchId: string; errorCode: string },
  null
>('aiState:markFailed');
const getAi = makeFunctionReference<
  'query',
  { batchId: string },
  { status: string; errorCode?: string; choices: unknown[] } | null
>('aiState:get');

async function seededProject(
  t: ReturnType<typeof convexTest>,
  designReference = 'minimal-ivory',
) {
  return await t.mutation(saveProject, {
    accountId,
    userId,
    title: 'Dinner',
    guests: [{ name: 'Ada' }, { name: 'Grace' }],
    design: { kind: 'predefined', reference: designReference },
    maximumActiveProjects: 1,
    maximumCards: 25,
    allowUploadedDesigns: false,
    allowAiDesigns: true,
  });
}

describe('TableCards durable operations', () => {
  it('deduplicates exports and keeps their status account scoped', async () => {
    const t = convexTest(schema, modules);
    const project = await seededProject(t);
    const input = {
      accountId,
      userId,
      projectId: project.publicId,
      maximumCards: 25,
      premiumDesigns: false,
      allowUploadedDesigns: false,
      allowAiDesigns: true,
      layoutId: 'portrait_4' as const,
    };
    const first = await t.mutation(createExport, input);
    expect(first).toMatchObject({ created: true, status: 'queued' });
    await expect(t.mutation(createExport, input)).resolves.toEqual({
      ...first,
      created: false,
    });
    await expect(
      t.mutation(loadExport, {
        accountId: 'account_otheraccount1234',
        exportId: first.publicId,
      }),
    ).rejects.toThrow(/NOT_FOUND|not found/u);
    await expect(
      t.mutation(loadExport, { accountId, exportId: first.publicId }),
    ).resolves.toMatchObject({
      title: 'Dinner',
      guests: [{ name: 'Ada' }, { name: 'Grace' }],
    });
    await t.mutation(failExport, {
      accountId,
      exportId: first.publicId,
      errorCode: 'TEST_FAILURE',
    });
    await expect(
      t.withIdentity(identity()).query(getExport, { exportId: first.publicId }),
    ).resolves.toMatchObject({
      status: 'failed',
      errorCode: 'TEST_FAILURE',
    });
    await expect(
      t
        .withIdentity(identity('account_otheraccount1234'))
        .query(getExport, { exportId: first.publicId }),
    ).resolves.toBeNull();
  });

  it('denies premium export when the current offer is free', async () => {
    const t = convexTest(schema, modules);
    const project = await seededProject(t, 'rosewater-frame');
    await expect(
      t.mutation(createExport, {
        accountId,
        userId,
        projectId: project.publicId,
        maximumCards: 25,
        premiumDesigns: false,
        allowUploadedDesigns: false,
        allowAiDesigns: true,
        layoutId: 'portrait_4',
      }),
    ).rejects.toThrow(/ENTITLEMENT_REQUIRED|paid offer/u);
  });

  it('keeps AI idempotency exact and requires exactly four outputs', async () => {
    const t = convexTest(schema, modules);
    const input = {
      accountId,
      userId,
      prompt: 'Watercolor wildflowers',
      idempotencyKey: 'idempotency_abcdefghijklmnop',
    };
    const first = await t.mutation(startAi, input);
    expect(first).toMatchObject({ created: true, status: 'queued' });
    await expect(t.mutation(startAi, input)).resolves.toEqual({
      ...first,
      created: false,
    });
    await expect(
      t.mutation(startAi, { ...input, prompt: 'Different prompt' }),
    ).rejects.toThrow(/CONFLICT|another prompt/u);
    await t.mutation(markAiGenerating, {
      accountId,
      batchId: first.publicId,
      reservationId: 'reservation_abcdefghijklmnop',
    });
    await expect(
      t.mutation(completeAi, {
        accountId,
        userId,
        batchId: first.publicId,
        assets: [],
      }),
    ).rejects.toThrow(/INVALID_INPUT|exactly four/u);
    await t.mutation(failAi, {
      accountId,
      batchId: first.publicId,
      errorCode: 'PROVIDER_UNAVAILABLE',
    });
    await expect(
      t.withIdentity(identity()).query(getAi, { batchId: first.publicId }),
    ).resolves.toMatchObject({
      status: 'failed',
      errorCode: 'PROVIDER_UNAVAILABLE',
      choices: [],
    });
  });
});
