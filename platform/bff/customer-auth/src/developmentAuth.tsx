import { useEffect, useRef, useState } from 'react';

import {
  completeDevelopmentCustomerAuth,
  customerAuthLocation,
  CustomerAuthFlowError,
  loadCustomerAuthChallenge,
} from './authFlow';

const DEVELOPMENT_MARKER = 'BFF_CUSTOMER_DEVELOPMENT_AUTH_DO_NOT_SHIP';
const GRANT_GLOBAL = '__BFF_CUSTOMER_DEVELOPMENT_GRANT__';

declare global {
  interface Window {
    __BFF_CUSTOMER_DEVELOPMENT_GRANT__?: unknown;
  }
}

function tokenExpiry(token: string): number | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const base64 = payload.replaceAll('-', '+').replaceAll('_', '/');
    const normalized = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    const decoded = JSON.parse(atob(normalized)) as { exp?: unknown };
    return typeof decoded.exp === 'number' ? decoded.exp * 1_000 : null;
  } catch {
    return null;
  }
}

export function consumeCustomerDevelopmentGrant(): string | null {
  document.documentElement.dataset.customerDevelopmentAuth = DEVELOPMENT_MARKER;
  const candidate = window[GRANT_GLOBAL];
  delete window.__BFF_CUSTOMER_DEVELOPMENT_GRANT__;
  if (
    typeof candidate !== 'string' ||
    candidate.length > 16 * 1024 ||
    (tokenExpiry(candidate) ?? 0) <= Date.now()
  ) {
    return null;
  }
  return candidate;
}

type DevelopmentState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string };

export function CustomerDevelopmentAuthApp({
  bffSiteUrl,
  grant,
  search = window.location.search,
  navigate = (url) => window.location.assign(url),
}: {
  readonly bffSiteUrl: string;
  readonly grant: string | null;
  readonly search?: string;
  readonly navigate?: (url: string) => void;
}) {
  const [state, setState] = useState<DevelopmentState>({ kind: 'loading' });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let active = true;
    void (async () => {
      try {
        if (!grant) {
          throw new CustomerAuthFlowError(
            { message: 'A valid development automation grant is required.' },
            false,
          );
        }
        const challenge = await loadCustomerAuthChallenge({
          bffSiteUrl,
          fetch: window.fetch.bind(window),
          location: customerAuthLocation(search),
        });
        const destination = await completeDevelopmentCustomerAuth({
          bffSiteUrl,
          challenge,
          grant,
          fetch: window.fetch.bind(window),
        });
        if (active) navigate(destination.href);
      } catch (error) {
        if (active) {
          setState({
            kind: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Development sign-in failed.',
          });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [bffSiteUrl, grant, navigate, search]);

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="development-auth-title">
        <div className="brand-mark" aria-hidden="true">
          T
        </div>
        <p className="eyebrow">TOFLER DEVELOPMENT AUTOMATION</p>
        <h1 id="development-auth-title">Development sign-in</h1>
        {state.kind === 'loading' ? (
          <p className="status" role="status">
            Completing the protected development sign-in…
          </p>
        ) : (
          <div className="error" role="alert">
            <p>{state.message}</p>
          </div>
        )}
      </section>
    </main>
  );
}
