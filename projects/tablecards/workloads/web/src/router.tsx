import { createBrowserRouter, Link } from 'react-router-dom';

import { ApplicationShell } from './layouts/application-shell';
import { PublicShell } from './layouts/public-shell';
import { PolicyPage } from './pages/policy-page';

function RouteError() {
  return (
    <main className="route-state">
      <p className="eyebrow">TableCards</p>
      <h1>This page is unavailable.</h1>
      <p>The address may be outdated, or the page could not be loaded.</p>
      <Link className="button" to="/">
        Return home
      </Link>
    </main>
  );
}

export const tableCardsRouter = createBrowserRouter([
  {
    element: <PublicShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, lazy: () => import('./pages/landing-page') },
      { path: 'privacy', element: <PolicyPage kind="privacy" /> },
      { path: 'terms', element: <PolicyPage kind="terms" /> },
      { path: 'contact', element: <PolicyPage kind="contact" /> },
      {
        path: 'invite/:invitationToken',
        lazy: () => import('./pages/invitation-page'),
      },
    ],
  },
  {
    path: 'create',
    lazy: () => import('./pages/create-page'),
    errorElement: <RouteError />,
  },
  {
    element: <ApplicationShell />,
    errorElement: <RouteError />,
    children: [
      { path: 'projects', lazy: () => import('./pages/projects-page') },
      {
        path: 'projects/:projectId',
        lazy: () => import('./pages/project-page'),
      },
      { path: 'designs', lazy: () => import('./pages/designs-page') },
      { path: 'settings', lazy: () => import('./pages/account-page') },
      { path: 'settings/team', lazy: () => import('./pages/team-page') },
    ],
  },
]);
