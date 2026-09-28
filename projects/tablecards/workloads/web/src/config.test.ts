import { afterEach, describe, expect, it, vi } from 'vitest';

import { readTableCardsWebConfiguration } from './config';

const requiredEnvironment = {
  VITE_BFF_CUSTOMER_API_URL: 'https://compassionate-buffalo-689.convex.site',
  VITE_BFF_CUSTOMER_ENVIRONMENT_KEY: 'tablecards-development',
  VITE_BFF_SESSION_ADAPTER_URL: 'https://api.tablecards-dev.tofler.app',
  VITE_CONVEX_URL: 'https://scrupulous-hawk-991.convex.cloud',
  VITE_CONVEX_SITE_URL: 'https://scrupulous-hawk-991.convex.site',
  VITE_TABLECARDS_WEB_ORIGIN: 'https://tablecards-dev.tofler.app',
} as const;

function setEnvironment() {
  for (const [key, value] of Object.entries(requiredEnvironment)) {
    vi.stubEnv(key, value);
  }
}

afterEach(() => vi.unstubAllEnvs());

describe('TableCards web configuration', () => {
  it('keeps development controls absent unless explicitly enabled', () => {
    setEnvironment();
    expect(readTableCardsWebConfiguration().developmentControlsEnabled).toBe(
      false,
    );

    vi.stubEnv('VITE_TABLECARDS_DEV_CONTROLS', 'true');
    expect(readTableCardsWebConfiguration().developmentControlsEnabled).toBe(
      true,
    );
  });

  it('fails closed when an environment identity is invalid', () => {
    setEnvironment();
    vi.stubEnv('VITE_BFF_CUSTOMER_ENVIRONMENT_KEY', 'TableCards Development');
    expect(() => readTableCardsWebConfiguration()).toThrow(/kebab-case/u);
  });
});
