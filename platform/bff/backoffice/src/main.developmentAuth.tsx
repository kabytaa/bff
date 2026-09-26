import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import { Dashboard } from './dashboard';
import {
  consumeDevelopmentAutomationToken,
  DevelopmentIdentityProvider,
  useDevelopmentAuthForConvex,
} from './developmentIdentity';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Dashboard root element is missing');
const root = createRoot(rootElement);
const convexUrl = import.meta.env.VITE_CONVEX_URL?.trim();
const siteUrl = import.meta.env.VITE_CONVEX_SITE_URL?.trim();
const token = consumeDevelopmentAutomationToken();

if (!convexUrl || !siteUrl || !token) {
  root.render(
    <StrictMode>
      <Dashboard
        model={{
          state: 'configuration-error',
          message:
            'The development automation token or hosted dashboard configuration is missing.',
        }}
      />
    </StrictMode>,
  );
} else {
  const client = new ConvexReactClient(convexUrl);
  root.render(
    <StrictMode>
      <DevelopmentIdentityProvider initialToken={token}>
        <ConvexProviderWithAuth
          client={client}
          useAuth={useDevelopmentAuthForConvex}
        >
          <App
            siteUrl={siteUrl}
            signInControl={
              <p className="subtle">
                The development automation token has expired.
              </p>
            }
          />
        </ConvexProviderWithAuth>
      </DevelopmentIdentityProvider>
    </StrictMode>,
  );
}
