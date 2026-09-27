import {
  createLocalJWKSet,
  createRemoteJWKSet,
  importJWK,
  jwtVerify,
  SignJWT,
  type JSONWebKeySet,
  type JWK,
  type JWTVerifyGetKey,
} from 'jose';
import { z } from 'zod';

import {
  CONTEXT_TOKEN_TTL_SECONDS,
  CUSTOMER_DEVELOPMENT_AUTH_PATH,
  CUSTOMER_DEVELOPMENT_GRANT_TTL_SECONDS,
  CUSTOMER_CONTEXT_VERSION,
  customerContextAudience,
  customerContextClaimsSchema,
  customerDevelopmentGrantClaimsSchema,
  normalizeHttpsOrigin,
  publicIdentifierSchema,
  type AccountPermission,
  type AccountRole,
  type CustomerContextClaims,
  type CustomerDevelopmentGrantClaims,
} from '@bff/contracts';
import {
  CUSTOMER_DEVELOPMENT_AUTOMATION_ISSUER,
  CUSTOMER_DEVELOPMENT_AUTOMATION_SUBJECT,
  CUSTOMER_GOOGLE_CLIENT_ID,
  CUSTOMER_GOOGLE_ISSUERS,
} from '@bff/static-config';

const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');
const GOOGLE_JWKS = createRemoteJWKSet(GOOGLE_JWKS_URL);
const MAX_PROVIDER_TOKEN_LENGTH = 16 * 1024;
const MAX_CONTEXT_TOKEN_LENGTH = 16 * 1024;
const MAX_DEVELOPMENT_GRANT_LENGTH = 16 * 1024;
const textEncoder = new TextEncoder();
const verifiedEmailSchema = z.string().trim().toLowerCase().email().max(320);

export const CUSTOMER_SIGNING_ENVIRONMENT = {
  issuer: 'BFF_CUSTOMER_AUTH_ISSUER',
  privateJwk: 'BFF_CUSTOMER_SIGNING_PRIVATE_JWK',
  publicJwks: 'BFF_CUSTOMER_SIGNING_PUBLIC_JWKS',
} as const;

export const CUSTOMER_DEVELOPMENT_AUTOMATION_ENVIRONMENT = {
  audience: 'BFF_CUSTOMER_DEVELOPMENT_AUTOMATION_AUDIENCE',
  publicJwks: 'BFF_CUSTOMER_DEVELOPMENT_AUTOMATION_PUBLIC_JWKS',
} as const;

const DEVELOPMENT_AUTOMATION_DISABLED = 'disabled';

interface CustomerPrivateJwk extends JWK {
  alg: 'ES256';
  crv: 'P-256';
  d: string;
  kid: string;
  kty: 'EC';
  use: 'sig';
  x: string;
  y: string;
}

export interface CustomerSigningConfiguration {
  readonly issuer: string;
  readonly privateJwk: CustomerPrivateJwk;
  readonly publicJwks: JSONWebKeySet;
}

export interface CustomerDevelopmentAutomationConfiguration {
  readonly audience: string;
  readonly publicJwks: JSONWebKeySet;
}

export interface VerifiedGoogleIdentity {
  readonly provider: 'google';
  readonly issuer: 'https://accounts.google.com';
  readonly subject: string;
  readonly verifiedEmail: string;
  readonly displayName: string;
  readonly pictureUrl?: string;
  readonly authenticatedAt: number;
}

export type CustomerContextIssuance =
  | {
      contextType: 'onboarding';
      environmentKey: string;
      userPublicId: string;
      sessionPublicId: string;
      tokenPublicId: string;
      authorizedAt: number;
      expiresAt: number;
    }
  | {
      contextType: 'account';
      environmentKey: string;
      userPublicId: string;
      sessionPublicId: string;
      tokenPublicId: string;
      accountPublicId: string;
      membershipPublicId: string;
      role: AccountRole;
      permissions: readonly AccountPermission[];
      authorizedAt: number;
      expiresAt: number;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} is malformed`);
  }
}

function isPrivateJwk(value: unknown): value is CustomerPrivateJwk {
  return (
    isRecord(value) &&
    value.kty === 'EC' &&
    value.crv === 'P-256' &&
    value.alg === 'ES256' &&
    value.use === 'sig' &&
    typeof value.kid === 'string' &&
    value.kid.length > 0 &&
    typeof value.x === 'string' &&
    value.x.length > 0 &&
    typeof value.y === 'string' &&
    value.y.length > 0 &&
    typeof value.d === 'string' &&
    value.d.length > 0
  );
}

function isPublicJwk(value: unknown): value is JWK & {
  alg: 'ES256';
  crv: 'P-256';
  kid: string;
  kty: 'EC';
  use: 'sig';
  x: string;
  y: string;
} {
  return (
    isRecord(value) &&
    value.kty === 'EC' &&
    value.crv === 'P-256' &&
    value.alg === 'ES256' &&
    value.use === 'sig' &&
    typeof value.kid === 'string' &&
    value.kid.length > 0 &&
    typeof value.x === 'string' &&
    value.x.length > 0 &&
    typeof value.y === 'string' &&
    value.y.length > 0 &&
    !('d' in value)
  );
}

function parseCustomerDevelopmentAudience(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== CUSTOMER_DEVELOPMENT_AUTH_PATH ||
    url.search ||
    url.hash ||
    url.href !== value
  ) {
    throw new Error(
      'Customer development automation audience must be the exact HTTPS endpoint',
    );
  }
  return value;
}

export function parseCustomerDevelopmentAutomationConfiguration({
  audience,
  publicJwks,
}: {
  readonly audience: string | undefined;
  readonly publicJwks: string | undefined;
}): CustomerDevelopmentAutomationConfiguration | null {
  const normalizedAudience = audience?.trim();
  const normalizedJwks = publicJwks?.trim();
  if (!normalizedAudience && !normalizedJwks) return null;
  if (
    normalizedAudience === DEVELOPMENT_AUTOMATION_DISABLED &&
    normalizedJwks === DEVELOPMENT_AUTOMATION_DISABLED
  ) {
    return null;
  }
  if (
    !normalizedAudience ||
    !normalizedJwks ||
    normalizedAudience === DEVELOPMENT_AUTOMATION_DISABLED ||
    normalizedJwks === DEVELOPMENT_AUTOMATION_DISABLED
  ) {
    throw new Error(
      'Customer development automation must be fully configured or disabled',
    );
  }
  const parsedJwks = parseJson(
    normalizedJwks,
    CUSTOMER_DEVELOPMENT_AUTOMATION_ENVIRONMENT.publicJwks,
  );
  if (
    !isRecord(parsedJwks) ||
    !Array.isArray(parsedJwks.keys) ||
    parsedJwks.keys.length !== 1 ||
    !isPublicJwk(parsedJwks.keys[0])
  ) {
    throw new Error('Customer development automation public JWKS is invalid');
  }
  return {
    audience: parseCustomerDevelopmentAudience(normalizedAudience),
    publicJwks: { keys: parsedJwks.keys },
  };
}

export function customerDevelopmentAutomationRouteEnabled(
  environment: Record<string, string | undefined> = process.env,
): boolean {
  return (
    parseCustomerDevelopmentAutomationConfiguration({
      audience:
        environment[CUSTOMER_DEVELOPMENT_AUTOMATION_ENVIRONMENT.audience],
      publicJwks:
        environment[CUSTOMER_DEVELOPMENT_AUTOMATION_ENVIRONMENT.publicJwks],
    }) !== null
  );
}

export function readCustomerDevelopmentAutomationConfiguration(): CustomerDevelopmentAutomationConfiguration {
  const configuration = parseCustomerDevelopmentAutomationConfiguration({
    audience: process.env[CUSTOMER_DEVELOPMENT_AUTOMATION_ENVIRONMENT.audience],
    publicJwks:
      process.env[CUSTOMER_DEVELOPMENT_AUTOMATION_ENVIRONMENT.publicJwks],
  });
  if (!configuration) {
    throw new Error('Customer development automation is disabled');
  }
  return configuration;
}

export async function verifyCustomerDevelopmentGrant({
  token,
  configuration = readCustomerDevelopmentAutomationConfiguration(),
  currentDate = new Date(),
}: {
  readonly token: string;
  readonly configuration?: CustomerDevelopmentAutomationConfiguration;
  readonly currentDate?: Date;
}): Promise<CustomerDevelopmentGrantClaims> {
  if (!token || token.length > MAX_DEVELOPMENT_GRANT_LENGTH) {
    throw new Error('Customer development grant is invalid');
  }
  const verified = await jwtVerify(
    token,
    createLocalJWKSet(configuration.publicJwks),
    {
      algorithms: ['ES256'],
      issuer: CUSTOMER_DEVELOPMENT_AUTOMATION_ISSUER,
      subject: CUSTOMER_DEVELOPMENT_AUTOMATION_SUBJECT,
      audience: configuration.audience,
      currentDate,
    },
  );
  if (verified.protectedHeader.typ !== 'JWT') {
    throw new Error('Customer development grant type is invalid');
  }
  const claims = customerDevelopmentGrantClaimsSchema.parse(verified.payload);
  const now = Math.floor(currentDate.getTime() / 1_000);
  if (
    claims.exp - claims.iat > CUSTOMER_DEVELOPMENT_GRANT_TTL_SECONDS ||
    claims.iat > now + 60
  ) {
    throw new Error('Customer development grant lifetime is invalid');
  }
  return claims;
}

export function parseCustomerSigningConfiguration({
  issuer,
  privateJwk,
  publicJwks,
}: {
  issuer: string | undefined;
  privateJwk: string | undefined;
  publicJwks: string | undefined;
}): CustomerSigningConfiguration {
  if (!issuer?.trim() || !privateJwk?.trim() || !publicJwks?.trim()) {
    throw new Error('Customer signing is not configured');
  }

  const normalizedIssuer = normalizeHttpsOrigin(issuer.trim());
  const parsedPrivate = parseJson(
    privateJwk,
    CUSTOMER_SIGNING_ENVIRONMENT.privateJwk,
  );
  const parsedPublic = parseJson(
    publicJwks,
    CUSTOMER_SIGNING_ENVIRONMENT.publicJwks,
  );
  if (!isPrivateJwk(parsedPrivate)) {
    throw new Error('Customer signing private key is invalid');
  }
  if (
    !isRecord(parsedPublic) ||
    !Array.isArray(parsedPublic.keys) ||
    parsedPublic.keys.length < 1 ||
    parsedPublic.keys.length > 4 ||
    !parsedPublic.keys.every(isPublicJwk)
  ) {
    throw new Error('Customer signing public JWKS is invalid');
  }

  const kids = new Set(parsedPublic.keys.map((key) => key.kid));
  if (kids.size !== parsedPublic.keys.length) {
    throw new Error('Customer signing public JWKS contains duplicate kids');
  }
  const matchingPublic = parsedPublic.keys.find(
    (key) => key.kid === parsedPrivate.kid,
  );
  if (
    !matchingPublic ||
    matchingPublic.x !== parsedPrivate.x ||
    matchingPublic.y !== parsedPrivate.y
  ) {
    throw new Error('Customer signing key pair does not match');
  }

  return {
    issuer: normalizedIssuer,
    privateJwk: parsedPrivate,
    publicJwks: { keys: parsedPublic.keys },
  };
}

export function readCustomerSigningConfiguration(
  environment: Record<string, string | undefined> = process.env,
): CustomerSigningConfiguration {
  return parseCustomerSigningConfiguration({
    issuer: environment[CUSTOMER_SIGNING_ENVIRONMENT.issuer],
    privateJwk: environment[CUSTOMER_SIGNING_ENVIRONMENT.privateJwk],
    publicJwks: environment[CUSTOMER_SIGNING_ENVIRONMENT.publicJwks],
  });
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

export function randomOpaqueSecret(byteLength = 32): string {
  if (!Number.isSafeInteger(byteLength) || byteLength < 16 || byteLength > 64) {
    throw new Error('Opaque secret length is invalid');
  }
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export function randomPublicIdentifier(prefix: string): string {
  if (!/^[a-z][a-z0-9_]{1,20}$/u.test(prefix)) {
    throw new Error('Public identifier prefix is invalid');
  }
  return publicIdentifierSchema.parse(`${prefix}_${randomOpaqueSecret(18)}`);
}

export async function sha256Base64Url(value: string): Promise<string> {
  return bytesToBase64Url(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', textEncoder.encode(value)),
    ),
  );
}

export async function pkceS256Challenge(verifier: string): Promise<string> {
  if (verifier.length < 43 || verifier.length > 128) {
    throw new Error('PKCE verifier length is invalid');
  }
  return await sha256Base64Url(verifier);
}

export function customerEnvironmentAudience(
  issuer: string,
  environmentKey: string,
): string {
  return customerContextAudience(issuer, environmentKey);
}

function optionalHttpsPicture(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
}

export async function verifyGoogleIdentityToken({
  token,
  expectedNonce,
  keySet = GOOGLE_JWKS,
  currentDate,
}: {
  token: string;
  expectedNonce: string;
  keySet?: JWTVerifyGetKey;
  currentDate?: Date;
}): Promise<VerifiedGoogleIdentity> {
  if (!token || token.length > MAX_PROVIDER_TOKEN_LENGTH) {
    throw new Error('Google identity token is invalid');
  }
  const { payload } = await jwtVerify(token, keySet, {
    algorithms: ['RS256'],
    audience: CUSTOMER_GOOGLE_CLIENT_ID,
    issuer: [...CUSTOMER_GOOGLE_ISSUERS],
    requiredClaims: ['aud', 'exp', 'iat', 'iss', 'sub', 'nonce', 'email'],
    typ: 'JWT',
    currentDate,
    clockTolerance: 30,
  });
  if (
    payload.nonce !== expectedNonce ||
    payload.email_verified !== true ||
    typeof payload.email !== 'string' ||
    typeof payload.sub !== 'string' ||
    payload.sub.length === 0 ||
    payload.sub.length > 255 ||
    typeof payload.iat !== 'number'
  ) {
    throw new Error('Google identity token is invalid');
  }

  if (
    Array.isArray(payload.aud) &&
    payload.aud.length > 1 &&
    payload.azp !== CUSTOMER_GOOGLE_CLIENT_ID
  ) {
    throw new Error('Google identity token is invalid');
  }
  const normalizedEmail = verifiedEmailSchema.parse(payload.email);
  const displayName =
    typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim().slice(0, 120)
      : normalizedEmail;
  const pictureUrl = optionalHttpsPicture(payload.picture);
  return {
    provider: 'google',
    issuer: 'https://accounts.google.com',
    subject: payload.sub,
    verifiedEmail: normalizedEmail,
    displayName,
    ...(pictureUrl === undefined ? {} : { pictureUrl }),
    authenticatedAt: payload.iat,
  };
}

export function createCustomerContextClaims(
  configuration: CustomerSigningConfiguration,
  issuance: CustomerContextIssuance,
): CustomerContextClaims {
  const base = {
    iss: configuration.issuer,
    aud: customerEnvironmentAudience(
      configuration.issuer,
      issuance.environmentKey,
    ),
    sub: issuance.userPublicId,
    iat: issuance.authorizedAt,
    exp: Math.min(
      issuance.expiresAt,
      issuance.authorizedAt + CONTEXT_TOKEN_TTL_SECONDS,
    ),
    jti: issuance.tokenPublicId,
    version: CUSTOMER_CONTEXT_VERSION,
    environmentKey: issuance.environmentKey,
    sessionId: issuance.sessionPublicId,
  } as const;

  return customerContextClaimsSchema.parse(
    issuance.contextType === 'onboarding'
      ? { ...base, contextType: 'onboarding' }
      : {
          ...base,
          contextType: 'account',
          accountId: issuance.accountPublicId,
          membershipId: issuance.membershipPublicId,
          role: issuance.role,
          permissions: issuance.permissions,
        },
  );
}

export async function signCustomerContextToken(
  configuration: CustomerSigningConfiguration,
  issuance: CustomerContextIssuance,
): Promise<string> {
  const claims = createCustomerContextClaims(configuration, issuance);
  if (claims.exp <= claims.iat) {
    throw new Error('Customer context authorization already expired');
  }
  const key = await importJWK(configuration.privateJwk, 'ES256');
  return await new SignJWT(claims)
    .setProtectedHeader({
      alg: 'ES256',
      kid: configuration.privateJwk.kid,
      typ: 'JWT',
    })
    .sign(key);
}

export async function verifyCustomerContextToken({
  configuration,
  environmentKey,
  token,
  currentDate,
}: {
  configuration: CustomerSigningConfiguration;
  environmentKey: string;
  token: string;
  currentDate?: Date;
}): Promise<CustomerContextClaims> {
  if (!token || token.length > MAX_CONTEXT_TOKEN_LENGTH) {
    throw new Error('Customer context token is invalid');
  }
  const { payload } = await jwtVerify(
    token,
    createLocalJWKSet(configuration.publicJwks),
    {
      algorithms: ['ES256'],
      audience: customerEnvironmentAudience(
        configuration.issuer,
        environmentKey,
      ),
      issuer: configuration.issuer,
      requiredClaims: ['aud', 'exp', 'iat', 'iss', 'jti', 'sub'],
      typ: 'JWT',
      currentDate,
      clockTolerance: 30,
    },
  );
  return customerContextClaimsSchema.parse(payload);
}

export function publicCustomerJwks(
  configuration: CustomerSigningConfiguration,
): JSONWebKeySet {
  return configuration.publicJwks;
}
