import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { OFFER_CATALOG } from '@tablecards/core';
import { StaticNotice } from './app';

describe('TableCards public product copy', () => {
  it('keeps the accepted pilot offers in the authoritative catalog', () => {
    expect(Object.values(OFFER_CATALOG).map((offer) => offer.name)).toEqual([
      'Free',
      'Event Pass',
      'Planner Pro',
      'Studio',
    ]);
    expect(OFFER_CATALOG.event_pass.priceUsd).toBe(5);
    expect(OFFER_CATALOG.planner_pro.priceUsd).toBe(9);
    expect(OFFER_CATALOG.studio.priceUsd).toBe(19);
  });

  it('exposes safe status text as visible UI', () => {
    const markup = renderToStaticMarkup(
      <StaticNotice>Project saved without exposing guest data.</StaticNotice>,
    );
    expect(markup).toContain('Project saved without exposing guest data.');
    expect(markup).not.toContain('token');
  });
});
