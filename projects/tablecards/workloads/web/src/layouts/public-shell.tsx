import { Link, Outlet, useLocation } from 'react-router-dom';
import { RouteFocus } from '../route-focus';
import { PublicSessionAction } from '../public-session-action';

export function PublicShell() {
  const location = useLocation();
  return (
    <div className="public-shell">
      <RouteFocus />
      <a className="skip-link" href="#public-content">
        Skip to content
      </a>
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
          <PublicSessionAction
            className="text-button"
            returnPath={
              location.pathname === '/'
                ? '/projects'
                : `${location.pathname}${location.search}${location.hash}`
            }
          />
          <Link className="button button-small" to="/create">
            Create cards
          </Link>
        </div>
      </header>
      <Outlet />
      <footer>
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">
            TC
          </span>
          <span>TableCards</span>
        </Link>
        <p>A Tofler Business Factory product. Digital PDF only.</p>
        <nav aria-label="Policy and contact">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </footer>
    </div>
  );
}
