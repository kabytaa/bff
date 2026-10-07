// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicSessionAction } from './public-session-action';

const auth = vi.hoisted(() => ({
  state: { status: 'loading' } as { status: string; customer?: object },
  client: { bootstrap: vi.fn() },
}));
vi.mock('@tofler/bff-auth/react', () => ({
  useBffAuth: () => auth,
  BffAuthLink: ({ children }: { children: React.ReactNode }) => (
    <a href="/test-login">{children}</a>
  ),
}));
afterEach(cleanup);
describe('public navigation session states', () => {
  it.each([
    'authenticated',
    'onboarding_required',
    'account_selection_required',
  ])('does not offer login for %s', (status) => {
    auth.state = { status, customer: {} };
    render(
      <MemoryRouter>
        <PublicSessionAction className="text-button" />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Projects' }).getAttribute('href'),
    ).toBe('/projects');
  });
  it('does not flash login while checking a session', () => {
    auth.state = { status: 'loading' };
    render(
      <MemoryRouter>
        <PublicSessionAction className="text-button" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status').textContent).toBe('Checking session…');
    expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull();
  });
  it('offers recovery instead of a second login on a transient error', () => {
    auth.state = { status: 'recoverable_error' };
    render(
      <MemoryRouter>
        <PublicSessionAction className="text-button" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry session' }));
    expect(auth.client.bootstrap).toHaveBeenCalledOnce();
  });
  it('offers login only once signed out is confirmed', () => {
    auth.state = { status: 'signed_out' };
    render(
      <MemoryRouter>
        <PublicSessionAction className="text-button" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Log in' })).toBeTruthy();
  });
});
