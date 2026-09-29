import {
  checkoutChallengeSchema,
  transitionCheckoutResponseSchema,
  type CheckoutChallenge,
} from '@bff/contracts';
import { useEffect, useState, type CSSProperties } from 'react';

type CheckoutState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly challenge: CheckoutChallenge }
  | { readonly kind: 'submitting'; readonly challenge: CheckoutChallenge }
  | { readonly kind: 'error'; readonly message: string };

function locationFromSearch(search: string) {
  const params = new URLSearchParams(search);
  const environmentKey = params.get('environment');
  const reference = params.get('checkout');
  if (!environmentKey || !reference)
    throw new Error('Checkout link is invalid');
  return { environmentKey, reference };
}

async function responseJson(response: Response) {
  const body: unknown = await response.json();
  if (!response.ok) throw new Error('Checkout could not be completed');
  return body;
}

export function CheckoutApp({
  bffSiteUrl,
  search = window.location.search,
  navigate = (url) => window.location.assign(url),
  fetchImplementation = window.fetch,
}: {
  readonly bffSiteUrl: string;
  readonly search?: string;
  readonly navigate?: (url: string) => void;
  readonly fetchImplementation?: typeof fetch;
}) {
  const [state, setState] = useState<CheckoutState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ kind: 'loading' });
    void (async () => {
      try {
        const location = locationFromSearch(search);
        const params = new URLSearchParams({
          environment: location.environmentKey,
          checkout: location.reference,
        });
        const response = await fetchImplementation(
          `${bffSiteUrl}/v1/checkouts?${params.toString()}`,
          { cache: 'no-store' },
        );
        const challenge = checkoutChallengeSchema.parse(
          await responseJson(response),
        );
        if (active) setState({ kind: 'ready', challenge });
      } catch {
        if (active) {
          setState({
            kind: 'error',
            message: 'This checkout link is invalid or has expired.',
          });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [bffSiteUrl, fetchImplementation, search]);

  const transition = async (kind: 'complete' | 'cancel') => {
    if (state.kind !== 'ready') return;
    const challenge = state.challenge;
    setState({ kind: 'submitting', challenge });
    try {
      const response = await fetchImplementation(
        `${bffSiteUrl}/v1/checkouts/${kind}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            environmentKey: challenge.environmentKey,
            reference: challenge.reference,
          }),
        },
      );
      const result = transitionCheckoutResponseSchema.parse(
        await responseJson(response),
      );
      navigate(result.redirectUrl);
    } catch {
      setState({
        kind: 'error',
        message:
          'Checkout could not be completed. Return to the app and try again.',
      });
    }
  };

  const challenge =
    state.kind === 'ready' || state.kind === 'submitting'
      ? state.challenge
      : undefined;
  const style = challenge
    ? ({ '--auth-accent': challenge.presentation.accentColor } as CSSProperties)
    : undefined;
  const price = challenge
    ? `$${(challenge.offer.priceUsdCents / 100).toFixed(2)}${
        challenge.offer.billing === 'monthly' ? ' / month' : ''
      }`
    : '';

  return (
    <main
      className="auth-shell"
      data-theme={challenge?.presentation.theme ?? 'system'}
      style={style}
    >
      <section className="auth-card" aria-labelledby="checkout-title">
        <div className="brand-mark" aria-hidden="true">
          {challenge?.presentation.productName.slice(0, 1).toUpperCase() ?? 'T'}
        </div>
        <p className="eyebrow">
          {challenge
            ? `${challenge.presentation.productName} · TOFLER TEST CHECKOUT`
            : 'TOFLER TEST CHECKOUT'}
        </p>
        <h1 id="checkout-title">
          {challenge ? challenge.offer.displayName : 'Checking checkout…'}
        </h1>

        {state.kind === 'loading' ? (
          <p className="status" role="status">
            Loading your checkout…
          </p>
        ) : null}
        {state.kind === 'ready' && state.challenge.state === 'pending' ? (
          <>
            <p className="checkout-price">{price}</p>
            <div className="test-checkout-note">
              <strong>Test payment simulation</strong>
              <span>
                No payment method is requested and no money is charged.
              </span>
            </div>
            <button type="button" onClick={() => void transition('complete')}>
              Complete test payment
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => void transition('cancel')}
            >
              Cancel and return
            </button>
          </>
        ) : null}
        {state.kind === 'ready' && state.challenge.state !== 'pending' ? (
          <p className="status" role="status">
            This checkout has already been {state.challenge.state}.
          </p>
        ) : null}
        {state.kind === 'submitting' ? (
          <p className="status" role="status">
            Applying access and returning…
          </p>
        ) : null}
        {state.kind === 'error' ? (
          <div className="error" role="alert">
            <p>{state.message}</p>
          </div>
        ) : null}
        <p className="privacy-note">
          Tofler owns this checkout handoff. The Business receives only the
          resulting access state, not payment-provider credentials.
        </p>
        <p className="secured-by">Checkout by Tofler</p>
      </section>
    </main>
  );
}
