import {
  BffAuthLink,
  BffSignOutButton,
  useBffAuth,
} from '@tofler/bff-auth/react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { WorkspaceSelector } from '../auth-navigation';
import { RouteFocus } from '../route-focus';

const primaryNavigation = [
  { to: '/projects', label: 'Projects' },
  { to: '/create', label: 'Create' },
  { to: '/designs', label: 'Designs' },
  { to: '/settings', label: 'Account' },
] as const;

function SetupRequired() {
  const { client, state } = useBffAuth();
  const location = useLocation();
  if (state.status === 'loading') {
    return <p className="route-state">Checking your TableCards session…</p>;
  }
  if (state.status === 'signed_out') {
    return (
      <section className="route-state">
        <h1>Sign in to open your workspace</h1>
        <BffAuthLink
          className="button"
          intent="login"
          returnPath={`${location.pathname}${location.search}${location.hash}`}
        >
          Log in with Google
        </BffAuthLink>
      </section>
    );
  }
  if (state.status === 'recoverable_error') {
    return (
      <section className="route-state">
        <p className="notice error" role="alert">
          We could not check your session. Try again to reopen this workspace.
        </p>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void client.bootstrap()}
        >
          Retry session
        </button>
      </section>
    );
  }
  if (state.status === 'onboarding_required') {
    return (
      <section className="route-state">
        <h1>Recover your TableCards workspace</h1>
        <p>
          Your private workspace is created during sign-in. Retry setup, or open
          your Studio invitation. Creating extra workspaces is not enabled.
        </p>
        <button
          className="button"
          type="button"
          onClick={() => void client.bootstrap()}
        >
          Retry workspace setup
        </button>
      </section>
    );
  }
  return (
    <section className="route-state">
      <h1>Choose a workspace</h1>
      <WorkspaceSelector className="account-select wide" label="Account" />
    </section>
  );
}

export function ApplicationShell() {
  const { state } = useBffAuth();
  const location = useLocation();

  if (state.status !== 'authenticated') return <SetupRequired />;
  const account = state.customer.accounts.find(
    (candidate) => candidate.id === state.accountId,
  );
  const pageTitle =
    primaryNavigation.find(({ to }) => location.pathname.startsWith(to))
      ?.label ?? 'TableCards';

  return (
    <div className="application-shell">
      <RouteFocus />
      <a className="skip-link" href="#application-content">
        Skip to content
      </a>
      <aside className="application-sidebar">
        <NavLink className="brand" to="/projects">
          <span className="brand-mark" aria-hidden="true">
            TC
          </span>
          <span>TableCards</span>
        </NavLink>
        <nav aria-label="Application navigation">
          {primaryNavigation.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-account">
          <strong>
            {account?.displayName ??
              (account?.membership.role === 'owner'
                ? 'My workspace'
                : 'Shared workspace')}
          </strong>
          <span>{account?.membership.role ?? 'member'}</span>
          <BffSignOutButton className="text-button">Sign out</BffSignOutButton>
        </div>
      </aside>
      <div className="application-main">
        <header className="application-topbar">
          <div>
            <p className="eyebrow">{account?.displayName}</p>
            <strong>{pageTitle}</strong>
          </div>
          <WorkspaceSelector
            className="account-select"
            label={<span className="sr-only">Account</span>}
          />
          <BffSignOutButton className="text-button mobile-sign-out">
            Sign out
          </BffSignOutButton>
        </header>
        <main
          className="application-content"
          id="application-content"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
      <nav className="mobile-navigation" aria-label="Application navigation">
        {primaryNavigation.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
