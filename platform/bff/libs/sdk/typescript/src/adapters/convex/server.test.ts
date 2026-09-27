import type { UserIdentity } from 'convex/server';
import { ConvexError } from 'convex/values';
import { describe, expect, it, vi } from 'vitest';

import {
  createBffConvexAuthConfig,
  requireBffConvexAccountScope,
  requireBffConvexAccountContext,
  requireBffConvexContext,
  requireBffConvexUserScope,
  withBffAccountAction,
  withBffAccountHttpAction,
  withBffAccountMutation,
  withBffAccountQuery,
  type BffConvexAuthContext,
} from './server';

const issuer = 'https://auth-dev.tofler.app';
const environmentKey = 'example-development';
const jwksUrl = 'https://bff-backend.convex.site/v1/auth/jwks';

function identity(overrides: Partial<UserIdentity> = {}): UserIdentity {
  return {
    tokenIdentifier: `${issuer}|user_abcdefghijklmnop`,
    issuer,
    subject: 'user_abcdefghijklmnop',
    version: 1,
    environmentKey,
    sessionId: 'session_abcdefghijklmnop',
    contextType: 'account',
    accountId: 'account_abcdefghijklmnop',
    membershipId: 'membership_abcdefghijklmnop',
    role: 'owner',
    permissions: ['account:read', 'members:read'],
    ...overrides,
  };
}

function authContext(value: UserIdentity | null): BffConvexAuthContext {
  return { auth: { getUserIdentity: vi.fn(async () => value) } };
}

function errorCode(error: unknown) {
  return error instanceof ConvexError &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'code' in error.data
    ? error.data.code
    : undefined;
}

describe('createBffConvexAuthConfig', () => {
  it('pins issuer, environment audience, JWKS and ES256', () => {
    expect(
      createBffConvexAuthConfig({ issuer, environmentKey, jwksUrl }),
    ).toEqual({
      providers: [
        {
          type: 'customJwt',
          applicationID: `${issuer}/environments/${environmentKey}`,
          issuer,
          jwks: jwksUrl,
          algorithm: 'ES256',
        },
      ],
    });
  });

  it.each([
    { issuer: 'http://bff.invalid', environmentKey, jwksUrl },
    { issuer, environmentKey: 'Wrong Environment', jwksUrl },
    {
      issuer,
      environmentKey,
      jwksUrl: 'https://bff-dev.tofler.tech/v1/auth/jwks#fragment',
    },
    {
      issuer,
      environmentKey,
      jwksUrl: 'https://bff-dev.tofler.tech/v1/auth/jwks?other=true',
    },
  ])('fails closed for malformed provider configuration', (options) => {
    expect(() => createBffConvexAuthConfig(options)).toThrow();
  });
});

describe('Convex account guards', () => {
  it('returns typed onboarding and account contexts from verified identities', async () => {
    await expect(
      requireBffConvexContext(
        authContext(
          identity({
            contextType: 'onboarding',
            accountId: undefined,
            membershipId: undefined,
            role: undefined,
            permissions: undefined,
          }),
        ),
        { issuer, environmentKey },
      ),
    ).resolves.toMatchObject({
      contextType: 'onboarding',
      userId: 'user_abcdefghijklmnop',
      sessionId: 'session_abcdefghijklmnop',
    });

    await expect(
      requireBffConvexAccountContext(authContext(identity()), {
        issuer,
        environmentKey,
        accountId: 'account_abcdefghijklmnop',
        permission: 'members:read',
      }),
    ).resolves.toMatchObject({
      contextType: 'account',
      accountId: 'account_abcdefghijklmnop',
      role: 'owner',
    });
  });

  it.each([
    {
      label: 'missing identity',
      value: null,
      options: { issuer, environmentKey },
      code: 'UNAUTHENTICATED',
    },
    {
      label: 'wrong issuer',
      value: identity({ issuer: 'https://attacker.invalid' }),
      options: { issuer, environmentKey },
      code: 'FORBIDDEN',
    },
    {
      label: 'wrong environment',
      value: identity({ environmentKey: 'another-development' }),
      options: { issuer, environmentKey },
      code: 'FORBIDDEN',
    },
    {
      label: 'wrong account',
      value: identity(),
      options: {
        issuer,
        environmentKey,
        accountId: 'account_other12345678',
      },
      code: 'FORBIDDEN',
    },
    {
      label: 'missing permission',
      value: identity(),
      options: {
        issuer,
        environmentKey,
        permission: 'members:manage' as const,
      },
      code: 'FORBIDDEN',
    },
  ])('denies $label', async ({ value, options, code }) => {
    try {
      await requireBffConvexAccountContext(authContext(value), options);
      throw new Error('Expected guard to reject');
    } catch (error) {
      expect(errorCode(error)).toBe(code);
    }
  });

  it('denies onboarding at the account guard', async () => {
    const onboarding = identity({
      contextType: 'onboarding',
      accountId: undefined,
      membershipId: undefined,
      role: undefined,
      permissions: undefined,
    });
    await expect(
      requireBffConvexAccountContext(authContext(onboarding), {
        issuer,
        environmentKey,
      }),
    ).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === 'ONBOARDING_REQUIRED',
    );
  });

  it('rejects browser-supplied user and account scopes that do not match the token', async () => {
    const context = await requireBffConvexAccountContext(
      authContext(identity()),
      { issuer, environmentKey },
    );
    expect(() =>
      requireBffConvexUserScope(context, 'user_other123456789'),
    ).toThrow();
    expect(() =>
      requireBffConvexAccountScope(context, 'account_other12345678'),
    ).toThrow();
    expect(() =>
      requireBffConvexUserScope(context, 'user_abcdefghijklmnop'),
    ).not.toThrow();
    expect(() =>
      requireBffConvexAccountScope(context, 'account_abcdefghijklmnop'),
    ).not.toThrow();
  });

  it('wraps query, mutation and action handlers with the same account context', async () => {
    const ctx = authContext(identity());
    const options = { issuer, environmentKey };
    const handler = vi.fn(
      async (_ctx: BffConvexAuthContext, args: { value: number }, auth) =>
        `${auth.accountId}:${args.value}`,
    );
    const wrappers = [
      withBffAccountQuery(options, handler),
      withBffAccountMutation(options, handler),
      withBffAccountAction(options, handler),
    ];

    for (const wrapped of wrappers) {
      await expect(wrapped(ctx, { value: 3 })).resolves.toBe(
        'account_abcdefghijklmnop:3',
      );
    }
  });

  it('returns bounded HTTP auth failures and a typed successful context', async () => {
    const handler = withBffAccountHttpAction(
      {
        issuer,
        environmentKey,
        webOrigins: ['https://business.example'],
        allowedMethods: ['GET'],
      },
      async (_ctx, _request, auth) =>
        Response.json({ accountId: auth.accountId }),
    );
    const request = new Request('https://backend.example/protected', {
      headers: { origin: 'https://business.example' },
    });

    const unauthorized = await handler(authContext(null), request);
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get('access-control-allow-origin')).toBe(
      'https://business.example',
    );
    expect(await unauthorized.json()).toMatchObject({
      error: { code: 'UNAUTHENTICATED' },
    });

    const forbidden = await handler(
      authContext(identity({ environmentKey: 'other-development' })),
      request,
    );
    expect(forbidden.status).toBe(403);
    expect(forbidden.headers.get('access-control-allow-origin')).toBe(
      'https://business.example',
    );

    const allowed = await handler(authContext(identity()), request);
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get('access-control-allow-origin')).toBe(
      'https://business.example',
    );
    expect(await allowed.json()).toEqual({
      accountId: 'account_abcdefghijklmnop',
    });

    const preflight = await handler(
      authContext(null),
      new Request('https://backend.example/protected', {
        method: 'OPTIONS',
        headers: { origin: 'https://business.example' },
      }),
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe(
      'https://business.example',
    );
    expect(preflight.headers.get('access-control-allow-headers')).toBe(
      'Authorization',
    );

    const deniedOrigin = await handler(
      authContext(identity()),
      new Request('https://backend.example/protected', {
        headers: { origin: 'https://attacker.example' },
      }),
    );
    expect(deniedOrigin.status).toBe(403);
    expect(deniedOrigin.headers.has('access-control-allow-origin')).toBe(false);
  });
});
