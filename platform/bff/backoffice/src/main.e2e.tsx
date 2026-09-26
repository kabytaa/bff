import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Dashboard } from './dashboard';
import './styles.css';

const BFF_E2E_FIXTURE = 'BFF_E2E_FIXTURE_DO_NOT_SHIP';
document.documentElement.dataset.fixture = BFF_E2E_FIXTURE;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dashboard
      model={{
        state: 'ready',
        health: {
          status: 'ok',
          service: 'business-factory-bff',
          version: 'test-build',
        },
        environments: [
          {
            id: 'environment-development',
            createdAt: Date.UTC(2026, 8, 25, 10),
            key: 'sample-development',
            businessName: 'Sample Business',
            environmentName: 'Development',
            updatedAt: Date.UTC(2026, 8, 25, 11),
          },
          {
            id: 'environment-qa',
            createdAt: Date.UTC(2026, 8, 25, 10),
            key: 'sample-qa',
            businessName: 'Sample Business',
            environmentName: 'QA',
            updatedAt: Date.UTC(2026, 8, 25, 12),
          },
        ],
      }}
    />
  </StrictMode>,
);
