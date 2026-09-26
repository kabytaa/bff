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
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

if (!convexUrl || !siteUrl || !googleClientId) {
  root.render(
    <StrictMode>
      <Dashboard
        model={{
          state: 'configuration-error',
          message:
            'VITE_CONVEX_URL, VITE_CONVEX_SITE_URL, and VITE_GOOGLE_CLIENT_ID are required for the hosted dashboard.',
        }}
      />
    </StrictMode>,
  );
} else {
  const client = new ConvexReactClient(convexUrl);
  root.render(
    <StrictMode>
      <GoogleIdentityProvider clientId={googleClientId}>
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
