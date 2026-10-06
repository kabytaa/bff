import { useBffAuth } from '@tofler/bff-auth/react';
import { useConvex } from 'convex/react';
import { useEffect, useMemo } from 'react';

import { createTableCardsBackend } from './backend';
import { readTableCardsWebConfiguration } from './config';

export function useTableCardsBackend() {
  const { client } = useBffAuth();
  const convex = useConvex();
  const backend = useMemo(
    () =>
      createTableCardsBackend(
        convex,
        client,
        readTableCardsWebConfiguration().convexSiteUrl,
      ),
    [client, convex],
  );
  useEffect(() => {
    backend.activate();
    return () => backend.dispose();
  }, [backend]);
  return backend;
}
