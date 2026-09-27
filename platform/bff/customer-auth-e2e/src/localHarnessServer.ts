import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer as createHttpsServer } from 'node:https';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { createBffAuthServer } from '@tofler/bff-auth/server';
import { createServer as createViteServer, type ViteDevServer } from 'vite';

const sourceRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(sourceRoot, '..');
const workspaceRoot = resolve(projectRoot, '../../..');
const fixtureRoot = resolve(projectRoot, 'fixture');
const webOrigins = ['https://localhost:4410', 'https://127.0.0.1:4410'];
const adapterOrigin = 'https://127.0.0.1:4411';
const environmentKey = 'browser-contract-development';

function opaque() {
  return randomBytes(32).toString('base64url');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function error(status: number, code: string, message: string) {
  return json(
    {
      error: {
        code,
        message,
        correlationId: 'correlation_0000000001',
      },
    },
    status,
  );
}

interface LoginTransaction {
  readonly callbackUrl: string;
  readonly pkceChallenge: string;
  readonly returnPath: string;
  readonly state: string;
  readonly webOrigin: string;
}

interface FakeSession {
  active: boolean;
  readonly absoluteExpiresAt: number;
}

const transactions = new Map<string, LoginTransaction>();
const codes = new Map<string, LoginTransaction>();
const sessions = new Map<string, FakeSession>();
let tokenSequence = 0;

const user = {
  id: 'user_0000000000000001',
  environmentKey,
  verifiedEmail: 'browser@example.invalid',
  displayName: 'Browser Contract',
  createdAt: 1,
  updatedAt: 1,
};

function account(id: string, membershipId: string, displayName: string) {
  return {
    id,
    displayName,
    membership: {
      id: membershipId,
      accountId: id,
      userId: user.id,
      role: 'owner' as const,
      createdAt: 1,
      updatedAt: 1,
    },
    policy: {
      values: {
        seatLimit: 2,
        adminRoleEnabled: false,
        memberInvitationsEnabled: false,
      },
      sources: {
        seatLimit: 'business_default' as const,
        adminRoleEnabled: 'business_default' as const,
        memberInvitationsEnabled: 'business_default' as const,
      },
    },
    activeMemberCount: 1,
    reservedInvitationCount: 0,
    createdAt: 1,
    updatedAt: 1,
  };
}

const accounts = [
  account('account_00000000000001', 'membership_000000000001', 'First account'),
  account(
    'account_00000000000002',
    'membership_000000000002',
    'Second account',
  ),
];
const customer = { user, accounts };

async function requestBody(request: Request) {
  return (await request.json()) as Record<string, unknown>;
}

async function fakeBff(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  const body = await requestBody(request);
  if (path === '/v1/auth/transactions') {
    if (body.environmentKey !== environmentKey) {
      return error(403, 'FORBIDDEN', 'Environment is not available.');
    }
    const reference = `transaction_${opaque()}`;
    transactions.set(reference, {
      callbackUrl: String(body.callbackUrl),
      pkceChallenge: String(body.pkceChallenge),
      returnPath: String(body.returnPath),
      state: String(body.state),
      webOrigin: String(body.webOrigin),
    });
    return json(
      {
        authorizationUrl: `${adapterOrigin}/test/authorize?reference=${reference}`,
      },
      201,
    );
  }
  if (path === '/v1/auth/exchange') {
    const code = String(body.code);
    const transaction = codes.get(code);
    codes.delete(code);
    if (!transaction || body.callbackUrl !== transaction.callbackUrl) {
      return error(401, 'UNAUTHENTICATED', 'Handoff is invalid.');
    }
    const actualChallenge = createHash('sha256')
      .update(String(body.verifier))
      .digest('base64url');
    if (actualChallenge !== transaction.pkceChallenge) {
      return error(401, 'UNAUTHENTICATED', 'Handoff is invalid.');
    }
    const sessionHandle = opaque();
    const absoluteExpiresAt = Date.now() + 60 * 60 * 1_000;
    sessions.set(sessionHandle, { active: true, absoluteExpiresAt });
    return json({
      sessionHandle,
      absoluteExpiresAt,
      webOrigin: transaction.webOrigin,
      returnPath: transaction.returnPath,
    });
  }
  if (path === '/v1/auth/session/context') {
    const session = sessions.get(String(body.sessionHandle));
    if (!session?.active || session.absoluteExpiresAt <= Date.now()) {
      return error(401, 'UNAUTHENTICATED', 'Sign in again to continue.');
    }
    const accountId = body.accountId;
    if (accountId === undefined) {
      return json({ status: 'account_selection_required', customer });
    }
    const selected = accounts.find((candidate) => candidate.id === accountId);
    if (!selected) {
      return error(403, 'FORBIDDEN', 'This account is not available.');
    }
    tokenSequence += 1;
    return json({
      status: 'authenticated',
      accountId: selected.id,
      token: `browser-contract-token-${selected.id}-${tokenSequence}`,
      expiresAt: Math.floor(Date.now() / 1_000) + 600,
      customer,
    });
  }
  if (path === '/v1/auth/session/logout') {
    const session = sessions.get(String(body.sessionHandle));
    if (!session?.active) {
      return error(401, 'UNAUTHENTICATED', 'Session is no longer active.');
    }
    session.active = false;
    return json({ signedOut: true });
  }
  return error(404, 'INVALID_INPUT', 'Route does not exist.');
}

const adapter = createBffAuthServer({
  bffBaseUrl: 'https://bff.test.invalid',
  environmentKey,
  transport: {
    webOrigins,
    sessionAdapterBaseUrl: adapterOrigin,
    defaultPostLoginPath: '/',
  },
  fetch: async (input, init) =>
    await fakeBff(
      new Request(input instanceof Request ? input.url : input, init),
    ),
});

async function nodeRequest(
  request: IncomingMessage,
  origin: string,
): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const method = request.method ?? 'GET';
  return new Request(new URL(request.url ?? '/', origin), {
    method,
    headers: request.headers as HeadersInit,
    ...(method === 'GET' || method === 'HEAD'
      ? {}
      : { body: Buffer.concat(chunks) }),
  });
}

async function writeResponse(response: Response, target: ServerResponse) {
  target.statusCode = response.status;
  for (const [name, value] of response.headers) {
    if (name !== 'set-cookie') target.setHeader(name, value);
  }
  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) target.setHeader('set-cookie', cookies);
  target.end(Buffer.from(await response.arrayBuffer()));
}

async function authorize(request: Request) {
  const reference = new URL(request.url).searchParams.get('reference') ?? '';
  const transaction = transactions.get(reference);
  transactions.delete(reference);
  if (!transaction) return error(400, 'INVALID_INPUT', 'Attempt is invalid.');
  const code = opaque();
  codes.set(code, transaction);
  const destination = new URL(transaction.callbackUrl);
  destination.searchParams.set('code', code);
  destination.searchParams.set('state', transaction.state);
  return new Response(null, {
    status: 303,
    headers: { location: destination.href },
  });
}

const certificateDirectory = mkdtempSync(
  join(tmpdir(), 'bff-customer-auth-e2e-'),
);
const keyPath = join(certificateDirectory, 'key.pem');
const certificatePath = join(certificateDirectory, 'certificate.pem');
execFileSync(
  'openssl',
  [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    keyPath,
    '-out',
    certificatePath,
    '-days',
    '1',
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
  ],
  { stdio: 'ignore' },
);
const https = {
  key: readFileSync(keyPath),
  cert: readFileSync(certificatePath),
};

const adapterServer = createHttpsServer(https, (incoming, outgoing) => {
  void (async () => {
    const request = await nodeRequest(incoming, adapterOrigin);
    const response =
      new URL(request.url).pathname === '/test/authorize'
        ? await authorize(request)
        : await adapter.handle(request);
    await writeResponse(response, outgoing);
  })().catch(() => {
    outgoing.statusCode = 500;
    outgoing.end('Harness failure');
  });
});

function vite(port: number): Promise<ViteDevServer> {
  return createViteServer({
    configFile: false,
    root: fixtureRoot,
    resolve: {
      alias: {
        '@bff/contracts': resolve(
          workspaceRoot,
          'platform/bff/libs/contracts/src/index.ts',
        ),
        '@tofler/bff-auth/browser': resolve(
          workspaceRoot,
          'platform/bff/libs/sdk/typescript/src/browser/index.ts',
        ),
        '@tofler/bff-auth/core': resolve(
          workspaceRoot,
          'platform/bff/libs/sdk/typescript/src/core/index.ts',
        ),
      },
    },
    server: { host: '0.0.0.0', port, strictPort: true, https },
  });
}

const appServer = await vite(4410);
const attackerServer = await vite(4413);
await Promise.all([
  appServer.listen(),
  attackerServer.listen(),
  new Promise<void>((resolveListen) =>
    adapterServer.listen(4411, '0.0.0.0', resolveListen),
  ),
]);
console.info('Customer auth browser harness ready');

async function shutdown() {
  await Promise.all([
    appServer.close(),
    attackerServer.close(),
    new Promise<void>((resolveClose) =>
      adapterServer.close(() => resolveClose()),
    ),
  ]);
  rmSync(certificateDirectory, { recursive: true, force: true });
}

process.once('SIGINT', () => void shutdown().finally(() => process.exit(0)));
process.once('SIGTERM', () => void shutdown().finally(() => process.exit(0)));
