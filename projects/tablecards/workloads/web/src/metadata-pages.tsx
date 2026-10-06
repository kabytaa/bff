import { useCallback, useEffect, useRef, useState } from 'react';

import type { MetadataPage } from './backend';
import { safeProductMessage } from './product-error';

interface PageState {
  readonly cursor: string | null;
  readonly done: boolean;
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly error: string | null;
}
const initialState: PageState = {
  cursor: null,
  done: false,
  loading: true,
  loadingMore: false,
  error: null,
};

function mergeItems<T extends { readonly id: string }>(
  previous: readonly T[],
  incoming: readonly T[],
): readonly T[] {
  const byId = new Map(previous.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()];
}

/** Account-scoped metadata pages only. Artwork bytes remain owned by useArtwork. */
export function useMetadataPages<T extends { readonly id: string }>(
  loadPage: (cursor?: string | null) => Promise<MetadataPage<T>>,
  label: 'artwork' | 'presets' | 'projects',
  retainId?: string,
) {
  const [items, setItems] = useState<readonly T[]>([]);
  const [page, setPage] = useState<PageState>(initialState);
  const generation = useRef(0);
  const morePending = useRef(false);
  const retainedId = useRef(retainId);
  retainedId.current = retainId;
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [loadPage],
  );

  const clear = useCallback(() => {
    generation.current += 1;
    morePending.current = false;
    setItems([]);
    setPage({ ...initialState, loading: false, done: true });
  }, []);

  const refresh = useCallback(async () => {
    const sequence = ++generation.current;
    morePending.current = false;
    setPage(initialState);
    try {
      const result = await loadPage();
      if (sequence !== generation.current) return null;
      setItems((previous) => {
        const retained = previous.find(
          (item) => item.id === retainedId.current,
        );
        return mergeItems(
          result.items,
          retained && !result.items.some((item) => item.id === retained.id)
            ? [retained]
            : [],
        );
      });
      setPage({
        cursor: result.cursor,
        done: result.done,
        loading: false,
        loadingMore: false,
        error: null,
      });
      return result;
    } catch (error) {
      if (sequence === generation.current)
        setPage({
          ...initialState,
          loading: false,
          error: safeProductMessage(
            error,
            `The ${label} page could not be loaded. Please retry.`,
          ),
        });
      return null;
    }
  }, [label, loadPage]);

  const loadMore = useCallback(async () => {
    if (page.loading || page.loadingMore || page.done || morePending.current)
      return;
    if (page.cursor === null) {
      await refresh();
      return;
    }
    const sequence = generation.current;
    morePending.current = true;
    setPage((current) => ({ ...current, loadingMore: true, error: null }));
    try {
      const result = await loadPage(page.cursor);
      if (sequence !== generation.current) return;
      setItems((previous) => mergeItems(previous, result.items));
      setPage({
        cursor: result.cursor,
        done: result.done,
        loading: false,
        loadingMore: false,
        error: null,
      });
    } catch (error) {
      if (sequence === generation.current)
        setPage((current) => ({
          ...current,
          loadingMore: false,
          error: safeProductMessage(
            error,
            `More ${label} could not be loaded. Please retry this page.`,
          ),
        }));
    } finally {
      if (sequence === generation.current) morePending.current = false;
    }
  }, [
    label,
    loadPage,
    page.cursor,
    page.done,
    page.loading,
    page.loadingMore,
    refresh,
  ]);

  return { items, page, refresh, clear, loadMore };
}

export function MetadataPageControls({
  label,
  page,
  onLoadMore,
  disabled = false,
  showEnd = false,
}: {
  readonly label: 'artwork' | 'presets' | 'projects';
  readonly page: PageState;
  readonly onLoadMore: () => Promise<unknown>;
  readonly disabled?: boolean;
  readonly showEnd?: boolean;
}) {
  if (page.loading) return <p role="status">Loading {label}…</p>;
  return (
    <div className="inline-actions">
      {page.error ? (
        <p className="notice error" role="alert">
          {page.error}
        </p>
      ) : null}
      {!page.done ? (
        <button
          className="secondary-button"
          type="button"
          disabled={disabled || page.loadingMore}
          onClick={() => void onLoadMore()}
        >
          {page.loadingMore
            ? `Loading more ${label}…`
            : page.error
              ? `Retry ${label} page`
              : `Load more ${label}`}
        </button>
      ) : showEnd ? (
        <p className="muted" role="status">
          All {label} loaded.
        </p>
      ) : null}
    </div>
  );
}
