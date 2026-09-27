import { CUSTOMER_GOOGLE_CLIENT_ID } from '@bff/static-config';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { CustomerAuthTransactionChallenge } from '@bff/contracts';

import {
  completeGoogleCustomerAuth,
  customerAuthLocation,
  CustomerAuthFlowError,
  loadCustomerAuthChallenge,
} from './authFlow';
import {
  loadGoogleIdentityApi,
  renderGoogleIdentityButton,
} from './googleIdentity';

type ViewState =
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'ready';
      readonly challenge: CustomerAuthTransactionChallenge;
    }
  | {
      readonly kind: 'submitting';
      readonly challenge: CustomerAuthTransactionChallenge;
    }
  | {
      readonly kind: 'error';
      readonly message: string;
      readonly correlationId?: string;
      readonly retryable: boolean;
    };

function failureState(error: unknown): ViewState {
  if (error instanceof CustomerAuthFlowError) {
    return {
      kind: 'error',
      message: error.message,
      retryable: error.retryable,
      ...(error.correlationId === undefined
        ? {}
        : { correlationId: error.correlationId }),
    };
  }
  return {
    kind: 'error',
    message: 'Customer sign-in is temporarily unavailable.',
    retryable: true,
  };
}

export function CustomerAuthApp({
  bffSiteUrl,
  search = window.location.search,
  navigate = (url) => window.location.assign(url),
}: {
  readonly bffSiteUrl: string;
  readonly search?: string;
  readonly navigate?: (url: string) => void;
}) {
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const button = useRef<HTMLDivElement>(null);
  const completionStarted = useRef(false);

  useEffect(() => {
    let active = true;
    completionStarted.current = false;
    setState({ kind: 'loading' });
    void (async () => {
      try {
        const location = customerAuthLocation(search);
        const challenge = await loadCustomerAuthChallenge({
          bffSiteUrl,
          fetch: window.fetch.bind(window),
          location,
        });
        if (active) setState({ kind: 'ready', challenge });
      } catch (error) {
        if (active) setState(failureState(error));
      }
    })();
    return () => {
      active = false;
    };
  }, [bffSiteUrl, search]);

  useEffect(() => {
    if (state.kind !== 'ready' || !button.current) return;
    let active = true;
    const challenge = state.challenge;
    void (async () => {
      try {
        const api = await loadGoogleIdentityApi();
        if (!active || !button.current) return;
        renderGoogleIdentityButton({
          api,
          challenge,
          clientId: CUSTOMER_GOOGLE_CLIENT_ID,
          element: button.current,
          onCredential: (credential) => {
            if (completionStarted.current) return;
            completionStarted.current = true;
            setState({ kind: 'submitting', challenge });
            void completeGoogleCustomerAuth({
              bffSiteUrl,
              challenge,
              credential,
              fetch: window.fetch.bind(window),
            })
              .then((destination) => navigate(destination.href))
              .catch((error: unknown) => {
                completionStarted.current = false;
                if (active) setState(failureState(error));
              });
          },
        });
      } catch (error) {
        if (active) setState(failureState(error));
      }
    })();
    return () => {
      active = false;
    };
  }, [bffSiteUrl, navigate, state]);

  const transfer =
    (state.kind === 'ready' || state.kind === 'submitting') &&
    state.challenge.purpose === 'ownership_transfer';
  const challenge =
    state.kind === 'ready' || state.kind === 'submitting'
      ? state.challenge
      : undefined;
  const heading = transfer
    ? 'Confirm account ownership'
    : challenge?.intent === 'login'
      ? `Log in to ${challenge.presentation.productName}`
      : challenge?.intent === 'signup'
        ? `Create your ${challenge.presentation.productName} account`
        : `Continue to ${challenge?.presentation.productName ?? 'your app'}`;
  const presentationStyle = challenge
    ? ({ '--auth-accent': challenge.presentation.accentColor } as CSSProperties)
    : undefined;

  return (
    <main
      className="auth-shell"
      data-theme={challenge?.presentation.theme ?? 'system'}
      style={presentationStyle}
    >
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="brand-mark" aria-hidden="true">
          {challenge?.presentation.productName.slice(0, 1).toUpperCase() ?? 'T'}
        </div>
        <p className="eyebrow">
          {challenge
            ? `${challenge.presentation.productName} · ${challenge.environmentName}`
            : 'TOFLER SECURE ACCESS'}
        </p>
        <h1 id="auth-title">{heading}</h1>
        <p className="description">
          {transfer
            ? 'Sign in again to confirm this ownership transfer. The transfer is not complete until you return to the app and approve it.'
            : 'Use your Google account to continue. Your password is handled only by Google.'}
        </p>

        {state.kind === 'loading' && (
          <p className="status" role="status">
            Checking your sign-in request…
          </p>
        )}
        {state.kind === 'ready' && (
          <div className="provider-area">
            <div ref={button} aria-label="Continue with Google" />
          </div>
        )}
        {state.kind === 'submitting' && (
          <p className="status" role="status">
            Finishing securely…
          </p>
        )}
        {state.kind === 'error' && (
          <div className="error" role="alert">
            <p>{state.message}</p>
            {state.correlationId && (
              <p className="reference">Reference: {state.correlationId}</p>
            )}
            {state.retryable && (
              <button type="button" onClick={() => window.location.reload()}>
                Try again
              </button>
            )}
          </div>
        )}

        <p className="privacy-note">
          Tofler uses this page only to complete the request that brought you
          here. It never sends your Google credential to the Business app.
        </p>
        {challenge && (
          <>
            <a
              className="back-link"
              href={challenge.returnUrl}
              onClick={(event) => {
                if (window.history.length > 1) {
                  event.preventDefault();
                  window.history.back();
                }
              }}
            >
              Back to {challenge.presentation.productName}
            </a>
            <p className="secured-by">Secured by Tofler</p>
          </>
        )}
      </section>
    </main>
  );
}
