import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const accountId = 'account_fresh_login_0001';
const userId = 'user_fresh_login_00001';
const current = makeFunctionReference<
  'action',
  { accessToken: string },
  { id: string; source: string; aiBatchesRemaining: number }
>('productAccess:current');
const projects = makeFunctionReference<'query', { state: 'active' }, unknown[]>(
  'projects:list',
);

function identity() {
  return {
    tokenIdentifier: `https://auth-dev.tofler.app|${userId}`,
    issuer: 'https://auth-dev.tofler.app',
    subject: userId,
    version: 1,
    environmentKey: 'tablecards-development',
    sessionId: 'session_fresh_login001',
    contextType: 'account',
    accountId,
    membershipId: 'membership_fresh_login01',
    role: 'owner',
    permissions: ['account:read'],
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('fresh-account product access with development mocks disabled', () => {
  it('loads default Free access and an empty project list without initializing a mock or calling AI', async () => {
    vi.stubEnv('TABLECARDS_DEVELOPMENT_MOCKS_ENABLED', 'false');
    const requests: string[] = [];
    // Only the cross-service transport is substituted. The SDK parsing,
    // TableCards action, account guard and project query run normally.
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      requests.push(url.pathname);
      if (url.pathname === '/v1/product-access') {
        return Response.json({
          version: 1,
          accountId,
          offerKey: 'free',
          offerRevision: 1,
          source: 'default',
          featureFlags: [],
          numericLimits: [],
          unitGrants: [],
          effectiveAt: 1,
          updatedAt: 1,
        });
      }
      if (url.pathname === '/v1/product-access/units') {
        return Response.json({
          accountId,
          unitType: 'ai_background_batch',
          periodKey: 'unallocated',
          allowance: 0,
          reserved: 0,
          consumed: 0,
          available: 0,
          updatedAt: 1,
        });
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    });
    const t = convexTest({ schema, modules, transactionLimits: true });
    const caller = t.withIdentity(identity());
    const [access, library] = await Promise.all([
      caller.action(current, { accessToken: 'synthetic_fresh_account_token' }),
      caller.query(projects, { state: 'active' }),
    ]);
    expect(access).toMatchObject({
      id: 'free',
      source: 'default',
      maximumActiveProjects: 1,
      aiBatchesRemaining: 0,
    });
    expect(library).toEqual([]);
    expect(requests).toEqual([
      '/v1/product-access',
      '/v1/product-access/units',
    ]);
    expect(
      await t.run(async (ctx) => await ctx.db.query('aiBatches').take(1)),
    ).toEqual([]);
  });

  it('refuses an unauthenticated access read before any BFF or AI call', async () => {
    vi.stubEnv('TABLECARDS_DEVELOPMENT_MOCKS_ENABLED', 'false');
    const network = vi.fn();
    vi.stubGlobal('fetch', network);
    const t = convexTest({ schema, modules, transactionLimits: true });
    await expect(
      t.action(current, { accessToken: 'synthetic_fresh_account_token' }),
    ).rejects.toThrow('UNAUTHENTICATED');
    expect(network).not.toHaveBeenCalled();
  });
});
