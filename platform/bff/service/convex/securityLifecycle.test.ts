import rateLimiterTest from '@convex-dev/rate-limiter/test';
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

describe('bounded customer auth safety controls', () => {
  it('rate limits expensive Google verification per environment', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    rateLimiterTest.register(t);

    for (let request = 0; request < 30; request += 1) {
      await expect(
        t.action(internal.rateLimits.consumeGoogleVerificationForTest, {
          environmentKey: 'example-development',
        }),
      ).resolves.toEqual({ ok: true });
    }
    await expect(
      t.action(internal.rateLimits.consumeGoogleVerificationForTest, {
        environmentKey: 'example-development',
      }),
    ).resolves.toMatchObject({ ok: false });
    await expect(
      t.action(internal.rateLimits.consumeGoogleVerificationForTest, {
        environmentKey: 'other-development',
      }),
    ).resolves.toEqual({ ok: true });
  });

  it('deletes at most one bounded retention batch', async () => {
    const t = convexTest({ schema, modules, transactionLimits: true });
    const environment = await t.mutation(internal.businessEnvironments.create, {
      key: 'example-development',
      businessName: 'Example',
      environmentName: 'Development',
    });
    await t.run(async (ctx) => {
      const storedEnvironment = await ctx.db
        .query('businessEnvironments')
        .withIndex('by_key', (query) => query.eq('key', environment.key))
        .unique();
      if (!storedEnvironment) throw new Error('Fixture setup failed');
      for (let event = 0; event < 120; event += 1) {
        await ctx.db.insert('securityEvents', {
          environmentId: storedEnvironment._id,
          type: 'customer_logout',
          correlationId: `correlation_${event.toString().padStart(16, '0')}`,
          occurredAt: event,
          cleanupAt: 1_000,
        });
      }
    });

    await expect(
      t.mutation(internal.authCleanup.deleteExpiredProtocolState, {
        now: 2_000,
      }),
    ).resolves.toEqual({ deleted: 100 });
    await expect(
      t.mutation(internal.authCleanup.deleteExpiredProtocolState, {
        now: 2_000,
      }),
    ).resolves.toEqual({ deleted: 20 });
  });
});
