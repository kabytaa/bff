// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Component } from './account-page';

const mocks = vi.hoisted(() => ({
  auth: {
    state: {
      status: 'authenticated',
      accountId: 'account-one',
      customer: {
        accounts: [
          {
            id: 'account-one',
            displayName: 'Review workspace',
            membership: { role: 'owner' },
          },
        ],
      },
    },
    snapshot: { generation: 1 },
    client: { renameAccount: vi.fn() },
  },
  backend: {
    getCurrentAccess: vi.fn(),
    listProjects: vi.fn(),
    startCheckout: vi.fn(),
  },
}));
vi.mock('@tofler/bff-auth/react', () => ({ useBffAuth: () => mocks.auth }));
vi.mock('../use-tablecards-backend', () => ({
  useTableCardsBackend: () => mocks.backend,
}));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.auth.snapshot.generation = 1;
  mocks.backend.getCurrentAccess.mockResolvedValue({
    offerKey: 'free',
    offerName: 'Free',
    maxActiveProjects: 1,
  });
  mocks.backend.listProjects.mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});
function mount(entry = '/settings') {
  const router = createMemoryRouter([{ path: '*', element: <Component /> }], {
    initialEntries: [entry],
  });
  return render(<RouterProvider router={router} />);
}

describe('operation-specific Account recovery', () => {
  it('retries failed checkout with the original idempotency key instead of refreshing usage', async () => {
    mocks.backend.startCheckout
      .mockRejectedValueOnce(
        new Error(
          '[CONVEX A(checkout:start)] Request ID: private Server Error',
        ),
      )
      .mockResolvedValueOnce({ checkoutUrl: '#checkout-ready' });
    mount('/settings?offer=planner_pro');
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Checkout could not be started.');
    expect(alert.textContent).not.toMatch(/CONVEX|Request ID/);
    expect(screen.queryByRole('button', { name: 'Retry usage' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry checkout' }));
    await waitFor(() =>
      expect(mocks.backend.startCheckout).toHaveBeenCalledTimes(2),
    );
    expect(mocks.backend.startCheckout.mock.calls[1]).toEqual(
      mocks.backend.startCheckout.mock.calls[0],
    );
    expect(mocks.backend.getCurrentAccess).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(window.location.hash).toBe('#checkout-ready'));
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('clears an old usage alert after a successful automatic usage refresh', async () => {
    mocks.backend.getCurrentAccess.mockRejectedValueOnce(
      new Error('Usage temporarily unavailable'),
    );
    mount();
    await screen.findByRole('alert');
    mocks.auth.snapshot.generation = 2;
    fireEvent.change(screen.getByLabelText('Workspace name'), {
      target: { value: 'Edited workspace' },
    });
    await screen.findByText('Free');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mocks.backend.startCheckout).not.toHaveBeenCalled();
  });
  it('retries only usage when that read fails', async () => {
    mocks.backend.getCurrentAccess.mockRejectedValueOnce(
      new Error('Usage temporarily unavailable'),
    );
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Retry usage' }));
    await screen.findByText('Free');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mocks.backend.startCheckout).not.toHaveBeenCalled();
  });
});
