import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ExampleDashboard } from './dashboard';

describe('ExampleDashboard', () => {
  it('renders an intentional signed-out reference state', () => {
    const markup = renderToStaticMarkup(
      <ExampleDashboard
        model={{ state: 'signed_out' }}
        actionControl={<a href="/sign-in">Sign in</a>}
      />,
    );

    expect(markup).toContain('One session, one verified context');
    expect(markup).toContain('Sign in');
  });

  it('shows the current user, account, role and all three protected paths', () => {
    const context = {
      userId: 'user_abcdefghijklmnop',
      accountId: 'account_abcdefghijklmnop',
      role: 'owner' as const,
    };
    const markup = renderToStaticMarkup(
      <ExampleDashboard
        model={{
          state: 'ready',
          displayName: 'Example Person',
          email: 'person@example.invalid',
          userId: context.userId,
          accountId: context.accountId,
          accountName: 'Example account',
          role: context.role,
          nativeContext: context,
          httpContext: context,
          bffContext: context,
        }}
        accountControl={<select aria-label="Account" />}
        actionControl={<button type="button">Sign out</button>}
      />,
    );

    expect(markup).toContain('Example Person');
    expect(markup).toContain('Example account');
    expect(markup).toContain('Native Convex query');
    expect(markup).toContain('Business HTTP API');
    expect(markup).toContain('Shared BFF /v1/me');
    expect(markup).toContain('Sign out');
  });

  it('keeps onboarding separate from account-authorized product access', () => {
    const markup = renderToStaticMarkup(
      <ExampleDashboard
        model={{
          state: 'onboarding_required',
          displayName: 'New Person',
          email: 'new@example.invalid',
          userId: 'user_newabcdefghijkl',
        }}
      />,
    );

    expect(markup).toContain('Account setup is required');
    expect(markup).not.toContain('Protected verification paths');
  });
});
