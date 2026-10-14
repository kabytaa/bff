import { useState } from 'react';

export function TestUserControl({
  enabled,
  customer,
  onSave,
}: {
  enabled: boolean;
  customer: string;
  onSave: (enabled: boolean) => Promise<unknown>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <section className="operator-panel" aria-label="Test-user settings">
      <h2>Test-user settings</h2>
      <p>
        <strong>{enabled ? 'Test user' : 'Normal user'}</strong> · {customer}
      </p>
      <p className="operator-secondary">
        Only operators can change this setting. Test checkout is available in
        either environment, only in test-only workspaces. It never charges money
        or replaces paid access.
      </p>
      {confirming ? (
        <div role="group" aria-label="Confirm test-user change">
          <p>
            {enabled
              ? 'Stop future test purchases for this customer? Existing test access and data will remain.'
              : 'Allow this customer to use no-charge test checkout? Normal sign-in, Owner permissions and usage limits still apply.'}
          </p>
          <div className="operator-actions">
            <button
              className="operator-button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setError(false);
                setSaved(false);
                void onSave(!enabled)
                  .then(() => {
                    setConfirming(false);
                    setSaved(true);
                  })
                  .catch(() => setError(true))
                  .finally(() => setBusy(false));
              }}
            >
              {busy
                ? 'Saving…'
                : enabled
                  ? 'Confirm removal'
                  : 'Enable test user'}
            </button>
            <button
              className="operator-button secondary"
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                setError(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="operator-button secondary"
          onClick={() => {
            setConfirming(true);
            setSaved(false);
          }}
        >
          {enabled ? 'Remove test-user status' : 'Mark as test user'}
        </button>
      )}
      {error ? (
        <p role="alert">
          Test-user status could not be changed. Review the current customer and
          try again.
        </p>
      ) : null}
      {saved ? <p role="status">Test-user status saved.</p> : null}
    </section>
  );
}
