import { parseHealthResponse, type HealthResponse } from '@bff/contracts';
import { api } from '@bff/service-api';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { useEffect, useState, type ReactNode } from 'react';

import { Dashboard, type DashboardModel } from './dashboard';

function useHealth(siteUrl: string) {
  const [health, setHealth] = useState<HealthResponse>();
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${siteUrl.replace(/\/$/, '')}/v1/health`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Health request failed');
        setHealth(parseHealthResponse(await response.json()));
      })
      .catch((caught: unknown) => {
        if (!(caught instanceof DOMException && caught.name === 'AbortError')) {
          setError(true);
        }
      });
    return () => controller.abort();
  }, [siteUrl]);

  return { health, error };
}

export function App({
  signInControl,
  siteUrl,
}: {
  signInControl: ReactNode;
  siteUrl: string;
}) {
  const [selectedEnvironmentKey, setSelectedEnvironmentKey] = useState<
    string | undefined
  >();
  const [userLookup, setUserLookup] = useState('');
  const [submittedUserLookup, setSubmittedUserLookup] = useState('');
  const { health, error: healthError } = useHealth(siteUrl);
  const operator = useQuery(api.backoffice.currentOperator, {});
  const overview = useQuery(
    api.backoffice.overview,
    operator?.authenticated && operator.authorized ? {} : 'skip',
  );
  const effectiveEnvironmentKey =
    selectedEnvironmentKey ?? overview?.businessEnvironments[0]?.key;
  const customerQueryArgs =
    operator?.authenticated &&
    operator.authorized &&
    effectiveEnvironmentKey !== undefined
      ? { environmentKey: effectiveEnvironmentKey }
      : ('skip' as const);
  const customerUsers = usePaginatedQuery(
    api.customerBackoffice.users,
    customerQueryArgs,
    { initialNumItems: 25 },
  );
  const customerAccounts = usePaginatedQuery(
    api.customerBackoffice.accounts,
    customerQueryArgs,
    { initialNumItems: 25 },
  );
  const customerMemberships = usePaginatedQuery(
    api.customerBackoffice.memberships,
    customerQueryArgs,
    { initialNumItems: 25 },
  );
  const customerSessions = usePaginatedQuery(
    api.customerBackoffice.sessions,
    customerQueryArgs,
    { initialNumItems: 25 },
  );
  const customerSecurityEvents = usePaginatedQuery(
    api.customerBackoffice.securityEvents,
    customerQueryArgs,
    { initialNumItems: 25 },
  );
  const matchedCustomerUser = useQuery(
    api.customerBackoffice.userLookup,
    customerQueryArgs === 'skip' || submittedUserLookup === ''
      ? 'skip'
      : {
          environmentKey: customerQueryArgs.environmentKey,
          exact: submittedUserLookup,
        },
  );

  useEffect(() => {
    if (
      selectedEnvironmentKey !== undefined &&
      overview?.businessEnvironments.some(
        (environment) => environment.key === selectedEnvironmentKey,
      ) === false
    ) {
      setSelectedEnvironmentKey(overview.businessEnvironments[0]?.key);
    }
  }, [overview, selectedEnvironmentKey]);

  let model: DashboardModel;
  if (healthError) {
    model = { state: 'error', message: 'The BFF health check failed.' };
  } else if (operator === undefined) {
    model = { state: 'checking', health };
  } else if (!operator.authenticated) {
    model = { state: 'signed-out', health };
  } else if (!operator.authorized) {
    model = {
      state: 'forbidden',
      health,
      email: operator.email,
      emailVerified: operator.emailVerified,
    };
  } else if (!health || overview === undefined) {
    model = { state: 'checking', health };
  } else {
    model = {
      state: 'ready',
      health,
      environments: overview.businessEnvironments,
      ...(effectiveEnvironmentKey === undefined
        ? {}
        : { selectedEnvironmentKey: effectiveEnvironmentKey }),
      ...(effectiveEnvironmentKey === undefined
        ? {}
        : {
            customerDetail: {
              loading:
                customerUsers.status === 'LoadingFirstPage' ||
                customerAccounts.status === 'LoadingFirstPage' ||
                customerMemberships.status === 'LoadingFirstPage' ||
                customerSessions.status === 'LoadingFirstPage' ||
                customerSecurityEvents.status === 'LoadingFirstPage',
              users: customerUsers.results,
              accounts: customerAccounts.results,
              memberships: customerMemberships.results,
              sessions: customerSessions.results,
              securityEvents: customerSecurityEvents.results,
              userLookup,
              submittedUserLookup,
              ...(matchedCustomerUser === undefined
                ? {}
                : { matchedUsers: matchedCustomerUser }),
              onUserLookupChange: setUserLookup,
              onUserLookupSubmit: () =>
                setSubmittedUserLookup(userLookup.trim()),
              pages: {
                users: paginationControl(customerUsers),
                accounts: paginationControl(customerAccounts),
                memberships: paginationControl(customerMemberships),
                sessions: paginationControl(customerSessions),
                securityEvents: paginationControl(customerSecurityEvents),
              },
            },
          }),
    };
  }

  return (
    <Dashboard
      model={model}
      signInControl={signInControl}
      onSelectEnvironment={setSelectedEnvironmentKey}
    />
  );
}

function paginationControl(result: {
  readonly status: string;
  readonly loadMore: (numItems: number) => void;
}) {
  return {
    hasMore: result.status === 'CanLoadMore',
    loading: result.status === 'LoadingMore',
    loadMore: () => result.loadMore(25),
  };
}
