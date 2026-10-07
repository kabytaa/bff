// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConvexError } from 'convex/values';

import { Component } from './designs-page';

const mocks = vi.hoisted(() => ({
  backend: {
    getCurrentAccess: vi.fn(),
    listAssets: vi.fn(),
    listPresets: vi.fn(),
    listAssetPage: vi.fn(),
    listPresetPage: vi.fn(),
    createPreset: vi.fn(),
    getPendingAiBatch: vi.fn(),
    generateAi: vi.fn(),
    resolveArtwork: vi.fn(),
    releaseArtwork: vi.fn(),
  },
}));
vi.mock('@tofler/bff-auth/react', () => ({
  useBffAuth: () => ({ snapshot: { generation: 1 } }),
}));
vi.mock('../use-tablecards-backend', () => ({
  useTableCardsBackend: () => mocks.backend,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.backend.getCurrentAccess.mockResolvedValue({
    offerKey: 'planner_pro',
    premiumDesignsEnabled: true,
    artworkUploadEnabled: true,
    reusablePresetsEnabled: true,
    aiBackgroundBatchesRemaining: 2,
  });
  mocks.backend.listAssets.mockResolvedValue([]);
  mocks.backend.listPresets.mockResolvedValue([]);
  mocks.backend.listAssetPage.mockImplementation(async () => ({
    items: await mocks.backend.listAssets(),
    done: true,
    cursor: '',
  }));
  mocks.backend.listPresetPage.mockImplementation(async () => ({
    items: await mocks.backend.listPresets(),
    done: true,
    cursor: '',
  }));
  mocks.backend.createPreset.mockResolvedValue('created-preset');
  mocks.backend.getPendingAiBatch.mockResolvedValue(null);
  mocks.backend.resolveArtwork.mockResolvedValue('blob:resolved-artwork');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount() {
  const router = createMemoryRouter([{ path: '*', element: <Component /> }]);
  return render(<RouterProvider router={router} />);
}

function asset(id: string) {
  return {
    id,
    source: 'uploaded' as const,
    url: `/v1/files/assets/${id.replaceAll('-', '_')}`,
    reusable: true,
    createdAt: 1,
  };
}
function preset(id: string) {
  return {
    id,
    assetId: `art-${id}`,
    assetSource: 'uploaded' as const,
    artworkUrl: `/v1/files/assets/art_${id.replaceAll('-', '_')}`,
    displayName: `Preset ${id}`,
    nameColor: '#123456',
    nameFont: 'serif' as const,
    namePosition: 'top' as const,
    nameSize: 'small' as const,
    updatedAt: 1,
  };
}

describe('complete paginated design library', () => {
  it('does not invent an unfinished batch after the daily safety cap rejects the input', async () => {
    mocks.backend.generateAi.mockRejectedValue(
      new ConvexError({
        code: 'LIMIT_EXCEEDED',
        message:
          'The daily AI safety limit has been reached. Try tomorrow; your remaining batches are unchanged.',
      }),
    );
    mount();
    fireEvent.click(
      await screen.findByRole('button', { name: /Generate four choices/ }),
    );
    expect((await screen.findByRole('alert')).textContent).toContain(
      'daily AI safety limit',
    );
    expect(
      screen.queryByRole('button', { name: 'Retry this background batch' }),
    ).toBeNull();
    expect(
      screen
        .getByLabelText('AI background description')
        .hasAttribute('disabled'),
    ).toBe(false);
  });

  it('loads a second artwork page, deduplicates it, and retains the selected older asset after a mutation refresh', async () => {
    const first = Array.from({ length: 24 }, (_, index) =>
      asset(`asset-${index}`),
    );
    let finishNext!: (page: {
      items: typeof first;
      done: boolean;
      cursor: string;
    }) => void;
    mocks.backend.listAssetPage.mockImplementation(async (cursor) =>
      cursor
        ? await new Promise((resolve) => {
            finishNext = resolve;
          })
        : { items: first, done: false, cursor: 'assets-next' },
    );
    mount();
    const more = await screen.findByRole('button', {
      name: 'Load more artwork',
    });
    expect(document.querySelectorAll('.asset-grid > article')).toHaveLength(24);
    fireEvent.click(more);
    expect(
      screen
        .getByRole('button', { name: 'Loading more artwork…' })
        .hasAttribute('disabled'),
    ).toBe(true);
    await act(async () =>
      finishNext({
        items: [first[0]!, asset('older-asset')],
        done: true,
        cursor: 'assets-end',
      }),
    );
    await screen.findByText('All artwork loaded.');
    expect(document.querySelectorAll('.asset-grid > article')).toHaveLength(25);
    expect(mocks.backend.listAssetPage).toHaveBeenLastCalledWith('assets-next');
    expect(
      screen.queryByRole('button', { name: 'Load more artwork' }),
    ).toBeNull();
    fireEvent.change(screen.getByLabelText('Artwork'), {
      target: { value: 'older-asset' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Save reusable preset' }),
    );
    await screen.findByText('Reusable preset saved.');
    expect(mocks.backend.createPreset.mock.calls[0]?.[0]).toBe('older-asset');
    expect((screen.getByLabelText('Artwork') as HTMLSelectElement).value).toBe(
      'older-asset',
    );
    expect(document.querySelectorAll('.asset-grid > article')).toHaveLength(25);
    expect(
      screen.getByRole('button', { name: 'Load more artwork' }),
    ).toBeTruthy();
  });
  it('loads older reusable presets through their own cursor and identifies the end', async () => {
    const first = Array.from({ length: 24 }, (_, index) =>
      preset(String(index)),
    );
    mocks.backend.listPresetPage
      .mockResolvedValueOnce({
        items: first,
        done: false,
        cursor: 'presets-next',
      })
      .mockResolvedValueOnce({
        items: [first[0], preset('older')],
        done: true,
        cursor: 'presets-end',
      });
    mount();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Load more presets' }),
    );
    await screen.findByText('Preset older');
    expect(document.querySelectorAll('.preset-grid > article')).toHaveLength(
      25,
    );
    expect(mocks.backend.listPresetPage).toHaveBeenLastCalledWith(
      'presets-next',
    );
    expect(screen.getByText('All presets loaded.')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Load more presets' }),
    ).toBeNull();
  });
  it('ignores an old next-page response after a mutation has refreshed the library', async () => {
    let finishOldPage!: (page: {
      items: ReturnType<typeof asset>[];
      done: boolean;
      cursor: string;
    }) => void;
    mocks.backend.listAssetPage.mockImplementation(async (cursor) =>
      cursor
        ? await new Promise((resolve) => {
            finishOldPage = resolve;
          })
        : { items: [asset('current')], done: false, cursor: 'next' },
    );
    mount();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Load more artwork' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Save reusable preset' }),
    );
    await screen.findByText('Reusable preset saved.');
    await act(async () =>
      finishOldPage({ items: [asset('stale')], done: true, cursor: 'old-end' }),
    );
    expect(document.querySelectorAll('.asset-grid > article')).toHaveLength(1);
    expect(document.querySelector('option[value="stale"]')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Load more artwork' }),
    ).toBeTruthy();
    expect(mocks.backend.resolveArtwork).not.toHaveBeenCalledWith(
      asset('stale').url,
    );
  });
  it('preserves loaded records and retries only the failed artwork cursor', async () => {
    mocks.backend.listAssetPage
      .mockResolvedValueOnce({
        items: [asset('first')],
        done: false,
        cursor: 'artwork-next',
      })
      .mockRejectedValueOnce(
        new Error('[CONVEX Q(assets:page)] Request ID: private Server Error'),
      )
      .mockResolvedValueOnce({
        items: [asset('second')],
        done: true,
        cursor: 'artwork-end',
      });
    mocks.backend.listPresetPage.mockResolvedValue({
      items: [preset('available')],
      done: true,
      cursor: 'presets-end',
    });
    mount();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Load more artwork' }),
    );
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(
      'More artwork could not be loaded. Please retry this page.',
    );
    expect(alert.textContent).not.toMatch(/CONVEX|Request ID/);
    expect(document.querySelectorAll('.asset-grid > article')).toHaveLength(1);
    expect(screen.getByText('Preset available')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry artwork page' }));
    await screen.findByText('All artwork loaded.');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mocks.backend.listAssetPage.mock.calls.slice(1)).toEqual([
      ['artwork-next'],
      ['artwork-next'],
    ]);
    expect(mocks.backend.listPresetPage).toHaveBeenCalledTimes(1);
  });
  it('recovers an initial metadata page error without claiming that the library is empty', async () => {
    mocks.backend.listAssetPage
      .mockRejectedValueOnce(new Error('[CONVEX Q(assets:page)] Server Error'))
      .mockResolvedValueOnce({
        items: [asset('recovered')],
        done: true,
        cursor: 'end',
      });
    mount();
    const retry = await screen.findByRole('button', {
      name: 'Retry artwork page',
    });
    expect(screen.queryByText(/No artwork yet/)).toBeNull();
    fireEvent.click(retry);
    await screen.findByText('All artwork loaded.');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.querySelectorAll('.asset-grid > article')).toHaveLength(1);
  });
});

describe('design artwork and safe AI feedback', () => {
  it('resolves only visible library thumbnails and never renders private descriptors as image URLs', async () => {
    const observations: {
      element: Element;
      callback: IntersectionObserverCallback;
    }[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(private readonly callback: IntersectionObserverCallback) {}
        observe(element: Element) {
          observations.push({ element, callback: this.callback });
        }
        unobserve() {}
        disconnect() {}
      },
    );
    mocks.backend.listAssets.mockResolvedValue(
      Array.from({ length: 200 }, (_, index) => ({
        id: `asset-${index}`,
        source: 'uploaded',
        url: `/api/private-artwork/asset-${index}`,
        reusable: true,
        createdAt: 1,
      })),
    );
    const { container } = mount();
    await screen.findByRole('button', { name: /Generate four choices/ });
    await waitFor(() => expect(observations).toHaveLength(200));
    expect(mocks.backend.resolveArtwork).not.toHaveBeenCalled();
    const first = observations[0]!;
    await act(async () =>
      first.callback(
        [
          {
            target: first.element,
            isIntersecting: true,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      ),
    );
    await waitFor(() =>
      expect(mocks.backend.resolveArtwork).toHaveBeenCalledTimes(1),
    );
    expect(mocks.backend.resolveArtwork).toHaveBeenCalledWith(
      '/api/private-artwork/asset-0',
    );
    expect(
      container.querySelector('.asset-preview')?.getAttribute('style'),
    ).toContain('blob:resolved-artwork');
    expect(
      Array.from(container.querySelectorAll('[style]')).some((element) =>
        element.getAttribute('style')?.includes('/api/private-artwork/'),
      ),
    ).toBe(false);
    await act(async () =>
      first.callback(
        [
          {
            target: first.element,
            isIntersecting: false,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      ),
    );
    await waitFor(() =>
      expect(mocks.backend.releaseArtwork).toHaveBeenCalledWith(
        '/api/private-artwork/asset-0',
        'blob:resolved-artwork',
      ),
    );
  });
  it('renders six distinct catalog artwork sources rather than blank swatches', async () => {
    const { container } = mount();
    await screen.findByRole('button', { name: /Generate four choices/ });
    const sources = Array.from(
      container.querySelectorAll('.design-library-card svg image'),
    ).map((element) => element.getAttribute('href'));
    expect(sources).toHaveLength(6);
    expect(new Set(sources).size).toBe(6);
    expect(
      sources.every((source) => source?.startsWith('/designs/predefined/v2/')),
    ).toBe(true);
  });
  it('presents an AI failure as an alert without exposing the framework envelope', async () => {
    mocks.backend.generateAi.mockRejectedValue(
      new Error(
        '[CONVEX A(ai:generate)] [Request ID: secret] Server Error Uncaught ConvexError at ai.ts:12',
      ),
    );
    mount();
    fireEvent.click(
      await screen.findByRole('button', { name: /Generate four choices/ }),
    );
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(
      'The design action could not be completed. Please try again.',
    );
    expect(alert.textContent).not.toMatch(/CONVEX|Request ID|ai\.ts/);
    expect(
      (
        screen.getByLabelText(
          'AI background description',
        ) as HTMLTextAreaElement
      ).maxLength,
    ).toBe(400);
  });
  it('recovers an unfinished original batch on mount when its unit is already reserved', async () => {
    mocks.backend.getCurrentAccess.mockResolvedValue({
      offerKey: 'planner_pro',
      artworkUploadEnabled: true,
      reusablePresetsEnabled: true,
      aiBackgroundBatchesRemaining: 0,
    });
    mocks.backend.getPendingAiBatch.mockResolvedValue({
      batchId: 'pending-batch',
      prompt: 'Original saved prompt',
      idempotencyKey: 'original-key',
    });
    mocks.backend.generateAi.mockResolvedValue({
      batchId: 'pending-batch',
      status: 'ready',
      assets: [{ id: 'asset-one', url: 'blob:asset-one' }],
    });
    mount();
    const retry = await screen.findByRole('button', {
      name: 'Retry this background batch',
    });
    await waitFor(() => expect(retry.hasAttribute('disabled')).toBe(false));
    expect(
      (
        screen.getByLabelText(
          'AI background description',
        ) as HTMLTextAreaElement
      ).value,
    ).toBe('Original saved prompt');
    fireEvent.click(retry);
    await screen.findByText('1 background choices are ready.');
    expect(mocks.backend.generateAi).toHaveBeenCalledWith({
      prompt: 'Original saved prompt',
      idempotencyKey: 'original-key',
    });
  });
  it('allows a revised prompt and new operation after a definitive provider failure', async () => {
    mocks.backend.generateAi
      .mockResolvedValueOnce({
        batchId: 'failed-batch',
        status: 'failed',
        errorMessage: 'PROVIDER_UNAVAILABLE',
      })
      .mockResolvedValueOnce({
        batchId: 'new-batch',
        status: 'ready',
        assets: [{ id: 'art-one', url: 'blob:art-one' }],
      });
    mount();
    const generate = await screen.findByRole('button', {
      name: /Generate four choices/,
    });
    const prompt = screen.getByLabelText('AI background description');
    fireEvent.change(prompt, { target: { value: '[fail] first description' } });
    fireEvent.click(generate);
    expect((await screen.findByRole('alert')).textContent).toContain(
      'This background batch failed. Edit the description and try again.',
    );
    await waitFor(() => expect(prompt.hasAttribute('disabled')).toBe(false));
    expect(
      screen.queryByRole('button', { name: 'Retry this background batch' }),
    ).toBeNull();
    fireEvent.change(prompt, {
      target: { value: 'Successful revised description' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Generate four choices/ }),
    );
    await screen.findByText('1 background choices are ready.');
    const first = mocks.backend.generateAi.mock.calls[0]?.[0];
    const second = mocks.backend.generateAi.mock.calls[1]?.[0];
    expect(second.prompt).toBe('Successful revised description');
    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
  });
  it('requires a fresh description of 3 to 400 trimmed characters without creating an operation', async () => {
    mount();
    await screen.findByRole('button', { name: /Generate four choices/ });
    const prompt = screen.getByLabelText('AI background description');
    for (const invalid of ['   ', ' ab ', 'x'.repeat(401)]) {
      fireEvent.change(prompt, { target: { value: invalid } });
      expect(
        screen
          .getByRole('button', { name: /Generate four choices/ })
          .hasAttribute('disabled'),
      ).toBe(true);
    }
    expect(mocks.backend.generateAi).not.toHaveBeenCalled();
    expect(prompt.hasAttribute('disabled')).toBe(false);
    fireEvent.change(prompt, { target: { value: '  oak  ' } });
    expect(
      screen
        .getByRole('button', { name: /Generate four choices/ })
        .hasAttribute('disabled'),
    ).toBe(false);
  });
  it('preserves an uncertain operation when a subsequent pending query returns nothing', async () => {
    mocks.backend.generateAi
      .mockRejectedValueOnce(new Error('Response interrupted'))
      .mockResolvedValueOnce({
        batchId: 'recovered-batch',
        status: 'ready',
        assets: [{ id: 'art-one', url: 'blob:art-one' }],
      });
    mount();
    fireEvent.click(
      await screen.findByRole('button', { name: /Generate four choices/ }),
    );
    const retry = await screen.findByRole('button', {
      name: 'Retry this background batch',
    });
    await waitFor(() => expect(retry.hasAttribute('disabled')).toBe(false));
    expect(
      screen
        .getByLabelText('AI background description')
        .hasAttribute('disabled'),
    ).toBe(true);
    fireEvent.click(retry);
    await screen.findByText('1 background choices are ready.');
    expect(mocks.backend.generateAi.mock.calls[1]?.[0]).toEqual(
      mocks.backend.generateAi.mock.calls[0]?.[0],
    );
  });
});
