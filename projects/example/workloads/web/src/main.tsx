import { createBffAuthBrowserClient } from '@tofler/bff-auth/browser';
import { BffConvexProvider } from '@tofler/bff-auth/convex/client';
import { BffAuthProvider } from '@tofler/bff-auth/react';
import { ConvexReactClient } from 'convex/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ExampleApp } from './app';
import { createExampleAuthDiagnostics } from './authDiagnostics';
import { readExampleWebConfiguration } from './config';
import { ExampleDashboard } from './dashboard';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Example root element is missing');
const root = createRoot(rootElement);

try {
  const configuration = readExampleWebConfiguration();
  const diagnostics = configuration.authDiagnosticsEnabled
    ? createExampleAuthDiagnostics({
        adapterOrigin: configuration.convexSiteUrl,
        environmentKey: configuration.environmentKey,
      })
    : undefined;
  const authClient = createBffAuthBrowserClient({
    bffBaseUrl: configuration.bffBaseUrl,
    environmentKey: configuration.environmentKey,
    sessionAdapterBaseUrl: configuration.convexSiteUrl,
    ...(diagnostics === undefined ? {} : { fetch: diagnostics.fetch }),
  });
  const convexClient = new ConvexReactClient(configuration.convexUrl);

  root.render(
    <StrictMode>
      <BffAuthProvider client={authClient}>
        <BffConvexProvider client={convexClient}>
          <ExampleApp
            bffBaseUrl={configuration.bffBaseUrl}
            convexSiteUrl={configuration.convexSiteUrl}
            environmentKey={configuration.environmentKey}
            diagnostics={diagnostics}
          />
        </BffConvexProvider>
      </BffAuthProvider>
    </StrictMode>,
  );
} catch {
  root.render(
    <StrictMode>
      <ExampleDashboard
        model={{
          state: 'configuration_error',
          message: 'The hosted example is missing its public configuration.',
        }}
      />
    </StrictMode>,
  );
}
