import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { describe, expect, it } from 'vitest';

import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const issuer = 'https://auth-dev.tofler.app';

interface ContextResult {
  readonly userId: string;
  readonly sessionId: string;
  readonly accountId: string;
  readonly membershipId: string;
  readonly role: 'owner' | 'admin' | 'member';
  readonly permissions: string[];
}

const currentContext = makeFunctionReference<
  'query',
  Record<string, never>,
  ContextResult
>('currentContext:currentContext');
const requireExactScope = makeFunctionReference<
  'query',
  { userId: string; accountId: string },
  ContextResult
>('currentContext:requireExactScope');

function accountIdentity(overrides: Record<string, unknown> = {}) {
  return {
    tokenIdentifier: `${issuer}|user_abcdefghijklmnop`,
    issuer,
    subject: 'user_abcdefghijklmnop',
    version: 1,
    environmentKey: 'example-development',
    sessionId: 'session_abcdefghijklmnop',
    contextType: 'account',
    accountId: 'account_abcdefghijklmnop',
    membershipId: 'membership_abcdefghijklmnop',
    role: 'owner',
    permissions: ['account:read', 'members:read'],
    ...overrides,
  };
}

describe('example native customer context', () => {
  it('returns only the verified account context', async () => {
    const t = convexTest(schema, modules).withIdentity(accountIdentity());

    await expect(t.query(currentContext, {})).resolves.toEqual({
      userId: 'user_abcdefghijklmnop',
      sessionId: 'session_abcdefghijklmnop',
      accountId: 'account_abcdefghijklmnop',
      membershipId: 'membership_abcdefghijklmnop',
      role: 'owner',
      permissions: ['account:read', 'members:read'],
    });
  });

  it('denies missing, onboarding and wrong-environment identities', async () => {
    await expect(
      convexTest(schema, modules).query(currentContext, {}),
    ).rejects.toThrow(/UNAUTHENTICATED|Authentication is required/u);
    await expect(
      convexTest(schema, modules)
        .withIdentity(
          accountIdentity({
            contextType: 'onboarding',
            accountId: undefined,
            membershipId: undefined,
            role: undefined,
            permissions: undefined,
          }),
        )
        .query(currentContext, {}),
    ).rejects.toThrow(/ONBOARDING_REQUIRED|Select or create/u);
    await expect(
      convexTest(schema, modules)
        .withIdentity(accountIdentity({ environmentKey: 'other-development' }))
        .query(currentContext, {}),
    ).rejects.toThrow(/FORBIDDEN|not valid here/u);
  });

  it('denies browser-supplied user and account scopes that do not match', async () => {
    const t = convexTest(schema, modules).withIdentity(accountIdentity());

    await expect(
      t.query(requireExactScope, {
        userId: 'user_other123456789',
        accountId: 'account_abcdefghijklmnop',
      }),
    ).rejects.toThrow(/FORBIDDEN|user scope/u);
    await expect(
      t.query(requireExactScope, {
        userId: 'user_abcdefghijklmnop',
        accountId: 'account_other12345678',
      }),
    ).rejects.toThrow(/FORBIDDEN|account scope/u);
  });

  it('exposes the same verified context through the protected HTTP route', async () => {
    const t = convexTest(schema, modules).withIdentity(accountIdentity());
    const response = await t.fetch('/v1/context', {
      headers: { origin: 'https://example-dev.tofler.app' },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'https://example-dev.tofler.app',
    );
    await expect(response.json()).resolves.toEqual({
      userId: 'user_abcdefghijklmnop',
      sessionId: 'session_abcdefghijklmnop',
      accountId: 'account_abcdefghijklmnop',
      membershipId: 'membership_abcdefghijklmnop',
      role: 'owner',
      permissions: ['account:read', 'members:read'],
    });
  });

  it('registers the session adapter and denies unregistered HTTP origins', async () => {
    const sessionResponse = await convexTest(schema, modules).fetch(
      '/_tofler/auth/context',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://example-dev.tofler.app',
          'x-tofler-csrf': '1',
        },
        body: '{}',
      },
    );
    expect(sessionResponse.status).toBe(401);

    const protectedResponse = await convexTest(schema, modules)
      .withIdentity(accountIdentity())
      .fetch('/v1/context', {
        headers: { origin: 'https://attacker.example' },
      });
    expect(protectedResponse.status).toBe(403);
  });
});
