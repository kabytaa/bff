import { type BffAccountSelector, useBffAuth } from '@tofler/bff-auth/react';
import { useEffect, useId, useRef, useState, type ComponentProps } from 'react';
import { safeProductMessage } from './product-error';

export const ACCOUNT_CHANGE_EVENT = 'tablecards:before-account-change';

export function WorkspaceSelector(
  props: ComponentProps<typeof BffAccountSelector>,
) {
  const { client, state } = useBffAuth();
  const generatedId = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const {
    label = 'Account',
    placeholder = 'Choose a workspace',
    id = generatedId,
    ...selectProps
  } = props;
  const customer = 'customer' in state ? state.customer : null;
  if (!customer || customer.accounts.length < 2) return null;
  const selected = state.status === 'authenticated' ? state.accountId : '';
  return (
    <div className="workspace-selector">
      <label htmlFor={id}>
        <span>{label}</span>
        <select
          {...selectProps}
          id={id}
          value={selected}
          disabled={busy || props.disabled}
          onChange={(event) => {
            const accountId = event.target.value;
            if (
              !window.dispatchEvent(
                new Event(ACCOUNT_CHANGE_EVENT, { cancelable: true }),
              )
            ) {
              event.currentTarget.value = selected;
              return;
            }
            setBusy(true);
            setError(null);
            void client
              .selectAccount(accountId)
              .catch((caught: unknown) =>
                setError(
                  safeProductMessage(
                    caught,
                    'The workspace could not be switched. Retry your session.',
                  ),
                ),
              )
              .finally(() => setBusy(false));
          }}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {customer.accounts.map((account, index) => (
            <option key={account.id} value={account.id}>
              {account.displayName ??
                `${account.membership.role === 'owner' ? 'My' : 'Shared'} workspace ${index + 1}`}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p className="notice error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// This observer must remain above BffConvexProvider's account-keyed subtree.
export function AccountNavigation({
  navigate,
  pathname,
}: {
  readonly navigate: (path: string) => void;
  readonly pathname: () => string;
}) {
  const { state } = useBffAuth();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (state.status === 'signed_out') {
      const endedAuthenticatedSession = previous.current !== null;
      previous.current = null;
      if (!endedAuthenticatedSession) return;
      try {
        const keys = Object.keys(sessionStorage).filter((key) =>
          key.startsWith('tablecards:protected-draft:'),
        );
        keys.forEach((key) => sessionStorage.removeItem(key));
      } catch {
        /* Storage is optional in private browsing. */
      }
      return;
    }
    if (state.status !== 'authenticated') return;
    const changed =
      previous.current !== null && previous.current !== state.accountId;
    previous.current = state.accountId;
    if (changed && /^\/(?:projects|designs|settings)(?:\/|$)/u.test(pathname()))
      navigate('/projects');
  }, [navigate, pathname, state]);
  return null;
}
