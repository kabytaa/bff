import { describe, expect, it } from 'vitest';

import {
  developmentProductAccessGrantRequestSchema,
  productAccessIdempotencyKeySchema,
  productAccessProjectionSchema,
  reserveUnitsRequestSchema,
} from './productAccess';

describe('product access contracts', () => {
  it('accepts a bounded provider-independent access projection', () => {
    expect(
      productAccessProjectionSchema.parse({
        version: 1,
        accountId: 'account_1234567890123456',
        offerKey: 'planner-pro',
        offerRevision: 2,
        source: 'provider',
        featureFlags: [{ key: 'premium_designs', enabled: true }],
        numericLimits: [{ key: 'active_projects', value: 25 }],
        unitGrants: [
          {
            unitType: 'ai_background_batch',
            periodKey: 'month:2026-09',
            allowance: 10,
          },
        ],
        effectiveAt: 1,
        updatedAt: 2,
      }),
    ).toMatchObject({ offerKey: 'planner-pro', source: 'provider' });
  });

  it('rejects duplicate feature, limit and unit keys', () => {
    const base = {
      offerKey: 'free',
      offerRevision: 1,
      featureFlags: [
        { key: 'pdf_export', enabled: true },
        { key: 'pdf_export', enabled: false },
      ],
      numericLimits: [],
      unitGrants: [],
    };
    expect(
      developmentProductAccessGrantRequestSchema.safeParse(base).success,
    ).toBe(false);
    expect(
      developmentProductAccessGrantRequestSchema.safeParse({
        ...base,
        featureFlags: [],
        unitGrants: [
          {
            unitType: 'ai_batch',
            allowance: 1,
            allocation: { kind: 'fixed', key: 'lifetime' },
          },
          {
            unitType: 'ai_batch',
            allowance: 2,
            allocation: { kind: 'monthly' },
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('bounds unit and idempotency inputs', () => {
    expect(
      reserveUnitsRequestSchema.parse({
        unitType: 'ai_background_batch',
        amount: 1,
        idempotencyKey: 'request_1234567890123456',
      }),
    ).toMatchObject({ amount: 1 });
    expect(productAccessIdempotencyKeySchema.safeParse('short').success).toBe(
      false,
    );
    expect(
      reserveUnitsRequestSchema.safeParse({
        unitType: 'AI BATCH',
        amount: 0,
        idempotencyKey: 'request_1234567890123456',
      }).success,
    ).toBe(false);
  });
});
