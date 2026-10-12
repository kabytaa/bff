import { api } from '@bff/service-api';
import { useQuery } from 'convex/react';
import type { ReactNode } from 'react';
import { Dashboard } from './dashboard';
import { OperationsApp } from './operations-app';

/** Operator authorization is authoritative; an independent health request cannot hide usable cases. */
export function App({
  signInControl,
}: {
  signInControl: ReactNode;
  siteUrl: string;
}) {
  const operator = useQuery(api.backoffice.currentOperator, {});
  if (operator === undefined)
    return (
      <Dashboard model={{ state: 'checking' }} signInControl={signInControl} />
    );
  if (!operator.authenticated)
    return (
      <Dashboard
        model={{ state: 'signed-out' }}
        signInControl={signInControl}
      />
    );
  if (!operator.authorized)
    return (
      <Dashboard
        model={{
          state: 'forbidden',
          email: operator.email,
          emailVerified: operator.emailVerified,
        }}
        signInControl={signInControl}
      />
    );
  return <OperationsApp />;
}
