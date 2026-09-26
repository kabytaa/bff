import { describe, expect, it } from 'vitest';

import { BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER } from '@bff/static-config';
import { buildAuthConfig } from './auth.config';

const publicKey = {
  kty: 'EC',
  crv: 'P-256',
  x: 'test-x',
  y: 'test-y',
  alg: 'ES256',
  use: 'sig',
  kid: 'test-key',
};
const validJwks = `data:application/json;base64,${btoa(
  JSON.stringify({ keys: [publicKey] }),
)}`;

describe('buildAuthConfig', () => {
  it('configures only Google when development automation is absent', () => {
    expect(buildAuthConfig().providers).toHaveLength(1);
    expect(buildAuthConfig().providers[0]).toMatchObject({
      domain: 'https://accounts.google.com',
    });
  });

  it('configures only Google when development automation is explicitly disabled', () => {
    const config = buildAuthConfig({
      audience: 'disabled',
      jwks: 'disabled',
    });

    expect(config.providers).toHaveLength(1);
    expect(config.providers[0]).toMatchObject({
      domain: 'https://accounts.google.com',
    });
  });

  it('adds one exact ES256 development provider', () => {
    const config = buildAuthConfig({
      audience: 'https://ops-dev.tofler.tech/',
      jwks: validJwks,
    });

    expect(config.providers).toHaveLength(2);
    expect(config.providers[1]).toEqual({
      type: 'customJwt',
      applicationID: 'https://ops-dev.tofler.tech/',
      issuer: BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER,
      jwks: validJwks,
      algorithm: 'ES256',
    });
  });

  it.each([
    { audience: 'https://ops-dev.tofler.tech/' },
    { jwks: validJwks },
    { audience: 'disabled', jwks: validJwks },
    { audience: 'https://ops-dev.tofler.tech/', jwks: 'disabled' },
    { audience: 'not-a-url', jwks: validJwks },
    {
      audience: 'https://ops-dev.tofler.tech/',
      jwks: 'data:application/json;base64,not-json',
    },
    {
      audience: 'https://ops-dev.tofler.tech/',
      jwks: `data:application/json;base64,${btoa(
        JSON.stringify({ keys: [{ ...publicKey, d: 'private' }] }),
      )}`,
    },
  ])('fails closed for malformed configuration', (configuration) => {
    expect(() => buildAuthConfig(configuration)).toThrow(
      /Development automation|BFF_DEVELOPMENT_AUTOMATION/,
    );
  });
});
