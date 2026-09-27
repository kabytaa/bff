import { randomBytes, randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { exportJWK, generateKeyPair, importJWK, SignJWT, type JWK } from 'jose';

import {
  CUSTOMER_DEVELOPMENT_GRANT_TTL_SECONDS,
  customerDevelopmentAudience,
  customerDevelopmentGrantClaimsSchema,
} from '@bff/contracts';
import {
  CUSTOMER_DEVELOPMENT_AUTOMATION_ISSUER,
  CUSTOMER_DEVELOPMENT_AUTOMATION_SUBJECT,
} from '@bff/static-config';

const PRIVATE_KEY_FILE = '.convex/customer-development-auth-private.jwk';
const PUBLIC_JWKS_FILE = '.convex/customer-development-auth-jwks.json';

export interface CustomerDevelopmentAuthPaths {
  readonly privateKey: string;
  readonly publicJwks: string;
}

interface DevelopmentPrivateJwk extends JWK {
  alg: 'ES256';
  crv: 'P-256';
  d: string;
  kid: string;
  kty: 'EC';
  use: 'sig';
  x: string;
  y: string;
}

interface DevelopmentPublicJwk extends JWK {
  alg: 'ES256';
  crv: 'P-256';
  kid: string;
  kty: 'EC';
  use: 'sig';
  x: string;
  y: string;
}

export function customerDevelopmentAuthPaths(
  workspaceRoot = process.cwd(),
): CustomerDevelopmentAuthPaths {
  return {
    privateKey: resolve(workspaceRoot, PRIVATE_KEY_FILE),
    publicJwks: resolve(workspaceRoot, PUBLIC_JWKS_FILE),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPublicJwk(value: unknown): value is DevelopmentPublicJwk {
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

function isPrivateJwk(value: unknown): value is DevelopmentPrivateJwk {
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

function parsePrivateJwk(content: string): DevelopmentPrivateJwk {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Customer development private key is malformed');
  }
  if (!isPrivateJwk(parsed)) {
    throw new Error('Customer development private key is malformed');
  }
  return parsed;
}

function parsePublicJwks(content: string): DevelopmentPublicJwk {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Customer development public JWKS is malformed');
  }
  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed.keys) ||
    parsed.keys.length !== 1 ||
    !isPublicJwk(parsed.keys[0])
  ) {
    throw new Error('Customer development public JWKS is malformed');
  }
  return parsed.keys[0];
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') return false;
    throw error;
  }
}

async function readPrivateJwk(path: string): Promise<DevelopmentPrivateJwk> {
  const metadata = await stat(path);
  if (!metadata.isFile() || (metadata.mode & 0o777) !== 0o600) {
    throw new Error(
      'Customer development private key must be a mode-0600 file',
    );
  }
  return parsePrivateJwk(await readFile(path, 'utf8'));
}

async function verifyExistingPair(
  paths: CustomerDevelopmentAuthPaths,
): Promise<void> {
  const privateKey = await readPrivateJwk(paths.privateKey);
  const publicKey = parsePublicJwks(await readFile(paths.publicJwks, 'utf8'));
  if (
    privateKey.kid !== publicKey.kid ||
    privateKey.x !== publicKey.x ||
    privateKey.y !== publicKey.y
  ) {
    throw new Error('Customer development key files do not match');
  }
}

export async function generateCustomerDevelopmentAuthKey(
  paths = customerDevelopmentAuthPaths(),
): Promise<{ readonly created: boolean }> {
  const [hasPrivateKey, hasPublicJwks] = await Promise.all([
    pathExists(paths.privateKey),
    pathExists(paths.publicJwks),
  ]);
  if (hasPrivateKey || hasPublicJwks) {
    if (!hasPrivateKey || !hasPublicJwks) {
      throw new Error(
        'Customer development key setup is incomplete; rotate it explicitly',
      );
    }
    await verifyExistingPair(paths);
    return { created: false };
  }

  await mkdir(dirname(paths.privateKey), { recursive: true, mode: 0o700 });
  const { privateKey, publicKey } = await generateKeyPair('ES256', {
    extractable: true,
  });
  const kid = randomUUID();
  const privateJwk = {
    ...(await exportJWK(privateKey)),
    alg: 'ES256',
    use: 'sig',
    kid,
  };
  const publicJwk = {
    ...(await exportJWK(publicKey)),
    alg: 'ES256',
    use: 'sig',
    kid,
  };
  if (!isPrivateJwk(privateJwk) || !isPublicJwk(publicJwk)) {
    throw new Error('Generated customer development key is invalid');
  }

  await writeFile(paths.privateKey, `${JSON.stringify(privateJwk)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  });
  await chmod(paths.privateKey, 0o600);
  await writeFile(
    paths.publicJwks,
    `${JSON.stringify({ keys: [publicJwk] })}\n`,
    { encoding: 'utf8', flag: 'wx', mode: 0o644 },
  );
  return { created: true };
}

type GrantTarget =
  | {
      readonly capability: 'signup';
      readonly personaId: string;
      readonly profile: {
        readonly verifiedEmail: string;
        readonly displayName: string;
        readonly pictureUrl?: string;
      };
    }
  | {
      readonly capability: 'login_as' | 'ownership_transfer';
      readonly userId: string;
    };

export async function mintCustomerDevelopmentGrant(input: {
  readonly bffSiteUrl: string;
  readonly environmentKey: string;
  readonly transactionReference: string;
  readonly target: GrantTarget;
  readonly now?: Date;
  readonly privateKeyPath?: string;
}): Promise<string> {
  const privateJwk = await readPrivateJwk(
    input.privateKeyPath ?? customerDevelopmentAuthPaths().privateKey,
  );
  const signingKey = await importJWK(privateJwk, 'ES256');
  const issuedAt = Math.floor((input.now ?? new Date()).getTime() / 1_000);
  const jti = `grant_${randomBytes(18).toString('base64url')}`;
  const audience = customerDevelopmentAudience(input.bffSiteUrl);
  const claims = customerDevelopmentGrantClaimsSchema.parse({
    iss: CUSTOMER_DEVELOPMENT_AUTOMATION_ISSUER,
    aud: audience,
    sub: CUSTOMER_DEVELOPMENT_AUTOMATION_SUBJECT,
    iat: issuedAt,
    exp: issuedAt + CUSTOMER_DEVELOPMENT_GRANT_TTL_SECONDS,
    jti,
    version: 1,
    lane: 'development',
    environmentKey: input.environmentKey,
    transactionReference: input.transactionReference,
    ...input.target,
  });
  const customClaims: Record<string, unknown> = { ...claims };
  for (const standardClaim of ['iss', 'aud', 'sub', 'iat', 'exp', 'jti']) {
    delete customClaims[standardClaim];
  }

  return new SignJWT(customClaims)
    .setProtectedHeader({ alg: 'ES256', kid: privateJwk.kid, typ: 'JWT' })
    .setIssuer(CUSTOMER_DEVELOPMENT_AUTOMATION_ISSUER)
    .setAudience(audience)
    .setSubject(CUSTOMER_DEVELOPMENT_AUTOMATION_SUBJECT)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + CUSTOMER_DEVELOPMENT_GRANT_TTL_SECONDS)
    .setJti(jti)
    .sign(signingKey);
}
