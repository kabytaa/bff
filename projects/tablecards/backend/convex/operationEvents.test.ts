import { convexTest, type TestConvex } from 'convex-test';
import {
  makeFunctionReference,
  type RegisteredMutation,
  type RegisteredAction,
} from 'convex/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import schema from './schema';
import type { MutationCtx } from './_generated/server';
import type { saveAuthorized } from './projects';
import type { complete as completeExport, failExport } from './exportState';
import type { complete as completeAi, markFailed } from './aiState';
import { type deliver, queueOperationOutcome } from './operationEvents';

const modules = import.meta.glob('./**/*.ts');
type Args<T> =
  T extends RegisteredMutation<'internal', infer A, unknown>
    ? A
    : T extends RegisteredAction<'internal', infer A, unknown>
      ? A
      : never;
const save = makeFunctionReference<'mutation', Args<typeof saveAuthorized>>(
  'projects:saveAuthorized',
);
const exportComplete = makeFunctionReference<
  'mutation',
  Args<typeof completeExport>
>('exportState:complete');
const exportFail = makeFunctionReference<'mutation', Args<typeof failExport>>(
  'exportState:failExport',
);
const aiComplete = makeFunctionReference<'mutation', Args<typeof completeAi>>(
  'aiState:complete',
);
const aiFail = makeFunctionReference<'mutation', Args<typeof markFailed>>(
  'aiState:markFailed',
);
const report = makeFunctionReference<'action', Args<typeof deliver>, null>(
  'operationEvents:deliver',
);
const accountId = 'account_abcdefghijklmnop';
const userId = 'user_abcdefghijklmnop';
const saveInput: Args<typeof saveAuthorized> = {
  accountId,
  userId,
  title: 'Private wedding title',
  guests: [{ name: 'Private guest' }],
  design: { kind: 'predefined', reference: 'minimal-ivory' },
  maximumActiveProjects: 100,
  maximumCards: 500,
  allowUploadedDesigns: false,
  allowAiDesigns: false,
  allowPremiumDesigns: true,
};
type Backend = TestConvex<typeof schema>;
async function jobs(t: Backend) {
  return await t.run(
    async (ctx) => await ctx.db.system.query('_scheduled_functions').take(100),
  );
}
async function project(t: Backend) {
  // Use an actual registered design to exercise the save path, not a fixture bypass.
  await t.mutation(save, saveInput);
  return await t.run(
    async (ctx) =>
      (
        await ctx.db
          .query('projects')
          .withIndex('by_account_state_updated_at', (index) =>
            index.eq('accountId', accountId).eq('state', 'active'),
          )
          .take(1)
      )[0]!,
  );
}
const outcome: Args<typeof deliver> = {
  name: 'project.saved',
  deduplicationId: 'project_abcdefghijklmnop:save:1',
  occurredAt: 1_791_547_200_000,
  productReference: 'project_abcdefghijklmnop',
  userPublicId: userId,
  accountPublicId: accountId,
  properties: {
    project_reference: 'project_abcdefghijklmnop',
    card_count: 1,
    operation: 'created',
  },
  attempt: 1,
};

describe('TableCards server outcome reporting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
    vi.stubEnv(
      'TABLECARDS_OPERATIONS_EVENT_SECRET',
      'separate_operations_fixture_secret_123456',
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('reports actual project revisions with trusted IDs and no private content', async () => {
    const t = convexTest(schema, modules);
    const saved = await project(t);
    const input = {
      ...saveInput,
      projectId: saved.publicId,
      design: { kind: 'predefined' as const, reference: saved.designReference },
    };
    await t.mutation(save, input);
    const scheduled = await jobs(t);
    expect(scheduled).toHaveLength(2);
    expect(scheduled.map((job) => job.args[0])).toMatchObject([
      {
        name: 'project.saved',
        deduplicationId: `${saved.publicId}:save:1`,
        userPublicId: userId,
        accountPublicId: accountId,
        properties: { operation: 'created', card_count: 1 },
      },
      {
        name: 'project.saved',
        deduplicationId: `${saved.publicId}:save:2`,
        properties: { operation: 'updated' },
      },
    ]);
    expect(JSON.stringify(scheduled)).not.toContain('Private');
    expect(JSON.stringify(scheduled)).not.toContain('SECRET');
    await expect(
      t.mutation(save, { ...input, accountId: 'account_otherabcdefghijkl' }),
    ).rejects.toThrow(/NOT_FOUND/);
    expect(await jobs(t)).toHaveLength(2);
  });

  it('keeps existing deployments compatible when optional reporting is disabled', async () => {
    vi.stubEnv('TABLECARDS_OPERATIONS_EVENT_SECRET', '');
    const t = convexTest(schema, modules);
    await project(t);
    expect(await jobs(t)).toHaveLength(0);
  });

  it('reports each export outcome once and sanitizes failure reason', async () => {
    const t = convexTest(schema, modules);
    const saved = await project(t);
    const storageId = await t.run(
      async (ctx) => await ctx.storage.store(new Blob(['private PDF'])),
    );
    await t.run(async (ctx) => {
      for (const publicId of [
        'export_completedfixture',
        'export_failedfixture',
      ])
        await ctx.db.insert('projectExports', {
          publicId,
          accountId,
          projectId: saved._id,
          requestedByUserId: userId,
          projectRevision: 1,
          status: 'generating',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
    });
    const args = {
      accountId,
      exportId: 'export_completedfixture',
      storageId,
      pageCount: 1,
    };
    await t.mutation(exportComplete, args);
    await t.mutation(exportComplete, args);
    const failed = {
      accountId,
      exportId: 'export_failedfixture',
      errorCode: 'raw error includes customer@example.invalid',
    };
    await t.mutation(exportFail, failed);
    await t.mutation(exportFail, failed);
    const events = (await jobs(t)).map((job) => job.args[0]);
    expect(events).toHaveLength(3);
    expect(events[1]).toMatchObject({
      name: 'pdf.export_completed',
      productReference: saved.publicId,
      properties: { card_count: 1 },
    });
    expect(events[2]).toMatchObject({
      name: 'pdf.export_failed',
      properties: { reason: 'OPERATION_FAILED' },
    });
    expect(JSON.stringify(events)).not.toContain('raw error');
  });

  it('reports AI completion/failure once, but not a recoverable completion checkpoint', async () => {
    const t = convexTest(schema, modules);
    const storageId = await t.run(
      async (ctx) => await ctx.storage.store(new Blob(['private artwork'])),
    );
    await t.run(async (ctx) => {
      for (const publicId of [
        'batch_readyfixture',
        'batch_failedfixture',
        'batch_recoveryfixture',
      ])
        await ctx.db.insert('aiBatches', {
          publicId,
          accountId,
          requestedByUserId: userId,
          idempotencyKey: publicId,
          prompt: 'Private customer prompt',
          status: 'generating',
          assetIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          ...(publicId !== 'batch_failedfixture'
            ? {
                unitCommitConfirmed: true,
                generatedAssets: Array.from({ length: 4 }, () => ({
                  storageId,
                  mimeType: 'image/png' as const,
                  width: 100,
                  height: 100,
                })),
              }
            : {}),
        });
    });
    await t.mutation(aiComplete, { accountId, batchId: 'batch_readyfixture' });
    await t.mutation(aiComplete, { accountId, batchId: 'batch_readyfixture' });
    for (let n = 0; n < 2; n++)
      await t.mutation(aiFail, {
        accountId,
        batchId: 'batch_failedfixture',
        errorCode: 'AI_PROVIDER_UNAVAILABLE',
      });
    await t.mutation(aiFail, {
      accountId,
      batchId: 'batch_recoveryfixture',
      errorCode: 'Private raw failure',
    });
    const events = (await jobs(t)).map((job) => job.args[0]);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      name: 'ai.batch_completed',
      properties: { completed_choices: 4 },
    });
    expect(events[1]).toMatchObject({
      name: 'ai.batch_failed',
      properties: { reason: 'AI_PROVIDER_UNAVAILABLE' },
    });
    expect(JSON.stringify(events)).not.toContain('Private');
  });

  it('uses separate authorization and fixed endpoint, retries at most three times with identical evidence', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    const t = convexTest(schema, modules);
    await t.action(report, outcome);
    const scheduled = await jobs(t);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]?.scheduledTime).toBe(Date.now() + 30_000);
    expect(scheduled[0]?.args[0]).toEqual({ ...outcome, attempt: 2 });
    await t.action(report, { ...outcome, attempt: 2 });
    await t.action(report, { ...outcome, attempt: 3 });
    expect(await jobs(t)).toHaveLength(2);
    const calls = fetchMock.mock.calls;
    expect(String(calls[0]?.[0])).toBe(
      'https://bff-backend.convex.site/v1/operations/events',
    );
    expect(calls[0]?.[1].headers.authorization).toBe(
      'Bearer separate_operations_fixture_secret_123456',
    );
    expect(calls.map((call) => call[1].body)).toEqual(
      Array(3).fill(calls[0]?.[1].body),
    );
    expect(JSON.parse(calls[0]?.[1].body)).toMatchObject({
      environmentKey: 'tablecards-development',
      version: 1,
    });
    expect(calls[0]?.[1].redirect).toBe('error');
  });

  it('does not retry permanent rejection or mutate product outcome', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 403 })),
    );
    const t = convexTest(schema, modules);
    const saved = await project(t);
    await t.action(report, outcome);
    expect(await jobs(t)).toHaveLength(1);
    expect(await t.run(async (ctx) => await ctx.db.get(saved._id))).toEqual(
      saved,
    );
  });

  it('contains scheduler failure so ancillary reporting cannot fail product writes', async () => {
    const ctx = {
      scheduler: {
        runAfter: vi.fn().mockRejectedValue(new Error('scheduler unavailable')),
      },
    } as unknown as MutationCtx;
    await expect(queueOperationOutcome(ctx, outcome)).resolves.toBeUndefined();
  });
});
