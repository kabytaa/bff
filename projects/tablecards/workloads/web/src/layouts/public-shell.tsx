import { BffAuthLink, useBffAuth } from '@tofler/bff-auth/react';
import { Link, Outlet } from 'react-router-dom';

export function PublicShell() {
  const { state } = useBffAuth();
  return (
    <div className="public-shell">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="TableCards home">
          <span className="brand-mark" aria-hidden="true">
            TC
          </span>
          <span>TableCards</span>
        </Link>
        <nav aria-label="Public navigation">
          <a href="/#how-it-works">How it works</a>
          <a href="/#pricing">Pricing</a>
          <a href="/#faq">FAQ</a>
        </nav>
        <div className="header-actions">
          {state.status === 'authenticated' ? (
            <Link className="text-button" to="/projects">
              Projects
            </Link>
          ) : (
            <BffAuthLink className="text-button" intent="login">
              Log in
            </BffAuthLink>
          )}
          <Link className="button button-small" to="/create">
            Create cards
          </Link>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
