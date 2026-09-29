import { useBffAuth } from '@tofler/bff-auth/react';
import { useConvex } from 'convex/react';
import { useMemo } from 'react';

import { createTableCardsBackend } from './backend';

export function useTableCardsBackend() {
  const { client } = useBffAuth();
  const convex = useConvex();
  return useMemo(
    () => createTableCardsBackend(convex, client),
    [client, convex],
  );
}
