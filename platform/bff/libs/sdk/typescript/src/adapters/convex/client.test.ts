import { describe, expect, it, vi } from 'vitest';

import type { CurrentCustomerView } from '@bff/contracts';
import type { AuthSessionState } from '../../core';
import { createConvexAuthTokenFetcher } from './index';
import { bffConvexAuthState } from './client';

const customer: CurrentCustomerView = {
  user: {
    id: 'user_abcdefghijklmnop',
    environmentKey: 'example-development',
    verifiedEmail: 'owner@example.com',
    displayName: 'Owner',
    createdAt: 1,
    updatedAt: 1,
  },
  accounts: [],
};

describe('Convex browser authentication bridge', () => {
  it.each([
    {
      state: { status: 'loading' } satisfies AuthSessionState,
      expected: {
        contextKey: 'loading',
        isLoading: true,
        isAuthenticated: false,
      },
    },
    {
      state: { status: 'signed_out' } satisfies AuthSessionState,
      expected: {
        contextKey: 'signed_out',
        isLoading: false,
        isAuthenticated: false,
      },
    },
    {
      state: {
        status: 'onboarding_required',
        customer,
        token: 'onboarding-token',
        expiresAt: 1_600,
      } satisfies AuthSessionState,
      expected: {
        contextKey: 'user_abcdefghijklmnop:onboarding',
        isLoading: false,
        isAuthenticated: true,
      },
    },
    {
      state: {
        status: 'authenticated',
        customer,
        token: 'account-token',
        accountId: 'account_abcdefghijklmnop',
        expiresAt: 1_600,
      } satisfies AuthSessionState,
      expected: {
        contextKey: 'user_abcdefghijklmnop:account:account_abcdefghijklmnop',
        isLoading: false,
        isAuthenticated: true,
      },
    },
  ])('maps $state.status without exposing a token', ({ state, expected }) => {
    expect(bffConvexAuthState(state)).toEqual(expected);
    expect(JSON.stringify(bffConvexAuthState(state))).not.toContain('token');
  });

  it('forwards the native Convex force-refresh request', async () => {
    const fetchToken = vi.fn(async (forceRefreshToken: boolean) =>
      forceRefreshToken ? 'fresh-token' : 'cached-token',
    );
    const bridge = createConvexAuthTokenFetcher(fetchToken);

    await expect(
      bridge.fetchAccessToken({ forceRefreshToken: false }),
    ).resolves.toBe('cached-token');
    await expect(
      bridge.fetchAccessToken({ forceRefreshToken: true }),
    ).resolves.toBe('fresh-token');
    expect(fetchToken).toHaveBeenNthCalledWith(1, false);
    expect(fetchToken).toHaveBeenNthCalledWith(2, true);
  });
});
