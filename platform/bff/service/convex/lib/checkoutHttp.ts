import {
  createCheckoutRequestSchema,
  transitionCheckoutRequestSchema,
} from '@bff/contracts';

import { internal } from '../_generated/api';
import type { ActionCtx } from '../_generated/server';
import { verifyCheckoutServiceAuthorization } from '../checkoutServiceAuth';
import { mockCheckoutEnabled } from '../mockCheckout';
import {
  accountContext,
  authOriginHeaders,
  jsonResponse,
  mapError,
  parseInput,
  readBoundedJson,
  withAuthenticatedCustomerRequest,
} from './customerHttp';
import {
  randomPublicIdentifier,
  readCustomerSigningConfiguration,
} from './customerCrypto';

function contextArguments(claims: ReturnType<typeof accountContext>) {
  return {
    environmentKey: claims.environmentKey,
    userPublicId: claims.sub,
    accountPublicId: claims.accountId,
    membershipPublicId: claims.membershipId,
  };
}

export async function createCheckoutHandler(ctx: ActionCtx, request: Request) {
  return await withAuthenticatedCustomerRequest(
    ctx,
    request,
    async (claims, headers) => {
      if (
        !(await verifyCheckoutServiceAuthorization(
          claims.environmentKey,
          request.headers.get('x-tofler-service-authorization'),
        ))
      ) {
        return mapError({ data: { code: 'UNAUTHENTICATED' } }, headers);
      }
      if (!mockCheckoutEnabled()) {
        return mapError({ data: { code: 'FORBIDDEN' } }, headers);
      }
      const input = parseInput(
        createCheckoutRequestSchema,
        await readBoundedJson(request),
      );
      const fingerprint = JSON.stringify(input);
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const created = await ctx.runMutation(
          internal.checkouts.createForAccount,
          {
            ...contextArguments(accountContext(claims)),
            ...input,
            requestFingerprint: fingerprint,
            publicReference: randomPublicIdentifier('checkout'),
            now: Date.now(),
          },
        );
        if (created.kind === 'collision') continue;
        const checkoutUrl = new URL(
          '/checkout',
          readCustomerSigningConfiguration().issuer,
        );
        checkoutUrl.searchParams.set('environment', claims.environmentKey);
        checkoutUrl.searchParams.set('checkout', created.reference);
        return jsonResponse(
          {
            provider: 'mock',
            checkoutUrl: checkoutUrl.href,
            expiresAt: created.expiresAt,
          },
          201,
          headers,
        );
      }
      return mapError({ data: { code: 'CONFIGURATION_ERROR' } }, headers);
    },
  );
}

export async function readCheckoutHandler(ctx: ActionCtx, request: Request) {
  let cors: HeadersInit = {};
  try {
    cors = authOriginHeaders(request);
    const url = new URL(request.url);
    const input = parseInput(transitionCheckoutRequestSchema, {
      environmentKey: url.searchParams.get('environment'),
      reference: url.searchParams.get('checkout'),
    });
    return jsonResponse(
      await ctx.runQuery(internal.checkouts.readChallenge, {
        ...input,
        now: Date.now(),
      }),
      200,
      cors,
    );
  } catch (error) {
    return mapError(error, cors);
  }
}

async function transitionCheckout(
  ctx: ActionCtx,
  request: Request,
  transition: 'complete' | 'cancel',
) {
  let cors: HeadersInit = {};
  try {
    cors = authOriginHeaders(request);
    const input = parseInput(
      transitionCheckoutRequestSchema,
      await readBoundedJson(request),
    );
    const result =
      transition === 'complete'
        ? await ctx.runMutation(internal.checkouts.complete, {
            ...input,
            now: Date.now(),
          })
        : await ctx.runMutation(internal.checkouts.cancel, {
            ...input,
            now: Date.now(),
          });
    return jsonResponse(result, 200, cors);
  } catch (error) {
    return mapError(error, cors);
  }
}

export async function completeCheckoutHandler(
  ctx: ActionCtx,
  request: Request,
) {
  return await transitionCheckout(ctx, request, 'complete');
}

export async function cancelCheckoutHandler(ctx: ActionCtx, request: Request) {
  return await transitionCheckout(ctx, request, 'cancel');
}

export function checkoutOptionsHandler(request: Request) {
  try {
    const cors = authOriginHeaders(request);
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        'access-control-allow-headers': 'Content-Type',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-max-age': '600',
        'cache-control': 'no-store',
        'referrer-policy': 'no-referrer',
        vary: 'Origin',
      },
    });
  } catch (error) {
    return mapError(error);
  }
}
