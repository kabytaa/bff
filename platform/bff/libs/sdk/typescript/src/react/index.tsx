import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';

import type { AuthSessionSnapshot, BffAuthBrowserClient } from '../browser';
import type { AuthSessionState } from '../core';

export interface BffAuthReactValue {
  readonly client: BffAuthBrowserClient;
  readonly snapshot: AuthSessionSnapshot;
  readonly state: AuthSessionState;
}

const BffAuthContext = createContext<BffAuthReactValue | null>(null);

export interface BffAuthProviderProps extends PropsWithChildren {
  readonly client: BffAuthBrowserClient;
  readonly autoBootstrap?: boolean;
}

export function BffAuthProvider({
  client,
  autoBootstrap = true,
  children,
}: BffAuthProviderProps) {
  const snapshot = useSyncExternalStore(
    client.subscribe,
    client.getSnapshot,
    client.getSnapshot,
  );

  useEffect(() => {
    if (autoBootstrap) void client.bootstrap();
  }, [autoBootstrap, client]);

  const value = useMemo(
    () => ({ client, snapshot, state: snapshot.state }),
    [client, snapshot],
  );
  return (
    <BffAuthContext.Provider value={value}>{children}</BffAuthContext.Provider>
  );
}

export function useBffAuth(): BffAuthReactValue {
  const value = useContext(BffAuthContext);
  if (!value) throw new Error('BffAuthProvider is missing');
  return value;
}

export interface BffSignInButtonProps {
  readonly returnPath?: string;
  readonly className?: string;
  readonly children?: ReactNode;
}

export function BffSignInButton({
  returnPath,
  className,
  children = 'Sign in',
}: BffSignInButtonProps) {
  const { client } = useBffAuth();
  return (
    <a className={className} href={client.getSignInUrl(returnPath)}>
      {children}
    </a>
  );
}

export type BffSignOutButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'type'
>;

export function BffSignOutButton({
  children = 'Sign out',
  disabled,
  ...props
}: BffSignOutButtonProps) {
  const { client, state } = useBffAuth();
  const unavailable =
    state.status === 'loading' || state.status === 'signed_out';
  return (
    <button
      {...props}
      type="button"
      disabled={disabled ?? unavailable}
      onClick={() => void client.logout().catch(() => undefined)}
    >
      {children}
    </button>
  );
}

export interface BffAccountSelectorProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'children' | 'onChange' | 'value'
> {
  readonly label?: ReactNode;
  readonly placeholder?: string;
}

export function BffAccountSelector({
  label = 'Account',
  placeholder = 'Choose an account',
  id,
  ...props
}: BffAccountSelectorProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const { client, state } = useBffAuth();
  const customer =
    state.status === 'authenticated' ||
    state.status === 'onboarding_required' ||
    state.status === 'account_selection_required'
      ? state.customer
      : undefined;
  if (!customer || customer.accounts.length < 2) return null;
  const selected = state.status === 'authenticated' ? state.accountId : '';

  return (
    <label htmlFor={selectId}>
      <span>{label}</span>
      <select
        {...props}
        id={selectId}
        value={selected}
        onChange={(event) => {
          if (event.target.value) {
            void client
              .selectAccount(event.target.value)
              .catch(() => undefined);
          }
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {customer.accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.displayName ?? account.id}
          </option>
        ))}
      </select>
    </label>
  );
}

export type { AuthSessionSnapshot, BffAuthBrowserClient } from '../browser';
export type { AuthSessionState } from '../core';
