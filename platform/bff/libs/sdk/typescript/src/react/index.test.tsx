import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { AccountSummary, CurrentCustomerView } from '@bff/contracts';
import { createAuthSessionStore, type BffAuthBrowserClient } from '../browser';
import type { AuthSessionState } from '../core';
import {
  BffAccountSelector,
  BffAuthLink,
  BffAuthProvider,
  BffSignInButton,
  BffSignOutButton,
  useBffAuth,
} from './index';

const accountOneId = 'account_1111111111111111';
const accountTwoId = 'account_2222222222222222';

function account(id: string, name: string): AccountSummary {
  return {
    id,
    displayName: name,
    membership: {
      id: `membership_${id.slice(-16)}`,
      accountId: id,
      userId: 'user_1111111111111111',
      role: 'owner',
      createdAt: 1,
      updatedAt: 1,
    },
    policy: {
      values: {
        seatLimit: 2,
        adminRoleEnabled: false,
        memberInvitationsEnabled: false,
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
  };
}

function customer(): CurrentCustomerView {
  return {
    user: {
      id: 'user_1111111111111111',
      environmentKey: 'example-development',
      verifiedEmail: 'owner@example.com',
      displayName: 'Owner',
      createdAt: 1,
      updatedAt: 1,
    },
    accounts: [
      account(accountOneId, 'First workspace'),
      account(accountTwoId, 'Second workspace'),
    ],
  };
}

function fakeClient(initialState: AuthSessionState): BffAuthBrowserClient {
  const store = createAuthSessionStore(initialState);
  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    bootstrap: vi.fn(async () => store.getSnapshot()),
    selectAccount: vi.fn(async () => store.getSnapshot()),
    createAccount: vi.fn(async () => account(accountOneId, 'First workspace')),
    acceptInvitation: vi.fn(async () =>
      account(accountOneId, 'First workspace'),
    ),
    getAccessToken: vi.fn(async () => null),
    logout: vi.fn(async () => undefined),
    getSignInUrl: vi.fn((options = '/') => {
      const returnPath =
        typeof options === 'string' ? options : (options.returnPath ?? '/');
      const intent =
        typeof options === 'string'
          ? 'continue'
          : (options.intent ?? 'continue');
      return `https://adapter.example/_tofler/auth/login?returnPath=${encodeURIComponent(returnPath)}&intent=${intent}`;
    }),
    dispose: vi.fn(),
  };
}

function Status() {
  const { state } = useBffAuth();
  return <p>{state.status}</p>;
}

describe('BffAuthProvider', () => {
  it('provides the current external-store snapshot', () => {
    const markup = renderToStaticMarkup(
      <BffAuthProvider
        client={fakeClient({
          status: 'authenticated',
          token: 'short-token',
          accountId: accountOneId,
          expiresAt: 1_600,
          customer: customer(),
        })}
        autoBootstrap={false}
      >
        <Status />
      </BffAuthProvider>,
    );
    expect(markup).toContain('<p>authenticated</p>');
  });

  it('renders labelled sign-in, account selection and sign-out controls', () => {
    const markup = renderToStaticMarkup(
      <BffAuthProvider
        client={fakeClient({
          status: 'account_selection_required',
          customer: customer(),
        })}
        autoBootstrap={false}
      >
        <BffSignInButton returnPath="/cards">Continue</BffSignInButton>
        <BffAuthLink returnPath="/join" intent="signup">
          Create account
        </BffAuthLink>
        <BffAccountSelector label="Workspace" />
        <BffSignOutButton />
      </BffAuthProvider>,
    );

    expect(markup).toContain(
      'href="https://adapter.example/_tofler/auth/login',
    );
    expect(markup).toContain('returnPath=%2Fcards');
    expect(markup).toContain('returnPath=%2Fjoin&amp;intent=signup');
    expect(markup).toContain('<span>Workspace</span>');
    expect(markup).toContain('First workspace');
    expect(markup).toContain('Second workspace');
    expect(markup).toContain('>Sign out</button>');
  });

  it('requires the provider for hooks', () => {
    expect(() => renderToStaticMarkup(<Status />)).toThrow(
      'BffAuthProvider is missing',
    );
  });
});
