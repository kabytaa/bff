import {
  BffAuthLink,
  BffSignOutButton,
  useBffAuth,
} from '@tofler/bff-auth/react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

import { Creator } from '../app';
import { useTableCardsApplication } from '../application-context';
import { WorkspaceSelector } from '../auth-navigation';
import { RouteFocus } from '../route-focus';

const authenticatedNavigation = [
  { to: '/projects', label: 'Projects' },
  { to: '/create', label: 'Create' },
  { to: '/designs', label: 'Designs' },
  { to: '/settings', label: 'Account' },
] as const;

export function Component() {
  const { state } = useBffAuth();
  const { developmentControlsEnabled } = useTableCardsApplication();
  const navigate = useNavigate();

  if (state.status === 'loading') {
    return (
      <main className="route-state">
        <p>Checking your TableCards session…</p>
      </main>
    );
  }

  return (
    <div className="creator-route">
      <RouteFocus />
      <header className="creator-route-header">
        <Link
          className="brand"
          to={state.status === 'authenticated' ? '/projects' : '/'}
          aria-label={
            state.status === 'authenticated'
              ? 'TableCards projects'
              : 'TableCards home'
          }
        >
          <span className="brand-mark" aria-hidden="true">
            TC
          </span>
          <span>TableCards</span>
        </Link>
        <div className="header-actions">
          {state.status === 'authenticated' ? (
            <>
              <nav
                className="creator-auth-navigation"
                aria-label="Application navigation"
              >
                {authenticatedNavigation.map((item) => (
                  <NavLink key={item.to} to={item.to}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <WorkspaceSelector
                className="account-select"
                label={<span className="sr-only">Account</span>}
              />
              <BffSignOutButton className="text-button">
                Sign out
              </BffSignOutButton>
            </>
          ) : (
            <BffAuthLink
              className="text-button"
              intent="login"
              returnPath="/create"
              onClick={(event) => {
                event.preventDefault();
                window.dispatchEvent(new Event('tablecards:creator-sign-in'));
              }}
            >
              Log in
            </BffAuthLink>
          )}
        </div>
      </header>
      <main>
        <Creator
          developmentControlsEnabled={developmentControlsEnabled}
          onProjectSaved={(project) =>
            navigate(`/projects/${project.id}`, {
              replace: true,
              state: { creatorStep: 3 },
            })
          }
        />
      </main>
      {state.status === 'authenticated' ? (
        <nav className="mobile-navigation" aria-label="Application navigation">
          {authenticatedNavigation.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
