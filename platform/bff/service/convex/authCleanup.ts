import { v } from 'convex/values';

import { internalMutation } from './_generated/server';
import { fail } from './lib/errors';

const CLEANUP_BATCH_SIZE = 100;

export const expirePendingInvitations = internalMutation({
  args: { now: v.optional(v.number()) },
  returns: v.object({ expired: v.number() }),
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const expired = await ctx.db
      .query('accountInvitations')
      .withIndex('by_state_expires_at', (query) =>
        query.eq('state', 'pending').lte('expiresAt', now),
      )
      .take(CLEANUP_BATCH_SIZE);
    for (const invitation of expired) {
      const account = await ctx.db.get(invitation.accountId);
      if (!account || account.pendingInvitationCount < 1) {
        return fail('CONFIGURATION_ERROR', 'Invitation counters are invalid');
      }
      await ctx.db.patch(invitation._id, {
        state: 'expired',
        updatedAt: now,
      });
      await ctx.db.patch(account._id, {
        pendingInvitationCount: account.pendingInvitationCount - 1,
        updatedAt: now,
      });
    }
    return { expired: expired.length };
  },
});

export const deleteExpiredProtocolState = internalMutation({
  args: { now: v.optional(v.number()) },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const tables = [
      'loginTransactions',
      'ownershipTransferProofs',
      'businessSessions',
      'securityEvents',
      'accountInvitations',
    ] as const;
    let remaining = CLEANUP_BATCH_SIZE;
    let deleted = 0;
    for (const table of tables) {
      if (remaining === 0) break;
      const documents = await ctx.db
        .query(table)
        .withIndex('by_cleanup_at', (query) => query.lte('cleanupAt', now))
        .take(remaining);
      for (const document of documents) {
        if (
          table === 'accountInvitations' &&
          'state' in document &&
          document.state === 'pending'
        ) {
          continue;
        }
        await ctx.db.delete(document._id);
        deleted += 1;
        remaining -= 1;
      }
    }
    return { deleted };
  },
});
