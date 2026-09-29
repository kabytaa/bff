import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CheckoutApp } from './checkout';

describe('shared checkout page', () => {
  it('renders a safe shared loading shell before checkout metadata arrives', () => {
    const markup = renderToStaticMarkup(
      <CheckoutApp
        bffSiteUrl="https://quirky-stoat-199.convex.site"
        search="?environment=tablecards-development&checkout=checkout_reference_000001"
        navigate={() => undefined}
        fetchImplementation={async () => new Response('{}')}
      />,
    );
    expect(markup).toContain('TOFLER TEST CHECKOUT');
    expect(markup).toContain('Loading your checkout');
    expect(markup).not.toContain('Paddle');
  });
});
