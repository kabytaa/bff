import { describe, expect, it, vi } from 'vitest';

import type { AccountSummary, CurrentCustomerView } from '@bff/contracts';
import {
  createAuthSessionStore,
  createBffAuthBrowserClient,
  type AccountPreferenceStore,
  type AuthSessionMessenger,
} from './index';

const adapterOrigin = 'https://example-backend.convex.site';
const bffOrigin = 'https://bff-dev.tofler.tech';
const webOrigin = 'https://example.tofler.app';
const environmentKey = 'example-development';
const accountOneId = 'account_1111111111111111';
const accountTwoId = 'account_2222222222222222';

interface FetchCall {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function fetchHarness() {
  const calls: FetchCall[] = [];
  const results: Array<Response | Error | Promise<Response>> = [];
  const implementation: typeof fetch = async (input, init) => {
    calls.push({
      url: input instanceof Request ? input.url : input.toString(),
      init,
    });
    const next = results.shift();
    if (!next) throw new Error('Unexpected fetch');
    if (next instanceof Error) throw next;
    return await next;
  };
  return {
    calls,
    enqueue: (...values: Array<Response | Error | Promise<Response>>) => {
      results.push(...values);
    },
    implementation,
  };
}

function account(id: string, role: 'owner' | 'admin' | 'member' = 'owner') {
  return {
    id,
    displayName: id === accountOneId ? 'First account' : 'Second account',
    membership: {
      id: `membership_${id.slice(-16)}`,
      accountId: id,
      userId: 'user_1111111111111111',
      role,
      createdAt: 1,
      updatedAt: 1,
    },
    policy: {
      values: {
        seatLimit: 3,
        adminRoleEnabled: true,
        memberInvitationsEnabled: true,
      },
      sources: {
        seatLimit: 'business_default',
        adminRoleEnabled: 'business_default',
        memberInvitationsEnabled: 'business_default',
      },
    },
    activeMemberCount: 1,
    reservedInvitationCount: 0,
    createdAt: 1,
    updatedAt: 1,
  } satisfies AccountSummary;
}

function customer(accounts: AccountSummary[]): CurrentCustomerView {
  return {
    user: {
      id: 'user_1111111111111111',
      environmentKey,
      verifiedEmail: 'owner@example.com',
      displayName: 'Owner',
      createdAt: 1,
      updatedAt: 1,
    },
    accounts,
  };
}

function authenticated(
  accountId: string,
  accounts: AccountSummary[],
  token = `token-for-${accountId}`,
) {
  return {
    status: 'authenticated' as const,
    token,
    accountId,
    expiresAt: 1_600,
    customer: customer(accounts),
  };
}

function onboarding(token = 'onboarding-token') {
  return {
    status: 'onboarding_required' as const,
    token,
    expiresAt: 1_600,
    customer: customer([]),
  };
}

function preference(initial: string | null = null) {
  let value = initial;
  const store: AccountPreferenceStore = {
    read: vi.fn(() => value),
    write: vi.fn((accountId) => {
      value = accountId;
    }),
    clear: vi.fn(() => {
      value = null;
    }),
  };
  return { store, value: () => value };
}

function messenger(): AuthSessionMessenger {
  return {
    postSessionEnded: vi.fn(),
    subscribeSessionEnded: () => () => undefined,
    close: vi.fn(),
  };
}

function client(
  implementation: typeof fetch,
  accountPreference = preference().store,
  sessionMessenger = messenger(),
) {
  return createBffAuthBrowserClient({
    sessionAdapterBaseUrl: adapterOrigin,
    bffBaseUrl: bffOrigin,
    environmentKey,
    webOrigin,
    fetch: implementation,
    accountPreference,
    messenger: sessionMessenger,
    now: () => 1_000_000,
  });
}

describe('createAuthSessionStore', () => {
  it('increments the generation and notifies active listeners', () => {
    const store = createAuthSessionStore({ status: 'signed_out' });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.replace(authenticated(accountOneId, [account(accountOneId)]));

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.replace({ status: 'signed_out' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({
      generation: 2,
      state: { status: 'signed_out' },
    });
  });
});

describe('createBffAuthBrowserClient', () => {
  it('renames the selected workspace and refreshes the authoritative account list', async () => {
    const harness = fetchHarness();
    harness.enqueue(json(authenticated(accountOneId, [account(accountOneId)])));
    const auth = client(harness.implementation);
    await auth.bootstrap();
    const renamed = { ...account(accountOneId), displayName: 'Wedding Studio' };
    const observedStatuses: string[] = [];
    const unsubscribe = auth.subscribe(() => {
      observedStatuses.push(auth.getSnapshot().state.status);
    });
    harness.enqueue(
      json(renamed),
      json(authenticated(accountOneId, [renamed])),
    );
    await expect(
      auth.renameAccount({
        accountId: accountOneId,
        displayName: '  Wedding Studio  ',
      }),
    ).resolves.toMatchObject({ displayName: 'Wedding Studio' });
    expect(harness.calls[1]?.url).toBe(
      `${bffOrigin}/v1/accounts/name?environment=${environmentKey}`,
    );
    expect(JSON.parse(String(harness.calls[1]?.init?.body))).toEqual({
      accountId: accountOneId,
      displayName: 'Wedding Studio',
    });
    expect(auth.getSnapshot().state).toMatchObject({
      status: 'authenticated',
      customer: { accounts: [{ displayName: 'Wedding Studio' }] },
    });
    expect(observedStatuses).toEqual(['authenticated']);
    unsubscribe();
    auth.dispose();
  });

  it('does not reactivate a renamed account after switching while its mutation is pending', async () => {
    const harness = fetchHarness();
    const accounts = [account(accountOneId), account(accountTwoId)];
    harness.enqueue(json(authenticated(accountOneId, accounts)));
    const auth = client(harness.implementation);
    await auth.bootstrap();
    const mutation = deferred<Response>();
    harness.enqueue(
      mutation.promise,
      json(authenticated(accountTwoId, accounts)),
    );
    const rename = auth.renameAccount({
      accountId: accountOneId,
      displayName: 'Renamed',
    });
    await vi.waitFor(() => expect(harness.calls).toHaveLength(2));
    await auth.selectAccount(accountTwoId);
    mutation.resolve(json({ ...accounts[0], displayName: 'Renamed' }));
    await rename;
    expect(auth.getSnapshot().state).toMatchObject({
      status: 'authenticated',
      accountId: accountTwoId,
    });
    expect(harness.calls).toHaveLength(3);
    auth.dispose();
  });

  it('does not restore a renamed account when its metadata refresh finishes after logout', async () => {
    const harness = fetchHarness();
    const original = account(accountOneId);
    harness.enqueue(json(authenticated(accountOneId, [original])));
    const auth = client(harness.implementation);
    await auth.bootstrap();
    const renamed = { ...original, displayName: 'Renamed' };
    const refresh = deferred<Response>();
    harness.enqueue(json(renamed), refresh.promise, json({ signedOut: true }));
    const rename = auth.renameAccount({
      accountId: accountOneId,
      displayName: 'Renamed',
    });
    await vi.waitFor(() => expect(harness.calls).toHaveLength(3));
    await auth.logout();
    refresh.resolve(json(authenticated(accountOneId, [renamed])));
    await rename;
    expect(auth.getSnapshot().state).toEqual({ status: 'signed_out' });
    auth.dispose();
  });

  it('fails closed if the session is revoked during a rename metadata refresh', async () => {
    const harness = fetchHarness();
    const original = account(accountOneId);
    harness.enqueue(json(authenticated(accountOneId, [original])));
    const auth = client(harness.implementation);
    await auth.bootstrap();
    harness.enqueue(
      json({ ...original, displayName: 'Renamed' }),
      json(
        {
          error: {
            code: 'SESSION_EXPIRED',
            message: 'Sign in again.',
            correlationId: 'correlation_1111111111111111',
          },
        },
        401,
      ),
    );
    await expect(
      auth.renameAccount({ accountId: accountOneId, displayName: 'Renamed' }),
    ).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    expect(auth.getSnapshot().state).toEqual({ status: 'signed_out' });
    auth.dispose();
  });
  it('bootstraps onboarding, one-account and multi-account states without storing tokens', async () => {
    const cases = [
      onboarding(),
      authenticated(accountOneId, [account(accountOneId)]),
      {
        status: 'account_selection_required' as const,
        customer: customer([account(accountOneId), account(accountTwoId)]),
      },
    ];

    for (const expected of cases) {
      const harness = fetchHarness();
      harness.enqueue(json(expected));
      const stored = preference();
      const auth = client(harness.implementation, stored.store);

      await expect(auth.bootstrap()).resolves.toMatchObject({
        state: expected,
      });
      expect(harness.calls[0]?.url).toBe(
        `${adapterOrigin}/_tofler/auth/context`,
      );
      expect(harness.calls[0]?.init).toMatchObject({
        method: 'POST',
        credentials: 'include',
      });
      expect(stored.value()).toBe(
        expected.status === 'authenticated' ? expected.accountId : null,
      );
      expect(JSON.stringify(stored.value())).not.toContain('token');
      auth.dispose();
    }
  });

  it('clears a stale account preference and retries authoritative selection once', async () => {
    const harness = fetchHarness();
    harness.enqueue(
      json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Account membership is required.',
            correlationId: 'correlation_1111111111111111',
          },
        },
        403,
      ),
      json({
        status: 'account_selection_required',
        customer: customer([account(accountOneId), account(accountTwoId)]),
      }),
    );
    const stored = preference('account_stale000000000');
    const auth = client(harness.implementation, stored.store);

    await expect(auth.bootstrap()).resolves.toMatchObject({
      state: { status: 'account_selection_required' },
    });
    expect(JSON.parse(String(harness.calls[0]?.init?.body))).toEqual({
      accountId: 'account_stale000000000',
    });
    expect(JSON.parse(String(harness.calls[1]?.init?.body))).toEqual({});
    expect(stored.store.clear).toHaveBeenCalledOnce();
    auth.dispose();
  });

  it('keeps selection tab-local and renews forced token requests as one flight', async () => {
    const harness = fetchHarness();
    const accounts = [account(accountOneId), account(accountTwoId)];
    harness.enqueue(
      json({
        status: 'account_selection_required',
        customer: customer(accounts),
      }),
      json(authenticated(accountTwoId, accounts)),
    );
    const auth = client(harness.implementation);
    await auth.bootstrap();
    await auth.selectAccount(accountTwoId);
    expect(auth.getSnapshot().state).toMatchObject({
      status: 'authenticated',
      accountId: accountTwoId,
    });

    const renewed = authenticated(accountTwoId, accounts, 'renewed-token');
    harness.enqueue(json(renewed));
    const [first, second] = await Promise.all([
      auth.getAccessToken(true),
      auth.getAccessToken(true),
    ]);
    expect(first).toBe('renewed-token');
    expect(second).toBe('renewed-token');
    expect(harness.calls).toHaveLength(3);
    auth.dispose();
  });

  it('creates the first account with the onboarding token and activates it', async () => {
    const harness = fetchHarness();
    const created = account(accountOneId);
    harness.enqueue(
      json(onboarding()),
      json(created, 201),
      json(authenticated(accountOneId, [created])),
    );
    const auth = client(harness.implementation);
    await auth.bootstrap();

    await expect(auth.createAccount('My account')).resolves.toEqual(created);
    expect(harness.calls[1]?.url).toBe(
      `${bffOrigin}/v1/accounts?environment=example-development`,
    );
    expect(
      new Headers(harness.calls[1]?.init?.headers).get('authorization'),
    ).toBe('Bearer onboarding-token');
    expect(auth.getSnapshot().state).toMatchObject({
      status: 'authenticated',
      accountId: accountOneId,
    });
    auth.dispose();
  });

  it('exposes typed account management while keeping transfer on the cookie adapter', async () => {
    const harness = fetchHarness();
    const selected = account(accountOneId);
    const member = {
      membership: {
        id: 'membership_2222222222222222',
        accountId: accountOneId,
        userId: 'user_2222222222222222',
        role: 'member' as const,
        createdAt: 1,
        updatedAt: 1,
      },
      displayName: 'Member',
      verifiedEmail: 'member@example.com',
    };
    const invitation = {
      id: 'invitation_1111111111111111',
      accountId: accountOneId,
      recipientEmail: 'member@example.com',
      state: 'pending' as const,
      expiresAt: 2_000_000,
      createdAt: 1,
    };
    harness.enqueue(
      json(authenticated(accountOneId, [selected])),
      json({ page: [member], isDone: true, continueCursor: '' }),
      json({ page: [invitation], isDone: true, continueCursor: '' }),
      json({ invitation, invitationToken: 'i'.repeat(43) }, 201),
      json({ ...member.membership, role: 'admin' }),
      json({ ...invitation, state: 'revoked' }),
      json({
        removedMembershipId: member.membership.id,
        accountId: accountOneId,
        userId: member.membership.userId,
        activeMemberCount: 1,
      }),
      json(
        {
          authorizationUrl:
            'https://auth-dev.tofler.app/?transaction=transfer_1234567890123456',
          expiresAt: 2_000_000,
        },
        201,
      ),
    );
    const auth = client(harness.implementation);
    await auth.bootstrap();

    await expect(auth.listAccountMembers()).resolves.toMatchObject({
      page: [{ displayName: 'Member' }],
    });
    await expect(auth.listAccountInvitations()).resolves.toMatchObject({
      page: [{ recipientEmail: 'member@example.com' }],
    });
    await expect(
      auth.createInvitation('MEMBER@example.com'),
    ).resolves.toMatchObject({ invitationToken: 'i'.repeat(43) });
    await expect(
      auth.changeMembershipRole(member.membership.id, 'admin'),
    ).resolves.toMatchObject({ role: 'admin' });
    await expect(auth.revokeInvitation(invitation.id)).resolves.toMatchObject({
      state: 'revoked',
    });
    await expect(
      auth.removeMembership(member.membership.id),
    ).resolves.toMatchObject({ activeMemberCount: 1 });
    await expect(
      auth.startOwnershipTransfer(member.membership.id),
    ).resolves.toMatchObject({
      authorizationUrl: expect.stringContaining('transaction=transfer_'),
    });

    expect(harness.calls[1]?.url).toContain('/v1/accounts/members?');
    expect(harness.calls[2]?.url).toContain('/v1/accounts/invitations?');
    expect(harness.calls[7]?.url).toBe(
      `${adapterOrigin}/_tofler/auth/transfer/start`,
    );
    expect(
      new Headers(harness.calls[7]?.init?.headers).get('authorization'),
    ).toBeNull();
    expect(harness.calls[7]?.init?.credentials).toBe('include');
    auth.dispose();
  });

  it('inspects an invitation without requiring an authenticated session', async () => {
    const harness = fetchHarness();
    harness.enqueue(
      json({
        accountDisplayName: 'TableCards Studio',
        state: 'pending',
        expiresAt: 2_000_000,
      }),
    );
    const auth = client(harness.implementation);

    await expect(auth.inspectInvitation('i'.repeat(43))).resolves.toEqual({
      accountDisplayName: 'TableCards Studio',
      state: 'pending',
      expiresAt: 2_000_000,
    });
    expect(
      new Headers(harness.calls[0]?.init?.headers).get('authorization'),
    ).toBeNull();
    expect(harness.calls[0]?.url).toContain(
      '/v1/accounts/invitations/inspect?environment=',
    );
    auth.dispose();
  });

  it('ignores a completed renewal after logout changes the session generation', async () => {
    const harness = fetchHarness();
    const accounts = [account(accountOneId)];
    harness.enqueue(json(authenticated(accountOneId, accounts)));
    const auth = client(harness.implementation);
    await auth.bootstrap();

    const refresh = deferred<Response>();
    harness.enqueue(refresh.promise, json({ signedOut: true }));
    const tokenPromise = auth.getAccessToken(true);
    const logoutPromise = auth.logout();
    await logoutPromise;
    refresh.resolve(
      json(authenticated(accountOneId, accounts, 'stale-renewal-token')),
    );

    await expect(tokenPromise).resolves.toBeNull();
    expect(auth.getSnapshot().state).toEqual({ status: 'signed_out' });
    auth.dispose();
  });

  it('lets the latest overlapping account switch win', async () => {
    const harness = fetchHarness();
    const accounts = [account(accountOneId), account(accountTwoId)];
    harness.enqueue(
      json({
        status: 'account_selection_required',
        customer: customer(accounts),
      }),
    );
    const auth = client(harness.implementation);
    await auth.bootstrap();

    const first = deferred<Response>();
    const second = deferred<Response>();
    harness.enqueue(first.promise, second.promise);
    const firstSwitch = auth.selectAccount(accountOneId);
    const secondSwitch = auth.selectAccount(accountTwoId);
    second.resolve(json(authenticated(accountTwoId, accounts)));
    await secondSwitch;
    first.resolve(json(authenticated(accountOneId, accounts)));
    await firstSwitch;

    expect(auth.getSnapshot().state).toMatchObject({
      status: 'authenticated',
      accountId: accountTwoId,
    });
    auth.dispose();
  });

  it('does not mint an ambiguous context while account selection is loading', async () => {
    const harness = fetchHarness();
    const accounts = [account(accountOneId), account(accountTwoId)];
    harness.enqueue(
      json({
        status: 'account_selection_required',
        customer: customer(accounts),
      }),
    );
    const auth = client(harness.implementation);
    await auth.bootstrap();

    const selected = deferred<Response>();
    harness.enqueue(selected.promise);
    const selection = auth.selectAccount(accountTwoId);

    await expect(auth.getAccessToken(true)).resolves.toBeNull();
    expect(harness.calls).toHaveLength(2);

    selected.resolve(json(authenticated(accountTwoId, accounts)));
    await selection;
    expect(auth.getSnapshot().state).toMatchObject({
      status: 'authenticated',
      accountId: accountTwoId,
    });
    auth.dispose();
  });

  it('keeps the session locally unavailable when logout is retryable', async () => {
    const harness = fetchHarness();
    harness.enqueue(
      json(authenticated(accountOneId, [account(accountOneId)])),
      json(
        {
          error: {
            code: 'RETRYABLE_UNAVAILABLE',
            message: 'Try again.',
            correlationId: 'correlation_2222222222222222',
          },
        },
        503,
      ),
      json(
        authenticated(accountOneId, [account(accountOneId)], 'recovered-token'),
      ),
    );
    const auth = client(harness.implementation);
    await auth.bootstrap();

    await expect(auth.logout()).rejects.toMatchObject({
      code: 'RETRYABLE_UNAVAILABLE',
    });
    expect(auth.getSnapshot().state).toEqual({
      status: 'recoverable_error',
      message: 'Try again.',
      correlationId: 'correlation_2222222222222222',
    });
    await expect(auth.getAccessToken(true)).resolves.toBe('recovered-token');
    expect(JSON.parse(String(harness.calls[2]?.init?.body))).toEqual({
      accountId: accountOneId,
    });
    auth.dispose();
  });

  it('builds only safe same-adapter sign-in URLs', () => {
    const auth = client(fetchHarness().implementation);
    const url = new URL(auth.getSignInUrl('/cards?day=today'));
    expect(url.origin).toBe(adapterOrigin);
    expect(url.pathname).toBe('/_tofler/auth/login');
    expect(url.searchParams.get('webOrigin')).toBe(webOrigin);
    expect(url.searchParams.get('returnPath')).toBe('/cards?day=today');
    expect(url.searchParams.get('intent')).toBe('continue');
    const signupUrl = new URL(
      auth.getSignInUrl({ returnPath: '/welcome', intent: 'signup' }),
    );
    expect(signupUrl.searchParams.get('intent')).toBe('signup');
    expect(signupUrl.searchParams.get('returnPath')).toBe('/welcome');
    expect(() => auth.getSignInUrl('//attacker.invalid')).toThrow();
    auth.dispose();
  });
});
