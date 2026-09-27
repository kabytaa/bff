import { parseHealthResponse, type HealthResponse } from '@bff/contracts';
import { api } from '@bff/service-api';
import { useQuery } from 'convex/react';
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
      ? {
          environmentKey: effectiveEnvironmentKey,
          paginationOpts: { cursor: null, numItems: 25 },
        }
      : ('skip' as const);
  const customerUsers = useQuery(
    api.customerBackoffice.users,
    customerQueryArgs,
  );
  const customerAccounts = useQuery(
    api.customerBackoffice.accounts,
    customerQueryArgs,
  );
  const customerMemberships = useQuery(
    api.customerBackoffice.memberships,
    customerQueryArgs,
  );
  const customerSessions = useQuery(
    api.customerBackoffice.sessions,
    customerQueryArgs,
  );
  const customerSecurityEvents = useQuery(
    api.customerBackoffice.securityEvents,
    customerQueryArgs,
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
                customerUsers === undefined ||
                customerAccounts === undefined ||
                customerMemberships === undefined ||
                customerSessions === undefined ||
                customerSecurityEvents === undefined,
              users: customerUsers?.page ?? [],
              accounts: customerAccounts?.page ?? [],
              memberships: customerMemberships?.page ?? [],
              sessions: customerSessions?.page ?? [],
              securityEvents: customerSecurityEvents?.page ?? [],
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
