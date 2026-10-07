import { BffAuthLink, useBffAuth } from '@tofler/bff-auth/react';
import { Link } from 'react-router-dom';

/** Only a confirmed signed-out state offers login; bootstrap is not logout. */
export function PublicSessionAction({
  className,
  returnPath = '/projects',
  destination = '/projects',
  signedInLabel = 'Projects',
  signedOutLabel = 'Log in',
  intent = 'login',
}: {
  readonly className: string;
  readonly returnPath?: string;
  readonly destination?: string;
  readonly signedInLabel?: string;
  readonly signedOutLabel?: string;
  readonly intent?: 'login' | 'continue';
}) {
  const { state, client } = useBffAuth();
  if (state.status === 'loading')
    return <span role="status">Checking session…</span>;
  if (state.status === 'recoverable_error') {
    return (
      <button
        className={className}
        type="button"
        onClick={() => void client.bootstrap()}
      >
        Retry session
      </button>
    );
  }
  if ('customer' in state) {
    return (
      <Link className={className} to={destination}>
        {signedInLabel}
      </Link>
    );
  }
  return (
    <BffAuthLink className={className} intent={intent} returnPath={returnPath}>
      {signedOutLabel}
    </BffAuthLink>
  );
}
