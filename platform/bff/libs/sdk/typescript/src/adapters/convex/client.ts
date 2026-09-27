import { createElement, useCallback, useMemo, type ReactNode } from 'react';
import { ConvexProviderWithAuth, type ConvexReactClient } from 'convex/react';

import { useBffAuth } from '../../react';
import type { AuthSessionState } from '../../core';

export interface BffConvexAuthState {
  readonly contextKey: string;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
}

export function bffConvexAuthState(
  state: AuthSessionState,
): BffConvexAuthState {
  if (state.status === 'loading') {
    return {
      contextKey: 'loading',
      isLoading: true,
      isAuthenticated: false,
    };
  }
  if (state.status === 'authenticated') {
    return {
      contextKey: `${state.customer.user.id}:account:${state.accountId}`,
      isLoading: false,
      isAuthenticated: true,
    };
  }
  if (state.status === 'onboarding_required') {
    return {
      contextKey: `${state.customer.user.id}:onboarding`,
      isLoading: false,
      isAuthenticated: true,
    };
  }
  return {
    contextKey: state.status,
    isLoading: false,
    isAuthenticated: false,
  };
}

export function useBffAuthForConvex() {
  const { client, state } = useBffAuth();
  const { contextKey, isLoading, isAuthenticated } = bffConvexAuthState(state);
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) =>
      await client.getAccessToken(forceRefreshToken),
    [client, contextKey],
  );

  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [fetchAccessToken, isAuthenticated, isLoading],
  );
}

export interface BffConvexProviderProps {
  readonly client: ConvexReactClient;
  readonly children?: ReactNode;
}

export function BffConvexProvider({
  client,
  children,
}: BffConvexProviderProps) {
  const { state } = useBffAuth();
  const { contextKey } = bffConvexAuthState(state);
  return createElement(
    ConvexProviderWithAuth,
    {
      key: contextKey,
      client,
      useAuth: useBffAuthForConvex,
    },
    children,
  );
}
