import type { ActionCtx } from './_generated/server';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CUSTOMER_DEVELOPMENT_AUTOMATION_ISSUER,
  CUSTOMER_DEVELOPMENT_AUTOMATION_SUBJECT,
} from '@bff/static-config';
import {
  CUSTOMER_DEVELOPMENT_AUTOMATION_ENVIRONMENT,
  CUSTOMER_SIGNING_ENVIRONMENT,
} from './lib/customerCrypto';
import { completeDevelopmentLoginHandler } from './lib/customerHttp';

const audience = 'https://example.convex.site/v1/auth/transactions/development';
const issuer = 'https://auth-dev.tofler.app';

async function installConfiguration() {
  const signingPair = await generateKeyPair('ES256', { extractable: true });
  const developmentPair = await generateKeyPair('ES256', {
    extractable: true,
  });
  const signingKid = 'customer-signing-key';
  const developmentKid = 'customer-development-key';
  vi.stubEnv(CUSTOMER_SIGNING_ENVIRONMENT.issuer, issuer);
  vi.stubEnv(
    CUSTOMER_SIGNING_ENVIRONMENT.privateJwk,
    JSON.stringify({
      ...(await exportJWK(signingPair.privateKey)),
      alg: 'ES256',
      kid: signingKid,
      use: 'sig',
    }),
  );
  vi.stubEnv(
    CUSTOMER_SIGNING_ENVIRONMENT.publicJwks,
    JSON.stringify({
      keys: [
        {
          ...(await exportJWK(signingPair.publicKey)),
          alg: 'ES256',
          kid: signingKid,
          use: 'sig',
        },
      ],
    }),
  );
  vi.stubEnv(CUSTOMER_DEVELOPMENT_AUTOMATION_ENVIRONMENT.audience, audience);
  vi.stubEnv(
    CUSTOMER_DEVELOPMENT_AUTOMATION_ENVIRONMENT.publicJwks,
    JSON.stringify({
      keys: [
        {
          ...(await exportJWK(developmentPair.publicKey)),
          alg: 'ES256',
          kid: developmentKid,
          use: 'sig',
        },
      ],
    }),
  );
  return { privateKey: developmentPair.privateKey, kid: developmentKid };
}

async function grant({
  privateKey,
  kid,
  transactionReference = 'login_abcdefghijklmnop',
}: {
  privateKey: CryptoKey;
  kid: string;
  transactionReference?: string;
}) {
  const now = Math.floor(Date.now() / 1_000);
  return await new SignJWT({
    version: 1,
    lane: 'development',
    environmentKey: 'example-development',
    transactionReference,
    capability: 'login_as',
    userId: 'user_abcdefghijklmnop',
  })
    .setProtectedHeader({ alg: 'ES256', kid, typ: 'JWT' })
    .setIssuer(CUSTOMER_DEVELOPMENT_AUTOMATION_ISSUER)
    .setAudience(audience)
    .setSubject(CUSTOMER_DEVELOPMENT_AUTOMATION_SUBJECT)
    .setIssuedAt(now)
    .setExpirationTime(now + 120)
    .setJti('grant_abcdefghijklmnop')
    .sign(privateKey);
}

function actionContext() {
  const runQuery = vi.fn(async () => ({
    reference: 'login_abcdefghijklmnop',
    environmentKey: 'example-development',
    purpose: 'login' as const,
    enabledProviders: ['google'] as const,
    providerNonce: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
    callbackUrl: 'https://api.example.tofler.app/_tofler/auth/callback',
    expiresAt: Date.now() + 60_000,
  }));
  const runMutation = vi.fn(async () => ({
    kind: 'ok' as const,
    callbackUrl: 'https://api.example.tofler.app/_tofler/auth/callback',
    webOrigin: 'https://example.tofler.app',
    returnPath: '/',
    state: 'state_abcdefghijklmnopqrstuvwxyz012345',
    handoffCodeExpiresAt: Date.now() + 60_000,
  }));
  return {
    ctx: { runQuery, runMutation } as unknown as ActionCtx,
    runMutation,
  };
}

function request(token: string) {
  return new Request(audience, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: issuer,
    },
    body: JSON.stringify({
      environmentKey: 'example-development',
      reference: 'login_abcdefghijklmnop',
      grant: token,
    }),
  });
}

afterEach(() => vi.unstubAllEnvs());

describe('customer development completion HTTP handler', () => {
  it('verifies the deployment and transaction-bound grant before completion', async () => {
    const fixture = await installConfiguration();
    const context = actionContext();
    const response = await completeDevelopmentLoginHandler(
      context.ctx,
      request(await grant(fixture)),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe(issuer);
    await expect(response.json()).resolves.toMatchObject({
      redirectUrl: expect.stringMatching(
        /^https:\/\/api\.example\.tofler\.app\/_tofler\/auth\/callback\?code=/u,
      ),
    });
    expect(context.runMutation).toHaveBeenCalledOnce();
  });

  it('rejects a grant bound to another transaction before mutation', async () => {
    const fixture = await installConfiguration();
    const context = actionContext();
    const response = await completeDevelopmentLoginHandler(
      context.ctx,
      request(
        await grant({
          ...fixture,
          transactionReference: 'login_othertransaction1',
        }),
      ),
    );
    expect(response.status).toBe(401);
    expect(context.runMutation).not.toHaveBeenCalled();
  });

  it('rejects even a valid grant when production trust is disabled', async () => {
    const fixture = await installConfiguration();
    const token = await grant(fixture);
    vi.stubEnv(
      CUSTOMER_DEVELOPMENT_AUTOMATION_ENVIRONMENT.audience,
      'disabled',
    );
    vi.stubEnv(
      CUSTOMER_DEVELOPMENT_AUTOMATION_ENVIRONMENT.publicJwks,
      'disabled',
    );
    const context = actionContext();
    const response = await completeDevelopmentLoginHandler(
      context.ctx,
      request(token),
    );
    expect(response.status).toBe(401);
    expect(context.runMutation).not.toHaveBeenCalled();
  });
});
