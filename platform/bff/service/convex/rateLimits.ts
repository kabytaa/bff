import { MINUTE, RateLimiter } from '@convex-dev/rate-limiter';
import { v } from 'convex/values';

import { components } from './_generated/api';
import { internalAction, type ActionCtx } from './_generated/server';

export const customerRateLimiter = new RateLimiter(components.rateLimiter, {
  publicCustomerAuthGlobal: {
    kind: 'fixed window',
    period: MINUTE,
    rate: 300,
    capacity: 300,
    shards: 5,
  },
  googleVerificationByEnvironment: {
    kind: 'fixed window',
    period: MINUTE,
    rate: 30,
    capacity: 30,
  },
});

export async function limitGoogleVerification(
  ctx: ActionCtx,
  environmentKey: string,
) {
  const global = await customerRateLimiter.limit(
    ctx,
    'publicCustomerAuthGlobal',
  );
  if (!global.ok) return global;
  return await customerRateLimiter.limit(
    ctx,
    'googleVerificationByEnvironment',
    { key: environmentKey },
  );
}

export const consumeGoogleVerificationForTest = internalAction({
  args: { environmentKey: v.string() },
  returns: v.object({ ok: v.boolean(), retryAfter: v.optional(v.number()) }),
  handler: async (ctx, args) =>
    await limitGoogleVerification(ctx, args.environmentKey),
});
