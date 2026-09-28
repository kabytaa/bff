import type { InvitationPreview } from '@tofler/bff-auth/core';
import { BffAuthLink, useBffAuth } from '@tofler/bff-auth/react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

export function Component() {
  const { invitationToken } = useParams();
  const { client, state } = useBffAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!invitationToken) {
      setError('This invitation link is incomplete.');
      return;
    }
    void client
      .inspectInvitation(invitationToken)
      .then(setPreview)
      .catch(() =>
        setError('This invitation is invalid, expired or no longer available.'),
      );
  }, [client, invitationToken]);

  const accept = async () => {
    if (!invitationToken) return;
    setBusy(true);
    setError(null);
    try {
      await client.acceptInvitation(invitationToken);
      navigate('/projects', { replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The invitation could not be accepted.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="invitation-page">
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
          </p>
        ) : null}
        {!preview && !error ? <p>Checking the invitation…</p> : null}
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
