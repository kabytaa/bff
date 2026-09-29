import { OFFER_CATALOG, type OfferId } from '@tablecards/core';
import { useBffAuth } from '@tofler/bff-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import type { CurrentProductAccess } from '../backend';
import { useTableCardsBackend } from '../use-tablecards-backend';

export function Component() {
  const { state, snapshot } = useBffAuth();
  const backend = useTableCardsBackend();
  const [searchParams, setSearchParams] = useSearchParams();
  const [access, setAccess] = useState<CurrentProductAccess | null>(null);
  const [activeProjects, setActiveProjects] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const loadSequence = useRef(0);
  const checkoutStarted = useRef(false);
  const requestedOffer = searchParams.get('offer');
  const checkoutResult = searchParams.get('checkout');
  const requestedOfferId = (
    requestedOffer && requestedOffer in OFFER_CATALOG ? requestedOffer : null
  ) as OfferId | null;
  const account =
    state.status === 'authenticated'
      ? state.customer.accounts.find(
          (candidate) => candidate.id === state.accountId,
        )
      : undefined;

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    const [nextAccess, projects] = await Promise.all([
      backend.getCurrentAccess(),
      backend.listProjects('active'),
    ]);
    if (sequence !== loadSequence.current) return;
    setAccess(nextAccess);
    setActiveProjects(projects.length);
  }, [backend]);

  useEffect(() => {
    void load().catch((caught: unknown) =>
      setError(
        caught instanceof Error
          ? caught.message
          : 'Account usage could not be loaded.',
      ),
    );
  }, [load, snapshot.generation]);

  useEffect(() => {
    if (checkoutResult === 'success') {
      if (requestedOfferId && state.status === 'authenticated') {
        window.sessionStorage.removeItem(
          `tablecards-checkout:${state.accountId}:${requestedOfferId}`,
        );
      }
      setNotice('Your access was updated successfully.');
      setSearchParams({}, { replace: true });
    } else if (checkoutResult === 'cancelled') {
      if (requestedOfferId && state.status === 'authenticated') {
        window.sessionStorage.removeItem(
          `tablecards-checkout:${state.accountId}:${requestedOfferId}`,
        );
      }
      setNotice('Checkout was cancelled. Your access was not changed.');
      setSearchParams({}, { replace: true });
    }
  }, [checkoutResult, requestedOfferId, setSearchParams, state]);

  useEffect(() => {
    if (
      checkoutResult ||
      !requestedOfferId ||
      requestedOfferId === 'free' ||
      checkoutStarted.current
    ) {
      return;
    }
    checkoutStarted.current = true;
    setBusy(true);
    setError(null);
    const storageKey = `tablecards-checkout:${state.status === 'authenticated' ? state.accountId : 'unknown'}:${requestedOfferId}`;
    const existing = window.sessionStorage.getItem(storageKey);
    const idempotencyKey = existing ?? crypto.randomUUID();
    window.sessionStorage.setItem(storageKey, idempotencyKey);
    void backend
      .startCheckout(requestedOfferId, idempotencyKey)
      .then(({ checkoutUrl }) => window.location.assign(checkoutUrl))
      .catch((caught: unknown) => {
        checkoutStarted.current = false;
        setBusy(false);
        setError(
          caught instanceof Error
            ? caught.message
            : 'Checkout could not be started.',
        );
      });
  }, [backend, checkoutResult, requestedOfferId, state]);

  return (
    <section className="app-page" aria-labelledby="account-title">
      <header className="page-header">
        <div>
          <p className="eyebrow">Workspace settings</p>
          <h1 id="account-title">Account and usage</h1>
          <p>
            Clear product limits without exposing billing-provider internals.
          </p>
        </div>
      </header>
      {error ? (
        <p className="notice error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="notice success" role="status">
          {notice}
        </p>
      ) : null}
      <div className="usage-summary-grid">
        <article>
          <span>Current offer</span>
          <strong>{access?.offerName ?? 'Loading…'}</strong>
          <small>
            {access?.source === 'development_mock'
              ? 'Development mock'
              : access?.source === 'provider'
                ? 'Verified provider'
                : 'Default access'}
          </small>
        </article>
        <article>
          <span>Active projects</span>
          <strong>
            {activeProjects} / {access?.maxActiveProjects ?? '—'}
          </strong>
          <small>Maximum {access?.maxCardsPerProject ?? '—'} cards each</small>
        </article>
        <article>
          <span>AI background batches</span>
          <strong>
            {access?.aiBackgroundBatchesRemaining ?? '—'} remaining
          </strong>
          <small>
            {access?.aiAllocationLabel === 'current_billing_cycle'
              ? 'Current billing cycle'
              : (access?.aiAllocationLabel ?? '—')}
          </small>
        </article>
        <article>
          <span>Members</span>
          <strong>
            {account?.activeMemberCount ?? '—'} /{' '}
            {access?.collaborationSeats ?? 1}
          </strong>
          <small>Your role: {account?.membership.role ?? 'member'}</small>
        </article>
      </div>

      <section className="page-section account-actions">
        <h2>Workspace</h2>
        <p>{account?.displayName ?? 'Selected TableCards account'}</p>
        {access?.teamAccessEnabled ? (
          <Link className="secondary-button" to="/settings/team">
            Manage team
          </Link>
        ) : (
          <p className="muted">Team collaboration is included with Studio.</p>
        )}
        <Link className="text-link" to="/?section=pricing">
          View plans
        </Link>
      </section>

      {busy && requestedOfferId ? (
        <section className="page-section" aria-live="polite">
          <p>
            Opening secure checkout for{' '}
            <strong>{OFFER_CATALOG[requestedOfferId].name}</strong>…
          </p>
        </section>
      ) : null}
    </section>
  );
}
