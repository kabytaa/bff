import { HOUR, MINUTE, RateLimiter } from '@convex-dev/rate-limiter';

import { components } from './_generated/api';
import type { ActionCtx } from './_generated/server';

const limiter = new RateLimiter(components.rateLimiter, {
  helperGlobal: { kind: 'fixed window', period: MINUTE, rate: 120, shards: 4 },
  helperSession: { kind: 'fixed window', period: MINUTE, rate: 6 },
  helperSessionHourly: { kind: 'fixed window', period: HOUR, rate: 20 },
  helperEnvironment: { kind: 'fixed window', period: HOUR, rate: 300 },
  contactCustomer: { kind: 'fixed window', period: HOUR, rate: 6 },
  contactEnvironment: { kind: 'fixed window', period: HOUR, rate: 100 },
  feedbackInvitation: { kind: 'fixed window', period: HOUR, rate: 10 },
});

export async function limitHelperTurn(
  ctx: ActionCtx,
  environmentKey: string,
  scopeKey: string,
) {
  const global = await limiter.limit(ctx, 'helperGlobal');
  if (!global.ok) return global;
  const environment = await limiter.limit(ctx, 'helperEnvironment', {
    key: environmentKey,
  });
  if (!environment.ok) return environment;
  const minute = await limiter.limit(ctx, 'helperSession', {
    key: `${environmentKey}:${scopeKey}`,
  });
  if (!minute.ok) return minute;
  return await limiter.limit(ctx, 'helperSessionHourly', {
    key: `${environmentKey}:${scopeKey}`,
  });
}

export async function limitContactSubmission(
  ctx: ActionCtx,
  environmentKey: string,
  userPublicId: string,
) {
  const environment = await limiter.limit(ctx, 'contactEnvironment', {
    key: environmentKey,
  });
  if (!environment.ok) return environment;
  return await limiter.limit(ctx, 'contactCustomer', {
    key: `${environmentKey}:${userPublicId}`,
  });
}

export async function limitFeedbackSubmission(
  ctx: ActionCtx,
  invitationHash: string,
) {
  return await limiter.limit(ctx, 'feedbackInvitation', {
    key: invitationHash,
  });
}
