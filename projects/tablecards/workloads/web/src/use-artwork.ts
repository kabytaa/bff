import { useCallback, useEffect, useState } from 'react';

import type { TableCardsBackend } from './backend';

type ArtworkState = 'idle' | 'loading' | 'ready' | 'error';
type Resolution = {
  backend: TableCardsBackend | null;
  attempt: number;
  address: string | null;
  url?: string;
  state: ArtworkState;
  error?: string;
};

/** Selected artwork resolves immediately. Thumbnails attach ref and opt into
 * lazy visibility; leaving the viewport releases their active byte lease. */
export function useArtwork(
  backend: TableCardsBackend | null,
  address: string | null | undefined,
  { lazy = false }: { readonly lazy?: boolean } = {},
) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [resolution, setResolution] = useState<Resolution>({
    backend: null,
    attempt: 0,
    address: null,
    state: 'idle',
  });
  const ref = useCallback((value: HTMLElement | null) => setElement(value), []);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const requested = address ?? null;
  const local = requested?.startsWith('blob:') === true;
  const enabled = !lazy || visible;

  useEffect(() => {
    if (!lazy || !element) {
      setVisible(false);
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible(entries.some((entry) => entry.isIntersecting));
      },
      { rootMargin: '160px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, lazy]);

  useEffect(() => {
    if (!backend || !requested || !enabled || local) return;
    let current = true;
    let delivered: string | undefined;
    setResolution({ backend, attempt, address: requested, state: 'loading' });
    void backend
      .resolveArtwork(requested)
      .then((url) => {
        if (!current) {
          backend.releaseArtwork(requested, url);
          return;
        }
        delivered = url;
        setResolution({
          backend,
          attempt,
          address: requested,
          state: 'ready',
          url,
        });
      })
      .catch(() => {
        if (current)
          setResolution({
            backend,
            attempt,
            address: requested,
            state: 'error',
            error: 'Artwork could not be loaded. Try again.',
          });
      });
    return () => {
      current = false;
      if (delivered) backend.releaseArtwork(requested, delivered);
      setResolution((previous) =>
        previous.backend === backend &&
        previous.address === requested &&
        previous.attempt === attempt
          ? { backend: null, attempt: 0, address: null, state: 'idle' }
          : previous,
      );
    };
  }, [backend, requested, enabled, local, attempt]);

  if (!requested || !enabled)
    return { url: undefined, state: 'idle' as const, ref, retry };
  if (local) return { url: requested, state: 'ready' as const, ref, retry };
  if (
    resolution.backend !== backend ||
    resolution.address !== requested ||
    resolution.attempt !== attempt
  )
    return { url: undefined, state: 'loading' as const, ref, retry };
  return {
    url: resolution.url,
    state: resolution.state,
    error: resolution.error,
    ref,
    retry,
  };
}
