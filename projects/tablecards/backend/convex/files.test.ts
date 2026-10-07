import { readFileSync } from 'node:fs';
import { encode } from 'fast-png';
import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductAccessProjection } from '@bff/contracts';
import type * as BffServer from '@tofler/bff-auth/server';
import schema from './schema';

const access = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@tofler/bff-auth/server', async (original) => ({
  ...(await original<typeof BffServer>()),
  createBffProductAccessClient: () => ({ getAccess: access.get }),
}));

const modules = import.meta.glob('./**/*.ts');
const accountId = 'account_abcdefghijklmnop';
const userId = 'user_abcdefghijklmnop';
const otherAccountId = 'account_otheraccount1234';
const issuer = 'https://auth-dev.tofler.app';
const origin = 'https://tablecards-dev.tofler.app';
const headers = {
  origin,
  authorization: 'Bearer synthetic-context',
  'content-type': 'image/jpeg',
};
const image = readFileSync(
  new URL(
    '../../workloads/web/public/designs/predefined/v2/minimal-ivory.jpg',
    import.meta.url,
  ),
);

function imageWithDimensions(width: number, height: number): Uint8Array {
  const bytes = Uint8Array.from(image);
  for (let offset = 0; offset < bytes.length - 9; offset += 1) {
    if (
      bytes[offset] === 0xff &&
      (bytes[offset + 1] === 0xc0 || bytes[offset + 1] === 0xc2)
    ) {
      const view = new DataView(bytes.buffer);
      view.setUint16(offset + 5, height);
      view.setUint16(offset + 7, width);
      return bytes;
    }
  }
  throw new Error('Fixture JPEG has no dimensions');
}

function identity(overrides = {}) {
  return {
    issuer,
    subject: userId,
    tokenIdentifier: `${issuer}|${userId}`,
    version: 1,
    environmentKey: 'tablecards-development',
    sessionId: 'session_abcdefghijklmnop',
    contextType: 'account',
    accountId,
    membershipId: 'membership_abcdefghijklmnop',
    role: 'owner',
    permissions: ['account:read'],
    ...overrides,
  };
}
function projection(
  customArtwork = true,
  reusable = true,
): ProductAccessProjection {
  return {
    version: 1,
    accountId,
    offerKey: 'planner_pro',
    offerRevision: 1,
    source: 'development_mock',
    featureFlags: [
      { key: 'custom_artwork', enabled: customArtwork },
      { key: 'reusable_presets', enabled: reusable },
    ],
    numericLimits: [],
    unitGrants: [],
    effectiveAt: 1,
    updatedAt: 1,
  };
}
async function files(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ({
    assets: await ctx.db.query('designAssets').collect(),
    storage: await ctx.db.system.query('_storage').collect(),
  }));
}
async function foreignFile(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob([Uint8Array.from(image).buffer], { type: 'image/jpeg' }),
    );
    await ctx.db.insert('designAssets', {
      publicId: 'asset_foreign12345678',
      accountId: otherAccountId,
      createdByUserId: userId,
      source: 'uploaded',
      storageId,
      mimeType: 'image/jpeg',
      width: 1050,
      height: 600,
      createdAt: 1,
    });
    return storageId;
  });
}

beforeEach(() => {
  access.get.mockReset();
  access.get.mockResolvedValue(projection());
});
afterEach(() => vi.restoreAllMocks());

describe('private TableCards HTTP files', () => {
  it('looks up the selected asset outside the library window without exposing another account descriptor', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(
        new Blob([Uint8Array.from(image).buffer], { type: 'image/jpeg' }),
      );
      for (let index = 0; index < 130; index += 1) {
        await ctx.db.insert('designAssets', {
          publicId: `asset_window_${index}`,
          accountId,
          createdByUserId: userId,
          source: 'uploaded',
          storageId,
          mimeType: 'image/jpeg',
          width: 1050,
          height: 600,
          createdAt: index,
        });
      }
    });
    const customer = t.withIdentity(identity());
    const listed = await customer.query(
      makeFunctionReference<'query'>('assets:list'),
      {},
    );
    expect(listed).toHaveLength(128);
    expect(
      listed.map((asset: { publicId: string }) => asset.publicId),
    ).not.toContain('asset_window_129');
    const get = makeFunctionReference<'query'>('assets:get');
    await expect(
      customer.query(get, { publicId: 'asset_window_129' }),
    ).resolves.toMatchObject({
      publicId: 'asset_window_129',
      url: '/v1/files/assets/asset_window_129',
    });
    await expect(
      t
        .withIdentity(identity({ accountId: otherAccountId }))
        .query(get, { publicId: 'asset_window_129' }),
    ).resolves.toBeNull();
    await expect(
      customer.query(get, { publicId: 'asset_missing' }),
    ).resolves.toBeNull();
    expect(access.get).not.toHaveBeenCalled();
  });
  it('fully decodes bounded PNG pixels and rejects truncated or oversized raster headers before storage', async () => {
    const t = convexTest(schema, modules);
    const customer = t.withIdentity(identity());
    const png = encode({
      width: 1050,
      height: 600,
      channels: 4,
      data: new Uint8Array(1050 * 600 * 4).fill(255),
    });
    const uploaded = await customer.fetch('/v1/files/artwork', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'image/png' },
      body: Uint8Array.from(png).buffer,
    });
    expect(uploaded.status).toBe(201);
    const count = (await files(t)).storage.length;
    for (const invalid of [
      png.subarray(0, 24),
      png.subarray(0, png.length - 12),
      image.subarray(0, image.length - 30),
    ]) {
      const response = await customer.fetch('/v1/files/artwork', {
        method: 'POST',
        headers: {
          ...headers,
          'content-type': invalid[0] === 137 ? 'image/png' : 'image/jpeg',
        },
        body: Uint8Array.from(invalid).buffer,
      });
      expect(response.status).toBe(400);
    }
    const huge = Uint8Array.from(png);
    const header = new DataView(huge.buffer);
    header.setUint32(16, 7000);
    header.setUint32(20, 4000);
    expect(
      (
        await customer.fetch('/v1/files/artwork', {
          method: 'POST',
          headers: { ...headers, 'content-type': 'image/png' },
          body: huge.buffer,
        })
      ).status,
    ).toBe(400);
    expect((await files(t)).storage).toHaveLength(count);
  });
  it('uploads server-owned bytes, lists a protected address, and retrieves them with fresh authorization', async () => {
    const t = convexTest(schema, modules);
    const customer = t.withIdentity(identity());
    const uploaded = await customer.fetch('/v1/files/artwork', {
      method: 'POST',
      headers,
      body: image,
    });
    expect(uploaded.status).toBe(201);
    expect(uploaded.headers.get('access-control-allow-origin')).toBe(origin);
    expect(uploaded.headers.get('cache-control')).toBe('no-store');
    const result = (await uploaded.json()) as { publicId: string };
    expect(result).not.toHaveProperty('storageId');
    const assets = await customer.query(
      makeFunctionReference<'query'>('assets:list'),
      {},
    );
    expect(assets).toMatchObject([
      { publicId: result.publicId, url: `/v1/files/assets/${result.publicId}` },
    ]);
    const downloaded = await customer.fetch(
      `/v1/files/assets/${result.publicId}`,
      { headers },
    );
    expect(downloaded.status).toBe(200);
    expect(downloaded.headers.get('content-type')).toBe('image/jpeg');
    expect(new Uint8Array(await downloaded.arrayBuffer())).toEqual(
      new Uint8Array(image),
    );
    expect(access.get).toHaveBeenCalledTimes(3);
    expect(access.get).toHaveBeenLastCalledWith({
      contextToken: 'synthetic-context',
    });
  });

  it('denies missing identity, wrong environment, foreign account and unregistered origin', async () => {
    const t = convexTest(schema, modules);
    await foreignFile(t);
    expect(
      (await t.fetch('/v1/files/assets/asset_foreign12345678', { headers }))
        .status,
    ).toBe(401);
    expect(
      (
        await t
          .withIdentity(identity({ environmentKey: 'tablecards-production' }))
          .fetch('/v1/files/assets/asset_foreign12345678', { headers })
      ).status,
    ).toBe(403);
    expect(
      (
        await t
          .withIdentity(identity())
          .fetch('/v1/files/assets/asset_foreign12345678', { headers })
      ).status,
    ).toBe(404);
    expect(
      (
        await t.withIdentity(identity()).fetch('/v1/files/artwork', {
          method: 'POST',
          headers: { ...headers, origin: `${origin}.attacker.test` },
          body: image,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await t.withIdentity(identity()).fetch('/v1/files/artwork', {
          method: 'POST',
          headers: { authorization: headers.authorization },
          body: image,
        })
      ).status,
    ).toBe(403);
    expect((await files(t)).storage).toHaveLength(1);
    expect((await files(t)).assets).toHaveLength(1);
  });

  it('returns exact-origin preflight allowing only required transfer headers', async () => {
    const t = convexTest(schema, modules);
    const response = await t.fetch('/v1/files/artwork', {
      method: 'OPTIONS',
      headers: {
        origin,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization,content-type',
      },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(origin);
    expect(response.headers.get('access-control-allow-methods')).toBe(
      'POST, OPTIONS',
    );
    expect(response.headers.get('access-control-allow-headers')).toBe(
      'Authorization, Content-Type',
    );
    expect(access.get).not.toHaveBeenCalled();
  });

  it('does not attach or delete a foreign storage ID on legacy finalize denial or replay', async () => {
    const t = convexTest(schema, modules);
    const storageId = await foreignFile(t);
    const finalize = makeFunctionReference<'action'>('assets:finalize');
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await expect(
        t
          .withIdentity(identity())
          .action(finalize, { accessToken: 'synthetic-context', storageId }),
      ).rejects.toThrow(/INVALID_INPUT|Refresh/u);
    }
    await expect(
      t
        .withIdentity(identity())
        .action(makeFunctionReference<'action'>('assets:generateUploadUrl'), {
          accessToken: 'synthetic-context',
        }),
    ).rejects.toThrow(/INVALID_INPUT|Refresh/u);
    expect(
      await t.run(async (ctx) => (await ctx.storage.get(storageId)) !== null),
    ).toBe(true);
    const state = await files(t);
    expect(state.assets).toHaveLength(1);
    expect(state.storage).toHaveLength(1);
    expect(access.get).not.toHaveBeenCalled();
  });

  it('denies invalid, empty, oversized and mismatched images without allocating files', async () => {
    const t = convexTest(schema, modules);
    const customer = t.withIdentity(identity());
    const requests: RequestInit[] = [
      { headers, body: new Uint8Array([1, 2, 3]) },
      { headers, body: new Uint8Array() },
      { headers, body: Uint8Array.from(imageWithDimensions(700, 400)).buffer },
      {
        headers,
        body: Uint8Array.from(imageWithDimensions(1050, 1050)).buffer,
      },
      { headers: { ...headers, 'content-type': 'image/png' }, body: image },
      {
        headers: { ...headers, 'content-length': String(10 * 1024 * 1024 + 1) },
        body: image,
      },
      { headers, body: new Uint8Array(10 * 1024 * 1024 + 1) },
      { headers: { ...headers, 'content-type': 'image/svg+xml' }, body: image },
    ];
    for (const init of requests)
      expect(
        (await customer.fetch('/v1/files/artwork', { method: 'POST', ...init }))
          .status,
      ).toBe(400);
    expect((await files(t)).storage).toHaveLength(0);
    expect((await files(t)).assets).toHaveLength(0);
  });

  it('preserves an attached upload when attachment committed before its response was lost', async () => {
    const t = convexTest(schema, modules);
    const storageId = await t.run(async (ctx) =>
      ctx.storage.store(
        new Blob([Uint8Array.from(image).buffer], { type: 'image/jpeg' }),
      ),
    );
    await t.mutation(
      makeFunctionReference<'mutation'>('assets:recordValidated'),
      {
        accountId,
        userId,
        storageId,
        source: 'uploaded',
        mimeType: 'image/jpeg',
        width: 1050,
        height: 600,
      },
    );
    await expect(
      t.mutation(
        makeFunctionReference<'mutation'>('assets:cleanupUnattached'),
        { storageId },
      ),
    ).resolves.toBe(false);
    expect(
      await t.run(async (ctx) => (await ctx.storage.get(storageId)) !== null),
    ).toBe(true);
    expect((await files(t)).assets).toHaveLength(1);
    const orphan = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(['pending'], { type: 'image/jpeg' })),
    );
    await expect(
      t.mutation(
        makeFunctionReference<'mutation'>('assets:cleanupUnattached'),
        { storageId: orphan },
      ),
    ).resolves.toBe(true);
    expect((await files(t)).storage).toHaveLength(1);
  });

  it('rechecks entitlement and project scope and cleans up only its new file after authorization is revoked', async () => {
    const t = convexTest(schema, modules);
    const foreign = await foreignFile(t);
    const customer = t.withIdentity(identity());
    access.get.mockResolvedValueOnce(projection(false));
    expect(
      (
        await customer.fetch('/v1/files/artwork', {
          method: 'POST',
          headers,
          body: image,
        })
      ).status,
    ).toBe(403);
    access.get.mockResolvedValueOnce(projection(true, false));
    expect(
      (
        await customer.fetch('/v1/files/artwork', {
          method: 'POST',
          headers,
          body: image,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await customer.fetch(
          '/v1/files/artwork?projectId=project_foreign12345678',
          { method: 'POST', headers, body: image },
        )
      ).status,
    ).toBe(404);
    access.get
      .mockResolvedValueOnce(projection())
      .mockResolvedValueOnce({ ...projection(), accountId: otherAccountId });
    expect(
      (
        await customer.fetch('/v1/files/artwork', {
          method: 'POST',
          headers,
          body: image,
        })
      ).status,
    ).toBe(403);
    expect(
      await t.run(async (ctx) => (await ctx.storage.get(foreign)) !== null),
    ).toBe(true);
    expect((await files(t)).storage).toHaveLength(1);
    expect((await files(t)).assets).toHaveLength(1);
  });

  it('denies replayed asset/export requests after authoritative membership or session revocation', async () => {
    const t = convexTest(schema, modules);
    const customer = t.withIdentity(identity());
    const uploaded = await customer.fetch('/v1/files/artwork', {
      method: 'POST',
      headers,
      body: image,
    });
    const { publicId } = (await uploaded.json()) as { publicId: string };
    const path = `/v1/files/assets/${publicId}`;
    expect((await customer.fetch(path, { headers })).status).toBe(200);
    const { BffProductAccessError } = await import('@tofler/bff-auth/server');
    access.get.mockRejectedValueOnce(
      new BffProductAccessError('FORBIDDEN', 403),
    );
    expect((await customer.fetch(path, { headers })).status).toBe(403);
    access.get.mockRejectedValueOnce(
      new BffProductAccessError('UNAUTHENTICATED', 401),
    );
    expect((await customer.fetch(path, { headers })).status).toBe(401);
    expect(
      (await customer.fetch(`${path}?accessToken=forbidden`, { headers }))
        .status,
    ).toBe(404);
    expect((await files(t)).storage).toHaveLength(1);
  });

  it('serves ready PDFs only in their project account, with no storage ID or bearer URL in the projection', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const projectId = await ctx.db.insert('projects', {
        publicId: 'project_export12345678',
        accountId,
        createdByUserId: userId,
        title: 'Synthetic',
        state: 'active',
        designKind: 'predefined',
        designReference: 'minimal-ivory',
        guestCount: 1,
        revision: 1,
        createdAt: 1,
        updatedAt: 1,
      });
      const storageId = await ctx.storage.store(
        new Blob(['%PDF-1.7\nsynthetic'], { type: 'application/pdf' }),
      );
      await ctx.db.insert('projectExports', {
        publicId: 'export_ready12345678',
        accountId,
        projectId,
        requestedByUserId: userId,
        projectRevision: 1,
        status: 'ready',
        storageId,
        createdAt: 1,
        updatedAt: 1,
      });
      await ctx.db.insert('projectExports', {
        publicId: 'export_queued12345678',
        accountId,
        projectId,
        requestedByUserId: userId,
        projectRevision: 1,
        status: 'queued',
        storageId,
        createdAt: 1,
        updatedAt: 1,
      });
    });
    const customer = t.withIdentity(identity());
    const response = await customer.fetch(
      '/v1/files/exports/export_ready12345678',
      { headers },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(await response.text()).toContain('%PDF-1.7');
    expect(
      await customer.query(makeFunctionReference<'query'>('exportState:get'), {
        exportId: 'export_ready12345678',
      }),
    ).toMatchObject({ downloadUrl: '/v1/files/exports/export_ready12345678' });
    expect(
      (
        await customer.fetch('/v1/files/exports/export_queued12345678', {
          headers,
        })
      ).status,
    ).toBe(404);
    access.get.mockResolvedValueOnce({
      ...projection(),
      accountId: otherAccountId,
    });
    expect(
      (
        await t
          .withIdentity(identity({ accountId: otherAccountId }))
          .fetch('/v1/files/exports/export_ready12345678', { headers })
      ).status,
    ).toBe(404);
  });
});
