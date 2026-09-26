import {
  BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER,
  BACKOFFICE_GOOGLE_CLIENT_ID,
  BACKOFFICE_GOOGLE_ISSUER,
} from '@bff/static-config';
import type { AuthConfig } from 'convex/server';

const JWKS_DATA_URI_PREFIX = 'data:application/json;base64,';

interface DevelopmentAutomationConfig {
  audience?: string;
  jwks?: string;
}

function parsePublicJwksDataUri(value: string): void {
  if (!value.startsWith(JWKS_DATA_URI_PREFIX)) {
    throw new Error(
      'BFF_DEVELOPMENT_AUTOMATION_JWKS must be a base64 JSON data URI',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(atob(value.slice(JWKS_DATA_URI_PREFIX.length)));
  } catch {
    throw new Error('BFF_DEVELOPMENT_AUTOMATION_JWKS is malformed');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('keys' in parsed) ||
    !Array.isArray(parsed.keys) ||
    parsed.keys.length !== 1
  ) {
    throw new Error(
      'BFF_DEVELOPMENT_AUTOMATION_JWKS must contain exactly one public key',
    );
  }

  const [key] = parsed.keys as unknown[];
  if (
    typeof key !== 'object' ||
    key === null ||
    !('kty' in key) ||
    key.kty !== 'EC' ||
    !('crv' in key) ||
    key.crv !== 'P-256' ||
    !('alg' in key) ||
    key.alg !== 'ES256' ||
    !('use' in key) ||
    key.use !== 'sig' ||
    !('kid' in key) ||
    typeof key.kid !== 'string' ||
    key.kid.length === 0 ||
    !('x' in key) ||
    typeof key.x !== 'string' ||
    !('y' in key) ||
    typeof key.y !== 'string' ||
    'd' in key
  ) {
    throw new Error(
      'BFF_DEVELOPMENT_AUTOMATION_JWKS must contain one ES256 public key',
    );
  }
}

function parseAudience(value: string): string {
  let audience: URL;
  try {
    audience = new URL(value);
  } catch {
    throw new Error('BFF_DEVELOPMENT_AUTOMATION_AUDIENCE must be a URL');
  }
  if (audience.protocol !== 'https:' || audience.toString() !== value) {
    throw new Error(
      'BFF_DEVELOPMENT_AUTOMATION_AUDIENCE must be a canonical HTTPS URL',
    );
  }
  return value;
}

export function buildAuthConfig({
  audience,
  jwks,
}: DevelopmentAutomationConfig = {}): AuthConfig {
  const providers: AuthConfig['providers'] = [
    {
      domain: BACKOFFICE_GOOGLE_ISSUER,
      applicationID: BACKOFFICE_GOOGLE_CLIENT_ID,
    },
  ];

  const normalizedAudience = audience?.trim();
  const normalizedJwks = jwks?.trim();
  if (!normalizedAudience && !normalizedJwks) return { providers };
  if (!normalizedAudience || !normalizedJwks) {
    throw new Error(
      'Development automation audience and JWKS must be configured together',
    );
  }

  parsePublicJwksDataUri(normalizedJwks);
  providers.push({
    type: 'customJwt',
    applicationID: parseAudience(normalizedAudience),
    issuer: BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER,
    jwks: normalizedJwks,
    algorithm: 'ES256',
  });
  return { providers };
}

export default buildAuthConfig({
  audience: process.env.BFF_DEVELOPMENT_AUTOMATION_AUDIENCE,
  jwks: process.env.BFF_DEVELOPMENT_AUTOMATION_JWKS,
});
