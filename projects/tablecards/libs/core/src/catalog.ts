export type DesignTier = 'free' | 'premium';
export type DesignInkUse = 'low' | 'medium';

export interface DesignDefinition {
  readonly id: DesignId;
  readonly name: string;
  readonly description: string;
  readonly tier: DesignTier;
  readonly occasions: readonly string[];
  readonly inkUse: DesignInkUse;
  readonly artwork: {
    readonly publicPath: string;
    readonly sha256: string;
    readonly mimeType: 'image/jpeg';
    readonly width: 1050;
    readonly height: 600;
  };
  readonly palette: {
    readonly background: string;
    readonly accent: string;
    readonly text: string;
    readonly secondaryText: string;
  };
}

export const DESIGN_CATALOG = Object.freeze({
  'minimal-ivory': Object.freeze({
    id: 'minimal-ivory',
    name: 'Minimal Ivory',
    description: 'Engraved ivory for dinners and business events.',
    tier: 'free',
    occasions: Object.freeze(['Dinner', 'Business']),
    inkUse: 'low',
    artwork: Object.freeze({
      publicPath: '/designs/predefined/v2/minimal-ivory.jpg',
      sha256:
        '2dcc0a214d1da4b997b1e2c2857aaa0984391a60fe0f9d6546fb699f8eb30fb8',
      mimeType: 'image/jpeg',
      width: 1050,
      height: 600,
    }),
    palette: Object.freeze({
      background: '#FFFDF7',
      accent: '#806C57',
      text: '#25221F',
      secondaryText: '#675F57',
    }),
  }),
  'garden-sage': Object.freeze({
    id: 'garden-sage',
    name: 'Garden Sage',
    description: 'Botanical sprigs for weddings and garden parties.',
    tier: 'free',
    occasions: Object.freeze(['Wedding', 'Garden party']),
    inkUse: 'low',
    artwork: Object.freeze({
      publicPath: '/designs/predefined/v2/garden-sage.jpg',
      sha256:
        '6f2b26690abf73df8add95d3487493fc6b887acd44fe06746d91a0a83d456627',
      mimeType: 'image/jpeg',
      width: 1050,
      height: 600,
    }),
    palette: Object.freeze({
      background: '#F4F7F1',
      accent: '#587052',
      text: '#233022',
      secondaryText: '#52614F',
    }),
  }),
  'midnight-gold': Object.freeze({
    id: 'midnight-gold',
    name: 'Midnight Gold',
    description: 'Art Deco fans for formal evening celebrations.',
    tier: 'free',
    occasions: Object.freeze(['Formal dinner', 'Anniversary']),
    inkUse: 'medium',
    artwork: Object.freeze({
      publicPath: '/designs/predefined/v2/midnight-gold.jpg',
      sha256:
        '9330b5d9e5953465b235ae12359aba2c4dd1af5d4df60fb0a48c9fb698300232',
      mimeType: 'image/jpeg',
      width: 1050,
      height: 600,
    }),
    palette: Object.freeze({
      background: '#FFF9E8',
      accent: '#9B772D',
      text: '#172238',
      secondaryText: '#596174',
    }),
  }),
  'rosewater-frame': Object.freeze({
    id: 'rosewater-frame',
    name: 'Rosewater Frame',
    description: 'Blush flower clusters for weddings and showers.',
    tier: 'premium',
    occasions: Object.freeze(['Wedding', 'Baby shower']),
    inkUse: 'medium',
    artwork: Object.freeze({
      publicPath: '/designs/predefined/v2/rosewater-frame.jpg',
      sha256:
        'a2c003229319d4e50449060778e809896378b6c485149f7da5a43c9c0ab0f2dc',
      mimeType: 'image/jpeg',
      width: 1050,
      height: 600,
    }),
    palette: Object.freeze({
      background: '#FFF7F6',
      accent: '#A6605C',
      text: '#452A29',
      secondaryText: '#7D5956',
    }),
  }),
  'coastal-blue': Object.freeze({
    id: 'coastal-blue',
    name: 'Coastal Blue',
    description: 'Layered waves for summer and destination events.',
    tier: 'premium',
    occasions: Object.freeze(['Summer party', 'Destination event']),
    inkUse: 'low',
    artwork: Object.freeze({
      publicPath: '/designs/predefined/v2/coastal-blue.jpg',
      sha256:
        'fe980bf2087eaf43fb06433499d40bd48f7d7bbc3c0dc7ce9c382b3282c9668b',
      mimeType: 'image/jpeg',
      width: 1050,
      height: 600,
    }),
    palette: Object.freeze({
      background: '#F2F8FA',
      accent: '#39778A',
      text: '#163945',
      secondaryText: '#4C6E78',
    }),
  }),
  'modern-charcoal': Object.freeze({
    id: 'modern-charcoal',
    name: 'Modern Charcoal',
    description: 'Architectural brackets for modern and corporate tables.',
    tier: 'premium',
    occasions: Object.freeze(['Corporate dinner', 'Modern reception']),
    inkUse: 'low',
    artwork: Object.freeze({
      publicPath: '/designs/predefined/v2/modern-charcoal.jpg',
      sha256:
        '1aa43a8b1441e3d4757d7d301247cc7c43080ca84e027a41011cac4790bec754',
      mimeType: 'image/jpeg',
      width: 1050,
      height: 600,
    }),
    palette: Object.freeze({
      background: '#F7F7F5',
      accent: '#526B7A',
      text: '#27292C',
      secondaryText: '#646A70',
    }),
  }),
} as const satisfies Record<
  string,
  Omit<DesignDefinition, 'id'> & { id: string }
>);

export type DesignId = keyof typeof DESIGN_CATALOG;

export const DESIGN_IDS = Object.freeze(
  Object.keys(DESIGN_CATALOG) as DesignId[],
);

export function getDesignDefinition(id: string): DesignDefinition {
  if (!(id in DESIGN_CATALOG)) {
    throw new Error(`Unknown TableCards design: ${id}`);
  }
  return DESIGN_CATALOG[id as DesignId];
}

export type OfferId = 'free' | 'event_pass' | 'planner_pro' | 'studio';

export interface OfferDefinition {
  readonly id: OfferId;
  readonly offerRevision: 1;
  readonly name: string;
  readonly billing: 'free' | 'one_time' | 'monthly';
  readonly priceUsd: number;
  readonly designTier: DesignTier;
  readonly collaborationSeats: number;
  readonly numericLimits: {
    readonly maximum_cards_per_project: number;
    readonly maximum_active_projects: number;
  };
  readonly featureFlags: {
    readonly custom_artwork: boolean;
    readonly ai_backgrounds: boolean;
    readonly reusable_presets: boolean;
    readonly team_access: boolean;
  };
  readonly aiUnitPolicy: {
    readonly unitType: 'ai_background_batch';
    readonly allowance: number;
    readonly period: 'lifetime' | 'event' | 'monthly';
  };
}

export const OFFER_CATALOG = Object.freeze({
  free: Object.freeze({
    id: 'free',
    offerRevision: 1,
    name: 'Free',
    billing: 'free',
    priceUsd: 0,
    designTier: 'free',
    collaborationSeats: 1,
    numericLimits: Object.freeze({
      maximum_cards_per_project: 25,
      maximum_active_projects: 1,
    }),
    featureFlags: Object.freeze({
      custom_artwork: false,
      ai_backgrounds: true,
      reusable_presets: false,
      team_access: false,
    }),
    aiUnitPolicy: Object.freeze({
      unitType: 'ai_background_batch',
      allowance: 1,
      period: 'lifetime',
    }),
  }),
  event_pass: Object.freeze({
    id: 'event_pass',
    offerRevision: 1,
    name: 'Event Pass',
    billing: 'one_time',
    priceUsd: 5,
    designTier: 'premium',
    collaborationSeats: 1,
    numericLimits: Object.freeze({
      maximum_cards_per_project: 500,
      maximum_active_projects: 1,
    }),
    featureFlags: Object.freeze({
      custom_artwork: true,
      ai_backgrounds: true,
      reusable_presets: false,
      team_access: false,
    }),
    aiUnitPolicy: Object.freeze({
      unitType: 'ai_background_batch',
      allowance: 2,
      period: 'event',
    }),
  }),
  planner_pro: Object.freeze({
    id: 'planner_pro',
    offerRevision: 1,
    name: 'Planner Pro',
    billing: 'monthly',
    priceUsd: 9,
    designTier: 'premium',
    collaborationSeats: 1,
    numericLimits: Object.freeze({
      maximum_cards_per_project: 500,
      maximum_active_projects: 25,
    }),
    featureFlags: Object.freeze({
      custom_artwork: true,
      ai_backgrounds: true,
      reusable_presets: true,
      team_access: false,
    }),
    aiUnitPolicy: Object.freeze({
      unitType: 'ai_background_batch',
      allowance: 10,
      period: 'monthly',
    }),
  }),
  studio: Object.freeze({
    id: 'studio',
    offerRevision: 1,
    name: 'Studio',
    billing: 'monthly',
    priceUsd: 19,
    designTier: 'premium',
    collaborationSeats: 5,
    numericLimits: Object.freeze({
      maximum_cards_per_project: 500,
      maximum_active_projects: 100,
    }),
    featureFlags: Object.freeze({
      custom_artwork: true,
      ai_backgrounds: true,
      reusable_presets: true,
      team_access: true,
    }),
    aiUnitPolicy: Object.freeze({
      unitType: 'ai_background_batch',
      allowance: 30,
      period: 'monthly',
    }),
  }),
} as const satisfies Record<OfferId, OfferDefinition>);

/** Public versioned TableCards offer registration input. */
export const TABLECARDS_OFFERS = OFFER_CATALOG;

export function getOfferDefinition(id: string): OfferDefinition {
  if (!(id in OFFER_CATALOG)) {
    throw new Error(`Unknown TableCards offer: ${id}`);
  }
  return OFFER_CATALOG[id as OfferId];
}

export type ExportAccessDenialCode =
  'card_limit_exceeded' | 'premium_design_required';

export interface ExportAccessDecision {
  readonly allowed: boolean;
  readonly denialCode?: ExportAccessDenialCode;
  readonly message?: string;
}

export function evaluateExportAccess(input: {
  readonly offerId: OfferId;
  readonly designId: DesignId;
  readonly guestCount: number;
}): ExportAccessDecision {
  const offer = getOfferDefinition(input.offerId);
  const design = getDesignDefinition(input.designId);
  if (input.guestCount > offer.numericLimits.maximum_cards_per_project) {
    return Object.freeze({
      allowed: false,
      denialCode: 'card_limit_exceeded',
      message: `${offer.name} supports up to ${offer.numericLimits.maximum_cards_per_project} cards per project.`,
    });
  }
  if (design.tier === 'premium' && offer.designTier === 'free') {
    return Object.freeze({
      allowed: false,
      denialCode: 'premium_design_required',
      message: `${design.name} requires a paid offer.`,
    });
  }
  return Object.freeze({ allowed: true });
}
