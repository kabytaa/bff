import type { InvitationPreview } from '@tofler/bff-auth/core';
import { BffAuthLink, useBffAuth } from '@tofler/bff-auth/react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { safeProductMessage } from '../product-error';

export function Component() {
  const { invitationToken } = useParams();
  const { client, state } = useBffAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setPreview(null);
    if (!invitationToken) {
      setError('This invitation link is incomplete.');
      return;
    }
    void client
      .inspectInvitation(invitationToken)
      .then((next) => {
        if (!cancelled) setPreview(next);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            'This invitation is invalid, expired or no longer available. Ask the owner for a new link, or retry if your connection was interrupted.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, client, invitationToken]);

  const accept = async () => {
    if (!invitationToken) return;
    setBusy(true);
    setError(null);
    try {
      await client.acceptInvitation(invitationToken);
      navigate('/projects', { replace: true });
    } catch (caught) {
      setError(
        safeProductMessage(caught, 'The invitation could not be accepted.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="invitation-page" id="public-content" tabIndex={-1}>
      <section className="invitation-card">
        <p className="eyebrow">TableCards invitation</p>
        <h1>
          {preview?.accountDisplayName
            ? `Join ${preview.accountDisplayName}`
            : 'Review your invitation'}
        </h1>
        {preview?.state === 'pending' ? (
          <p>
            You were invited to collaborate on projects and reusable designs in
            this workspace.
          </p>
        ) : null}
        {error ? (
          <p className="notice error" role="alert">
            {error}
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => setAttempt((current) => current + 1)}
            >
              Retry invitation
            </button>
          </p>
        ) : null}
        {!preview && !error ? <p>Checking the invitation…</p> : null}
        {state.status === 'recoverable_error' ? (
          <div className="notice error" role="alert">
            <p>Your session could not be checked. Retry it before accepting.</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => void client.bootstrap()}
            >
              Retry session
            </button>
          </div>
        ) : null}
        {preview?.state === 'pending' && state.status === 'signed_out' ? (
          <BffAuthLink
            className="button"
            intent="continue"
            returnPath={`/invite/${encodeURIComponent(invitationToken ?? '')}`}
          >
            Sign in to accept
          </BffAuthLink>
        ) : preview?.state === 'pending' &&
          state.status !== 'loading' &&
          state.status !== 'recoverable_error' ? (
          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={() => void accept()}
          >
            {busy ? 'Joining…' : 'Accept invitation'}
          </button>
        ) : null}
        {preview && preview.state !== 'pending' ? (
          <p className="notice info">This invitation is {preview.state}.</p>
        ) : null}
        <Link className="text-button" to="/">
          Back to TableCards
        </Link>
      </section>
    </main>
  );
}
