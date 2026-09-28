import { OFFER_CATALOG, type OfferId } from '@tablecards/core';
import { useBffAuth } from '@tofler/bff-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useTableCardsApplication } from '../application-context';
import type { CurrentProductAccess } from '../backend';
import { useTableCardsBackend } from '../use-tablecards-backend';

export function Component() {
  const { state, snapshot } = useBffAuth();
  const { developmentControlsEnabled } = useTableCardsApplication();
  const backend = useTableCardsBackend();
  const [access, setAccess] = useState<CurrentProductAccess | null>(null);
  const [activeProjects, setActiveProjects] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const account =
    state.status === 'authenticated'
      ? state.customer.accounts.find(
          (candidate) => candidate.id === state.accountId,
        )
      : undefined;

  const load = useCallback(async () => {
    const [nextAccess, projects] = await Promise.all([
      backend.getCurrentAccess(),
      backend.listProjects('active'),
    ]);
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
    try {
      await backend.selectDevelopmentOffer(offerId);
      await load();
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
          <h2>Mock an offer</h2>
          <p>
            This exercises the same product-access contract without charging a
            payment method.
          </p>
          <div className="offer-buttons">
            {(Object.keys(OFFER_CATALOG) as OfferId[]).map((offerId) => (
              <button
                key={offerId}
                type="button"
                disabled={busy}
                className={access?.offerKey === offerId ? 'active' : ''}
                onClick={() => void switchOffer(offerId)}
              >
                {OFFER_CATALOG[offerId].name}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
