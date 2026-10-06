// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Component } from './designs-page';

const mocks = vi.hoisted(() => ({
  backend: {
    getCurrentAccess: vi.fn(),
    listAssets: vi.fn(),
    listPresets: vi.fn(),
    getPendingAiBatch: vi.fn(),
    generateAi: vi.fn(),
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
  mocks.backend.getPendingAiBatch.mockResolvedValue(null);
});
afterEach(cleanup);
function mount() {
  const router = createMemoryRouter([{ path: '*', element: <Component /> }]);
  return render(<RouterProvider router={router} />);
}

describe('design artwork and safe AI feedback', () => {
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
});
