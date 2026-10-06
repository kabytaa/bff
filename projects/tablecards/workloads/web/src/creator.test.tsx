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

import { Creator, guestRowsToText, SheetPreview } from './app';
import { createTableCardsDraftStore } from './draft';

const mocks = vi.hoisted(() => ({
  auth: {
    state: {
      status: 'authenticated',
      accountId: 'account-one',
      customer: { accounts: [] },
    },
    snapshot: { generation: 1 },
    client: { bootstrap: vi.fn(), getSignInUrl: vi.fn() },
  },
  backend: {
    getCurrentAccess: vi.fn(),
    listPresets: vi.fn(),
    listAssets: vi.fn(),
    listProjects: vi.fn(),
    getProject: vi.fn(),
    getLatestExport: vi.fn(),
    saveProject: vi.fn(),
    requestExport: vi.fn(),
    getExport: vi.fn(),
    generateAi: vi.fn(),
    getPendingAiBatch: vi.fn(),
  },
}));
vi.mock('@tofler/bff-auth/react', () => ({ useBffAuth: () => mocks.auth }));
vi.mock('./use-tablecards-backend', () => ({
  useTableCardsBackend: () => mocks.backend,
}));

const originalProject = {
  id: 'project-one',
  title: 'Original event',
  guests: [{ name: 'Ada Original' }],
  guestCount: 1,
  designKind: 'predefined',
  designId: 'minimal-ivory',
  updatedAt: 1,
  state: 'active',
};
function mount(projectId: string | null = 'project-one', onSaved = vi.fn()) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <Creator
            developmentControlsEnabled
            initialProjectId={projectId ?? undefined}
            onProjectSaved={onSaved}
          />
        ),
      },
    ],
    { initialEntries: [projectId ? `/projects/${projectId}` : '/create'] },
  );
  render(<RouterProvider router={router} />);
  return { router, onSaved };
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  mocks.backend.getCurrentAccess.mockResolvedValue({
    offerKey: 'event_pass',
    offerName: 'Event Pass',
    maxActiveProjects: 1,
    maxCardsPerProject: 500,
    premiumDesignsEnabled: true,
    artworkUploadEnabled: true,
    aiBackgroundBatchesRemaining: 2,
  });
  mocks.backend.getPendingAiBatch.mockResolvedValue(null);
  mocks.backend.listPresets.mockResolvedValue([]);
  mocks.backend.listAssets.mockResolvedValue([]);
  mocks.backend.listProjects.mockResolvedValue([originalProject]);
  mocks.backend.getProject.mockResolvedValue(originalProject);
  mocks.backend.getLatestExport.mockResolvedValue({
    status: 'ready',
    storageUrl: 'blob:previous-pdf',
  });
  mocks.backend.saveProject.mockImplementation(async (input) => ({
    ...originalProject,
    title: input.title,
    guestCount: input.guests.length,
  }));
  mocks.backend.requestExport.mockResolvedValue({ exportId: 'export-current' });
  mocks.backend.getExport.mockResolvedValue({
    status: 'ready',
    storageUrl: 'blob:current-pdf',
  });
});
afterEach(cleanup);

describe('current creator input and export', () => {
  it('saves newly typed input before exporting and hides the previous download while dirty', async () => {
    mount();
    await screen.findByDisplayValue('Original event');
    await screen.findByRole('link', { name: 'Download PDF' });
    fireEvent.change(screen.getByLabelText(/Paste one name/), {
      target: { value: 'Zelda Corrected\nNew Guest' },
    });
    fireEvent.change(screen.getByLabelText('Event name'), {
      target: { value: 'Changed event' },
    });
    expect(screen.queryByRole('link', { name: 'Download PDF' })).toBeNull();
    expect(screen.getByText(/Unsaved changes/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Create print-ready PDF' }),
    );
    await screen.findByRole('link', { name: 'Download PDF' });
    expect(mocks.backend.saveProject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-one',
        title: 'Changed event',
        guests: [{ name: 'Zelda Corrected' }, { name: 'New Guest' }],
      }),
    );
    expect(mocks.backend.saveProject.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.backend.requestExport.mock.invocationCallOrder[0]!,
    );
    expect(
      screen.getByRole('link', { name: 'Download PDF' }).getAttribute('href'),
    ).toBe('blob:current-pdf');
    expect(screen.getByText('Saved to this workspace')).toBeTruthy();
  });

  it('normalizes current input on Save without requiring Preview names', async () => {
    mount();
    await screen.findByDisplayValue('Original event');
    fireEvent.change(screen.getByLabelText(/Paste one name/), {
      target: { value: '  New Name  \nSecond Name' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }));
    await waitFor(() => expect(mocks.backend.saveProject).toHaveBeenCalled());
    expect(mocks.backend.saveProject.mock.calls[0]?.[0].guests).toEqual([
      { name: 'New Name' },
      { name: 'Second Name' },
    ]);
  });

  it('does not advance or reuse old guests when mapped replacement input is invalid', async () => {
    mount();
    await screen.findByDisplayValue('Original event');
    fireEvent.change(screen.getByLabelText(/Paste one name/), {
      target: { value: `Name\tTable\n${'A'.repeat(121)}\t2` },
    });
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Review spreadsheet columns' })[0]!,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Use these columns' }));
    expect(
      document.querySelector('#creator')?.getAttribute('data-active-step'),
    ).toBe('1');
    expect(
      screen.getByRole('button', { name: 'Use these columns' }),
    ).toBeTruthy();
    expect(screen.getByRole('alert', { name: 'Import issues' })).toBeTruthy();
    expect(mocks.backend.saveProject).not.toHaveBeenCalled();
  });

  it('shows actionable print-fit errors and prevents save/export for non-fitting text', async () => {
    mount();
    await screen.findByDisplayValue('Original event');
    fireEvent.change(screen.getByLabelText(/Paste one name/), {
      target: { value: 'W'.repeat(120) },
    });
    expect(
      screen
        .getByRole('button', { name: 'Save project' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Create print-ready PDF' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.getByRole('alert').textContent).toMatch(
      /Guest 1 name cannot fit/,
    );
    expect(
      screen.queryByText(
        'Add at least one valid guest to see every sheet before signing in.',
      ),
    ).toBeNull();
  });

  it('puts a first export onto the saved-project destination after the PDF is ready', async () => {
    mocks.backend.listProjects.mockResolvedValue([]);
    const { onSaved } = mount(null);
    fireEvent.change(screen.getByLabelText(/Paste one name/), {
      target: { value: 'First Guest' },
    });
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: 'Create print-ready PDF' })
          .hasAttribute('disabled'),
      ).toBe(false),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Create print-ready PDF' }),
    );
    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'project-one',
          guests: [{ name: 'First Guest' }],
        }),
      ),
    );
    expect(mocks.backend.getExport.mock.invocationCallOrder[0]).toBeLessThan(
      onSaved.mock.invocationCallOrder[0]!,
    );
  });

  it('restores raw input, styling and the active step without an expiring blob URL', async () => {
    createTableCardsDraftStore(
      sessionStorage,
      Date.now,
      'tablecards:protected-draft:v1:account-one:new',
    ).write({
      title: 'Retained draft',
      designId: 'garden-sage',
      layoutId: 'landscape_6',
      guests: [{ name: 'Draft Guest' }],
      pastedText: 'Draft Guest\nUnreviewed Guest',
      validatedText: 'Draft Guest',
      activeStep: 2,
      customDesign: {
        kind: 'uploaded',
        reference: 'asset-one',
        label: 'Event art',
        nameStyle: {
          color: '#123456',
          position: 'top',
          font: 'serif',
          size: 'small',
        },
      },
    });
    mount(null);
    expect(screen.getByLabelText('Event name').getAttribute('value')).toBe(
      'Retained draft',
    );
    expect(
      (screen.getByLabelText(/Paste one name/) as HTMLTextAreaElement).value,
    ).toBe('Draft Guest\nUnreviewed Guest');
    expect(
      document.querySelector('#creator')?.getAttribute('data-active-step'),
    ).toBe('2');
    await screen.findByLabelText('Font');
    expect((screen.getByLabelText('Font') as HTMLSelectElement).value).toBe(
      'serif',
    );
  });

  it('retries an uncertain AI batch with the same operation instead of charging a new one', async () => {
    mocks.backend.generateAi
      .mockResolvedValueOnce({ batchId: 'batch-one', status: 'generating' })
      .mockResolvedValueOnce({
        batchId: 'batch-one',
        status: 'ready',
        assets: [{ id: 'art-one', url: 'blob:art-one' }],
      });
    mount();
    await screen.findByDisplayValue('Original event');
    fireEvent.click(
      screen.getByRole('button', { name: 'Generate four choices' }),
    );
    await screen.findByRole('button', { name: 'Retry this background batch' });
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry this background batch' }),
    );
    await screen.findByRole('button', { name: 'Use AI choice 1' });
    expect(mocks.backend.generateAi.mock.calls[1]?.[0]).toEqual(
      mocks.backend.generateAi.mock.calls[0]?.[0],
    );
  });
  it('recovers the original AI operation after a component remount, even with no units remaining', async () => {
    const pending = {
      batchId: 'batch-pending',
      prompt: 'Original background prompt',
      idempotencyKey: 'original-key',
    };
    mocks.backend.getPendingAiBatch.mockResolvedValue(pending);
    mocks.backend.getCurrentAccess.mockResolvedValue({
      offerKey: 'event_pass',
      premiumDesignsEnabled: true,
      artworkUploadEnabled: true,
      aiBackgroundBatchesRemaining: 0,
    });
    mocks.backend.generateAi.mockResolvedValue({
      batchId: 'batch-pending',
      status: 'ready',
      assets: [{ id: 'art-one', url: 'blob:art-one' }],
    });
    mount();
    await screen.findByDisplayValue('Original event');
    cleanup();
    mount();
    const retry = await screen.findByRole('button', {
      name: 'Retry this background batch',
    });
    expect(retry.hasAttribute('disabled')).toBe(false);
    expect(
      (
        screen.getByLabelText(
          'AI background description',
        ) as HTMLTextAreaElement
      ).value,
    ).toBe(pending.prompt);
    fireEvent.click(retry);
    await screen.findByRole('button', { name: 'Use AI choice 1' });
    expect(mocks.backend.generateAi).toHaveBeenCalledWith({
      projectId: 'project-one',
      prompt: pending.prompt,
      idempotencyKey: pending.idempotencyKey,
    });
  });
});

describe('preview and guest-column fidelity', () => {
  it('retains an empty table column when a marker exists', () => {
    expect(guestRowsToText([{ name: 'Ada', marker: 'Vegan' }])).toBe(
      'Name\tTable\tMarker\nAda\t\tVegan',
    );
  });
  it('reports fit problems instead of showing an empty-input placeholder', () => {
    render(
      <SheetPreview
        guests={[{ name: 'W'.repeat(120) }]}
        designId="minimal-ivory"
        layoutId="portrait_4"
      />,
    );
    expect(
      screen.getByRole('list', { name: 'Print fit issues' }).textContent,
    ).toMatch(/cannot fit without clipping/);
  });
});
