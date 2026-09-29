import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const workspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

export default defineConfig({
  resolve: {
    alias: {
      '@bff/contracts': resolve(
        workspaceRoot,
        'platform/bff/libs/contracts/src/index.ts',
      ),
      '@tablecards/core': resolve(
        workspaceRoot,
        'projects/tablecards/libs/core/src/index.ts',
      ),
      '@tofler/bff-auth/convex/server': resolve(
        workspaceRoot,
        'platform/bff/libs/sdk/typescript/src/adapters/convex/server.ts',
      ),
      '@tofler/bff-auth/server': resolve(
        workspaceRoot,
        'platform/bff/libs/sdk/typescript/src/server/index.ts',
      ),
    },
  },
  test: {
    environment: 'edge-runtime',
    env: {
      BFF_CUSTOMER_AUTH_ISSUER: 'https://auth-dev.tofler.app',
      BFF_CUSTOMER_API_BASE_URL: 'https://bff-backend.convex.site',
      BFF_CUSTOMER_DEFAULT_POST_LOGIN_PATH: '/',
      BFF_CUSTOMER_ENVIRONMENT_KEY: 'tablecards-development',
      BFF_CUSTOMER_JWKS_URL: 'https://bff-backend.convex.site/v1/auth/jwks',
      BFF_CUSTOMER_SESSION_ADAPTER_BASE_URL:
        'https://tablecards-backend.convex.site',
      BFF_CUSTOMER_WEB_ORIGINS_JSON: '["https://tablecards-dev.tofler.app"]',
      BFF_CHECKOUT_SERVICE_TOKEN: 'checkout_service_secret_000000000001',
      TABLECARDS_DEVELOPMENT_MOCKS_ENABLED: 'true',
    },
    include: ['projects/tablecards/backend/convex/**/*.test.ts'],
    server: {
      deps: {
        inline: ['convex-test'],
      },
    },
  },
});
