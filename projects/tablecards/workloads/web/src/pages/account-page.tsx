import { OFFER_CATALOG, type OfferId } from '@tablecards/core';
import { useBffAuth } from '@tofler/bff-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import type { CurrentProductAccess } from '../backend';
import { useTableCardsBackend } from '../use-tablecards-backend';
import { safeProductMessage } from '../product-error';

export function Component() {
  const { client, state, snapshot } = useBffAuth();
  const backend = useTableCardsBackend();
  const [searchParams, setSearchParams] = useSearchParams();
  const [access, setAccess] = useState<CurrentProductAccess | null>(null);
  const [activeProjects, setActiveProjects] = useState(0);
  const [error, setError] = useState<{
    readonly message: string;
    readonly operation: 'usage' | 'checkout' | 'rename' | 'permission';
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const loadSequence = useRef(0);
  const checkoutStarted = useRef(false);
  const [checkoutRetry, setCheckoutRetry] = useState(0);
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
  useEffect(() => {
    setWorkspaceName(
      account?.displayName ??
        (account?.membership.role === 'owner'
          ? 'My workspace'
          : 'Shared workspace'),
    );
  }, [account?.displayName, account?.id, account?.membership.role]);

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    const [nextAccess, projects] = await Promise.all([
      backend.getCurrentAccess(),
      backend.listProjects('active'),
    ]);
    if (sequence !== loadSequence.current) return;
    setAccess(nextAccess);
    setActiveProjects(projects.length);
    setError((current) => (current?.operation === 'usage' ? null : current));
  }, [backend]);

  useEffect(() => {
    void load().catch((caught: unknown) =>
      setError({
        operation: 'usage',
        message: safeProductMessage(
          caught,
          'Account usage could not be loaded.',
        ),
      }),
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
    if (!account) return;
    if (account.membership.role !== 'owner') {
      setError({
        operation: 'permission',
        message:
          'Only the workspace Owner can change its plan. Ask your Owner to update access.',
      });
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
        setError({
          operation: 'checkout',
          message: safeProductMessage(caught, 'Checkout could not be started.'),
        });
      });
  }, [
    account,
    backend,
    checkoutResult,
    checkoutRetry,
    requestedOfferId,
    state,
  ]);

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
          {error.message}
          {!busy && error.operation === 'checkout' ? (
            <button
              className="secondary-button"
              type="button"
              onClick={() => setCheckoutRetry((attempt) => attempt + 1)}
            >
              Retry checkout
            </button>
          ) : null}
          {!busy && error.operation === 'usage' ? (
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setError(null);
                void load().catch((caught: unknown) =>
                  setError({
                    operation: 'usage',
                    message: safeProductMessage(
                      caught,
                      'Account usage could not be loaded.',
                    ),
                  }),
                );
              }}
            >
              Retry usage
            </button>
          ) : null}
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
              ? 'No-charge simulation'
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
        <p>
          {account?.displayName ??
            (account?.membership.role === 'owner'
              ? 'My workspace'
              : 'Shared workspace')}
        </p>
        {account?.membership.role === 'owner' ? (
          <form
            className="workspace-name-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!workspaceName.trim()) return;
              setRenaming(true);
              setError(null);
              void client
                .renameAccount({
                  accountId: account.id,
                  displayName: workspaceName.trim(),
                })
                .then(() => setNotice('Workspace name saved.'))
                .catch((caught: unknown) =>
                  setError({
                    operation: 'rename',
                    message: safeProductMessage(
                      caught,
                      'The workspace could not be renamed.',
                    ),
                  }),
                )
                .finally(() => setRenaming(false));
            }}
          >
            <label htmlFor="workspace-name">Workspace name</label>
            <input
              id="workspace-name"
              value={workspaceName}
              required
              maxLength={120}
              onChange={(event) => setWorkspaceName(event.target.value)}
            />
            <button
              className="secondary-button"
              type="submit"
              disabled={renaming || !workspaceName.trim()}
            >
              {renaming ? 'Saving name…' : 'Save workspace name'}
            </button>
          </form>
        ) : null}
        {access?.teamAccessEnabled ? (
          <Link className="secondary-button" to="/settings/team">
            Manage team
          </Link>
        ) : (
          <p className="muted">Team collaboration is included with Studio.</p>
        )}
        <Link className="text-link" to="/#pricing">
          View plans
        </Link>
        {account?.membership.role !== 'owner' ? (
          <p className="muted">
            Only the Owner can change this workspace's plan.
          </p>
        ) : null}
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
