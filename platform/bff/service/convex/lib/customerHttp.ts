import type { ActionCtx } from '../_generated/server';

import {
  customerAuthErrorCodeSchema,
  type CustomerAuthErrorCode,
} from '@bff/contracts';
import { internal } from '../_generated/api';
import {
  pkceS256Challenge,
  randomOpaqueSecret,
  randomPublicIdentifier,
  readCustomerSigningConfiguration,
  sha256Base64Url,
  signCustomerContextToken,
  verifyCustomerContextToken,
  verifyGoogleIdentityToken,
} from './customerCrypto';

const MAX_JSON_BYTES = 20 * 1024;
const decoder = new TextDecoder();

class HttpInputError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: CustomerAuthErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readBoundedJson(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    throw new HttpInputError(
      415,
      'INVALID_INPUT',
      'Content-Type must be application/json.',
    );
  }
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) {
    throw new HttpInputError(
      413,
      'INVALID_INPUT',
      'Request body is too large.',
    );
  }

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  const reader = request.body?.getReader();
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_JSON_BYTES) {
        await reader.cancel();
        throw new HttpInputError(
          413,
          'INVALID_INPUT',
          'Request body is too large.',
        );
      }
      chunks.push(value);
    }
  }
  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const parsed: unknown = JSON.parse(decoder.decode(body));
    if (!isRecord(parsed)) throw new Error('Expected an object');
    return parsed;
  } catch {
    throw new HttpInputError(400, 'INVALID_INPUT', 'Request JSON is invalid.');
  }
}

function requiredString(
  body: Record<string, unknown>,
  key: string,
  maximumLength = 2_048,
) {
  const value = body[key];
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maximumLength
  ) {
    throw new HttpInputError(400, 'INVALID_INPUT', `${key} is invalid.`);
  }
  return value;
}

function optionalString(
  body: Record<string, unknown>,
  key: string,
  maximumLength = 2_048,
) {
  const value = body[key];
  if (value === undefined) return undefined;
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maximumLength
  ) {
    throw new HttpInputError(400, 'INVALID_INPUT', `${key} is invalid.`);
  }
  return value;
}

function responseHeaders(extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra);
  headers.set('cache-control', 'no-store');
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('referrer-policy', 'no-referrer');
  headers.set('x-content-type-options', 'nosniff');
  return headers;
}

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: HeadersInit = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(extraHeaders),
  });
}

function publicError(
  code: CustomerAuthErrorCode,
  message: string,
  status: number,
  extraHeaders: HeadersInit = {},
) {
  return jsonResponse(
    {
      error: {
        code,
        message,
        correlationId: randomPublicIdentifier('error'),
      },
    },
    status,
    extraHeaders,
  );
}

function errorData(error: unknown): Record<string, unknown> | undefined {
  if (!isRecord(error) || !isRecord(error.data)) return undefined;
  return error.data;
}

function mapError(error: unknown, extraHeaders: HeadersInit = {}) {
  if (error instanceof HttpInputError) {
    return publicError(error.code, error.message, error.status, extraHeaders);
  }
  const rawCode = errorData(error)?.code;
  if (rawCode === 'VALIDATION_ERROR' || rawCode === 'NOT_FOUND') {
    return publicError(
      'INVALID_INPUT',
      'The request is invalid or expired.',
      400,
      extraHeaders,
    );
  }
  if (rawCode === 'CONFIGURATION_ERROR') {
    return publicError(
      'RETRYABLE_UNAVAILABLE',
      'Customer authentication is temporarily unavailable.',
      503,
      extraHeaders,
    );
  }
  const parsedCode = customerAuthErrorCodeSchema.safeParse(rawCode);
  if (parsedCode.success) {
    const code = parsedCode.data;
    const status =
      code === 'UNAUTHENTICATED' || code === 'SESSION_EXPIRED'
        ? 401
        : code === 'FORBIDDEN'
          ? 403
          : code === 'CONFLICT' || code === 'CAPACITY_CONFLICT'
            ? 409
            : code === 'RATE_LIMITED'
              ? 429
              : code === 'RETRYABLE_UNAVAILABLE'
                ? 503
                : 400;
    return publicError(
      code,
      'The request could not be completed.',
      status,
      extraHeaders,
    );
  }
  return publicError(
    'RETRYABLE_UNAVAILABLE',
    'Customer authentication is temporarily unavailable.',
    503,
    extraHeaders,
  );
}

function authOriginHeaders(request: Request) {
  const configuration = readCustomerSigningConfiguration();
  const origin = request.headers.get('origin');
  if (origin !== configuration.issuer) {
    throw new HttpInputError(
      403,
      'FORBIDDEN',
      'Request origin is not allowed.',
    );
  }
  return {
    'access-control-allow-origin': origin,
    vary: 'Origin',
  };
}

export async function startLoginHandler(ctx: ActionCtx, request: Request) {
  try {
    const body = await readBoundedJson(request);
    const environmentKey = requiredString(body, 'environmentKey', 64);
    const state = requiredString(body, 'state', 128);
    const pkceChallenge = requiredString(body, 'pkceChallenge', 128);
    const callbackUrl = requiredString(body, 'callbackUrl');
    const returnPath = requiredString(body, 'returnPath');
    const signing = readCustomerSigningConfiguration();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const reference = randomPublicIdentifier('login');
      const providerNonce = randomOpaqueSecret();
      const started = await ctx.runMutation(
        internal.loginTransactions.startLogin,
        {
          environmentKey,
          reference,
          state,
          providerNonce,
          pkceChallenge,
          callbackUrl,
          returnPath,
          now: Date.now(),
        },
      );
      if (started.kind === 'collision') continue;

      const authorizationUrl = new URL(signing.issuer);
      authorizationUrl.searchParams.set('environment', environmentKey);
      authorizationUrl.searchParams.set('transaction', reference);
      return jsonResponse(
        {
          reference,
          authorizationUrl: authorizationUrl.href,
          expiresAt: started.expiresAt,
        },
        201,
      );
    }
    return publicError(
      'RETRYABLE_UNAVAILABLE',
      'Unable to start sign-in. Try again.',
      503,
    );
  } catch (error) {
    return mapError(error);
  }
}

export async function readLoginChallengeHandler(
  ctx: ActionCtx,
  request: Request,
) {
  let cors: HeadersInit = {};
  try {
    cors = authOriginHeaders(request);
    const url = new URL(request.url);
    const environmentKey = url.searchParams.get('environment');
    const reference = url.searchParams.get('transaction');
    if (!environmentKey || !reference) {
      throw new HttpInputError(400, 'INVALID_INPUT', 'Transaction is invalid.');
    }
    const challenge = await ctx.runQuery(
      internal.loginTransactions.readChallenge,
      { environmentKey, reference, now: Date.now() },
    );
    return jsonResponse(challenge, 200, cors);
  } catch (error) {
    return mapError(error, cors);
  }
}

export async function completeGoogleLoginHandler(
  ctx: ActionCtx,
  request: Request,
) {
  let cors: HeadersInit = {};
  try {
    cors = authOriginHeaders(request);
    const body = await readBoundedJson(request);
    const environmentKey = requiredString(body, 'environmentKey', 64);
    const reference = requiredString(body, 'reference', 128);
    const credential = requiredString(body, 'credential', 16 * 1024);
    const challenge = await ctx.runQuery(
      internal.loginTransactions.readChallenge,
      { environmentKey, reference, now: Date.now() },
    );
    let identity;
    try {
      identity = await verifyGoogleIdentityToken({
        token: credential,
        expectedNonce: challenge.providerNonce,
      });
    } catch {
      throw new HttpInputError(
        401,
        'UNAUTHENTICATED',
        'Sign-in could not be verified.',
      );
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const handoffCode = randomOpaqueSecret();
      const completed = await ctx.runMutation(
        internal.loginTransactions.completeProvider,
        {
          environmentKey,
          reference,
          providerNonce: challenge.providerNonce,
          provider: identity.provider,
          issuer: identity.issuer,
          subject: identity.subject,
          profile: {
            verifiedEmail: identity.verifiedEmail,
            displayName: identity.displayName,
            ...(identity.pictureUrl === undefined
              ? {}
              : { pictureUrl: identity.pictureUrl }),
          },
          authenticatedAt: identity.authenticatedAt,
          candidates: {
            userPublicId: randomPublicIdentifier('user'),
            accountPublicId: randomPublicIdentifier('account'),
            membershipPublicId: randomPublicIdentifier('membership'),
          },
          handoffCodeHash: await sha256Base64Url(handoffCode),
          now: Date.now(),
        },
      );
      if (completed.kind === 'collision') continue;

      const redirectUrl = new URL(completed.callbackUrl);
      redirectUrl.searchParams.set('code', handoffCode);
      redirectUrl.searchParams.set('state', completed.state);
      return jsonResponse({ redirectUrl: redirectUrl.href }, 200, cors);
    }
    return publicError(
      'RETRYABLE_UNAVAILABLE',
      'Unable to complete sign-in. Try again.',
      503,
      cors,
    );
  } catch (error) {
    return mapError(error, cors);
  }
}

export async function exchangeLoginHandler(ctx: ActionCtx, request: Request) {
  try {
    const body = await readBoundedJson(request);
    const environmentKey = requiredString(body, 'environmentKey', 64);
    const handoffCode = requiredString(body, 'code', 128);
    const verifier = requiredString(body, 'verifier', 128);
    const callbackUrl = requiredString(body, 'callbackUrl');
    const handoffCodeHash = await sha256Base64Url(handoffCode);
    const pkceChallenge = await pkceS256Challenge(verifier);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const sessionHandle = randomOpaqueSecret();
      const established = await ctx.runMutation(
        internal.sessions.exchangeForSession,
        {
          environmentKey,
          handoffCodeHash,
          pkceChallenge,
          callbackUrl,
          handleHash: await sha256Base64Url(sessionHandle),
          sessionPublicId: randomPublicIdentifier('session'),
          now: Date.now(),
        },
      );
      if (established.kind === 'collision') continue;
      return jsonResponse({ ...established, sessionHandle });
    }
    return publicError(
      'RETRYABLE_UNAVAILABLE',
      'Unable to create a session. Try sign-in again.',
      503,
    );
  } catch (error) {
    return mapError(error);
  }
}

export async function issueContextHandler(ctx: ActionCtx, request: Request) {
  try {
    const body = await readBoundedJson(request);
    const environmentKey = requiredString(body, 'environmentKey', 64);
    const sessionHandle = requiredString(body, 'sessionHandle', 128);
    const accountPublicId = optionalString(body, 'accountId', 128);
    const result = await ctx.runMutation(internal.sessions.issueContext, {
      environmentKey,
      handleHash: await sha256Base64Url(sessionHandle),
      ...(accountPublicId === undefined ? {} : { accountPublicId }),
      tokenPublicId: randomPublicIdentifier('token'),
      now: Date.now(),
    });
    if (result.kind === 'session_unavailable') {
      return publicError(
        'SESSION_EXPIRED',
        'The session expired. Sign in again.',
        401,
      );
    }
    if (result.kind === 'selection_required') {
      return jsonResponse({ status: 'account_selection_required', ...result });
    }

    const signing = readCustomerSigningConfiguration();
    const token = await signCustomerContextToken(signing, result.issuance);
    return jsonResponse({
      status:
        result.issuance.contextType === 'onboarding'
          ? 'onboarding_required'
          : 'authenticated',
      token,
      expiresAt: result.issuance.expiresAt,
      customer: result.customer,
    });
  } catch (error) {
    return mapError(error);
  }
}

export async function logoutHandler(ctx: ActionCtx, request: Request) {
  try {
    const body = await readBoundedJson(request);
    const environmentKey = requiredString(body, 'environmentKey', 64);
    const sessionHandle = requiredString(body, 'sessionHandle', 128);
    await ctx.runMutation(internal.sessions.logout, {
      environmentKey,
      handleHash: await sha256Base64Url(sessionHandle),
      now: Date.now(),
    });
    return jsonResponse({ signedOut: true });
  } catch (error) {
    return mapError(error);
  }
}

export async function currentCustomerHandler(ctx: ActionCtx, request: Request) {
  try {
    const environmentKey = request.headers.get('x-tofler-environment');
    const authorization = request.headers.get('authorization');
    if (
      !environmentKey ||
      !authorization?.startsWith('Bearer ') ||
      authorization.length > 16 * 1024
    ) {
      throw new HttpInputError(
        401,
        'UNAUTHENTICATED',
        'Authentication is required.',
      );
    }
    const token = authorization.slice('Bearer '.length);
    let claims;
    try {
      claims = await verifyCustomerContextToken({
        configuration: readCustomerSigningConfiguration(),
        environmentKey,
        token,
      });
    } catch {
      throw new HttpInputError(
        401,
        'UNAUTHENTICATED',
        'Authentication is required.',
      );
    }
    const customer = await ctx.runQuery(
      internal.customerAuth.currentCustomerByPublicId,
      { environmentKey, userPublicId: claims.sub },
    );
    return jsonResponse({ customer, context: claims });
  } catch (error) {
    return mapError(error);
  }
}

export function customerAuthOptionsHandler(request: Request) {
  try {
    const cors = authOriginHeaders(request);
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        'access-control-allow-headers': 'Content-Type',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-max-age': '600',
        'cache-control': 'no-store',
        vary: 'Origin',
      },
    });
  } catch (error) {
    return mapError(error);
  }
}
