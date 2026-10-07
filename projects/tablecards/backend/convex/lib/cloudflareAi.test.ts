// @vitest-environment node
import { encode } from 'fast-png';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cloudflareImages, validateReferenceImage } from './cloudflareAi';

function png(width: number, height: number) {
  return encode({
    width,
    height,
    channels: 4,
    data: new Uint8Array(width * height * 4).fill(255),
  });
}
beforeEach(() => {
  vi.stubEnv(
    'TABLECARDS_CLOUDFLARE_AI_URL',
    'https://provider.invalid/generate',
  );
  vi.stubEnv('TABLECARDS_CLOUDFLARE_AI_SECRET', 'synthetic_secret');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('Cloudflare generation contract', () => {
  it('accepts differently shaped logos and rejects oversized, false-MIME and truncated images', () => {
    const bytes = Uint8Array.from(png(300, 150)).buffer;
    expect(() =>
      validateReferenceImage({ bytes, mimeType: 'image/png' }),
    ).not.toThrow();
    for (const reference of [
      { bytes, mimeType: 'image/jpeg' as const },
      {
        bytes: Uint8Array.from(png(513, 100)).buffer,
        mimeType: 'image/png' as const,
      },
      { bytes: bytes.slice(0, 33), mimeType: 'image/png' as const },
    ])
      expect(() => validateReferenceImage(reference)).toThrow(
        /INVALID_INPUT|style reference/u,
      );
  });
  it('requests four real images with the explicitly selected reference and only the style prompt', async () => {
    const fetcher = vi.fn().mockImplementation(async () =>
      Response.json({
        image: Buffer.from(png(1344, 768)).toString('base64'),
      }),
    );
    vi.stubGlobal('fetch', fetcher);
    const reference = {
      bytes: Uint8Array.from(png(128, 64)).buffer,
      mimeType: 'image/png' as const,
    };
    const outputs = await cloudflareImages('Blue geometric corners', reference);
    expect(outputs).toHaveLength(4);
    expect(fetcher).toHaveBeenCalledTimes(4);
    for (const [url, request] of fetcher.mock.calls) {
      expect(url).toBe('https://provider.invalid/generate');
      expect(request.redirect).toBe('error');
      const input = JSON.parse(request.body);
      expect(input.prompt).toContain('Blue geometric corners');
      expect(input.prompt).toContain('image 0');
      expect(input.reference.base64).toBe(
        Buffer.from(reference.bytes).toString('base64'),
      );
      expect(input).not.toHaveProperty('guests');
      expect(input).not.toHaveProperty('accountId');
    }
  });
  it('fails rather than publishing wrong-sized or undecodable output', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () =>
        Response.json({
          image: Buffer.from(png(512, 512)).toString('base64'),
        }),
      ),
    );
    await expect(cloudflareImages('Watercolor corners')).rejects.toThrow(
      /PROVIDER_UNAVAILABLE|dimensions/u,
    );
  });
});
