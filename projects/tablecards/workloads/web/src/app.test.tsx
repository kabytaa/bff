import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PricingSection, StaticNotice } from './app';

describe('TableCards public product copy', () => {
  it('renders the accepted pilot offers without implying physical fulfillment', () => {
    const markup = renderToStaticMarkup(<PricingSection />);

    expect(markup).toContain('Free');
    expect(markup).toContain('Event Pass');
    expect(markup).toContain('$5');
    expect(markup).toContain('$9');
    expect(markup).toContain('$19');
    expect(markup).toContain('downloadable PDF');
    expect(markup).toContain('do not print or ship');
  });

  it('exposes safe status text as visible UI', () => {
    const markup = renderToStaticMarkup(
      <StaticNotice>Project saved without exposing guest data.</StaticNotice>,
    );
    expect(markup).toContain('Project saved without exposing guest data.');
    expect(markup).not.toContain('token');
  });
});
