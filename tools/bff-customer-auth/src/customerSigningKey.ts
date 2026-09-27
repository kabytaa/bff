import { randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { exportJWK, generateKeyPair, type JWK } from 'jose';

const DEVELOPMENT_PRIVATE_KEY_FILE =
  '.convex/customer-context-signing-private.jwk';
const DEVELOPMENT_PUBLIC_JWKS_FILE =
  '.convex/customer-context-signing-jwks.json';
const PRODUCTION_PRIVATE_KEY_FILE =
  '.convex/customer-context-signing-production-private.jwk';
const PRODUCTION_PUBLIC_JWKS_FILE =
  '.convex/customer-context-signing-production-jwks.json';

export type CustomerSigningLane = 'development' | 'production';

export interface CustomerSigningKeyPaths {
  readonly privateKey: string;
  readonly publicJwks: string;
}

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

interface CustomerPublicJwk extends JWK {
  alg: 'ES256';
  crv: 'P-256';
  kid: string;
  kty: 'EC';
  use: 'sig';
  x: string;
  y: string;
}

export function customerSigningKeyPaths(
  workspaceRoot = process.cwd(),
  lane: CustomerSigningLane = 'development',
): CustomerSigningKeyPaths {
  const privateKey =
    lane === 'production'
      ? PRODUCTION_PRIVATE_KEY_FILE
      : DEVELOPMENT_PRIVATE_KEY_FILE;
  const publicJwks =
    lane === 'production'
      ? PRODUCTION_PUBLIC_JWKS_FILE
      : DEVELOPMENT_PUBLIC_JWKS_FILE;
  return {
    privateKey: resolve(workspaceRoot, privateKey),
    publicJwks: resolve(workspaceRoot, publicJwks),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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

function isPublicJwk(value: unknown): value is CustomerPublicJwk {
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

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') return false;
    throw error;
  }
}

async function verifyExistingPair(paths: CustomerSigningKeyPaths) {
  const privateMetadata = await stat(paths.privateKey);
  if (!privateMetadata.isFile() || (privateMetadata.mode & 0o777) !== 0o600) {
    throw new Error('Customer signing private key must be a mode-0600 file');
  }

  let privateJwk: unknown;
  let publicJwks: unknown;
  try {
    privateJwk = JSON.parse(await readFile(paths.privateKey, 'utf8'));
    publicJwks = JSON.parse(await readFile(paths.publicJwks, 'utf8'));
  } catch {
    throw new Error('Customer signing key files are malformed');
  }
  if (
    !isPrivateJwk(privateJwk) ||
    !isRecord(publicJwks) ||
    !Array.isArray(publicJwks.keys) ||
    publicJwks.keys.length !== 1 ||
    !isPublicJwk(publicJwks.keys[0]) ||
    privateJwk.kid !== publicJwks.keys[0].kid ||
    privateJwk.x !== publicJwks.keys[0].x ||
    privateJwk.y !== publicJwks.keys[0].y
  ) {
    throw new Error('Customer signing key files are malformed or mismatched');
  }
}

export async function generateCustomerSigningKey(
  paths = customerSigningKeyPaths(),
): Promise<{ readonly created: boolean }> {
  const [hasPrivateKey, hasPublicJwks] = await Promise.all([
    pathExists(paths.privateKey),
    pathExists(paths.publicJwks),
  ]);
  if (hasPrivateKey || hasPublicJwks) {
    if (!hasPrivateKey || !hasPublicJwks) {
      throw new Error(
        'Customer signing key setup is incomplete; rotate it explicitly',
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
    throw new Error('Generated customer signing key is invalid');
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
