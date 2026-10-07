// @vitest-environment node

import { readFile } from 'node:fs/promises';

import { convexTest, type TestConvex } from 'convex-test';
import {
  getFunctionName,
  makeFunctionReference,
  type FunctionArgs,
  type FunctionReference,
} from 'convex/server';
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  decodePDFRawStream,
} from 'pdf-lib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TABLECARDS_FONTS, getDesignDefinition } from '@tablecards/core';
import type { ActionCtx, MutationCtx } from './_generated/server';
import { create as createExportMutation } from './exportState';
import { render } from './exports';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const issuer = 'https://auth-dev.tofler.app';
const accountId = 'account_abcdefghijklmnop';
const userId = 'user_abcdefghijklmnop';
type TestBackend = TestConvex<typeof schema>;

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
    projectId?: string;
    title: string;
    guests: { name: string }[];
    design: {
      kind: 'predefined';
      reference: string;
      nameStyle?: {
        color: string;
        position: 'top' | 'center' | 'bottom';
        font: 'sans' | 'serif';
        size: 'small' | 'medium' | 'large';
      };
    };
    maximumActiveProjects: number;
    maximumCards: number;
    allowUploadedDesigns: boolean;
    allowAiDesigns: boolean;
    allowPremiumDesigns: boolean;
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
  {
    title: string;
    guests: { name: string }[];
    nameStyle?: {
      color: string;
      position: 'top' | 'center' | 'bottom';
      font: 'sans' | 'serif';
      size: 'small' | 'medium' | 'large';
    };
  }
>('exportState:load');
const failExport = makeFunctionReference<
  'mutation',
  { accountId: string; exportId: string; errorCode: string },
  null
>('exportState:failExport');
const renderExport = makeFunctionReference<
  'action',
  { accountId: string; exportId: string },
  null
>('exports:render');
const latestExport = makeFunctionReference<
  'query',
  { projectId: string },
  { status: string; downloadUrl: string | null } | null
>('exportState:latestForProject');
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
    provider?: 'cloudflare' | 'development';
    referenceDigest?: string;
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
    batchId: string;
    assets: [];
  },
  null
>('aiState:recordGenerated');
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
  t: TestBackend,
  designReference = 'minimal-ivory',
  withNameStyle = false,
) {
  return await t.mutation(saveProject, {
    accountId,
    userId,
    title: 'Dinner',
    guests: [{ name: 'Ada' }, { name: 'Grace' }],
    design: {
      kind: 'predefined',
      reference: designReference,
      ...(withNameStyle
        ? {
            nameStyle: {
              color: '#224466',
              position: 'top' as const,
              font: 'serif' as const,
              size: 'small' as const,
            },
          }
        : {}),
    },
    maximumActiveProjects: 1,
    maximumCards: 25,
    allowUploadedDesigns: false,
    allowAiDesigns: true,
    allowPremiumDesigns: designReference === 'rosewater-frame',
  });
}

function extractedPdfText(pdf: PDFDocument): string[] {
  return pdf.getPages().flatMap((page) => {
    const fonts = page.node.Resources()?.lookup(PDFName.of('Font'), PDFDict);
    const maps = new Map<string, Map<string, string>>();
    for (const [name, reference] of fonts?.entries() ?? []) {
      const font = pdf.context.lookup(reference, PDFDict);
      const unicode = pdf.context.lookup(font.get(PDFName.of('ToUnicode')));
      if (!(unicode instanceof PDFRawStream)) continue;
      const cmap = new TextDecoder().decode(
        decodePDFRawStream(unicode).decode(),
      );
      maps.set(
        name.decodeText(),
        new Map(
          [...cmap.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/gu)].map(
            (match) => [
              (match[1] ?? '').toUpperCase(),
              String.fromCharCode(
                ...(match[2]?.match(/.{4}/gu) ?? []).map((part) =>
                  Number.parseInt(part, 16),
                ),
              ),
            ],
          ),
        ),
      );
    }
    const contents = page.node.Contents();
    const streams =
      contents instanceof PDFArray
        ? contents.asArray().map((reference) => pdf.context.lookup(reference))
        : [contents];
    let activeFont = '';
    return streams.flatMap((stream) => {
      if (!(stream instanceof PDFRawStream)) return [];
      const commands = new TextDecoder().decode(
        decodePDFRawStream(stream).decode(),
      );
      const text: string[] = [];
      for (const match of commands.matchAll(
        /\/([^\s]+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]+)>\s*Tj/gu,
      )) {
        if (match[1]) {
          activeFont = match[1];
          continue;
        }
        const map = maps.get(activeFont);
        const glyphs = match[2]?.match(map ? /.{4}/gu : /../gu) ?? [];
        text.push(
          glyphs
            .map((glyph) =>
              map
                ? (map.get(glyph.toUpperCase()) ?? '')
                : String.fromCharCode(Number.parseInt(glyph, 16)),
            )
            .join(''),
        );
      }
      return text;
    });
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function stubRenderFiles() {
  const paths = new Set([
    getDesignDefinition('minimal-ivory').artwork.publicPath,
    TABLECARDS_FONTS.sans.publicPath,
    TABLECARDS_FONTS.serif.publicPath,
  ]);
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (request) => {
    const url = new URL(
      request instanceof Request ? request.url : String(request),
    );
    if (!paths.has(url.pathname)) throw new Error('Unexpected render fetch');
    const asset = await readFile(
      new URL(`../../workloads/web/public${url.pathname}`, import.meta.url),
    );
    return new Response(Uint8Array.from(asset).buffer, {
      headers: {
        'content-type': url.pathname.endsWith('.ttf')
          ? 'font/ttf'
          : 'image/jpeg',
      },
    });
  });
}

describe('TableCards durable operations', () => {
  it('deduplicates exports and keeps their status account scoped', async () => {
    const t = convexTest(schema, modules);
    const project = await seededProject(t, 'minimal-ivory', true);
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
    const scheduled = await t.run(
      async (ctx) => await ctx.db.system.query('_scheduled_functions').take(4),
    );
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]).toMatchObject({
      name: 'exports:render',
      args: [{ accountId, exportId: first.publicId }],
      state: { kind: 'pending' },
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
      nameStyle: {
        color: '#224466',
        position: 'top',
        font: 'serif',
        size: 'small',
      },
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

  it('rolls back the export insert when durable scheduling fails', async () => {
    const t = convexTest(schema, modules);
    const project = await seededProject(t);
    const input: FunctionArgs<typeof createExport> = {
      accountId,
      userId,
      projectId: project.publicId,
      maximumCards: 25,
      premiumDesigns: false,
      allowUploadedDesigns: false,
      allowAiDesigns: true,
      layoutId: 'portrait_4',
    };
    const handler = (
      createExportMutation as typeof createExportMutation & {
        _handler: (
          ctx: MutationCtx,
          args: typeof input,
        ) => Promise<{ publicId: string; status: string; created: boolean }>;
      }
    )._handler;
    await expect(
      t.mutation(
        async (ctx) =>
          await handler(
            {
              ...ctx,
              scheduler: {
                ...ctx.scheduler,
                runAfter: async () => {
                  throw new Error('Simulated scheduler failure');
                },
              },
            },
            input,
          ),
      ),
    ).rejects.toThrow(/scheduler failure/u);
    expect(
      await t.run(
        async (ctx) =>
          await ctx.db
            .query('projectExports')
            .withIndex('by_account_public_id', (q) =>
              q.eq('accountId', accountId),
            )
            .take(4),
      ),
    ).toEqual([]);
    expect(
      await t.run(
        async (ctx) =>
          await ctx.db.system.query('_scheduled_functions').take(4),
      ),
    ).toEqual([]);
    const created = await t.mutation(createExport, input);
    expect(created.created).toBe(true);
    await t.mutation(createExport, input);
    expect(
      await t.run(
        async (ctx) =>
          await ctx.db.system.query('_scheduled_functions').take(4),
      ),
    ).toHaveLength(1);
  });

  it('caps live-provider attempts atomically across accounts and releases the cap only on a new UTC day', async () => {
    vi.stubEnv('TABLECARDS_AI_DAILY_BUDGET_USD', '0.06');
    const t = convexTest(schema, modules);
    vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
    const requests = Array.from({ length: 12 }, (_, index) => ({
      accountId: `account_${index}abcdefghijklmnop`,
      userId,
      prompt: 'Illustrated blue corner flowers',
      idempotencyKey: `budget_${index}abcdefghijklmnop`,
      provider: 'cloudflare' as const,
    }));
    const results = await Promise.allSettled(
      requests.map((input) => t.mutation(startAi, input)),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(8);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(4);
    const accepted =
      requests[results.findIndex((result) => result.status === 'fulfilled')]!;
    await expect(t.mutation(startAi, accepted)).resolves.toMatchObject({
      created: false,
    });
    await expect(
      t.mutation(startAi, {
        ...accepted,
        idempotencyKey: 'mock_budget_abcdefghijklmnop',
        provider: 'development',
      }),
    ).resolves.toMatchObject({ created: true });
    vi.setSystemTime(new Date('2026-10-08T00:00:00Z'));
    await expect(
      t.mutation(startAi, {
        ...accepted,
        idempotencyKey: 'new_day_abcdefghijklmnop',
      }),
    ).resolves.toMatchObject({ created: true });
  });

  it('enforces the one-dollar budget at 138 starts, counting failed attempts and preserving recovery', async () => {
    vi.stubEnv('TABLECARDS_AI_DAILY_BUDGET_USD', '1');
    vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (let index = 0; index < 136; index += 1)
        await ctx.db.insert('aiBatches', {
          publicId: `ai_batch_seed_${index}abcdefghijklmnop`,
          accountId: `account_seed_${index}abcdefghijklmnop`,
          requestedByUserId: userId,
          idempotencyKey: `seed_budget_${index}abcdefghijklmnop`,
          prompt: 'Blue corner motifs',
          provider: 'cloudflare',
          providerBudgetDay: '2026-10-07',
          status: index % 2 === 0 ? 'failed' : 'queued',
          assetIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
    });
    const requests = Array.from({ length: 12 }, (_, index) => ({
      accountId: `account_race_${index}abcdefghijklmnop`,
      userId,
      prompt: 'Blue corner motifs',
      idempotencyKey: `dollar_budget_${index}abcdefghijklmnop`,
      provider: 'cloudflare' as const,
    }));
    const results = await Promise.allSettled(
      requests.map((input) => t.mutation(startAi, input)),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(2);
    const denied = results.filter((result) => result.status === 'rejected');
    expect(denied).toHaveLength(10);
    for (const result of denied)
      expect(String(result.reason)).toMatch(/LIMIT_EXCEEDED|daily AI safety/u);
    expect(
      await t.run(
        async (ctx) =>
          await ctx.db
            .query('aiBatches')
            .withIndex('by_provider_budget_day', (q) =>
              q
                .eq('provider', 'cloudflare')
                .eq('providerBudgetDay', '2026-10-07'),
            )
            .take(139),
      ),
    ).toHaveLength(138);
    const accepted =
      requests[results.findIndex((result) => result.status === 'fulfilled')]!;
    vi.stubEnv('TABLECARDS_AI_DAILY_BUDGET_USD', '0');
    await expect(t.mutation(startAi, accepted)).resolves.toMatchObject({
      created: false,
    });
    await expect(
      t.mutation(startAi, {
        ...accepted,
        idempotencyKey: 'paused_budget_abcdefghijklmnop',
      }),
    ).rejects.toThrow(/LIMIT_EXCEEDED|paused/u);
    vi.stubEnv('TABLECARDS_AI_DAILY_BUDGET_USD', '2');
    await expect(
      t.mutation(startAi, {
        ...accepted,
        idempotencyKey: 'raised_budget_abcdefghijklmnop',
      }),
    ).resolves.toMatchObject({ created: true });
  });

  it('binds the selected image and provider to the original idempotency key', async () => {
    const t = convexTest(schema, modules);
    const input = {
      accountId,
      userId,
      prompt: 'Company style',
      idempotencyKey: 'reference_abcdefghijklmnop',
      provider: 'development' as const,
      referenceDigest: 'original_image_digest',
    };
    await t.mutation(startAi, input);
    await expect(
      t.mutation(startAi, {
        ...input,
        referenceDigest: 'different_image_digest',
      }),
    ).rejects.toThrow(/CONFLICT|reference image/u);
    await expect(
      t.mutation(startAi, { ...input, provider: 'cloudflare' }),
    ).rejects.toThrow(/CONFLICT|provider/u);
    const recovery = { ...input, referenceDigest: undefined };
    await expect(t.mutation(startAi, recovery)).resolves.toMatchObject({
      created: false,
    });
  });

  it('does not reuse or advertise legacy PDFs with the extra calibration page', async () => {
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
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query('projectExports')
        .withIndex('by_account_public_id', (q) =>
          q.eq('accountId', accountId).eq('publicId', first.publicId),
        )
        .unique();
      await ctx.db.patch(row!._id, {
        renderVersion: undefined,
        status: 'ready',
        pageCount: 2,
      });
    });
    await expect(
      t
        .withIdentity(identity())
        .query(latestExport, { projectId: project.publicId }),
    ).resolves.toBeNull();
    const fresh = await t.mutation(createExport, input);
    expect(fresh.created).toBe(true);
    expect(fresh.publicId).not.toBe(first.publicId);
  });

  it('regenerates single-line PDF caches without changing the saved project or old export', async () => {
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
    const original = await t.run(async (ctx) => {
      const row = await ctx.db
        .query('projectExports')
        .withIndex('by_account_public_id', (q) =>
          q.eq('accountId', accountId).eq('publicId', first.publicId),
        )
        .unique();
      await ctx.db.patch(row!._id, { renderVersion: 2, status: 'ready' });
      return await ctx.db.get(row!.projectId);
    });
    const owner = t.withIdentity(identity());
    await expect(
      owner.query(latestExport, { projectId: project.publicId }),
    ).resolves.toBeNull();

    vi.setSystemTime(Date.now() + 1);
    const fresh = await t.mutation(createExport, input);
    expect(fresh).toMatchObject({ created: true, status: 'queued' });
    expect(fresh.publicId).not.toBe(first.publicId);
    await expect(t.mutation(createExport, input)).resolves.toEqual({
      ...fresh,
      created: false,
    });
    const rows = await t.run(async (ctx) => {
      const exports = await ctx.db
        .query('projectExports')
        .withIndex('by_project_created_at', (q) =>
          q.eq('projectId', original!._id),
        )
        .collect();
      return { exports, project: await ctx.db.get(original!._id) };
    });
    expect(rows.project).toEqual(original);
    expect(rows.exports).toHaveLength(2);
    expect(
      rows.exports.find((row) => row.publicId === fresh.publicId),
    ).toMatchObject({
      renderVersion: 3,
      projectRevision: original!.revision,
    });
    expect(
      rows.exports.find((row) => row.publicId === first.publicId),
    ).toMatchObject({
      renderVersion: 2,
      status: 'ready',
    });
    await expect(
      owner.query(getExport, { exportId: first.publicId }),
    ).resolves.toMatchObject({ status: 'ready' });
    await expect(
      owner.query(latestExport, { projectId: project.publicId }),
    ).resolves.toMatchObject({ status: 'queued' });
    await expect(
      t.withIdentity(identity('account_otheraccount1234')).query(getExport, {
        exportId: first.publicId,
      }),
    ).resolves.toBeNull();
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

  it('renders the authorized snapshot after a later save changes content and entitlement', async () => {
    const t = convexTest(schema, modules);
    const project = await seededProject(t);
    const requested = await t.mutation(createExport, {
      accountId,
      userId,
      projectId: project.publicId,
      maximumCards: 25,
      premiumDesigns: false,
      allowUploadedDesigns: false,
      allowAiDesigns: true,
      layoutId: 'portrait_4',
    });
    await t.mutation(saveProject, {
      accountId,
      userId,
      projectId: project.publicId,
      title: 'Changed title',
      guests: Array.from({ length: 26 }, () => ({ name: 'Changed Guest' })),
      design: { kind: 'predefined', reference: 'rosewater-frame' },
      maximumActiveProjects: 1,
      maximumCards: 500,
      allowUploadedDesigns: false,
      allowAiDesigns: true,
      allowPremiumDesigns: true,
    });
    const loaded = await t.mutation(loadExport, {
      accountId,
      exportId: requested.publicId,
    });
    expect(loaded).toMatchObject({
      title: 'Dinner',
      guests: [{ name: 'Ada' }, { name: 'Grace' }],
      designReference: 'minimal-ivory',
    });
    stubRenderFiles();
    await t.action(renderExport, { accountId, exportId: requested.publicId });
    const bytes = await t.run(async (ctx) => {
      const job = await ctx.db
        .query('projectExports')
        .withIndex('by_account_public_id', (q) =>
          q.eq('accountId', accountId).eq('publicId', requested.publicId),
        )
        .unique();
      if (!job?.storageId) throw new Error('Missing rendered PDF');
      const file = await ctx.storage.get(job.storageId);
      if (!file) throw new Error('Missing PDF bytes');
      return await file.arrayBuffer();
    });
    const pdf = await PDFDocument.load(new Uint8Array(bytes));
    expect(pdf.getTitle()).toBe('Dinner');
    const names = extractedPdfText(pdf);
    expect(names.filter((name) => name === 'Ada')).toHaveLength(2);
    expect(names.filter((name) => name === 'Grace')).toHaveLength(2);
    expect(names).not.toContain('Changed Guest');
    expect(
      await t.run(
        async (ctx) =>
          await ctx.db
            .query('projectExports')
            .withIndex('by_account_public_id', (q) =>
              q.eq('accountId', accountId).eq('publicId', requested.publicId),
            )
            .unique(),
      ),
    ).toMatchObject({ projectRevision: 1, status: 'ready' });
    await expect(
      t.withIdentity(identity()).query(latestExport, {
        projectId: project.publicId,
      }),
    ).resolves.toBeNull();
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
    ).rejects.toThrow(/LIMIT_EXCEEDED/u);
  });

  it.each([false, true])(
    'preserves the attached PDF after a lost completion response (cleanup unavailable: %s)',
    async (cleanupUnavailable) => {
      const t = convexTest(schema, modules);
      const project = await seededProject(t);
      const requested = await t.mutation(createExport, {
        accountId,
        userId,
        projectId: project.publicId,
        maximumCards: 25,
        premiumDesigns: false,
        allowUploadedDesigns: false,
        allowAiDesigns: true,
        layoutId: 'portrait_4',
      });
      stubRenderFiles();
      const handler = (
        render as typeof render & {
          _handler: (
            ctx: ActionCtx,
            args: { accountId: string; exportId: string },
          ) => Promise<null>;
        }
      )._handler;
      const rendering = t.action(async (ctx) => {
        const runMutation = (async (
          reference: FunctionReference<'mutation'>,
          mutationArgs: Record<string, unknown>,
        ) => {
          if (
            cleanupUnavailable &&
            getFunctionName(reference) === 'exportState:cleanupUnattached'
          ) {
            throw new Error('Simulated unavailable cleanup reconciliation');
          }
          const result = await ctx.runMutation(reference, mutationArgs);
          if (getFunctionName(reference) === 'exportState:complete') {
            throw new Error('Simulated lost PDF completion response');
          }
          return result;
        }) as typeof ctx.runMutation;
        return await handler(
          { ...ctx, runMutation },
          { accountId, exportId: requested.publicId },
        );
      });
      if (cleanupUnavailable) {
        await expect(rendering).rejects.toThrow(/lost PDF completion/u);
      } else {
        await expect(rendering).resolves.toBeNull();
      }
      const bytes = await t.run(async (ctx) => {
        const job = await ctx.db
          .query('projectExports')
          .withIndex('by_account_public_id', (q) =>
            q.eq('accountId', accountId).eq('publicId', requested.publicId),
          )
          .unique();
        expect(job?.status).toBe('ready');
        if (!job?.storageId) throw new Error('Missing PDF attachment');
        const file = await ctx.storage.get(job.storageId);
        if (!file) throw new Error('Attached PDF was deleted');
        return await file.arrayBuffer();
      });
      const pdf = await PDFDocument.load(new Uint8Array(bytes));
      expect(pdf.getTitle()).toBe('Dinner');
      expect(
        extractedPdfText(pdf).filter((text) => text === 'Ada'),
      ).toHaveLength(2);
      await expect(
        t
          .withIdentity(identity())
          .query(latestExport, { projectId: project.publicId }),
      ).resolves.toMatchObject({
        status: 'ready',
        downloadUrl: `/v1/files/exports/${requested.publicId}`,
      });
    },
  );

  it('rejects a stale legacy export without relabelling live content', async () => {
    const t = convexTest(schema, modules);
    const project = await seededProject(t);
    const requested = await t.mutation(createExport, {
      accountId,
      userId,
      projectId: project.publicId,
      maximumCards: 25,
      premiumDesigns: false,
      allowUploadedDesigns: false,
      allowAiDesigns: true,
      layoutId: 'portrait_4',
    });
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query('projectExports')
        .withIndex('by_account_public_id', (q) =>
          q.eq('accountId', accountId).eq('publicId', requested.publicId),
        )
        .unique();
      if (!row) throw new Error('Missing test export');
      await ctx.db.patch(row._id, { snapshot: undefined });
    });
    await t.mutation(saveProject, {
      accountId,
      userId,
      projectId: project.publicId,
      title: 'Changed title',
      guests: [{ name: 'Changed Guest' }],
      design: { kind: 'predefined', reference: 'minimal-ivory' },
      maximumActiveProjects: 1,
      maximumCards: 25,
      allowUploadedDesigns: false,
      allowAiDesigns: true,
      allowPremiumDesigns: false,
    });
    await expect(
      t.mutation(loadExport, {
        accountId,
        exportId: requested.publicId,
      }),
    ).rejects.toThrow(/CONFLICT|stale/u);
  });
});
