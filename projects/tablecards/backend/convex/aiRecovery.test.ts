// @vitest-environment node

import { convexTest, type TestConvex } from 'convex-test';
import {
  getFunctionName,
  makeFunctionReference,
  type FunctionReference,
} from 'convex/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generate } from './ai';
import type { ActionCtx } from './_generated/server';
import schema from './schema';

const bff = vi.hoisted(() => ({
  getAccess: vi.fn(),
  reserveUnits: vi.fn(),
  commitUnits: vi.fn(),
  releaseUnits: vi.fn(),
}));
vi.mock('@tofler/bff-auth/server', () => ({
  createBffProductAccessClient: () => bff,
}));

const modules = import.meta.glob('./**/*.ts');
const accountId = 'account_abcdefghijklmnop';
const userId = 'user_abcdefghijklmnop';
const reservationId = 'reservation_abcdefghijklmnop';
const input = {
  accessToken: 'synthetic_account_token',
  prompt: 'Watercolor wildflowers',
  idempotencyKey: 'idempotency_abcdefghijklmnop',
};
const getBatch = makeFunctionReference<
  'query',
  { batchId: string },
  {
    status: string;
    errorCode?: string;
    choices: { publicId: string; url: string | null }[];
  } | null
>('aiState:get');
const pendingBatch = makeFunctionReference<
  'query',
  { projectId?: string },
  {
    batchId: string;
    idempotencyKey: string;
    prompt: string;
    projectId?: string;
  } | null
>('aiState:pendingForCaller');
const generateBatch = makeFunctionReference<
  'action',
  typeof input & { projectId?: string },
  { batchId: string; status: string }
>('ai:generate');
type TestBackend = TestConvex<typeof schema>;

function identity(selectedAccount = accountId) {
  return {
    tokenIdentifier: `https://auth-dev.tofler.app|${userId}`,
    issuer: 'https://auth-dev.tofler.app',
    subject: userId,
    version: 1,
    environmentKey: 'tablecards-development',
    sessionId: 'session_abcdefghijklmnop',
    contextType: 'account',
    accountId: selectedAccount,
    membershipId: 'membership_abcdefghijklmnop',
    role: 'owner',
    permissions: ['account:read', 'members:read'],
  };
}

async function batchRow(t: TestBackend, batchId: string) {
  return await t.run(
    async (ctx) =>
      await ctx.db
        .query('aiBatches')
        .withIndex('by_account_public_id', (q) =>
          q.eq('accountId', accountId).eq('publicId', batchId),
        )
        .unique(),
  );
}

async function assertPreservedOutputs(t: TestBackend, batchId: string) {
  const batch = await batchRow(t, batchId);
  expect(batch?.generatedAssets).toHaveLength(4);
  for (const asset of batch?.generatedAssets ?? []) {
    expect(
      await t.run(
        async (ctx) => (await ctx.storage.get(asset.storageId)) !== null,
      ),
    ).toBe(true);
  }
  return batch;
}

// Execute the exported action's real guarded handler in convex-test. Only the
// selected mutation transport is interrupted; state/functions/storage are real.
async function interruptMutation(
  t: TestBackend,
  functionName: string,
  afterCommit: boolean,
) {
  let interrupted = false;
  const handler = (
    generate as typeof generate & {
      _handler: (
        ctx: ActionCtx,
        args: typeof input,
      ) => Promise<{ batchId: string; status: string }>;
    }
  )._handler;
  return await t.withIdentity(identity()).action(async (ctx) => {
    const runMutation = (async (
      reference: FunctionReference<'mutation'>,
      mutationArgs: Record<string, unknown>,
    ) => {
      if (!interrupted && getFunctionName(reference) === functionName) {
        interrupted = true;
        if (afterCommit) await ctx.runMutation(reference, mutationArgs);
        throw new Error('Simulated lost mutation response');
      }
      return await ctx.runMutation(reference, mutationArgs);
    }) as typeof ctx.runMutation;
    return await handler({ ...ctx, runMutation }, input);
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('TABLECARDS_AI_PROVIDER', 'development');
  bff.getAccess.mockResolvedValue({
    accountId,
    unitGrants: [{ unitType: 'ai_background_batch', allowance: 10 }],
    featureFlags: [{ key: 'reusable_presets', enabled: true }],
  });
  bff.reserveUnits.mockResolvedValue({
    reservation: { id: reservationId, state: 'reserved' },
  });
  bff.commitUnits.mockResolvedValue({
    reservation: { id: reservationId, state: 'committed' },
  });
  bff.releaseUnits.mockResolvedValue({
    reservation: { id: reservationId, state: 'released' },
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('AI action interruption recovery', () => {
  it('recovers an idempotently committed batch when the BFF response is lost', async () => {
    const t = convexTest(schema, modules);
    let consumed = 0;
    let committed = false;
    bff.commitUnits.mockImplementation(async (_context, transition) => {
      expect(transition).toEqual({
        reservationId,
        idempotencyKey: input.idempotencyKey,
      });
      const persisted = await t.run(
        async (ctx) =>
          await ctx.db
            .query('aiBatches')
            .withIndex('by_account_idempotency_key', (q) =>
              q
                .eq('accountId', accountId)
                .eq('idempotencyKey', input.idempotencyKey),
            )
            .unique(),
      );
      expect(persisted?.generatedAssets).toHaveLength(4);
      if (!committed) {
        committed = true;
        consumed += 1;
        throw new Error('Simulated committed BFF response lost');
      }
      return { reservation: { id: reservationId, state: 'committed' } };
    });
    const first = await t.withIdentity(identity()).action(generateBatch, input);
    expect(first.status).toBe('generating');
    const pending = await assertPreservedOutputs(t, first.batchId);
    expect(pending?.assetIds).toEqual([]);
    await expect(
      t.withIdentity(identity()).query(getBatch, { batchId: first.batchId }),
    ).resolves.toMatchObject({
      choices: [],
      errorCode: 'AI_COMPLETION_PENDING',
    });
    await expect(
      t.withIdentity(identity()).query(pendingBatch, {}),
    ).resolves.toEqual({
      batchId: first.batchId,
      prompt: input.prompt,
      idempotencyKey: input.idempotencyKey,
    });
    const otherUserId = 'user_otherabcdefghijklmnop';
    await expect(
      t
        .withIdentity({
          ...identity(),
          subject: otherUserId,
          tokenIdentifier: `https://auth-dev.tofler.app|${otherUserId}`,
        })
        .action(generateBatch, input),
    ).rejects.toThrow(/FORBIDDEN|original requester/u);
    await expect(
      t
        .withIdentity({
          ...identity(),
          subject: otherUserId,
          tokenIdentifier: `https://auth-dev.tofler.app|${otherUserId}`,
        })
        .query(pendingBatch, {}),
    ).resolves.toBeNull();
    await expect(
      t
        .withIdentity(identity('account_otheraccount1234'))
        .query(pendingBatch, {}),
    ).resolves.toBeNull();
    const recovered = await t
      .withIdentity(identity())
      .action(generateBatch, input);
    expect(recovered).toEqual({ ...first, status: 'ready' });
    expect(consumed).toBe(1);
    expect(bff.reserveUnits).toHaveBeenCalledTimes(1);
    expect(bff.commitUnits).toHaveBeenCalledTimes(2);
    expect(bff.releaseUnits).not.toHaveBeenCalled();
    const ready = await assertPreservedOutputs(t, first.batchId);
    expect(ready?.assetIds).toHaveLength(4);
    await expect(
      t.withIdentity(identity()).query(pendingBatch, {}),
    ).resolves.toBeNull();
    const choices = await t
      .withIdentity(identity())
      .query(getBatch, { batchId: first.batchId });
    expect(choices?.choices).toHaveLength(4);
    expect(
      choices?.choices.every(
        (choice) => choice.url === `/v1/files/assets/${choice.publicId}`,
      ),
    ).toBe(true);
    await expect(
      t
        .withIdentity(identity('account_otheraccount1234'))
        .query(getBatch, { batchId: first.batchId }),
    ).resolves.toBeNull();
    await expect(
      t.withIdentity(identity()).action(generateBatch, input),
    ).resolves.toEqual(recovered);
    expect(bff.commitUnits).toHaveBeenCalledTimes(2);
    expect(
      await t.run(
        async (ctx) =>
          await ctx.db
            .query('designAssets')
            .withIndex('by_account_project', (q) =>
              q.eq('accountId', accountId),
            )
            .take(8),
      ),
    ).toHaveLength(4);
  });

  it('retries failed TableCards completion without another commit or losing paid images', async () => {
    const t = convexTest(schema, modules);
    const first = await interruptMutation(t, 'aiState:complete', false);
    expect(first.status).toBe('generating');
    expect(
      (await assertPreservedOutputs(t, first.batchId))?.unitCommitConfirmed,
    ).toBe(true);
    await expect(
      t.withIdentity(identity()).action(generateBatch, input),
    ).resolves.toEqual({ ...first, status: 'ready' });
    expect(bff.reserveUnits).toHaveBeenCalledTimes(1);
    expect(bff.commitUnits).toHaveBeenCalledTimes(1);
    expect(bff.releaseUnits).not.toHaveBeenCalled();
    expect(
      (await assertPreservedOutputs(t, first.batchId))?.assetIds,
    ).toHaveLength(4);
  });

  it('recognizes completion when its mutation response was lost', async () => {
    const t = convexTest(schema, modules);
    const completed = await interruptMutation(t, 'aiState:complete', true);
    expect(completed.status).toBe('ready');
    await expect(
      t.withIdentity(identity()).action(generateBatch, input),
    ).resolves.toEqual(completed);
    expect(bff.reserveUnits).toHaveBeenCalledTimes(1);
    expect(bff.commitUnits).toHaveBeenCalledTimes(1);
    expect(bff.releaseUnits).not.toHaveBeenCalled();
    expect(
      (await assertPreservedOutputs(t, completed.batchId))?.assetIds,
    ).toHaveLength(4);
  });

  it('recovers persisted images after their persistence response was lost, before charging', async () => {
    const t = convexTest(schema, modules);
    const first = await interruptMutation(t, 'aiState:recordGenerated', true);
    expect(first.status).toBe('generating');
    await assertPreservedOutputs(t, first.batchId);
    expect(bff.commitUnits).not.toHaveBeenCalled();
    expect(bff.releaseUnits).not.toHaveBeenCalled();
    await expect(
      t.withIdentity(identity()).action(generateBatch, input),
    ).resolves.toEqual({ ...first, status: 'ready' });
    expect(bff.reserveUnits).toHaveBeenCalledTimes(1);
    expect(bff.commitUnits).toHaveBeenCalledTimes(1);
  });

  it('releases a provider failure before output persistence and refuses unauthenticated generation', async () => {
    const t = convexTest(schema, modules);
    await expect(t.action(generateBatch, input)).rejects.toThrow(
      /UNAUTHENTICATED/u,
    );
    expect(bff.reserveUnits).not.toHaveBeenCalled();
    const failed = await t.withIdentity(identity()).action(generateBatch, {
      ...input,
      prompt: '[fail] Watercolor',
    });
    expect(failed.status).toBe('failed');
    expect(
      await t
        .withIdentity(identity())
        .query(getBatch, { batchId: failed.batchId }),
    ).toMatchObject({ status: 'failed', errorCode: 'PROVIDER_UNAVAILABLE' });
    const retry = await t.withIdentity(identity()).action(generateBatch, {
      ...input,
      prompt: '[fail] Watercolor',
    });
    expect(retry).toEqual(failed);
    expect(bff.reserveUnits).toHaveBeenCalledTimes(1);
    expect(bff.commitUnits).not.toHaveBeenCalled();
    expect(bff.releaseUnits).toHaveBeenCalledTimes(1);
    expect(
      await t.run(
        async (ctx) =>
          await ctx.db
            .query('designAssets')
            .withIndex('by_account_project', (q) =>
              q.eq('accountId', accountId),
            )
            .take(8),
      ),
    ).toEqual([]);
    const recovered = await t.withIdentity(identity()).action(generateBatch, {
      ...input,
      idempotencyKey: 'new_provider_attempt_abcdefghijklmnop',
    });
    expect(recovered.status).toBe('ready');
    expect(bff.reserveUnits).toHaveBeenCalledTimes(2);
    expect(bff.commitUnits).toHaveBeenCalledTimes(1);
    expect(bff.releaseUnits).toHaveBeenCalledTimes(1);
  });

  it('does not publish private outputs when BFF did not commit the reservation', async () => {
    const t = convexTest(schema, modules);
    bff.commitUnits.mockResolvedValue({
      reservation: { id: reservationId, state: 'expired' },
    });
    const pending = await t
      .withIdentity(identity())
      .action(generateBatch, input);
    expect(pending.status).toBe('failed');
    const batch = await assertPreservedOutputs(t, pending.batchId);
    expect(batch?.unitCommitConfirmed).not.toBe(true);
    expect(batch?.assetIds).toEqual([]);
    await expect(
      t.withIdentity(identity()).query(getBatch, { batchId: pending.batchId }),
    ).resolves.toMatchObject({ choices: [] });
    expect(bff.releaseUnits).not.toHaveBeenCalled();
    await expect(
      t.withIdentity(identity()).action(generateBatch, input),
    ).resolves.toEqual(pending);
    expect(bff.commitUnits).toHaveBeenCalledTimes(1);
  });

  it('finds event-only pending recovery in the exact saved event after reload', async () => {
    const t = convexTest(schema, modules);
    const projectId = 'project_abcdefghijklmnop';
    await t.run(async (ctx) => {
      await ctx.db.insert('projects', {
        publicId: projectId,
        accountId,
        createdByUserId: userId,
        title: 'Dinner',
        state: 'active',
        designKind: 'predefined',
        designReference: 'minimal-ivory',
        guestCount: 1,
        revision: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    bff.commitUnits.mockRejectedValueOnce(
      new Error('Simulated lost commit response'),
    );
    const generated = await t
      .withIdentity(identity())
      .action(generateBatch, { ...input, projectId });
    expect(generated.status).toBe('generating');
    await expect(
      t.withIdentity(identity()).query(pendingBatch, { projectId }),
    ).resolves.toEqual({
      batchId: generated.batchId,
      prompt: input.prompt,
      idempotencyKey: input.idempotencyKey,
      projectId,
    });
    await expect(
      t.withIdentity(identity()).query(pendingBatch, {}),
    ).resolves.toBeNull();
    await expect(
      t
        .withIdentity(identity())
        .query(pendingBatch, { projectId: 'project_otherabcdefghijklmnop' }),
    ).resolves.toBeNull();
    await expect(
      t.withIdentity(identity()).action(generateBatch, { ...input, projectId }),
    ).resolves.toEqual({ ...generated, status: 'ready' });
  });
});
