// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TableCardsBackend } from './backend';
import { useArtwork } from './use-artwork';

function fixture() {
  const resolve = vi.fn<(address: string) => Promise<string>>();
  const release = vi.fn();
  const backend = {
    resolveArtwork: resolve,
    releaseArtwork: release,
  } as unknown as TableCardsBackend;
  return { backend, resolve, release };
}
const address = '/v1/files/assets/asset_selected';
let visibility:
  | ((entries: Pick<IntersectionObserverEntry, 'isIntersecting'>[]) => void)
  | undefined;
const disconnect = vi.fn();
beforeEach(() => {
  visibility = undefined;
  disconnect.mockReset();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: typeof visibility) {
        visibility = callback;
      }
      observe() {
        /* browser supplies visibility later */
      }
      disconnect = disconnect;
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('private artwork leases in the browser', () => {
  it('hydrates only a visible thumbnail, releases it offscreen, and reacquires before returning a ready URL', async () => {
    const { backend, resolve, release } = fixture();
    resolve
      .mockResolvedValueOnce('blob:first')
      .mockResolvedValueOnce('blob:second');
    const { result } = renderHook(() =>
      useArtwork(backend, address, { lazy: true }),
    );
    act(() => result.current.ref(document.createElement('div')));
    expect(resolve).not.toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
    act(() => visibility?.([{ isIntersecting: true }]));
    await waitFor(() => expect(result.current.url).toBe('blob:first'));
    expect(resolve).toHaveBeenCalledWith(address);
    act(() => visibility?.([{ isIntersecting: false }]));
    expect(result.current.url).toBeUndefined();
    expect(release).toHaveBeenCalledWith(address, 'blob:first');
    act(() => visibility?.([{ isIntersecting: true }]));
    expect(result.current.state).toBe('loading');
    expect(result.current.url).toBeUndefined();
    await waitFor(() => expect(result.current.url).toBe('blob:second'));
    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('releases a delivery that completes after its thumbnail unmounts', async () => {
    const { backend, resolve, release } = fixture();
    let deliver: ((url: string) => void) | undefined;
    resolve.mockImplementationOnce(
      () =>
        new Promise((finish) => {
          deliver = finish;
        }),
    );
    const { result, unmount } = renderHook(() => useArtwork(backend, address));
    expect(result.current.state).toBe('loading');
    unmount();
    await act(async () => {
      deliver?.('blob:late');
    });
    expect(release).toHaveBeenCalledExactlyOnceWith(address, 'blob:late');
  });

  it('never returns another backend scope’s resolved URL while the same address is reacquiring', async () => {
    const first = fixture();
    const second = fixture();
    first.resolve.mockResolvedValue('blob:old-scope');
    let deliver: ((url: string) => void) | undefined;
    second.resolve.mockImplementationOnce(
      () =>
        new Promise((finish) => {
          deliver = finish;
        }),
    );
    const { result, rerender } = renderHook(
      ({ backend }) => useArtwork(backend, address),
      { initialProps: { backend: first.backend } },
    );
    await waitFor(() => expect(result.current.url).toBe('blob:old-scope'));
    rerender({ backend: second.backend });
    expect(first.release).toHaveBeenCalledWith(address, 'blob:old-scope');
    expect(result.current.state).toBe('loading');
    expect(result.current.url).toBeUndefined();
    await act(async () => {
      deliver?.('blob:new-scope');
    });
    expect(result.current.url).toBe('blob:new-scope');
  });

  it('balances StrictMode’s canceled first effect and active second lease', async () => {
    const { backend, resolve, release } = fixture();
    resolve
      .mockResolvedValueOnce('blob:canceled')
      .mockResolvedValueOnce('blob:active');
    const { result, unmount } = renderHook(() => useArtwork(backend, address), {
      reactStrictMode: true,
    });
    await waitFor(() => expect(result.current.url).toBe('blob:active'));
    expect(release).toHaveBeenCalledExactlyOnceWith(address, 'blob:canceled');
    unmount();
    expect(release).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenLastCalledWith(address, 'blob:active');
  });

  it('offers safe retry feedback and bypasses acquisition for local upload bytes', async () => {
    const { backend, resolve, release } = fixture();
    resolve
      .mockRejectedValueOnce(new Error('raw sensitive provider diagnostics'))
      .mockResolvedValueOnce('blob:retried');
    const { result, rerender } = renderHook(
      ({ requested }) => useArtwork(backend, requested),
      { initialProps: { requested: address } },
    );
    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.error).toBe(
      'Artwork could not be loaded. Try again.',
    );
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.url).toBe('blob:retried'));
    rerender({ requested: 'blob:local-upload' });
    expect(result.current.url).toBe('blob:local-upload');
    expect(resolve).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledWith(address, 'blob:retried');
  });
});
