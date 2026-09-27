import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('customer auth hosting headers', () => {
  it('forbids caching, framing, referrers, and unapproved script origins', async () => {
    const headers = await readFile(
      resolve('platform/bff/customer-auth/public/_headers'),
      'utf8',
    );
    expect(headers).toContain('Cache-Control: no-store');
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain(
      "script-src 'self' https://accounts.google.com/gsi/client",
    );
    expect(headers).toContain('Referrer-Policy: no-referrer');
    expect(headers).toContain('X-Frame-Options: DENY');
    expect(headers).toContain('X-Robots-Tag: noindex, nofollow');
  });
});
