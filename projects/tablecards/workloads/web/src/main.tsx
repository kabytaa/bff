import { createBffAuthBrowserClient } from '@tofler/bff-auth/browser';
import { BffConvexProvider } from '@tofler/bff-auth/convex/client';
import { BffAuthProvider } from '@tofler/bff-auth/react';
import { ConvexReactClient } from 'convex/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { TableCardsApplicationProvider } from './application-context';
import { readTableCardsWebConfiguration } from './config';
import { tableCardsRouter } from './router';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('TableCards root element is missing');
const root = createRoot(rootElement);

try {
  const configuration = readTableCardsWebConfiguration();
  const authClient = createBffAuthBrowserClient({
    bffBaseUrl: configuration.bffBaseUrl,
    environmentKey: configuration.environmentKey,
    sessionAdapterBaseUrl: configuration.sessionAdapterUrl,
    ...(configuration.webOrigin === undefined
      ? {}
      : { webOrigin: configuration.webOrigin }),
  });
  const convexClient = new ConvexReactClient(configuration.convexUrl);

  root.render(
    <StrictMode>
      <BffAuthProvider client={authClient}>
        <BffConvexProvider client={convexClient}>
          <TableCardsApplicationProvider
            developmentControlsEnabled={
              configuration.developmentControlsEnabled
            }
          >
            <RouterProvider router={tableCardsRouter} />
          </TableCardsApplicationProvider>
        </BffConvexProvider>
      </BffAuthProvider>
    </StrictMode>,
  );
} catch {
  root.render(
    <StrictMode>
      <main className="configuration-error">
        <p className="eyebrow">TableCards configuration</p>
        <h1>This development surface is not configured yet.</h1>
        <p>
          The public backend and authentication origins are required before the
          creator can start.
        </p>
      </main>
    </StrictMode>,
  );
}
