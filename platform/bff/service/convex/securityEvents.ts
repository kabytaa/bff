import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

const SECURITY_EVENT_RETENTION_MILLISECONDS = 90 * 24 * 60 * 60 * 1_000;

export type SecurityEventType =
  'customer_login_succeeded' | 'customer_logout' | 'ownership_transferred';

export async function recordSecurityEvent(
  ctx: MutationCtx,
  event: {
    environmentId: Id<'businessEnvironments'>;
    userId?: Id<'businessUsers'>;
    accountId?: Id<'accounts'>;
    sessionId?: Id<'businessSessions'>;
    type: SecurityEventType;
    correlationId: string;
    occurredAt: number;
  },
) {
  await ctx.db.insert('securityEvents', {
    ...event,
    cleanupAt: event.occurredAt + SECURITY_EVENT_RETENTION_MILLISECONDS,
  });
}
