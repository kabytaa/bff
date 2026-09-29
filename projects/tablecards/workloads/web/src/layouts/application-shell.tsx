import {
  BffAccountSelector,
  BffAuthLink,
  BffSignOutButton,
  useBffAuth,
} from '@tofler/bff-auth/react';
import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

const primaryNavigation = [
  { to: '/projects', label: 'Projects' },
  { to: '/create', label: 'Create' },
  { to: '/designs', label: 'Designs' },
  { to: '/settings', label: 'Account' },
] as const;

function SetupRequired() {
  const { client, state } = useBffAuth();
  if (state.status === 'loading') {
    return <p className="route-state">Checking your TableCards session…</p>;
  }
  if (state.status === 'signed_out') {
    return (
      <section className="route-state">
        <h1>Sign in to open your workspace</h1>
        <BffAuthLink className="button" intent="login">
          Log in with Google
        </BffAuthLink>
      </section>
    );
  }
  if (state.status === 'recoverable_error') {
    return <p className="route-state notice error">{state.message}</p>;
  }
  if (state.status === 'onboarding_required') {
    return (
      <section className="route-state">
        <h1>Create your TableCards account</h1>
        <p>Your first workspace keeps projects and PDFs together.</p>
        <button
          className="button"
          type="button"
          onClick={() => void client.createAccount('My TableCards account')}
        >
          Create my account
        </button>
      </section>
    );
  }
  return (
    <section className="route-state">
      <h1>Choose a workspace</h1>
      <BffAccountSelector className="account-select wide" label="Account" />
    </section>
  );
}

export function ApplicationShell() {
  const { state } = useBffAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const accountId = state.status === 'authenticated' ? state.accountId : null;
  const previousAccountId = useRef(accountId);

  useEffect(() => {
    const previous = previousAccountId.current;
    previousAccountId.current = accountId;
    if (previous !== null && accountId !== null && previous !== accountId) {
      navigate('/projects', { replace: true });
    }
  }, [accountId, navigate]);

  if (state.status !== 'authenticated') return <SetupRequired />;
  const account = state.customer.accounts.find(
    (candidate) => candidate.id === state.accountId,
  );
  const pageTitle =
    primaryNavigation.find(({ to }) => location.pathname.startsWith(to))
      ?.label ?? 'TableCards';

  return (
    <div className="application-shell">
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
          <strong>{account?.displayName ?? 'Selected account'}</strong>
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
          <BffAccountSelector
            className="account-select"
            label={<span className="sr-only">Account</span>}
          />
        </header>
        <main className="application-content">
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
