// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AccountNavigation,
  WorkspaceSelector,
  ACCOUNT_CHANGE_EVENT,
} from './auth-navigation';

const mocks = vi.hoisted(() => ({
  state: {
    status: 'authenticated',
    accountId: 'one',
    customer: { accounts: [] },
  } as Record<string, unknown>,
  selectAccount: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@tofler/bff-auth/react', () => ({
  useBffAuth: () => ({
    state: mocks.state,
    client: { selectAccount: mocks.selectAccount },
  }),
}));
afterEach(cleanup);

describe('workspace navigation outside the scoped remount', () => {
  it('preserves an anonymous draft on reload but clears drafts after an authenticated sign-out', () => {
    sessionStorage.setItem(
      'tablecards:protected-draft:v1:visitor:new',
      'anonymous',
    );
    const navigate = vi.fn();
    const pathname = () => '/create';
    mocks.state = { status: 'signed_out' };
    const view = render(
      <AccountNavigation navigate={navigate} pathname={pathname} />,
    );
    expect(
      sessionStorage.getItem('tablecards:protected-draft:v1:visitor:new'),
    ).toBe('anonymous');
    mocks.state = { status: 'authenticated', accountId: 'one' };
    view.rerender(
      <AccountNavigation navigate={navigate} pathname={pathname} />,
    );
    mocks.state = { status: 'signed_out' };
    view.rerender(
      <AccountNavigation navigate={navigate} pathname={pathname} />,
    );
    expect(
      sessionStorage.getItem('tablecards:protected-draft:v1:visitor:new'),
    ).toBeNull();
  });
  it('retains the prior workspace through loading and leaves a saved-project route on a switch', () => {
    const navigate = vi.fn();
    const pathname = () => '/projects/old-project';
    mocks.state = { status: 'authenticated', accountId: 'one' };
    const view = render(
      <AccountNavigation navigate={navigate} pathname={pathname} />,
    );
    mocks.state = { status: 'loading' };
    view.rerender(
      <AccountNavigation navigate={navigate} pathname={pathname} />,
    );
    mocks.state = { status: 'authenticated', accountId: 'two' };
    view.rerender(
      <AccountNavigation navigate={navigate} pathname={pathname} />,
    );
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/projects');
  });
  it('does not redirect on refresh of the same workspace or on public creator routes', () => {
    const navigate = vi.fn();
    const pathname = () => '/create';
    mocks.state = { status: 'authenticated', accountId: 'one' };
    const view = render(
      <AccountNavigation navigate={navigate} pathname={pathname} />,
    );
    mocks.state = { status: 'loading' };
    view.rerender(
      <AccountNavigation navigate={navigate} pathname={pathname} />,
    );
    mocks.state = { status: 'authenticated', accountId: 'one' };
    view.rerender(
      <AccountNavigation navigate={navigate} pathname={pathname} />,
    );
    mocks.state = { status: 'authenticated', accountId: 'two' };
    view.rerender(
      <AccountNavigation navigate={navigate} pathname={pathname} />,
    );
    expect(navigate).not.toHaveBeenCalled();
  });
  it('uses meaningful unnamed-workspace labels and respects a cancelled dirty switch', () => {
    mocks.state = {
      status: 'authenticated',
      accountId: 'one',
      customer: {
        accounts: [
          { id: 'one', membership: { role: 'owner' } },
          { id: 'two', membership: { role: 'member' } },
        ],
      },
    };
    render(<WorkspaceSelector label="Account" />);
    expect(screen.getByRole('option', { name: 'My workspace 1' })).toBeTruthy();
    expect(
      screen.getByRole('option', { name: 'Shared workspace 2' }),
    ).toBeTruthy();
    const cancel = (event: Event) => event.preventDefault();
    window.addEventListener(ACCOUNT_CHANGE_EVENT, cancel);
    fireEvent.change(screen.getByLabelText('Account'), {
      target: { value: 'two' },
    });
    window.removeEventListener(ACCOUNT_CHANGE_EVENT, cancel);
    expect((screen.getByLabelText('Account') as HTMLSelectElement).value).toBe(
      'one',
    );
    expect(mocks.selectAccount).not.toHaveBeenCalled();
  });
});
