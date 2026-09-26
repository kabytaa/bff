import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

import { exportJWK, generateKeyPair, importJWK, SignJWT, type JWK } from 'jose';

import {
  BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER,
  BACKOFFICE_DEVELOPMENT_AUTOMATION_SUBJECT,
} from '@bff/static-config';

const PRIVATE_KEY_FILE = '.convex/development-auth-private.jwk';
const PUBLIC_JWKS_FILE = '.convex/development-auth-jwks.txt';
const JWT_TTL_SECONDS = 120;

export interface DevelopmentAuthPaths {
  privateKey: string;
  publicJwks: string;
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

export function developmentAuthPaths(
  workspaceRoot = process.cwd(),
): DevelopmentAuthPaths {
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
    throw new Error('Development automation private key is malformed');
  }
  if (!isPrivateJwk(parsed)) {
    throw new Error('Development automation private key is malformed');
  }
  return parsed;
}

function publicJwksDataUri(publicKey: DevelopmentPublicJwk): string {
  const encoded = Buffer.from(
    JSON.stringify({ keys: [publicKey] }),
    'utf8',
  ).toString('base64');
  return `data:application/json;base64,${encoded}`;
}

function parsePublicJwksDataUri(content: string): DevelopmentPublicJwk {
  const prefix = 'data:application/json;base64,';
  let parsed: unknown;
  try {
    if (!content.startsWith(prefix)) throw new Error('Invalid prefix');
    parsed = JSON.parse(
      Buffer.from(content.slice(prefix.length), 'base64').toString('utf8'),
    );
  } catch {
    throw new Error('Development automation public JWKS is malformed');
  }

  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed.keys) ||
    parsed.keys.length !== 1 ||
    !isPublicJwk(parsed.keys[0])
  ) {
    throw new Error('Development automation public JWKS is malformed');
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
      'Development automation private key must be a mode-0600 file',
    );
  }
  return parsePrivateJwk(await readFile(path, 'utf8'));
}

async function verifyExistingPair(paths: DevelopmentAuthPaths): Promise<void> {
  const privateKey = await readPrivateJwk(paths.privateKey);
  const publicKey = parsePublicJwksDataUri(
    (await readFile(paths.publicJwks, 'utf8')).trim(),
  );
  if (
    privateKey.kid !== publicKey.kid ||
    privateKey.x !== publicKey.x ||
    privateKey.y !== publicKey.y
  ) {
    throw new Error('Development automation key files do not match');
  }
}

export async function generateDevelopmentAuthKey(
  paths = developmentAuthPaths(),
): Promise<{ created: boolean }> {
  const [hasPrivateKey, hasPublicJwks] = await Promise.all([
    pathExists(paths.privateKey),
    pathExists(paths.publicJwks),
  ]);
  if (hasPrivateKey || hasPublicJwks) {
    if (!hasPrivateKey || !hasPublicJwks) {
      throw new Error(
        'Development automation key setup is incomplete; rotate it explicitly',
      );
    }
    await verifyExistingPair(paths);
    return { created: false };
  }

  await mkdir(dirname(paths.privateKey), {
    recursive: true,
    mode: 0o700,
  });
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
    throw new Error('Generated development automation key is invalid');
  }

  await writeFile(paths.privateKey, `${JSON.stringify(privateJwk)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  });
  await chmod(paths.privateKey, 0o600);
  await writeFile(paths.publicJwks, `${publicJwksDataUri(publicJwk)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o644,
  });
  return { created: true };
}

function validateAudience(audience: string): string {
  const parsed = new URL(audience);
  if (parsed.protocol !== 'https:' || parsed.toString() !== audience) {
    throw new Error(
      'Development automation audience must be a canonical HTTPS URL',
    );
  }
  return audience;
}

export async function mintDevelopmentAuthToken({
  audience,
  now = new Date(),
  privateKeyPath = developmentAuthPaths().privateKey,
}: {
  audience: string;
  now?: Date;
  privateKeyPath?: string;
}): Promise<string> {
  const privateJwk = await readPrivateJwk(privateKeyPath);
  const signingKey = await importJWK(privateJwk, 'ES256');
  const issuedAt = Math.floor(now.getTime() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: privateJwk.kid, typ: 'JWT' })
    .setIssuer(BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER)
    .setAudience(validateAudience(audience))
    .setSubject(BACKOFFICE_DEVELOPMENT_AUTOMATION_SUBJECT)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + JWT_TTL_SECONDS)
    .sign(signingKey);
}
