import { ConvexError } from 'convex/values';
import { z } from 'zod';

import { createAssistantUIResponse } from '@bff/assistant/server';
import {
  publicIdentifierSchema,
  safePropertiesSchema,
  type CustomerContextClaims,
} from '@bff/contracts';
import { internal } from '../_generated/api';
import type { ActionCtx } from '../_generated/server';
import {
  randomOpaqueSecret,
  readCustomerSigningConfiguration,
  sha256Base64Url,
  verifyCustomerContextToken,
} from './customerCrypto';
import {
  boundedBytes,
  OperationTransportError,
  operationJson,
  operationResponseHeaders,
  readOperationJson,
  verifyOperationServiceAuthorization,
  verifyResendOperationWebhook,
} from './operationsTransport';
import {
  limitContactSubmission,
  limitFeedbackSubmission,
  limitHelperTurn,
} from '../operationsRateLimits';

const environmentSchema = z.string().regex(/^[a-z][a-z0-9-]{1,63}$/u);
const opaqueCapability = z
  .string()
  .min(32)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u);
const pageSchema = z.object({ key: z.string().min(1).max(128) }).strict();
const choiceSchema = z.enum(['yes', 'partly', 'no']);

function errorResponse(error: unknown, cors: HeadersInit = {}) {
  if (error instanceof OperationTransportError)
    return operationJson(
      { error: { code: error.code, message: error.message } },
      error.status,
      cors,
    );
  if (error instanceof z.ZodError)
    return operationJson(
      { error: { code: 'INVALID_INPUT', message: 'The request is invalid.' } },
      400,
      cors,
    );
  if (
    error instanceof ConvexError &&
    typeof error.data === 'object' &&
    error.data &&
    'code' in error.data
  ) {
    const code = String(error.data.code);
    const status =
      code === 'FORBIDDEN'
        ? 403
        : code === 'UNAUTHENTICATED'
          ? 401
          : code === 'NOT_FOUND'
            ? 404
            : code === 'CONFLICT'
              ? 409
              : code === 'CONFIGURATION_ERROR'
                ? 503
                : 400;
    return operationJson(
      {
        error: {
          code,
          message:
            status === 503
              ? 'This service is temporarily unavailable.'
              : status === 409
                ? 'New information requires a fresh review.'
                : 'The request could not be accepted.',
        },
      },
      status,
      cors,
    );
  }
  return operationJson(
    {
      error: {
        code: 'TEMPORARILY_UNAVAILABLE',
        message:
          'This service is temporarily unavailable. Your message is preserved.',
      },
    },
    503,
    cors,
  );
}

async function originHeaders(
  ctx: ActionCtx,
  request: Request,
  environmentKey: string,
): Promise<Record<string, string>> {
  const origin = request.headers.get('origin');
  if (!origin) return {};
  const allowed = await ctx.runQuery(
    internal.businessEnvironments.customerWebOrigins,
    { key: environmentKey },
  );
  if (!allowed.includes(origin))
    throw new OperationTransportError(
      'FORBIDDEN',
      403,
      'Request origin is not allowed.',
    );
  return { 'access-control-allow-origin': origin, vary: 'Origin' };
}

async function scopedRequest(
  ctx: ActionCtx,
  request: Request,
  handler: (environmentKey: string, cors: HeadersInit) => Promise<Response>,
) {
  let cors: HeadersInit = {};
  try {
    const key = environmentSchema.parse(
      request.headers.get('x-tofler-environment') ??
        new URL(request.url).searchParams.get('environmentKey'),
    );
    cors = await originHeaders(ctx, request, key);
    return await handler(key, cors);
  } catch (error) {
    return errorResponse(error, cors);
  }
}

async function optionalCustomer(
  request: Request,
  environmentKey: string,
): Promise<CustomerContextClaims | null> {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;
  if (!authorization.startsWith('Bearer ') || authorization.length > 16_384)
    throw new OperationTransportError(
      'UNAUTHENTICATED',
      401,
      'Check your current sign-in session.',
    );
  try {
    return await verifyCustomerContextToken({
      configuration: readCustomerSigningConfiguration(),
      environmentKey,
      token: authorization.slice(7),
    });
  } catch {
    throw new OperationTransportError(
      'UNAUTHENTICATED',
      401,
      'Check your current sign-in session.',
    );
  }
}
function customerArguments(claims: CustomerContextClaims | null) {
  return claims
    ? {
        userPublicId: claims.sub,
        ...(claims.contextType === 'account'
          ? {
              accountPublicId: claims.accountId,
              membershipPublicId: claims.membershipId,
            }
          : {}),
      }
    : {};
}
function matchingEnvironment(
  body: Record<string, unknown>,
  environmentKey: string,
) {
  if (
    body.environmentKey !== undefined &&
    body.environmentKey !== environmentKey
  )
    throw new OperationTransportError(
      'FORBIDDEN',
      403,
      'Business context does not match.',
    );
}
function limited(result: { ok: boolean; retryAfter?: number }) {
  if (!result.ok)
    throw new OperationTransportError(
      'RATE_LIMITED',
      429,
      'The service is temporarily at its limit. Contact by email remains available.',
    );
}

export async function operationsOptions(ctx: ActionCtx, request: Request) {
  return scopedRequest(ctx, request, async (_environmentKey, cors) => {
    const headers = operationResponseHeaders(cors);
    headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
    headers.set(
      'access-control-allow-headers',
      'authorization, content-type, x-tofler-environment',
    );
    headers.set('access-control-max-age', '600');
    return new Response(null, { status: 204, headers });
  });
}
export async function operationsConfiguration(
  ctx: ActionCtx,
  request: Request,
) {
  return scopedRequest(ctx, request, async (environmentKey, cors) =>
    operationJson(
      await ctx.runQuery(internal.operationsState.publicConfiguration, {
        environmentKey,
      }),
      200,
      cors,
    ),
  );
}

export async function operationsHelper(ctx: ActionCtx, request: Request) {
  return scopedRequest(ctx, request, async (environmentKey, cors) => {
    const body = await readOperationJson(request);
    matchingEnvironment(body, environmentKey);
    const page = pageSchema.parse(body.page);
    const claims = await optionalCustomer(request, environmentKey);
    const conversationPublicId =
      body.conversationId === undefined
        ? undefined
        : publicIdentifierSchema.parse(body.conversationId);
    const capability = claims
      ? undefined
      : body.capability === undefined && !conversationPublicId
        ? randomOpaqueSecret()
        : opaqueCapability.parse(body.capability);
    const anonymousHandleHash = capability
      ? await sha256Base64Url(capability)
      : undefined;
    const identity = {
      environmentKey,
      ...customerArguments(claims),
      ...(anonymousHandleHash ? { anonymousHandleHash } : {}),
    };
    limited(
      await limitHelperTurn(
        ctx,
        environmentKey,
        claims
          ? `${claims.sub}:${claims.contextType === 'account' ? claims.accountId : 'onboarding'}`
          : anonymousHandleHash!,
      ),
    );
    let runId;
    let publicId;
    if (body.toolResults !== undefined) {
      const results = z
        .array(
          z
            .object({
              toolCallId: z.string().min(1).max(128),
              toolName: z.string().min(1).max(80),
              output: safePropertiesSchema,
              contextKey: z.string().max(300),
            })
            .strict(),
        )
        .length(1)
        .parse(body.toolResults);
      if (!conversationPublicId)
        throw new OperationTransportError(
          'INVALID_INPUT',
          400,
          'A current helper conversation is required.',
        );
      const history = await ctx.runQuery(
        internal.operationsState.helperHistory,
        { ...identity, conversationPublicId },
      );
      const pending = history.activeRun?.pendingClientTool;
      const result = results[0]!;
      const fingerprint = await sha256Base64Url(
        JSON.stringify({ key: page.key }),
      );
      if (!pending || pending.pageContextFingerprint !== fingerprint)
        throw new OperationTransportError(
          'CONFLICT',
          409,
          'The page changed; ask again from the current page.',
        );
      runId = await ctx.runMutation(internal.operationsState.resumeClientTool, {
        ...identity,
        conversationPublicId,
        runPublicId: history.activeRun!.publicId,
        callId: result.toolCallId,
        name: result.toolName,
        pageContextFingerprint: fingerprint,
        result: result.output,
      });
      publicId = conversationPublicId;
    } else {
      const message = z
        .object({
          id: publicIdentifierSchema,
          text: z.string().trim().min(1).max(12_000),
        })
        .strict()
        .parse(body.message);
      const turn = await ctx.runMutation(internal.operationsState.helperTurn, {
        ...identity,
        ...(conversationPublicId ? { conversationPublicId } : {}),
        text: message.text,
        idempotencyKey: message.id,
        pageContext: { key: page.key },
      });
      runId = turn.runId;
      publicId = turn.publicId;
      if (turn.savedAnswer)
        return createAssistantUIResponse({
          ...turn.savedAnswer,
          toolCalls: [],
          session: {
            conversationId: publicId,
            ...(capability ? { capability } : {}),
          },
          headers: operationResponseHeaders(cors),
        });
      if (turn.savedClientTool) {
        const { messageId, mocked, ...toolCall } = turn.savedClientTool;
        return createAssistantUIResponse({
          text: '',
          messageId,
          mocked,
          toolCalls: [toolCall],
          session: {
            conversationId: publicId,
            ...(capability ? { capability } : {}),
          },
          headers: operationResponseHeaders(cors),
        });
      }
    }
    if (!runId)
      throw new OperationTransportError(
        'CONFLICT',
        409,
        'This question is already being handled.',
      );
    const response = await ctx.runAction(
      internal.operationsRuntime.processRun,
      { runId },
    );
    return createAssistantUIResponse({
      ...response,
      session: {
        conversationId: publicId,
        ...(capability ? { capability } : {}),
      },
      headers: operationResponseHeaders(cors),
    });
  });
}

export async function operationsContact(ctx: ActionCtx, request: Request) {
  return scopedRequest(ctx, request, async (environmentKey, cors) => {
    const body = await readOperationJson(request);
    matchingEnvironment(body, environmentKey);
    const input = z
      .object({
        kind: z.enum(['question', 'problem', 'feedback']),
        subject: z.string().trim().min(1).max(200),
        message: z.string().trim().min(1).max(12_000),
        idempotencyKey: publicIdentifierSchema,
      })
      .parse(body);
    const claims = await optionalCustomer(request, environmentKey);
    if (!claims)
      throw new OperationTransportError(
        'UNAUTHENTICATED',
        401,
        'Sign in to send this form, or use support email.',
      );
    limited(await limitContactSubmission(ctx, environmentKey, claims.sub));
    const result = await ctx.runMutation(
      internal.operationsState.intakeContact,
      {
        environmentKey,
        ...customerArguments(claims),
        userPublicId: claims.sub,
        subject: input.subject,
        text: input.message,
        idempotencyKey: input.idempotencyKey,
      },
    );
    const user = await ctx.runQuery(
      internal.customerAuth.currentCustomerByPublicId,
      { environmentKey, userPublicId: claims.sub },
    );
    const mocked =
      process.env.BFF_OPERATIONS_MAIL_MODE === 'mock' &&
      process.env.BFF_DEVELOPMENT_OPERATOR_WORK_ENABLED === 'enabled';
    return operationJson(
      {
        conversationId: result.publicId,
        reference: result.publicId.slice(-12),
        contactEmail: user.user.verifiedEmail,
        receiptState: mocked ? 'mocked' : 'queued',
      },
      200,
      cors,
    );
  });
}

export async function operationsFeedback(ctx: ActionCtx, request: Request) {
  return scopedRequest(ctx, request, async (environmentKey, cors) => {
    const body = await readOperationJson(request);
    matchingEnvironment(body, environmentKey);
    const input = z
      .object({
        conversationId: publicIdentifierSchema,
        capability: opaqueCapability.optional(),
        answerEntryId: publicIdentifierSchema,
        choice: choiceSchema,
        comment: z.string().max(2000).optional(),
      })
      .parse(body);
    const claims = await optionalCustomer(request, environmentKey);
    const anonymousHandleHash =
      !claims && input.capability
        ? await sha256Base64Url(input.capability)
        : undefined;
    limited(
      await limitFeedbackSubmission(
        ctx,
        `${environmentKey}:${input.answerEntryId}`,
      ),
    );
    await ctx.runMutation(internal.operationsState.submitHelperFeedback, {
      environmentKey,
      conversationPublicId: input.conversationId,
      ...customerArguments(claims),
      ...(anonymousHandleHash ? { anonymousHandleHash } : {}),
      answerPublicId: input.answerEntryId,
      rating: input.choice,
      ...(input.comment ? { comment: input.comment } : {}),
    });
    return operationJson({ submitted: true }, 200, cors);
  });
}

export async function operationsSurvey(ctx: ActionCtx, request: Request) {
  return scopedRequest(ctx, request, async (environmentKey, cors) => {
    if (request.method === 'GET') {
      const tokenHash = await sha256Base64Url(
        opaqueCapability.parse(new URL(request.url).searchParams.get('token')),
      );
      const invitation = await ctx.runQuery(internal.operationsState.survey, {
        environmentKey,
        tokenHash,
      });
      return operationJson(
        invitation ? { ...invitation, active: true } : { active: false },
        200,
        cors,
      );
    }
    const input = z
      .object({
        token: opaqueCapability,
        choice: choiceSchema,
        comment: z.string().max(2000).optional(),
      })
      .parse(await readOperationJson(request));
    const tokenHash = await sha256Base64Url(input.token);
    limited(await limitFeedbackSubmission(ctx, tokenHash));
    return operationJson(
      await ctx.runMutation(internal.operationsState.submitSurvey, {
        environmentKey,
        tokenHash,
        rating: input.choice,
        ...(input.comment ? { comment: input.comment } : {}),
      }),
      200,
      cors,
    );
  });
}

export async function operationsEvents(ctx: ActionCtx, request: Request) {
  try {
    const body = await readOperationJson(request);
    const input = z
      .object({
        environmentKey: environmentSchema,
        deduplicationId: z.string().min(1).max(128),
        name: z.string().min(1).max(80),
        version: z.number().int().positive(),
        occurredAt: z.number().int().nonnegative(),
        properties: safePropertiesSchema,
        productReference: z.string().max(128).optional(),
        userPublicId: publicIdentifierSchema.optional(),
        accountPublicId: publicIdentifierSchema.optional(),
        membershipPublicId: publicIdentifierSchema.optional(),
      })
      .strict()
      .parse(body);
    if (
      !(await verifyOperationServiceAuthorization(
        input.environmentKey,
        request.headers.get('authorization'),
      ))
    )
      throw new OperationTransportError(
        'FORBIDDEN',
        403,
        'Business event service authorization is required.',
      );
    return operationJson(
      await ctx.runMutation(internal.operationsState.ingestEvent, input),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function operationsResendWebhook(
  ctx: ActionCtx,
  request: Request,
) {
  try {
    const payload = new TextDecoder().decode(
      await boundedBytes(request.body, 64_000),
    );
    if (
      !(await verifyResendOperationWebhook({
        payload,
        headers: request.headers,
        secret: process.env.BFF_OPERATIONS_RESEND_WEBHOOK_SECRET ?? '',
      }))
    )
      throw new OperationTransportError(
        'FORBIDDEN',
        403,
        'Webhook verification failed.',
      );
    const parsed = z
      .object({
        type: z.string().min(1).max(80),
        created_at: z.string().max(100),
        data: z.object({
          email_id: z.string().min(1).max(200),
          from: z.string().max(300).optional(),
          to: z.array(z.string().max(300)).max(10).optional(),
        }),
      })
      .parse(JSON.parse(payload));
    const occurredAt = Date.parse(parsed.created_at);
    if (!Number.isFinite(occurredAt))
      throw new OperationTransportError(
        'INVALID_INPUT',
        400,
        'Event timestamp is invalid.',
      );
    if (
      !(await ctx.runQuery(internal.lib.operationsMailRouting.acceptsWebhook, {
        eventType: parsed.type,
        providerMessageId: parsed.data.email_id,
        ...(parsed.data.from ? { sender: parsed.data.from } : {}),
        recipients: parsed.data.to ?? [],
      }))
    )
      return operationJson({ received: true, ignored: true });
    const receipt = await ctx.runMutation(
      internal.operationsState.recordWebhook,
      {
        eventId: request.headers.get('svix-id')!,
        eventType: parsed.type,
        occurredAt,
        providerMessageId: parsed.data.email_id,
        ...(parsed.data.from ? { sender: parsed.data.from } : {}),
        recipients: parsed.data.to ?? [],
        threadIds: [],
      },
    );
    // The mutation schedules processing atomically with the durable dedup receipt.
    return operationJson({ received: true, duplicate: receipt.duplicate });
  } catch (error) {
    return errorResponse(error);
  }
}
