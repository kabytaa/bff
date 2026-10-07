import { describe, expect, it } from 'vitest';

import {
  DESIGN_CATALOG,
  OFFER_CATALOG,
  evaluateExportAccess,
  getDesignDefinition,
  getOfferDefinition,
} from './catalog';

describe('TableCards catalogs', () => {
  it('contains exactly three free designs', () => {
    expect(
      Object.values(DESIGN_CATALOG)
        .filter((design) => design.tier === 'free')
        .map((design) => design.id),
    ).toEqual(['minimal-ivory', 'garden-sage', 'midnight-gold']);
  });

  it('encodes accepted offer prices and limits', () => {
    expect(OFFER_CATALOG).toMatchObject({
      free: {
        priceUsd: 0,
        offerRevision: 1,
        numericLimits: {
          maximum_cards_per_project: 25,
          maximum_active_projects: 1,
        },
        aiUnitPolicy: { allowance: 1, period: 'lifetime' },
      },
      event_pass: {
        priceUsd: 5,
        numericLimits: { maximum_cards_per_project: 500 },
        aiUnitPolicy: { allowance: 2, period: 'event' },
      },
      planner_pro: {
        priceUsd: 9,
        numericLimits: { maximum_active_projects: 25 },
        aiUnitPolicy: { allowance: 10, period: 'monthly' },
      },
      studio: {
        priceUsd: 19,
        collaborationSeats: 5,
        numericLimits: { maximum_active_projects: 100 },
        featureFlags: { team_access: true },
        aiUnitPolicy: { allowance: 30, period: 'monthly' },
      },
    });
  });

  it('evaluates card and design limits independently', () => {
    expect(
      evaluateExportAccess({
        offerId: 'free',
        designId: 'minimal-ivory',
        guestCount: 25,
      }),
    ).toEqual({ allowed: true });
    expect(
      evaluateExportAccess({
        offerId: 'free',
        designId: 'minimal-ivory',
        guestCount: 26,
      }),
    ).toMatchObject({ allowed: false, denialCode: 'card_limit_exceeded' });
    expect(
      evaluateExportAccess({
        offerId: 'free',
        designId: 'rosewater-frame',
        guestCount: 25,
      }),
    ).toMatchObject({
      allowed: false,
      denialCode: 'premium_design_required',
    });
  });

  it('fails closed on unknown catalog identifiers', () => {
    expect(() => getDesignDefinition('unknown')).toThrow(/Unknown/u);
    expect(() => getOfferDefinition('unknown')).toThrow(/Unknown/u);
  });
});
