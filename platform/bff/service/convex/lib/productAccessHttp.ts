import {
  developmentProductAccessGrantRequestSchema,
  reserveUnitsRequestSchema,
  transitionUnitReservationRequestSchema,
  unitBalanceRequestSchema,
} from '@bff/contracts';

import type { ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import { randomPublicIdentifier } from './customerCrypto';
import {
  accountContext,
  jsonResponse,
  mapError,
  parseInput,
  readBoundedJson,
  withAuthenticatedCustomerRequest,
} from './customerHttp';

function contextArguments(claims: ReturnType<typeof accountContext>) {
  return {
    environmentKey: claims.environmentKey,
    userPublicId: claims.sub,
    accountPublicId: claims.accountId,
    membershipPublicId: claims.membershipId,
  };
}

export async function currentProductAccessHandler(
  ctx: ActionCtx,
  request: Request,
) {
  return await withAuthenticatedCustomerRequest(
    ctx,
    request,
    async (claims, headers) => {
      await ctx.runQuery(internal.sessions.validateContext, {
        environmentKey: claims.environmentKey,
        userPublicId: claims.sub,
        sessionPublicId: claims.sessionId,
        now: Date.now(),
      });
      return jsonResponse(
        await ctx.runQuery(internal.productAccess.currentForAccount, {
          ...contextArguments(accountContext(claims)),
          now: Date.now(),
        }),
        200,
        headers,
      );
    },
  );
}

export async function currentUnitBalanceHandler(
  ctx: ActionCtx,
  request: Request,
) {
  return await withAuthenticatedCustomerRequest(
    ctx,
    request,
    async (claims, headers) => {
      const url = new URL(request.url);
      const input = parseInput(unitBalanceRequestSchema, {
        unitType: url.searchParams.get('unitType'),
      });
      return jsonResponse(
        await ctx.runQuery(internal.unitLedger.balanceForAccount, {
          ...contextArguments(accountContext(claims)),
          ...input,
          now: Date.now(),
        }),
        200,
        headers,
      );
    },
  );
}

export async function reserveUnitsHandler(ctx: ActionCtx, request: Request) {
  return await withAuthenticatedCustomerRequest(
    ctx,
    request,
    async (claims, headers) => {
      const input = parseInput(
        reserveUnitsRequestSchema,
        await readBoundedJson(request),
      );
      const account = contextArguments(accountContext(claims));
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const result = await ctx.runMutation(
          internal.unitLedger.reserveForAccount,
          {
            ...account,
            ...input,
            reservationPublicId: randomPublicIdentifier('unit_reservation'),
            now: Date.now(),
          },
        );
        if (result.kind === 'collision') continue;
        return jsonResponse(result.result, 201, headers);
      }
      return mapError({ data: { code: 'CONFIGURATION_ERROR' } }, headers);
    },
  );
}

async function transitionUnits(
  ctx: ActionCtx,
  request: Request,
  transition: 'commit' | 'release',
) {
  return await withAuthenticatedCustomerRequest(
    ctx,
    request,
    async (claims, headers) => {
      const input = parseInput(
        transitionUnitReservationRequestSchema,
        await readBoundedJson(request),
      );
      const args = {
        ...contextArguments(accountContext(claims)),
        ...input,
        now: Date.now(),
      };
      const result =
        transition === 'commit'
          ? await ctx.runMutation(internal.unitLedger.commitForAccount, args)
          : await ctx.runMutation(internal.unitLedger.releaseForAccount, args);
      return jsonResponse(result, 200, headers);
    },
  );
}

export async function commitUnitsHandler(ctx: ActionCtx, request: Request) {
  return await transitionUnits(ctx, request, 'commit');
}

export async function releaseUnitsHandler(ctx: ActionCtx, request: Request) {
  return await transitionUnits(ctx, request, 'release');
}

export async function setDevelopmentProductAccessHandler(
  ctx: ActionCtx,
  request: Request,
) {
  return await withAuthenticatedCustomerRequest(
    ctx,
    request,
    async (claims, headers) => {
      const input = parseInput(
        developmentProductAccessGrantRequestSchema,
        await readBoundedJson(request),
      );
      return jsonResponse(
        await ctx.runMutation(internal.productAccess.setDevelopmentForAccount, {
          ...contextArguments(accountContext(claims)),
          ...input,
          now: Date.now(),
        }),
        200,
        headers,
      );
    },
  );
}
