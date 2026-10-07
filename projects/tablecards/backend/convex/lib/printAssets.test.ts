// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readPrintAsset } from './printAssets';

const url = new URL('https://tablecards.invalid/fonts/pinned.ttf');
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('immutable print-asset reads', () => {
  it('recovers a transient network failure without changing the URL or redirect policy', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(
        new Response('pinned bytes', {
          headers: { 'content-type': 'font/ttf' },
        }),
      );
    vi.stubGlobal('fetch', fetcher);
    const result = readPrintAsset(url);
    await vi.runAllTimersAsync();
    expect(new TextDecoder().decode((await result).bytes)).toBe('pinned bytes');
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [requested, options] of fetcher.mock.calls) {
      expect(requested).toBe(url);
      expect(options.redirect).toBe('error');
      expect(options.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it('retries a broken response body before publishing any bytes', async () => {
    const broken = new Response('incomplete');
    vi.spyOn(broken, 'arrayBuffer').mockRejectedValue(
      new TypeError('fetch failed'),
    );
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(broken)
      .mockResolvedValueOnce(new Response('complete'));
    vi.stubGlobal('fetch', fetcher);
    const result = readPrintAsset(url);
    await vi.runAllTimersAsync();
    expect(new TextDecoder().decode((await result).bytes)).toBe('complete');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('retries temporary service responses but stops after three reads', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(
        new Response('art', {
          headers: { 'content-type': 'image/jpeg; charset=binary' },
        }),
      );
    vi.stubGlobal('fetch', fetcher);
    const result = readPrintAsset(url, { accept: 'image/jpeg' });
    await vi.runAllTimersAsync();
    expect((await result).contentType).toBe('image/jpeg');
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[2]?.[1].headers).toEqual({
      accept: 'image/jpeg',
    });
  });

  it.each([403, 404, 302])(
    'does not retry denial/missing/redirect status %s',
    async (status) => {
      const fetcher = vi.fn().mockResolvedValue(new Response('', { status }));
      vi.stubGlobal('fetch', fetcher);
      await expect(readPrintAsset(url)).rejects.toThrow(
        /print asset is unavailable/u,
      );
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it('preserves the last network error after the bounded retry budget', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetcher);
    const result = expect(readPrintAsset(url)).rejects.toThrow('fetch failed');
    await vi.runAllTimersAsync();
    await result;
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('fails closed when temporary responses never recover', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(new Response('', { status: 503 })),
        ),
    );
    const result = expect(readPrintAsset(url)).rejects.toThrow(
      /print asset is unavailable/u,
    );
    await vi.runAllTimersAsync();
    await result;
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
