import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CustomerAuthApp } from './app';

describe('customer auth page', () => {
  it('renders a provider-neutral secure loading shell before metadata arrives', () => {
    const markup = renderToStaticMarkup(
      <CustomerAuthApp
        bffSiteUrl="https://example.convex.site"
        navigate={() => undefined}
        search="?environment=example-development&transaction=login_abcdefghijklmnop"
      />,
    );
    expect(markup).toContain('Continue to your app');
    expect(markup).toContain('Checking your sign-in request');
    expect(markup).not.toContain('apps.googleusercontent.com');
  });
});
