import { OFFER_CATALOG, type OfferId } from '@tablecards/core';
import { useBffAuth } from '@tofler/bff-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useTableCardsApplication } from '../application-context';
import type { CurrentProductAccess } from '../backend';
import { useTableCardsBackend } from '../use-tablecards-backend';

export function Component() {
  const { state, snapshot } = useBffAuth();
  const { developmentControlsEnabled } = useTableCardsApplication();
  const backend = useTableCardsBackend();
  const [searchParams, setSearchParams] = useSearchParams();
  const [access, setAccess] = useState<CurrentProductAccess | null>(null);
  const [activeProjects, setActiveProjects] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const loadSequence = useRef(0);
  const requestedOffer = searchParams.get('offer');
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

  const switchOffer = async (offerId: OfferId) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const nextAccess = await backend.selectDevelopmentOffer(offerId);
      const projects = await backend.listProjects('active');
      ++loadSequence.current;
      setAccess(nextAccess);
      setActiveProjects(projects.length);
      const offer = OFFER_CATALOG[offerId];
      setNotice(
        `${offer.name} activated in development. This simulated ${offer.billing === 'monthly' ? 'a monthly subscription' : offer.billing === 'one_time' ? 'a one-time purchase' : 'Free access'}; no payment was charged.`,
      );
      setSearchParams({}, { replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The development offer could not be changed.',
      );
    } finally {
      setBusy(false);
    }
  };

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
      </section>

      {developmentControlsEnabled ? (
        <section className="development-panel page-section">
          <p className="eyebrow">Development only</p>
          <h2>Test purchase and subscription access</h2>
          <p>
            Choose an offer to simulate the provider-confirmed access that Build
            4 checkout will grant. No payment method is used or charged.
          </p>
          {requestedOfferId ? (
            <p className="entitlement-callout" role="status">
              The pricing page selected{' '}
              <strong>{OFFER_CATALOG[requestedOfferId].name}</strong> at $
              {OFFER_CATALOG[requestedOfferId].priceUsd}
              {OFFER_CATALOG[requestedOfferId].billing === 'monthly'
                ? ' per month'
                : OFFER_CATALOG[requestedOfferId].billing === 'one_time'
                  ? ' one time'
                  : ''}
              . Activate it below to test the workflow without a charge.
            </p>
          ) : null}
          <div className="offer-buttons">
            {(Object.keys(OFFER_CATALOG) as OfferId[]).map((offerId) => (
              <button
                key={offerId}
                type="button"
                disabled={busy || access === null}
                className={access?.offerKey === offerId ? 'active' : ''}
                onClick={() => void switchOffer(offerId)}
              >
                Activate {OFFER_CATALOG[offerId].name} · $
                {OFFER_CATALOG[offerId].priceUsd}
                {OFFER_CATALOG[offerId].billing === 'monthly'
                  ? '/month'
                  : OFFER_CATALOG[offerId].billing === 'one_time'
                    ? ' once'
                    : ''}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
