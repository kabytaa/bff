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
    expect(() => auth.getSignInUrl('//attacker.invalid')).toThrow();
    auth.dispose();
  });
});
