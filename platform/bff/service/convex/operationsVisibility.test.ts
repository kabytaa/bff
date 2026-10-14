import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OperatorWorkConfiguration } from '@bff/contracts';
import { BACKOFFICE_OPERATOR_EMAILS } from '@bff/static-config';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const day = 86_400_000;
const now = Date.UTC(2026, 9, 10, 12);
const configuration: OperatorWorkConfiguration = {
  version: 1,
  enabled: false,
  presentation: {
    productName: 'Example',
    helpUrl: 'https://example.invalid/help',
    contactEmail: 'help@example.invalid',
  },
  support: {
    botKey: 'support',
    fromEmail: 'help@example.invalid',
    fromName: 'Example',
    receivingAddress: 'help@receive.example.invalid',
    replyDomain: 'receive.example.invalid',
    receiptText: 'Received.',
    surveyQuestion: 'Did this help?',
  },
  bots: [],
  skills: [],
  pageCapabilities: [],
  events: [
    {
      name: 'item.saved',
      version: 1,
      label: 'Item saved',
      properties: [{ name: 'count', type: 'number', required: false }],
    },
  ],
  kpis: [
    {
      key: 'saves',
      label: 'Items saved',
      description: 'Recorded saves.',
      measure: 'event_count',
      eventNames: ['item.saved'],
    },
    {
      key: 'active',
      label: 'Active customers',
      description: 'Distinct verified customers.',
      measure: 'active_customers',
      eventNames: ['item.saved'],
    },
  ],
};
async function fixture() {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  const t = convexTest(schema, modules);
  const operator = t.withIdentity({
    issuer: 'https://accounts.google.com',
    subject: 'operator',
    tokenIdentifier: 'https://accounts.google.com|operator',
    email: BACKOFFICE_OPERATOR_EMAILS[0],
    emailVerified: true,
  });
  const records = await t.run(async (ctx) => {
    const environmentId = await ctx.db.insert('businessEnvironments', {
      key: 'example-development',
      businessName: 'Example',
      environmentName: 'Development',
      updatedAt: now,
      operatorWork: configuration,
    });
    const otherEnvironmentId = await ctx.db.insert('businessEnvironments', {
      key: 'other-development',
      businessName: 'Other',
      environmentName: 'Development',
      updatedAt: now,
      operatorWork: configuration,
    });
    const users = [];
    for (const [index, scope] of [
      environmentId,
      environmentId,
      otherEnvironmentId,
    ].entries()) {
      const principalId = await ctx.db.insert('authPrincipals', {
        createdAt: now,
      });
      users.push(
        await ctx.db.insert('businessUsers', {
          environmentId: scope,
          principalId,
          publicId: `user_synthetic${index}`,
          verifiedEmail: `synthetic${index}@example.invalid`,
          displayName: `Synthetic ${index}`,
          createdAt: now,
          updatedAt: now,
          firstSignInProvisioningCompletedAt: now,
          activeMembershipCount: 0,
          ownedAccountCount: 0,
        }),
      );
    }
    return {
      environmentId,
      otherEnvironmentId,
      userId: users[0]!,
      secondUserId: users[1]!,
      otherUserId: users[2]!,
    };
  });
  return { t, operator, ...records };
}
afterEach(() => vi.useRealTimers());

describe('Business event visibility', () => {
  it('uses seven rolling daily buckets with exact boundaries and independent distinct-user totals', async () => {
    const state = await fixture();
    await state.t.run(async (ctx) => {
      for (const [index, event] of [
        { occurredAt: now - 7 * day, userId: state.userId },
        { occurredAt: now - 6 * day, userId: state.userId },
        { occurredAt: now - 6 * day + 1, userId: state.userId },
        { occurredAt: now, userId: state.secondUserId },
        { occurredAt: now - 1 },
        { occurredAt: now - 7 * day - 1, userId: state.userId },
        { occurredAt: now + 1, userId: state.userId },
      ].entries())
        await ctx.db.insert('businessEvents', {
          environmentId: state.environmentId,
          deduplicationId: `event-${index}`,
          name: 'item.saved',
          version: 1,
          receivedAt: now,
          properties: {},
          ...event,
        });
      await ctx.db.insert('businessEvents', {
        environmentId: state.otherEnvironmentId,
        deduplicationId: 'other',
        name: 'item.saved',
        version: 1,
        receivedAt: now,
        occurredAt: now,
        properties: {},
        userId: state.otherUserId,
      });
    });
    const result = await state.operator.query(api.operations.overview, {
      environmentKey: 'example-development',
    });
    const metrics = result.businessKpis[0]!.metrics;
    expect(metrics.map((metric) => metric.value)).toEqual([5, 2]);
    expect(metrics[0]!.trend.map((point) => point.value)).toEqual([
      1, 2, 0, 0, 0, 0, 2,
    ]);
    expect(metrics[1]!.trend.map((point) => point.value)).toEqual([
      1, 1, 0, 0, 0, 0, 1,
    ]);
    expect(metrics[0]!.trend[0]!.startAt).toBe(now - 7 * day);
    expect(metrics[0]!.trend[6]!.endAt).toBe(now);
    const all = await state.operator.query(api.operations.overview, {});
    expect(
      all.businessKpis.find(
        (group) => group.environmentKey === 'other-development',
      )!.metrics[0]!.value,
    ).toBe(1);
    await expect(state.t.query(api.operations.overview, {})).rejects.toThrow();
  });

  it('keeps zero series truthful and truncated series bounded to the same sample as totals', async () => {
    const state = await fixture();
    const empty = await state.operator.query(api.operations.overview, {
      environmentKey: 'example-development',
    });
    expect(
      empty.businessKpis[0]!.metrics[0]!.trend.map((point) => point.value),
    ).toEqual([0, 0, 0, 0, 0, 0, 0]);
    await state.t.run(async (ctx) => {
      for (let index = 0; index < 501; index++)
        await ctx.db.insert('businessEvents', {
          environmentId: state.environmentId,
          deduplicationId: `bounded-${index}`,
          name: 'item.saved',
          version: 1,
          receivedAt: now,
          occurredAt: now - index,
          properties: {},
        });
    });
    const group = (
      await state.operator.query(api.operations.overview, {
        environmentKey: 'example-development',
      })
    ).businessKpis[0]!;
    expect(group.complete).toBe(false);
    expect(group.metrics[0]!.value).toBe(500);
    expect(
      group.metrics[0]!.trend.reduce((sum, point) => sum + point.value, 0),
    ).toBe(500);
  });

  it('shows readable customer event evidence without importing another customer or unlinked events', async () => {
    const state = await fixture();
    await state.t.run(async (ctx) => {
      for (let index = 0; index < 32; index++)
        await ctx.db.insert('businessEvents', {
          environmentId: state.environmentId,
          userId: state.userId,
          deduplicationId: `linked-${index}`,
          name: 'item.saved',
          version: 1,
          receivedAt: now,
          occurredAt: now - index,
          properties: { count: index, note: 'Useful bounded context.' },
          productReference: `item-${index}`,
        });
      for (const [index, userId] of [state.secondUserId, undefined].entries())
        await ctx.db.insert('businessEvents', {
          environmentId: state.environmentId,
          ...(userId ? { userId } : {}),
          deduplicationId: `not-customer-${index}`,
          name: 'item.saved',
          version: 1,
          receivedAt: now,
          occurredAt: now + 1,
          properties: { note: 'Not this customer' },
        });
      await ctx.db.insert('businessEvents', {
        environmentId: state.otherEnvironmentId,
        userId: state.otherUserId,
        deduplicationId: 'other-scope',
        name: 'item.saved',
        version: 1,
        receivedAt: now,
        occurredAt: now,
        properties: {},
      });
    });
    const detail = await state.operator.query(api.operations.customerDetail, {
      environmentKey: 'example-development',
      userPublicId: 'user_synthetic0',
    });
    expect(detail.events).toHaveLength(30);
    expect(detail.eventsComplete).toBe(false);
    expect(detail.events[0]).toMatchObject({
      label: 'Item saved',
      version: 1,
      productReference: 'item-0',
      properties: { count: 0, note: 'Useful bounded context.' },
    });
    expect(
      detail.events.every(
        (event) => event.properties.note !== 'Not this customer',
      ),
    ).toBe(true);
    const first = await state.operator.query(api.operations.activity, {
      environmentKey: 'example-development',
      userPublicId: 'user_synthetic0',
      paginationOpts: { cursor: null, numItems: 25 },
    });
    const second = await state.operator.query(api.operations.activity, {
      environmentKey: 'example-development',
      userPublicId: 'user_synthetic0',
      paginationOpts: { cursor: first.continueCursor, numItems: 25 },
    });
    expect([...first.page, ...second.page]).toHaveLength(32);
    expect(second.isDone).toBe(true);
    await expect(
      state.operator.query(api.operations.activity, {
        userPublicId: 'user_synthetic0',
        paginationOpts: { cursor: null, numItems: 25 },
      }),
    ).rejects.toThrow('Business environment');
    await expect(
      state.operator.query(api.operations.activity, {
        environmentKey: 'other-development',
        userPublicId: 'user_synthetic0',
        paginationOpts: { cursor: null, numItems: 25 },
      }),
    ).rejects.toThrow('not found');
    await expect(
      state.t.query(api.operations.customerDetail, {
        environmentKey: 'example-development',
        userPublicId: 'user_synthetic0',
      }),
    ).rejects.toThrow();
    await expect(
      state.t.query(api.operations.activity, {
        environmentKey: 'example-development',
        userPublicId: 'user_synthetic0',
        paginationOpts: { cursor: null, numItems: 25 },
      }),
    ).rejects.toThrow();
  });

  it('falls back to the recorded identifier when a historical version has no current label', async () => {
    const state = await fixture();
    await state.t.run(async (ctx) => {
      await ctx.db.insert('businessEvents', {
        environmentId: state.environmentId,
        userId: state.userId,
        deduplicationId: 'historical',
        name: 'item.saved',
        version: 2,
        occurredAt: now,
        receivedAt: now,
        properties: {},
      });
    });
    const result = await state.operator.query(api.operations.customerDetail, {
      environmentKey: 'example-development',
      userPublicId: 'user_synthetic0',
    });
    expect(result.eventsComplete).toBe(true);
    expect(result.events[0]!.label).toBe('item.saved');
    expect(result.events[0]!.version).toBe(2);
  });
});
