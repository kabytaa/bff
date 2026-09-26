import { parseHealthResponse, type HealthResponse } from '@bff/contracts';
import { api } from '@bff/service-api';
import { useQuery } from 'convex/react';
import { useEffect, useState } from 'react';

import { Dashboard, type DashboardModel } from './dashboard';
import { GoogleSignInButton } from './googleIdentity';

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

export function App({ siteUrl }: { siteUrl: string }) {
  const { health, error: healthError } = useHealth(siteUrl);
  const operator = useQuery(api.backoffice.currentOperator, {});
  const overview = useQuery(
    api.backoffice.overview,
    operator?.authenticated && operator.authorized ? {} : 'skip',
  );

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
      issuer: operator.issuer,
      subject: operator.subject,
    };
  } else if (!health || overview === undefined) {
    model = { state: 'checking', health };
  } else {
    model = {
      state: 'ready',
      health,
      environments: overview.businessEnvironments,
    };
  }

  return (
    <Dashboard
      model={model}
      signInControl={<GoogleSignInButton />}
      onCopyIdentity={(identity) => navigator.clipboard.writeText(identity)}
    />
  );
}
