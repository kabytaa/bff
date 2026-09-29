import { describe, expect, it } from 'vitest';

import { createCheckoutRequestSchema } from './checkout';

describe('checkout contracts', () => {
  const request = {
    idempotencyKey: 'checkout_request_0000000001',
    offer: {
      key: 'studio',
      revision: 1,
      displayName: 'Studio',
      priceUsdCents: 1900,
      billing: 'monthly' as const,
    },
    grant: {
      offerKey: 'studio',
      offerRevision: 1,
      featureFlags: [{ key: 'team_access', enabled: true }],
      numericLimits: [{ key: 'maximum_active_projects', value: 100 }],
      unitGrants: [
        {
          unitType: 'ai_background_batch',
          allowance: 30,
          allocation: { kind: 'monthly' as const },
        },
      ],
    },
    accountPolicy: {
      seatLimit: 5,
      adminRoleEnabled: true,
      memberInvitationsEnabled: true,
    },
    returnUrl: 'https://tablecards-dev.tofler.app/settings',
  };

  it('accepts matching code-owned offer and grant snapshots', () => {
    expect(createCheckoutRequestSchema.parse(request)).toEqual(request);
  });

  it('rejects mismatched grants and unsafe return URLs', () => {
    expect(
      createCheckoutRequestSchema.safeParse({
        ...request,
        grant: { ...request.grant, offerKey: 'planner_pro' },
      }).success,
    ).toBe(false);
    expect(
      createCheckoutRequestSchema.safeParse({
        ...request,
        returnUrl: 'http://tablecards.invalid/settings',
      }).success,
    ).toBe(false);
  });
});
