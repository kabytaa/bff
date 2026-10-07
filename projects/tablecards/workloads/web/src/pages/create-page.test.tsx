// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Component } from './create-page';

const auth = vi.hoisted(() => ({
  state: {
    status: 'authenticated',
    accountId: 'workspace-one',
    customer: {
      accounts: [
        {
          id: 'workspace-one',
          displayName: 'My events',
          membership: { role: 'owner' },
        },
      ],
    },
  },
}));
vi.mock('@tofler/bff-auth/react', () => ({
  useBffAuth: () => auth,
  BffAuthLink: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: ComponentProps<'a'>['onClick'];
  }) => (
    <a href="/test-login" onClick={onClick}>
      {children}
    </a>
  ),
  BffSignOutButton: ({ children }: { children: ReactNode }) => (
    <button>{children}</button>
  ),
}));
vi.mock('../app', () => ({ Creator: () => <h2>Guest-list editor</h2> }));
vi.mock('../application-context', () => ({
  useTableCardsApplication: () => ({ developmentControlsEnabled: false }),
}));
vi.mock('../route-focus', () => ({ RouteFocus: () => null }));

beforeEach(() => {
  auth.state.status = 'authenticated';
});
afterEach(cleanup);

function mount() {
  return render(
    <MemoryRouter initialEntries={['/create']}>
      <Component />
    </MemoryRouter>,
  );
}

describe('Create route navigation', () => {
  it('uses the shared signed-in shell and active Create destination', () => {
    const { container } = mount();
    const sidebar = container.querySelector('aside')!;
    expect(sidebar.className).toBe('application-sidebar');
    expect(within(sidebar).getByText('My events')).toBeTruthy();
    const links = within(sidebar).getByRole('navigation');
    expect(
      within(links)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Projects', 'Create', 'Designs', 'Account']);
    expect(
      within(links)
        .getByRole('link', { name: 'Create' })
        .getAttribute('aria-current'),
    ).toBe('page');
    expect(
      container.querySelector('.application-topbar strong')?.textContent,
    ).toBe('Create');
    expect(container.querySelector('.mobile-navigation')).not.toBeNull();
    expect(container.querySelector('.creator-route-header')).toBeNull();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(
      within(screen.getByRole('main')).getByText('Guest-list editor'),
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull();
  });

  it('keeps the public editor and draft-preserving sign-in action', () => {
    auth.state.status = 'signed_out';
    const signIn = vi.fn();
    window.addEventListener('tablecards:creator-sign-in', signIn);
    try {
      const { container } = mount();
      expect(container.querySelector('.application-shell')).toBeNull();
      expect(container.querySelector('.creator-route-header')).not.toBeNull();
      expect(screen.getByText('Guest-list editor')).toBeTruthy();
      expect(screen.queryByRole('navigation')).toBeNull();
      fireEvent.click(screen.getByRole('link', { name: 'Log in' }));
      expect(signIn).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener('tablecards:creator-sign-in', signIn);
    }
  });

  it('does not flash login or render the editor while the session loads', () => {
    auth.state.status = 'loading';
    mount();
    expect(screen.getByText('Checking your TableCards session…')).toBeTruthy();
    expect(screen.queryByText('Guest-list editor')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull();
  });

  it('keeps account-choice recovery out of the authenticated shell', () => {
    auth.state.status = 'account_selection_required';
    const { container } = mount();
    expect(container.querySelector('.application-shell')).toBeNull();
    expect(screen.getByRole('link', { name: 'Choose workspace' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull();
  });
});
