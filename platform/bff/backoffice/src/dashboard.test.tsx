import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Dashboard, type DashboardModel } from './dashboard';

describe('Dashboard', () => {
  it('renders the ready state and keeps registry management read only', () => {
    render(
      <Dashboard
        model={{
          state: 'ready',
          health: {
            status: 'ok',
            service: 'business-factory-bff',
            version: 'test-build',
          },
          environments: [
            {
              id: 'one',
              createdAt: 1,
              key: 'sample-development',
              businessName: 'Sample',
              environmentName: 'Development',
              updatedAt: 1,
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Business Factory' }),
    ).toBeInTheDocument();
    expect(screen.getByText('sample-development')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^create$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^delete$/i })).toBeNull();
  });

  it('shows the verified email without revealing an allowlist', () => {
    render(
      <Dashboard
        model={{
          state: 'forbidden',
          email: 'operator@example.com',
          emailVerified: true,
        }}
      />,
    );

    expect(screen.getByText('Access not enabled')).toBeInTheDocument();
    expect(screen.getByText('operator@example.com')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.queryByText(/allowlist.*operator@example.com/i)).toBeNull();
  });

  it('renders an intentional empty registry state', () => {
    render(
      <Dashboard
        model={{
          state: 'ready',
          health: {
            status: 'ok',
            service: 'business-factory-bff',
            version: 'development',
          },
          environments: [],
        }}
      />,
    );

    expect(
      screen.getByText('No Business environments yet.'),
    ).toBeInTheDocument();
  });

  it('shows safe paginated customer state and policy provenance read only', () => {
    render(
      <Dashboard
        model={{
          state: 'ready',
          health: {
            status: 'ok',
            service: 'business-factory-bff',
            version: 'development',
          },
          selectedEnvironmentKey: 'sample-development',
          environments: [
            {
              id: 'one',
              createdAt: 1,
              key: 'sample-development',
              businessName: 'Sample',
              environmentName: 'Development',
              updatedAt: 1,
            },
          ],
          customerDetail: {
            loading: false,
            users: [
              {
                id: 'user_0123456789abcdef',
                verifiedEmail: 'customer@example.invalid',
                displayName: 'Customer',
                activeMembershipCount: 1,
                ownedAccountCount: 1,
              },
            ],
            accounts: [
              {
                id: 'account_0123456789abcdef',
                ownerUserId: 'user_0123456789abcdef',
                effectivePolicy: {
                  seatLimit: 2,
                  adminRoleEnabled: false,
                  memberInvitationsEnabled: true,
                },
                policySources: {
                  seatLimit: 'account_override',
                  adminRoleEnabled: 'business_default',
                  memberInvitationsEnabled: 'account_override',
                },
                activeMemberCount: 1,
                reservedInvitationCount: 0,
              },
            ],
            memberships: [],
            sessions: [],
            securityEvents: [],
          },
        }}
      />,
    );

    expect(screen.getByText('customer@example.invalid')).toBeInTheDocument();
    expect(screen.getByText(/Seats 1\/2/)).toHaveTextContent(
      'account_override',
    );
    expect(screen.queryByRole('button', { name: /revoke/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /configure/i })).toBeNull();
  });

  it.each<{ expected: string; model: DashboardModel }>([
    {
      model: { state: 'checking' },
      expected: 'Checking access',
    },
    {
      model: { state: 'signed-out' },
      expected: 'Operator sign-in',
    },
    {
      model: {
        state: 'configuration-error',
        message: 'Public configuration is missing.',
      },
      expected: 'Configuration required',
    },
    {
      model: { state: 'error', message: 'Health check failed.' },
      expected: 'Dashboard unavailable',
    },
  ])('renders the $model.state state', ({ model, expected }) => {
    render(<Dashboard model={model} />);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
