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
      '@tofler/bff-auth/convex/server': resolve(
        workspaceRoot,
        'platform/bff/libs/sdk/typescript/src/adapters/convex/server.ts',
      ),
    },
  },
  test: {
    environment: 'edge-runtime',
    env: {
      BFF_CUSTOMER_AUTH_ISSUER: 'https://auth-dev.tofler.app',
      BFF_CUSTOMER_API_BASE_URL: 'https://bff-backend.convex.site',
      BFF_CUSTOMER_DEFAULT_POST_LOGIN_PATH: '/',
      BFF_CUSTOMER_ENVIRONMENT_KEY: 'example-development',
      BFF_CUSTOMER_JWKS_URL: 'https://bff-backend.convex.site/v1/auth/jwks',
      BFF_CUSTOMER_SESSION_ADAPTER_BASE_URL:
        'https://example-backend.convex.site',
      BFF_CUSTOMER_WEB_ORIGINS_JSON: '["https://example-dev.tofler.app"]',
    },
    include: ['projects/example/backend/convex/**/*.test.ts'],
    server: {
      deps: {
        inline: ['convex-test'],
      },
    },
  },
});
