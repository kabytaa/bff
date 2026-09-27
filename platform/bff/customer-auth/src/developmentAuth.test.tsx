import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CustomerDevelopmentAuthApp } from './developmentAuth';

describe('customer development auth page', () => {
  it('renders only the protected automation progress surface', () => {
    const markup = renderToStaticMarkup(
      <CustomerDevelopmentAuthApp
        bffSiteUrl="https://example.convex.site"
        grant="header.payload.signature"
        navigate={() => undefined}
        search="?environment=example-development&transaction=login_abcdefghijklmnop"
      />,
    );
    expect(markup).toContain('TOFLER DEVELOPMENT AUTOMATION');
    expect(markup).toContain('Completing the protected development sign-in');
    expect(markup).not.toContain('Continue with Google');
    expect(markup).not.toContain('user_');
  });
});
