import { BACKOFFICE_GOOGLE_CLIENT_ID } from '@bff/static-config';
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import { Dashboard } from './dashboard';
import {
  GoogleIdentityProvider,
  useGoogleAuthForConvex,
} from './googleIdentity';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Dashboard root element is missing');
const root = createRoot(rootElement);
const convexUrl = import.meta.env.VITE_CONVEX_URL?.trim();
const siteUrl = import.meta.env.VITE_CONVEX_SITE_URL?.trim();

if (!convexUrl || !siteUrl) {
  root.render(
    <StrictMode>
      <Dashboard
        model={{
          state: 'configuration-error',
          message:
            'VITE_CONVEX_URL and VITE_CONVEX_SITE_URL are required for the hosted dashboard.',
        }}
      />
    </StrictMode>,
  );
} else {
  const client = new ConvexReactClient(convexUrl);
  root.render(
    <StrictMode>
      <GoogleIdentityProvider clientId={BACKOFFICE_GOOGLE_CLIENT_ID}>
        <ConvexProviderWithAuth
          client={client}
          useAuth={useGoogleAuthForConvex}
        >
          <App siteUrl={siteUrl} />
        </ConvexProviderWithAuth>
      </GoogleIdentityProvider>
    </StrictMode>,
  );
}
