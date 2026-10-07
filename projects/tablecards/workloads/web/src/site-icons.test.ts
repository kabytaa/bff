import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const webRoot = new URL('../', import.meta.url);

describe('TableCards site icons', () => {
  it('declares a branded vector favicon and self-hosted raster fallbacks', () => {
    const html = readFileSync(new URL('index.html', webRoot), 'utf8');
    expect(html).toContain(
      'rel="icon" type="image/svg+xml" href="/favicon.svg"',
    );
    expect(html).toContain('sizes="32x32" href="/favicon-32.png"');
    expect(html).toContain('rel="apple-touch-icon" sizes="180x180"');
    const svg = readFileSync(new URL('public/favicon.svg', webRoot), 'utf8');
    expect(svg).toContain('<title>TableCards</title>');
    expect(svg).toContain('fill="#c7583d"');
    expect(svg).not.toMatch(/<script|<image|https?:\/\/(?!www\.w3\.org)/u);
  });

  it.each([
    ['favicon-32.png', 32],
    ['apple-touch-icon.png', 180],
  ])('ships %s at its declared dimensions', (name, size) => {
    const png = readFileSync(new URL(`public/${name}`, webRoot));
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  });
});
