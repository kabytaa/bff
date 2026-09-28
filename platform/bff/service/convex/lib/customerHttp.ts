import type { ActionCtx } from '../_generated/server';
import type { ZodType } from 'zod';

import {
  acceptInvitationRequestSchema,
  changeMembershipRoleRequestSchema,
  createAccountRequestSchema,
  createInvitationRequestSchema,
  customerAuthErrorCodeSchema,
  customerAuthIntentSchema,
  removeMembershipRequestSchema,
  revokeInvitationRequestSchema,
  updateAccountPolicyRequestSchema,
  type AccountContextClaims,
  type CustomerContextClaims,
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
  verifyCustomerDevelopmentGrant,
  verifyCustomerContextToken,
  verifyGoogleIdentityToken,
} from './customerCrypto';
import { limitGoogleVerification } from '../rateLimits';

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

export async function readBoundedJson(request: Request) {
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

export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new HttpInputError(400, 'INVALID_INPUT', 'Request input is invalid.');
  }
  return parsed.data;
}

function responseHeaders(extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra);
  headers.set('cache-control', 'no-store');
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('referrer-policy', 'no-referrer');
  headers.set('x-content-type-options', 'nosniff');
  return headers;
}

export function jsonResponse(
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

export function mapError(error: unknown, extraHeaders: HeadersInit = {}) {
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
          : code === 'CONFLICT' ||
              code === 'CAPACITY_CONFLICT' ||
              code === 'UNIT_EXHAUSTED'
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

async function authenticatedContext(
  request: Request,
): Promise<CustomerContextClaims> {
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
  try {
    return await verifyCustomerContextToken({
      configuration: readCustomerSigningConfiguration(),
      environmentKey,
      token: authorization.slice('Bearer '.length),
    });
  } catch {
    throw new HttpInputError(
      401,
      'UNAUTHENTICATED',
      'Authentication is required.',
    );
  }
}

async function customerApiOriginHeaders(
  ctx: ActionCtx,
  request: Request,
  environmentKey: string,
): Promise<HeadersInit> {
  const origin = request.headers.get('origin');
  if (origin === null) return {};
  const allowedOrigins = await ctx.runQuery(
    internal.businessEnvironments.customerWebOrigins,
    { key: environmentKey },
  );
  if (!allowedOrigins.includes(origin)) {
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

export async function withAuthenticatedCustomerRequest(
  ctx: ActionCtx,
  request: Request,
  handler: (
    claims: CustomerContextClaims,
    responseHeaders: HeadersInit,
  ) => Promise<Response>,
) {
  let cors: HeadersInit = {};
  try {
    const environmentKey = request.headers.get('x-tofler-environment');
    if (!environmentKey || environmentKey.length > 64) {
      throw new HttpInputError(
        401,
        'UNAUTHENTICATED',
        'Authentication is required.',
      );
    }
    cors = await customerApiOriginHeaders(ctx, request, environmentKey);
    const claims = await authenticatedContext(request);
    return await handler(claims, cors);
  } catch (error) {
    return mapError(error, cors);
  }
}

export function accountContext(
  claims: CustomerContextClaims,
): AccountContextClaims {
  if (claims.contextType !== 'account') {
    throw new HttpInputError(
      403,
      'ONBOARDING_REQUIRED',
      'Select or join an account first.',
    );
  }
  return claims;
}

export async function startLoginHandler(ctx: ActionCtx, request: Request) {
  try {
    const body = await readBoundedJson(request);
    const environmentKey = requiredString(body, 'environmentKey', 64);
    const state = requiredString(body, 'state', 128);
    const pkceChallenge = requiredString(body, 'pkceChallenge', 128);
    const callbackUrl = requiredString(body, 'callbackUrl');
    const webOrigin = requiredString(body, 'webOrigin');
    const returnPath = requiredString(body, 'returnPath');
    const intent = customerAuthIntentSchema.parse(
      typeof body.intent === 'string' ? body.intent : 'continue',
    );
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
          webOrigin,
          returnPath,
          intent,
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
    const rateLimit = await limitGoogleVerification(ctx, environmentKey);
    if (!rateLimit.ok) {
      throw new HttpInputError(
        429,
        'RATE_LIMITED',
        'Too many sign-in attempts. Try again later.',
      );
    }
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
      const completed =
        challenge.purpose === 'ownership_transfer'
          ? await ctx.runMutation(
              internal.ownershipTransfers.completeProvider,
              {
                environmentKey,
                reference,
                providerNonce: challenge.providerNonce,
                provider: identity.provider,
                issuer: identity.issuer,
                subject: identity.subject,
                authenticatedAt: identity.authenticatedAt,
                handoffCodeHash: await sha256Base64Url(handoffCode),
                now: Date.now(),
              },
            )
          : await ctx.runMutation(internal.loginTransactions.completeProvider, {
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
            });
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

export async function completeDevelopmentLoginHandler(
  ctx: ActionCtx,
  request: Request,
) {
  let cors: HeadersInit = {};
  try {
    cors = authOriginHeaders(request);
    const body = await readBoundedJson(request);
    const environmentKey = requiredString(body, 'environmentKey', 64);
    const reference = requiredString(body, 'reference', 128);
    const grant = requiredString(body, 'grant', 16 * 1024);
    let claims;
    try {
      claims = await verifyCustomerDevelopmentGrant({ token: grant });
    } catch {
      throw new HttpInputError(
        401,
        'UNAUTHENTICATED',
        'Development sign-in could not be verified.',
      );
    }
    if (
      claims.environmentKey !== environmentKey ||
      claims.transactionReference !== reference
    ) {
      throw new HttpInputError(
        401,
        'UNAUTHENTICATED',
        'Development sign-in could not be verified.',
      );
    }
    const challenge = await ctx.runQuery(
      internal.loginTransactions.readChallenge,
      { environmentKey, reference, now: Date.now() },
    );
    if (
      (challenge.purpose === 'login' &&
        claims.capability === 'ownership_transfer') ||
      (challenge.purpose === 'ownership_transfer' &&
        claims.capability !== 'ownership_transfer')
    ) {
      throw new HttpInputError(
        401,
        'UNAUTHENTICATED',
        'Development sign-in could not be verified.',
      );
    }

    const grantHash = await sha256Base64Url(grant);
    const grantIdHash = await sha256Base64Url(claims.jti);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const handoffCode = randomOpaqueSecret();
      const handoffCodeHash = await sha256Base64Url(handoffCode);
      const completed =
        claims.capability === 'ownership_transfer'
          ? await ctx.runMutation(
              internal.ownershipTransfers.completeDevelopmentProvider,
              {
                environmentKey,
                reference,
                userPublicId: claims.userId,
                grantHash,
                grantIdHash,
                authenticatedAt: claims.iat,
                handoffCodeHash,
                now: Date.now(),
              },
            )
          : await ctx.runMutation(
              internal.loginTransactions.completeDevelopmentProvider,
              {
                environmentKey,
                reference,
                target:
                  claims.capability === 'signup'
                    ? {
                        capability: 'signup' as const,
                        personaId: claims.personaId,
                        profile: claims.profile,
                      }
                    : {
                        capability: 'login_as' as const,
                        userPublicId: claims.userId,
                      },
                grantHash,
                grantIdHash,
                handoffCodeHash,
                authenticatedAt: claims.iat,
                candidates: {
                  userPublicId: randomPublicIdentifier('user'),
                  accountPublicId: randomPublicIdentifier('account'),
                  membershipPublicId: randomPublicIdentifier('membership'),
                },
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
      'Unable to complete development sign-in. Try again.',
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
      return jsonResponse({
        status: 'account_selection_required',
        customer: result.customer,
      });
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
      ...(result.issuance.contextType === 'account'
        ? { accountId: result.issuance.accountPublicId }
        : {}),
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
  return await withAuthenticatedCustomerRequest(
    ctx,
    request,
    async (claims, cors) => {
      const customer = await ctx.runQuery(
        internal.customerAuth.currentCustomerByPublicId,
        { environmentKey: claims.environmentKey, userPublicId: claims.sub },
      );
      return jsonResponse({ customer, context: claims }, 200, cors);
    },
  );
}

export async function createAccountHandler(ctx: ActionCtx, request: Request) {
  return await withAuthenticatedCustomerRequest(
    ctx,
    request,
    async (claims, cors) => {
      const input = parseInput(
        createAccountRequestSchema,
        await readBoundedJson(request),
      );
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const created = await ctx.runMutation(internal.accounts.createForUser, {
          environmentKey: claims.environmentKey,
          userPublicId: claims.sub,
          ...(input.displayName === undefined
            ? {}
            : { displayName: input.displayName }),
          accountPublicId: randomPublicIdentifier('account'),
          membershipPublicId: randomPublicIdentifier('membership'),
          now: Date.now(),
        });
        if (created.kind === 'collision') continue;
        return jsonResponse(created.account, 201, cors);
      }
      return publicError(
        'RETRYABLE_UNAVAILABLE',
        'Unable to create the account. Try again.',
        503,
        cors,
      );
    },
  );
}

export async function listAccountMembersHandler(
  ctx: ActionCtx,
  request: Request,
) {
  return await withAuthenticatedCustomerRequest(
    ctx,
    request,
    async (rawClaims, cors) => {
      const claims = accountContext(rawClaims);
      const url = new URL(request.url);
      const requestedItems = Number(url.searchParams.get('limit') ?? '25');
      if (!Number.isInteger(requestedItems) || requestedItems < 1) {
        throw new HttpInputError(400, 'INVALID_INPUT', 'limit is invalid.');
      }
      const cursor = url.searchParams.get('cursor');
      const result = await ctx.runQuery(internal.memberships.listForAccount, {
        environmentKey: claims.environmentKey,
        accountPublicId: claims.accountId,
        actorUserPublicId: claims.sub,
        paginationOpts: {
          numItems: Math.min(50, requestedItems),
          cursor,
        },
      });
      return jsonResponse(result, 200, cors);
    },
  );
}

export async function changeMembershipRoleHandler(
  ctx: ActionCtx,
  request: Request,
) {
  return await withAuthenticatedCustomerRequest(
    ctx,
    request,
    async (rawClaims, cors) => {
      const claims = accountContext(rawClaims);
      const input = parseInput(
        changeMembershipRoleRequestSchema,
        await readBoundedJson(request),
      );
      const membership = await ctx.runMutation(
        internal.memberships.changeRole,
        {
          environmentKey: claims.environmentKey,
          accountPublicId: claims.accountId,
          actorUserPublicId: claims.sub,
          targetMembershipPublicId: input.membershipId,
          role: input.role,
          now: Date.now(),
        },
      );
      return jsonResponse(membership, 200, cors);
    },
  );
}

export async function removeMembershipHandler(
  ctx: ActionCtx,
  request: Request,
) {
  return await withAuthenticatedCustomerRequest(
    ctx,
    request,
    async (rawClaims, cors) => {
      const claims = accountContext(rawClaims);
      const input = parseInput(
        removeMembershipRequestSchema,
        await readBoundedJson(request),
      );
      return jsonResponse(
        await ctx.runMutation(internal.memberships.remove, {
          environmentKey: claims.environmentKey,
          accountPublicId: claims.accountId,
          actorUserPublicId: claims.sub,
          targetMembershipPublicId: input.membershipId,
          now: Date.now(),
        }),
        200,
        cors,
      );
    },
  );
}

export async function updateAccountPolicyHandler(
  ctx: ActionCtx,
  request: Request,
) {
  return await withAuthenticatedCustomerRequest(
    ctx,
    request,
    async (rawClaims, cors) => {
      const claims = accountContext(rawClaims);
      const input = parseInput(
        updateAccountPolicyRequestSchema,
        await readBoundedJson(request),
      );
      return jsonResponse(
        await ctx.runMutation(internal.accounts.updatePolicyOverrides, {
          environmentKey: claims.environmentKey,
          accountPublicId: claims.accountId,
          actorUserPublicId: claims.sub,
          policyOverrides: input.policyOverrides,
          now: Date.now(),
        }),
        200,
        cors,
      );
    },
  );
}

export async function createInvitationHandler(
  ctx: ActionCtx,
  request: Request,
) {
  return await withAuthenticatedCustomerRequest(
    ctx,
    request,
    async (rawClaims, cors) => {
      const claims = accountContext(rawClaims);
      const input = parseInput(
        createInvitationRequestSchema,
        await readBoundedJson(request),
      );
      if (input.accountId !== claims.accountId) {
        throw new HttpInputError(
          403,
          'FORBIDDEN',
          'Account context is invalid.',
        );
      }
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const invitationToken = randomOpaqueSecret();
        const result = await ctx.runMutation(internal.invitations.create, {
          environmentKey: claims.environmentKey,
          accountPublicId: claims.accountId,
          actorUserPublicId: claims.sub,
          recipientEmail: input.recipientEmail,
          publicId: randomPublicIdentifier('invitation'),
          tokenHash: await sha256Base64Url(invitationToken),
          now: Date.now(),
        });
        if (result.kind === 'collision') continue;
        return jsonResponse(
          { invitation: result.invitation, invitationToken },
          201,
          cors,
        );
      }
      return publicError(
        'RETRYABLE_UNAVAILABLE',
        'Unable to create the invitation. Try again.',
        503,
        cors,
      );
    },
  );
}

export async function acceptInvitationHandler(
  ctx: ActionCtx,
  request: Request,
) {
  return await withAuthenticatedCustomerRequest(
    ctx,
    request,
    async (claims, cors) => {
      const input = parseInput(
        acceptInvitationRequestSchema,
        await readBoundedJson(request),
      );
      const tokenHash = await sha256Base64Url(input.invitationToken);
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const result = await ctx.runMutation(internal.invitations.accept, {
          environmentKey: claims.environmentKey,
          userPublicId: claims.sub,
          tokenHash,
          membershipPublicId: randomPublicIdentifier('membership'),
          now: Date.now(),
        });
        if (result.kind === 'collision') continue;
        if (result.kind === 'expired') {
          return publicError('CONFLICT', 'The invitation expired.', 409, cors);
        }
        return jsonResponse(result.account, 200, cors);
      }
      return publicError(
        'RETRYABLE_UNAVAILABLE',
        'Unable to accept the invitation. Try again.',
        503,
        cors,
      );
    },
  );
}

export async function revokeInvitationHandler(
  ctx: ActionCtx,
  request: Request,
) {
  return await withAuthenticatedCustomerRequest(
    ctx,
    request,
    async (rawClaims, cors) => {
      const claims = accountContext(rawClaims);
      const input = parseInput(
        revokeInvitationRequestSchema,
        await readBoundedJson(request),
      );
      return jsonResponse(
        await ctx.runMutation(internal.invitations.revoke, {
          environmentKey: claims.environmentKey,
          accountPublicId: claims.accountId,
          actorUserPublicId: claims.sub,
          invitationPublicId: input.invitationId,
          now: Date.now(),
        }),
        200,
        cors,
      );
    },
  );
}

export async function startOwnershipTransferHandler(
  ctx: ActionCtx,
  request: Request,
) {
  try {
    const body = await readBoundedJson(request);
    const environmentKey = requiredString(body, 'environmentKey', 64);
    const sessionHandle = requiredString(body, 'sessionHandle', 128);
    const accountPublicId = requiredString(body, 'accountId', 128);
    const targetMembershipPublicId = requiredString(
      body,
      'targetMembershipId',
      128,
    );
    const state = requiredString(body, 'state', 128);
    const pkceChallenge = requiredString(body, 'pkceChallenge', 128);
    const callbackUrl = requiredString(body, 'callbackUrl');
    const webOrigin = requiredString(body, 'webOrigin');
    const returnPath = requiredString(body, 'returnPath');
    const signing = readCustomerSigningConfiguration();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const reference = randomPublicIdentifier('transfer');
      const started = await ctx.runMutation(internal.ownershipTransfers.start, {
        environmentKey,
        handleHash: await sha256Base64Url(sessionHandle),
        accountPublicId,
        targetMembershipPublicId,
        reference,
        state,
        providerNonce: randomOpaqueSecret(),
        pkceChallenge,
        callbackUrl,
        webOrigin,
        returnPath,
        now: Date.now(),
      });
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
      'Unable to confirm ownership transfer. Try again.',
      503,
    );
  } catch (error) {
    return mapError(error);
  }
}

export async function exchangeOwnershipTransferHandler(
  ctx: ActionCtx,
  request: Request,
) {
  try {
    const body = await readBoundedJson(request);
    const environmentKey = requiredString(body, 'environmentKey', 64);
    const handoffCode = requiredString(body, 'code', 128);
    const verifier = requiredString(body, 'verifier', 128);
    const callbackUrl = requiredString(body, 'callbackUrl');
    const handoffCodeHash = await sha256Base64Url(handoffCode);
    const pkceChallenge = await pkceS256Challenge(verifier);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const transferProof = randomOpaqueSecret();
      const result = await ctx.runMutation(
        internal.ownershipTransfers.exchangeProof,
        {
          environmentKey,
          handoffCodeHash,
          pkceChallenge,
          callbackUrl,
          proofHash: await sha256Base64Url(transferProof),
          proofPublicId: randomPublicIdentifier('transfer_proof'),
          now: Date.now(),
        },
      );
      if (result.kind === 'collision') continue;
      return jsonResponse({ ...result, transferProof });
    }
    return publicError(
      'RETRYABLE_UNAVAILABLE',
      'Unable to confirm ownership transfer. Try again.',
      503,
    );
  } catch (error) {
    return mapError(error);
  }
}

export async function completeOwnershipTransferHandler(
  ctx: ActionCtx,
  request: Request,
) {
  try {
    const body = await readBoundedJson(request);
    const environmentKey = requiredString(body, 'environmentKey', 64);
    const transferProof = requiredString(body, 'transferProof', 128);
    return jsonResponse(
      await ctx.runMutation(internal.ownershipTransfers.transfer, {
        environmentKey,
        proofHash: await sha256Base64Url(transferProof),
        now: Date.now(),
      }),
    );
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

export async function customerApiOptionsHandler(
  ctx: ActionCtx,
  request: Request,
) {
  let cors: HeadersInit = {};
  try {
    // Browsers do not send custom-header values on the preflight itself. The
    // public environment key therefore travels in the preflight URL, while
    // the real request must still present the signed token and matching
    // x-tofler-environment header.
    const environmentKey = new URL(request.url).searchParams.get('environment');
    if (!environmentKey || environmentKey.length > 64) {
      throw new HttpInputError(
        400,
        'INVALID_INPUT',
        'Business environment is required.',
      );
    }
    cors = await customerApiOriginHeaders(ctx, request, environmentKey);
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        'access-control-allow-headers':
          'Authorization, Content-Type, X-Tofler-Environment',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-max-age': '600',
        'cache-control': 'no-store',
        'referrer-policy': 'no-referrer',
      },
    });
  } catch (error) {
    return mapError(error, cors);
  }
}
