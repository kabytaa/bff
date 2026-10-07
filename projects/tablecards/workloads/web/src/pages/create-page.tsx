import { BffAuthLink, useBffAuth } from '@tofler/bff-auth/react';
import { Link, useNavigate } from 'react-router-dom';

import { Creator } from '../app';
import { useTableCardsApplication } from '../application-context';
import { ApplicationShell } from '../layouts/application-shell';
import { RouteFocus } from '../route-focus';
import { PublicSessionAction } from '../public-session-action';

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

  const creator = (
    <Creator
      developmentControlsEnabled={developmentControlsEnabled}
      onProjectSaved={(project) =>
        navigate(`/projects/${project.id}`, {
          replace: true,
          state: { creatorStep: 3 },
        })
      }
    />
  );
  if (state.status === 'authenticated') {
    return <ApplicationShell>{creator}</ApplicationShell>;
  }

  return (
    <div className="creator-route">
      <RouteFocus />
      <header className="creator-route-header">
        <Link className="brand" to="/" aria-label="TableCards home">
          <span className="brand-mark" aria-hidden="true">
            TC
          </span>
          <span>TableCards</span>
        </Link>
        <div className="header-actions">
          {state.status === 'signed_out' ? (
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
          ) : (
            <PublicSessionAction
              className="text-button"
              destination="/projects"
              signedInLabel="Choose workspace"
            />
          )}
        </div>
      </header>
      <main>{creator}</main>
    </div>
  );
}
