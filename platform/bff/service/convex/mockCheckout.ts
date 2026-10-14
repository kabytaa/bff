import { MAX_ACCOUNT_SEAT_LIMIT } from '@bff/contracts';
import type { Doc } from './_generated/dataModel';
import type { QueryCtx, MutationCtx } from './_generated/server';
import type { ResolvedAccountContext } from './productAccess';
import { fail } from './lib/errors';

/** Eligibility is current database authority, not deployment mode or a JWT flag. */
export async function testCheckoutAvailable(
  ctx: QueryCtx | MutationCtx,
  context: ResolvedAccountContext,
): Promise<boolean> {
  if (
    context.user.isTestUser !== true ||
    context.membership.role !== 'owner' ||
    context.account.ownerUserId !== context.user._id
  )
    return false;
  const grant = await ctx.db
    .query('accountAccessGrants')
    .withIndex('by_environment_account', (q) =>
      q
        .eq('environmentId', context.environment._id)
        .eq('accountId', context.account._id),
    )
    .unique();
  if (grant?.source === 'provider') return false;
  const members = await ctx.db
    .query('memberships')
    .withIndex('by_environment_account_role', (q) =>
      q
        .eq('environmentId', context.environment._id)
        .eq('accountId', context.account._id),
    )
    .take(MAX_ACCOUNT_SEAT_LIMIT + 1);
  if (
    !members.length ||
    members.length > MAX_ACCOUNT_SEAT_LIMIT ||
    members.length !== context.account.activeMembershipCount
  )
    return false;
  const users = await Promise.all(
    members.map((member) => ctx.db.get(member.userId)),
  );
  return users.every(
    (user) =>
      user?.environmentId === context.environment._id &&
      user.isTestUser === true,
  );
}

export async function requireTestCheckout(
  ctx: QueryCtx | MutationCtx,
  context: ResolvedAccountContext,
) {
  if (!(await testCheckoutAvailable(ctx, context)))
    return fail(
      'FORBIDDEN',
      'Mock checkout requires a test Owner and a test-only workspace without paid provider access',
    );
}

/** Recheck at actual membership/ownership transition, not just at invitation creation. */
export async function requireTestWorkspaceMember(
  ctx: QueryCtx | MutationCtx,
  account: Doc<'accounts'>,
  user: Doc<'businessUsers'>,
) {
  const grant = await ctx.db
    .query('accountAccessGrants')
    .withIndex('by_environment_account', (q) =>
      q.eq('environmentId', account.environmentId).eq('accountId', account._id),
    )
    .unique();
  if (
    grant?.source === 'test_mock' &&
    (user.environmentId !== account.environmentId || user.isTestUser !== true)
  )
    return fail(
      'FORBIDDEN',
      'Only designated test users can join or own a test workspace',
    );
}
