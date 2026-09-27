import type {
  Auth,
  AuthConfig,
  RoutableMethod,
  UserIdentity,
} from 'convex/server';
import { ConvexError } from 'convex/values';
import { z } from 'zod';

import {
  CUSTOMER_CONTEXT_VERSION,
  accountPermissionSchema,
  accountRoleSchema,
  customerContextAudience,
  normalizeHttpsOrigin,
  publicIdentifierSchema,
  type AccountPermission,
  type AccountRole,
} from '../../core';

export {
  createConvexBffAuthHttpAction,
  mountConvexBffAuthRoutes,
} from './http';

const environmentKeySchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);

const customContextSchema = z.discriminatedUnion('contextType', [
  z
    .object({
      version: z.literal(CUSTOMER_CONTEXT_VERSION),
      environmentKey: environmentKeySchema,
      sessionId: publicIdentifierSchema,
      contextType: z.literal('onboarding'),
    })
    .strict(),
  z
    .object({
      version: z.literal(CUSTOMER_CONTEXT_VERSION),
      environmentKey: environmentKeySchema,
      sessionId: publicIdentifierSchema,
      contextType: z.literal('account'),
      accountId: publicIdentifierSchema,
      membershipId: publicIdentifierSchema,
      role: accountRoleSchema,
      permissions: z.array(accountPermissionSchema).max(16),
    })
    .strict(),
]);

export interface BffConvexAuthConfigOptions {
  readonly issuer: string;
  readonly environmentKey: string;
  readonly jwksUrl: string;
}

function parseJwksUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.href !== value
  ) {
    throw new Error('jwksUrl must be a canonical HTTPS URL');
  }
  return value;
}

export function createBffConvexAuthConfig({
  issuer,
  environmentKey,
  jwksUrl,
}: BffConvexAuthConfigOptions): AuthConfig {
  const normalizedIssuer = normalizeHttpsOrigin(issuer);
  const applicationID = customerContextAudience(
    normalizedIssuer,
    environmentKey,
  );
  const jwks = parseJwksUrl(jwksUrl);
  return {
    providers: [
      {
        type: 'customJwt',
        applicationID,
        issuer: normalizedIssuer,
        jwks,
        algorithm: 'ES256',
      },
    ],
  };
}

export interface BffConvexGuardOptions {
  readonly issuer: string;
  readonly environmentKey: string;
}

export interface BffConvexAccountGuardOptions extends BffConvexGuardOptions {
  readonly accountId?: string;
  readonly permission?: AccountPermission;
}

export interface BffConvexHttpActionOptions extends BffConvexAccountGuardOptions {
  readonly webOrigins: readonly string[];
  readonly allowedMethods?: readonly Exclude<RoutableMethod, 'OPTIONS'>[];
}

export interface BffConvexOnboardingContext {
  readonly contextType: 'onboarding';
  readonly environmentKey: string;
  readonly sessionId: string;
  readonly userId: string;
  readonly identity: UserIdentity;
}

export interface BffConvexAccountContext {
  readonly contextType: 'account';
  readonly environmentKey: string;
  readonly sessionId: string;
  readonly userId: string;
  readonly accountId: string;
  readonly membershipId: string;
  readonly role: AccountRole;
  readonly permissions: readonly AccountPermission[];
  readonly identity: UserIdentity;
}

export type BffConvexContext =
  BffConvexOnboardingContext | BffConvexAccountContext;

export interface BffConvexAuthContext {
  readonly auth: Pick<Auth, 'getUserIdentity'>;
}

type BffConvexAuthErrorCode =
  'FORBIDDEN' | 'ONBOARDING_REQUIRED' | 'UNAUTHENTICATED';

type BffConvexAuthErrorData = {
  readonly code: BffConvexAuthErrorCode;
  readonly message: string;
};

function fail(code: BffConvexAuthErrorCode, message: string): never {
  throw new ConvexError({ code, message });
}

function customClaims(identity: UserIdentity) {
  return {
    version: identity.version,
    environmentKey: identity.environmentKey,
    sessionId: identity.sessionId,
    contextType: identity.contextType,
    ...(identity.contextType === 'account'
      ? {
          accountId: identity.accountId,
          membershipId: identity.membershipId,
          role: identity.role,
          permissions: identity.permissions,
        }
      : {}),
  };
}

export async function requireBffConvexContext(
  ctx: BffConvexAuthContext,
  options: BffConvexGuardOptions,
): Promise<BffConvexContext> {
  let identity: UserIdentity | null;
  try {
    identity = await ctx.auth.getUserIdentity();
  } catch {
    return fail('UNAUTHENTICATED', 'Authentication is required');
  }
  if (!identity) {
    return fail('UNAUTHENTICATED', 'Authentication is required');
  }
  const issuer = normalizeHttpsOrigin(options.issuer);
  const userId = publicIdentifierSchema.safeParse(identity.subject);
  const claims = customContextSchema.safeParse(customClaims(identity));
  if (
    identity.issuer !== issuer ||
    !userId.success ||
    !claims.success ||
    claims.data.environmentKey !== options.environmentKey
  ) {
    return fail('FORBIDDEN', 'The authentication context is not valid here');
  }
  if (claims.data.contextType === 'onboarding') {
    return {
      ...claims.data,
      userId: userId.data,
      identity,
    };
  }
  return {
    ...claims.data,
    userId: userId.data,
    identity,
  };
}

export async function requireBffConvexAccountContext(
  ctx: BffConvexAuthContext,
  options: BffConvexAccountGuardOptions,
): Promise<BffConvexAccountContext> {
  const context = await requireBffConvexContext(ctx, options);
  if (context.contextType !== 'account') {
    return fail('ONBOARDING_REQUIRED', 'Select or create an account first');
  }
  if (options.accountId && context.accountId !== options.accountId) {
    return fail('FORBIDDEN', 'The account context does not match');
  }
  if (options.permission && !context.permissions.includes(options.permission)) {
    return fail('FORBIDDEN', 'The required account permission is missing');
  }
  return context;
}

export function requireBffConvexUserScope(
  context: BffConvexContext,
  userId: string,
): void {
  if (
    !publicIdentifierSchema.safeParse(userId).success ||
    context.userId !== userId
  ) {
    return fail('FORBIDDEN', 'The user scope does not match');
  }
}

export function requireBffConvexAccountScope(
  context: BffConvexAccountContext,
  accountId: string,
): void {
  if (
    !publicIdentifierSchema.safeParse(accountId).success ||
    context.accountId !== accountId
  ) {
    return fail('FORBIDDEN', 'The account scope does not match');
  }
}

type AccountHandler<Context, Args, Result> = (
  ctx: Context,
  args: Args,
  auth: BffConvexAccountContext,
) => Result;

function withAccountContext<Context extends BffConvexAuthContext, Args, Result>(
  options: BffConvexAccountGuardOptions,
  handler: AccountHandler<Context, Args, Result>,
) {
  return async (ctx: Context, args: Args): Promise<Awaited<Result>> => {
    const auth = await requireBffConvexAccountContext(ctx, options);
    return await handler(ctx, args, auth);
  };
}

export function withBffAccountQuery<
  Context extends BffConvexAuthContext,
  Args,
  Result,
>(
  options: BffConvexAccountGuardOptions,
  handler: AccountHandler<Context, Args, Result>,
) {
  return withAccountContext(options, handler);
}

export function withBffAccountMutation<
  Context extends BffConvexAuthContext,
  Args,
  Result,
>(
  options: BffConvexAccountGuardOptions,
  handler: AccountHandler<Context, Args, Result>,
) {
  return withAccountContext(options, handler);
}

export function withBffAccountAction<
  Context extends BffConvexAuthContext,
  Args,
  Result,
>(
  options: BffConvexAccountGuardOptions,
  handler: AccountHandler<Context, Args, Result>,
) {
  return withAccountContext(options, handler);
}

function isBffAuthError(
  error: unknown,
): error is ConvexError<BffConvexAuthErrorData> {
  if (!(error instanceof ConvexError)) return false;
  const data = error.data;
  return (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    (data.code === 'UNAUTHENTICATED' ||
      data.code === 'ONBOARDING_REQUIRED' ||
      data.code === 'FORBIDDEN') &&
    'message' in data &&
    typeof data.message === 'string'
  );
}

function appendVary(headers: Headers, value: string): void {
  const existing = headers.get('vary');
  const values = new Set(
    (existing ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
  values.add(value);
  headers.set('vary', [...values].join(', '));
}

function corsResponse(response: Response, origin: string): Response {
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', origin);
  headers.set('cache-control', 'no-store');
  headers.set('referrer-policy', 'no-referrer');
  headers.set('x-content-type-options', 'nosniff');
  appendVary(headers, 'Origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function withBffAccountHttpAction<Context extends BffConvexAuthContext>(
  options: BffConvexHttpActionOptions,
  handler: (
    ctx: Context,
    request: Request,
    auth: BffConvexAccountContext,
  ) => Promise<Response> | Response,
) {
  const webOrigins = new Set(options.webOrigins.map(normalizeHttpsOrigin));
  if (webOrigins.size === 0) {
    throw new Error('At least one web origin is required');
  }
  const allowedMethods = options.allowedMethods ?? ['GET'];
  if (
    allowedMethods.length === 0 ||
    new Set(allowedMethods).size !== allowedMethods.length
  ) {
    throw new Error('At least one unique HTTP method is required');
  }
  return async (ctx: Context, request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    if (!origin || !webOrigins.has(origin)) {
      return Response.json(
        { error: { code: 'FORBIDDEN', message: 'Origin is not allowed' } },
        { status: 403 },
      );
    }
    if (request.method === 'OPTIONS') {
      return corsResponse(
        new Response(null, {
          status: 204,
          headers: {
            'access-control-allow-headers': 'Authorization',
            'access-control-allow-methods': [...allowedMethods, 'OPTIONS'].join(
              ', ',
            ),
            'access-control-max-age': '600',
          },
        }),
        origin,
      );
    }
    try {
      const auth = await requireBffConvexAccountContext(ctx, options);
      return corsResponse(await handler(ctx, request, auth), origin);
    } catch (error) {
      if (!isBffAuthError(error)) throw error;
      const status = error.data.code === 'UNAUTHENTICATED' ? 401 : 403;
      return corsResponse(
        Response.json({ error: error.data }, { status }),
        origin,
      );
    }
  };
}
