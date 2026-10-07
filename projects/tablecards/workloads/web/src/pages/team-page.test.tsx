// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Component } from './team-page';

const mocks = vi.hoisted(() => ({
  auth: {
    state: {
      status: 'authenticated',
      accountId: 'account-one',
      customer: {
        accounts: [
          {
            id: 'account-one',
            membership: { id: 'owner-membership', role: 'owner' },
            policy: {
              values: { seatLimit: 5, memberInvitationsEnabled: true },
            },
          },
        ],
      },
    },
    snapshot: { generation: 1 },
    client: {
      listAccountMembers: vi.fn(),
      listAccountInvitations: vi.fn(),
      createInvitation: vi.fn(),
    },
  },
  backend: { getCurrentAccess: vi.fn() },
  writeText: vi.fn(),
}));
vi.mock('@tofler/bff-auth/react', () => ({ useBffAuth: () => mocks.auth }));
vi.mock('../use-tablecards-backend', () => ({
  useTableCardsBackend: () => mocks.backend,
}));

const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard',
);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.backend.getCurrentAccess.mockResolvedValue({ teamAccessEnabled: true });
  mocks.auth.client.listAccountMembers.mockResolvedValue({ page: [] });
  mocks.auth.client.listAccountInvitations.mockResolvedValue({ page: [] });
  mocks.auth.client.createInvitation.mockResolvedValue({
    invitationToken: 'synthetic-unit-test-only',
  });
  mocks.writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: mocks.writeText },
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  if (originalClipboard)
    Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else Reflect.deleteProperty(navigator, 'clipboard');
});
async function mountReady() {
  const router = createMemoryRouter([{ path: '*', element: <Component /> }], {
    initialEntries: ['/settings/team'],
  });
  render(<RouterProvider router={router} />);
  const invite = await screen.findByRole('button', {
    name: 'Create invitation',
  });
  await waitFor(() => expect(invite.hasAttribute('disabled')).toBe(false));
}
function createInvitation() {
  fireEvent.change(screen.getByLabelText('Verified email'), {
    target: { value: 'synthetic-recipient@example.invalid' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create invitation' }));
}
function expectSelectedLink() {
  const input = screen.getByLabelText(
    'One-time invitation link',
  ) as HTMLInputElement;
  expect(document.activeElement).toBe(input);
  expect(input.selectionStart).toBe(0);
  expect(input.selectionEnd).toBe(input.value.length);
}

describe('Team invitation copy outcomes', () => {
  it('keeps copy feedback visible when invitation loading finishes after the copy', async () => {
    await mountReady();
    let finishReload!: (access: { teamAccessEnabled: boolean }) => void;
    mocks.backend.getCurrentAccess.mockReturnValueOnce(
      new Promise((resolve) => {
        finishReload = resolve;
      }),
    );
    createInvitation();
    await screen.findByLabelText('One-time invitation link');
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    await screen.findByText('Invitation link copied.');
    await act(async () => finishReload({ teamAccessEnabled: true }));
    await screen.findByText(
      'Invitation created. Copy the link now; the secret is shown only here.',
    );
    expect(screen.queryByText('Invitation link copied.')).not.toBeNull();
    expect(mocks.writeText).toHaveBeenCalledTimes(1);
  });
  it.each(['missing', 'rejected'] as const)(
    'selects the link for manual copying when clipboard access is %s',
    async (failure) => {
      await mountReady();
      if (failure === 'missing')
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: undefined,
        });
      else mocks.writeText.mockRejectedValue(new Error('Permission denied'));
      createInvitation();
      await screen.findByLabelText('One-time invitation link');
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
      await screen.findByText(/selected so you can copy it manually/);
      expectSelectedLink();
    },
  );
  it('bounds a clipboard request that never settles and provides a manual-copy outcome', async () => {
    await mountReady();
    createInvitation();
    await screen.findByText(
      'Invitation created. Copy the link now; the secret is shown only here.',
    );
    mocks.writeText.mockReturnValue(new Promise(() => undefined));
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(
      screen.queryByText(/selected so you can copy it manually/),
    ).not.toBeNull();
    expectSelectedLink();
  });
});
