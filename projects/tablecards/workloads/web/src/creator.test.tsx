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
    listPresetPage: vi.fn(),
    listAssets: vi.fn(),
    getAsset: vi.fn(),
    listProjects: vi.fn(),
    getProject: vi.fn(),
    getLatestExport: vi.fn(),
    saveProject: vi.fn(),
    requestExport: vi.fn(),
    getExport: vi.fn(),
    generateAi: vi.fn(),
    getPendingAiBatch: vi.fn(),
    resolveArtwork: vi.fn(),
    releaseArtwork: vi.fn(),
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
  mocks.auth.state.status = 'authenticated';
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
  mocks.backend.listPresetPage.mockImplementation(async () => ({
    items: await mocks.backend.listPresets(),
    done: true,
    cursor: '',
  }));
  mocks.backend.listAssets.mockResolvedValue([]);
  mocks.backend.getAsset.mockResolvedValue(null);
  mocks.backend.resolveArtwork.mockResolvedValue('blob:resolved-artwork');
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

describe('creator introduction reflects the current journey', () => {
  it('loads a varied example list and previews long names as two readable lines', async () => {
    mount(null);
    fireEvent.click(
      screen.getByRole('button', { name: 'Try an example list' }),
    );
    const names = screen.getByLabelText(
      /Paste one name per line/u,
    ) as HTMLTextAreaElement;
    expect(names.value.split('\n')).toEqual([
      'Anaïs Dubois',
      'Alexandria Catherine Montgomery-Sinclair',
      'Björn Hansen',
      'Olivia Rose Bennett',
      'María Fernanda de la Cruz Hernández',
      'José García',
    ]);
    const sheet = await screen.findByRole('img', {
      name: 'TableCards print sheet 1',
    });
    const lines = [...sheet.querySelectorAll('text')].map(
      (element) => element.textContent,
    );
    expect(lines.filter((line) => line === 'Anaïs Dubois')).toHaveLength(2);
    expect(
      lines.filter((line) => line === 'Alexandria Catherine'),
    ).toHaveLength(2);
    expect(lines.filter((line) => line === 'Montgomery-Sinclair')).toHaveLength(
      2,
    );
    expect(mocks.backend.generateAi).not.toHaveBeenCalled();
  });

  it('shows edit guidance, not sign-in marketing, for a saved project', async () => {
    mount();
    await screen.findByDisplayValue('Original event');
    expect(
      screen.getByRole('heading', { name: 'Edit your sheet' }),
    ).toBeTruthy();
    expect(screen.queryByText('Try it before you sign in')).toBeNull();
    expect(
      screen.getByText(
        'Changes stay in this tab until you save or export an updated PDF.',
      ),
    ).toBeTruthy();
  });

  it('shows creation guidance for an authenticated new project', () => {
    mount(null);
    expect(
      screen.getByRole('heading', { name: 'Create your place cards' }),
    ).toBeTruthy();
    expect(screen.queryByText('Try it before you sign in')).toBeNull();
  });

  it('keeps the public try-before-sign-in introduction for visitors', () => {
    mocks.auth.state.status = 'signed_out';
    mount(null);
    expect(
      screen.getByRole('heading', { name: 'Build your first sheet' }),
    ).toBeTruthy();
    expect(screen.getByText('Try it before you sign in')).toBeTruthy();
  });
});

const retainedNameStyle = {
  color: '#123456',
  position: 'top',
  font: 'serif',
  size: 'small',
} as const;
function writeSavedArtworkDraft(kind: 'uploaded' | 'ai') {
  createTableCardsDraftStore(
    sessionStorage,
    Date.now,
    'tablecards:protected-draft:v1:account-one:project-one',
  ).write({
    title: 'Unsaved artwork event',
    designId: 'garden-sage',
    layoutId: 'portrait_4',
    guests: [{ name: 'Retained Guest' }],
    pastedText: 'Retained Guest',
    validatedText: 'Retained Guest',
    activeStep: 3,
    customDesign: {
      kind,
      reference: 'asset-new',
      label: 'Unsaved event artwork',
      nameStyle: retainedNameStyle,
    },
  });
}

describe('restored current private artwork', () => {
  it('loads and selects an older preset with its exact snapshotted name style', async () => {
    const first = Array.from({ length: 24 }, (_, index) => ({
      id: `preset-${index}`,
      assetId: `asset-${index}`,
      assetSource: 'uploaded',
      artworkUrl: `/v1/files/assets/asset_${index}`,
      displayName: `Recent preset ${index}`,
      nameColor: '#243026',
      nameFont: 'sans',
      namePosition: 'center',
      nameSize: 'medium',
      updatedAt: 1,
    }));
    const older = {
      ...first[0],
      id: 'older-preset',
      assetId: 'older-asset',
      artworkUrl: '/v1/files/assets/older_asset',
      displayName: 'Older retained preset',
      nameColor: '#123456',
      nameFont: 'serif',
      namePosition: 'top',
      nameSize: 'small',
    };
    mocks.backend.listPresetPage
      .mockResolvedValueOnce({
        items: first,
        done: false,
        cursor: 'older-presets-cursor',
      })
      .mockResolvedValueOnce({ items: [older], done: true, cursor: 'end' });
    mocks.backend.getCurrentAccess.mockResolvedValue({
      offerKey: 'studio',
      artworkUploadEnabled: true,
      reusablePresetsEnabled: true,
      aiBackgroundBatchesRemaining: 2,
    });
    mocks.backend.resolveArtwork.mockImplementation(async (address) =>
      address === older.artworkUrl ? 'blob:older-preset' : 'blob:recent-preset',
    );
    mount();
    await screen.findByDisplayValue('Original event');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Load more presets' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Older retained preset' }),
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: 'Save project' })
          .hasAttribute('disabled'),
      ).toBe(false),
    );
    expect(mocks.backend.listPresetPage).toHaveBeenLastCalledWith(
      'older-presets-cursor',
    );
    expect(screen.getByText('All presets loaded.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next sheet' }));
    expect(
      document
        .querySelector('.creator-preview .paper-preview image')
        ?.getAttribute('href'),
    ).toBe('blob:older-preset');
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }));
    await waitFor(() => expect(mocks.backend.saveProject).toHaveBeenCalled());
    expect(mocks.backend.saveProject.mock.calls[0]?.[0].design).toEqual({
      kind: 'uploaded',
      reference: 'older-asset',
      nameStyle: retainedNameStyle,
    });
  });
  it('hydrates selected artwork through an exact authorized lookup when it is outside the library window', async () => {
    writeSavedArtworkDraft('uploaded');
    mocks.backend.listAssets.mockResolvedValue(
      Array.from({ length: 128 }, (_, index) => ({
        id: `unrelated-${index}`,
        source: 'uploaded',
        url: `/api/private-artwork/unrelated-${index}`,
        reusable: true,
        createdAt: 1,
      })),
    );
    mocks.backend.getAsset.mockResolvedValue({
      id: 'asset-new',
      source: 'uploaded',
      url: '/api/private-artwork/selected-beyond-window',
      reusable: false,
      createdAt: 1,
    });
    mocks.backend.resolveArtwork.mockResolvedValue(
      'blob:selected-beyond-window',
    );
    mount();
    await screen.findByDisplayValue('Unsaved artwork event');
    await waitFor(() =>
      expect(mocks.backend.getAsset).toHaveBeenCalledWith('asset-new'),
    );
    await waitFor(() =>
      expect(mocks.backend.resolveArtwork).toHaveBeenCalledWith(
        '/api/private-artwork/selected-beyond-window',
      ),
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: 'Save project' })
          .hasAttribute('disabled'),
      ).toBe(false),
    );
    expect(mocks.backend.getAsset).toHaveBeenCalledWith('asset-new');
    expect(mocks.backend.resolveArtwork).toHaveBeenCalledTimes(1);
    expect(mocks.backend.resolveArtwork).toHaveBeenCalledWith(
      '/api/private-artwork/selected-beyond-window',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next sheet' }));
    expect(
      document
        .querySelector('.creator-preview .paper-preview image')
        ?.getAttribute('href'),
    ).toBe('blob:selected-beyond-window');
    fireEvent.click(
      screen.getByRole('button', { name: 'Create print-ready PDF' }),
    );
    await screen.findByRole('link', { name: 'Download PDF' });
    expect(mocks.backend.saveProject.mock.calls[0]?.[0].design.reference).toBe(
      'asset-new',
    );
  });
  it.each(['uploaded', 'ai'] as const)(
    'loads a restored %s draft reference before preview/export and preserves edits while waiting',
    async (kind) => {
      writeSavedArtworkDraft(kind);
      let completeAssets!: (
        assets: readonly {
          id: string;
          source: 'uploaded' | 'ai';
          url: string;
          reusable: boolean;
          createdAt: number;
        }[],
      ) => void;
      mocks.backend.listAssets.mockReturnValue(
        new Promise((resolve) => {
          completeAssets = resolve;
        }),
      );
      let completeArtwork!: (url: string) => void;
      mocks.backend.resolveArtwork.mockReturnValue(
        new Promise((resolve) => {
          completeArtwork = resolve;
        }),
      );
      mount();
      await screen.findByDisplayValue('Unsaved artwork event');
      expect(screen.getByText(/Loading your selected artwork/)).toBeTruthy();
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
      expect(
        screen
          .getByRole('button', { name: 'Open complete preview' })
          .hasAttribute('disabled'),
      ).toBe(true);
      expect(
        document.querySelector('.creator-preview .paper-preview'),
      ).toBeNull();
      fireEvent.change(screen.getByLabelText('Project name'), {
        target: { value: 'Edited while artwork loads' },
      });
      fireEvent.change(screen.getByLabelText(/Paste one name/), {
        target: { value: 'Current Edited Guest' },
      });
      await act(async () =>
        completeAssets([
          {
            id: 'asset-new',
            source: kind,
            url: '/api/private-artwork/current-draft',
            reusable: false,
            createdAt: 1,
          },
          ...Array.from({ length: 200 }, (_, index) => ({
            id: `unrelated-${index}`,
            source: kind,
            url: `/api/private-artwork/unrelated-${index}`,
            reusable: false,
            createdAt: 1,
          })),
        ]),
      );
      await waitFor(() =>
        expect(mocks.backend.resolveArtwork).toHaveBeenCalledWith(
          '/api/private-artwork/current-draft',
        ),
      );
      expect(mocks.backend.resolveArtwork).toHaveBeenCalledTimes(1);
      expect(
        screen
          .getByRole('button', { name: 'Save project' })
          .hasAttribute('disabled'),
      ).toBe(true);
      expect(
        document.querySelector('.creator-preview .paper-preview'),
      ).toBeNull();
      await act(async () => completeArtwork('blob:current-draft-artwork'));
      await waitFor(() =>
        expect(
          screen
            .getByRole('button', { name: 'Create print-ready PDF' })
            .hasAttribute('disabled'),
        ).toBe(false),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Next sheet' }));
      const imageSources = Array.from(
        document.querySelectorAll('.creator-preview .paper-preview image'),
      ).map((element) => element.getAttribute('href'));
      expect(imageSources.length).toBeGreaterThan(0);
      expect(
        imageSources.every((source) => source === 'blob:current-draft-artwork'),
      ).toBe(true);
      expect((screen.getByLabelText('Font') as HTMLSelectElement).value).toBe(
        'serif',
      );
      fireEvent.click(
        screen.getByRole('button', { name: 'Create print-ready PDF' }),
      );
      await screen.findByRole('link', { name: 'Download PDF' });
      expect(mocks.backend.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-one',
          title: 'Edited while artwork loads',
          guests: [{ name: 'Current Edited Guest' }],
          design: {
            kind,
            reference: 'asset-new',
            nameStyle: retainedNameStyle,
          },
        }),
      );
      expect(mocks.backend.requestExport).toHaveBeenCalledWith(
        'project-one',
        'portrait_4',
      );
    },
  );

  it.each(['missing', 'failed', 'bytes'] as const)(
    'blocks a %s restored asset without a catalog fallback and retries without losing the draft',
    async (failure) => {
      writeSavedArtworkDraft('uploaded');
      if (failure === 'failed')
        mocks.backend.listAssets.mockRejectedValue(
          new Error('[CONVEX Q(assets:list)] Request ID: private Server Error'),
        );
      if (failure === 'bytes') {
        mocks.backend.listAssets.mockResolvedValue([
          {
            id: 'asset-new',
            source: 'uploaded',
            url: '/api/private-artwork/current-draft',
            reusable: false,
            createdAt: 1,
          },
        ]);
        mocks.backend.resolveArtwork.mockRejectedValue(
          new Error('Authorized bytes unavailable'),
        );
      }
      mount();
      await screen.findByDisplayValue('Unsaved artwork event');
      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toContain(
        'The selected artwork could not be loaded in this workspace. Your edits are preserved.',
      );
      expect(alert.textContent).not.toMatch(/CONVEX|Request ID/);
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
      expect(
        document.querySelector('.creator-preview .paper-preview'),
      ).toBeNull();
      expect(mocks.backend.saveProject).not.toHaveBeenCalled();
      mocks.backend.listAssets.mockResolvedValue([
        {
          id: 'asset-new',
          source: 'uploaded',
          url: '/api/private-artwork/current-draft',
          reusable: false,
          createdAt: 1,
        },
      ]);
      mocks.backend.resolveArtwork.mockResolvedValue('blob:retried-artwork');
      fireEvent.click(screen.getByRole('button', { name: 'Retry artwork' }));
      await waitFor(() =>
        expect(
          screen
            .getByRole('button', { name: 'Save project' })
            .hasAttribute('disabled'),
        ).toBe(false),
      );
      expect(
        (screen.getByLabelText('Project name') as HTMLInputElement).value,
      ).toBe('Unsaved artwork event');
      expect(
        (screen.getByLabelText(/Paste one name/) as HTMLTextAreaElement).value,
      ).toBe('Retained Guest');
      expect(screen.getByText('Unsaved event artwork')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Next sheet' }));
      expect(
        document
          .querySelector('.creator-preview .paper-preview image')
          ?.getAttribute('href'),
      ).toBe('blob:retried-artwork');
    },
  );

  it('resolves the current draft through an authorized preset without replacing its snapshotted style', async () => {
    writeSavedArtworkDraft('uploaded');
    mocks.backend.listPresets.mockResolvedValue([
      {
        id: 'preset-one',
        assetId: 'asset-new',
        assetSource: 'uploaded',
        artworkUrl: '/api/private-artwork/preset-artwork',
        displayName: 'Later preset name',
        nameColor: '#abcdef',
        nameFont: 'sans',
        nameSize: 'large',
        namePosition: 'bottom',
      },
    ]);
    mocks.backend.resolveArtwork.mockResolvedValue('blob:preset-artwork');
    mount();
    await screen.findByDisplayValue('Unsaved artwork event');
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: 'Save project' })
          .hasAttribute('disabled'),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next sheet' }));
    expect(
      document
        .querySelector('.creator-preview .paper-preview image')
        ?.getAttribute('href'),
    ).toBe('blob:preset-artwork');
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }));
    await waitFor(() => expect(mocks.backend.saveProject).toHaveBeenCalled());
    expect(mocks.backend.saveProject.mock.calls[0]?.[0].design).toEqual({
      kind: 'uploaded',
      reference: 'asset-new',
      nameStyle: retainedNameStyle,
    });
  });
});

describe('current creator input and export', () => {
  it('offers project naming above every step before the first save', async () => {
    mocks.backend.listProjects.mockResolvedValue([]);
    mount(null);
    const name = screen.getByLabelText('Project name');
    expect(name.closest('.section-intro')).not.toBeNull();
    expect(name.closest('.creator-controls')).toBeNull();
    fireEvent.change(name, { target: { value: 'First named project' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'Try an example list' }),
    );
    for (const step of ['Guests', 'Design', 'Review']) {
      fireEvent.click(screen.getByRole('button', { name: step }));
      expect(screen.getByLabelText('Project name')).toBe(name);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }));
    await waitFor(() => expect(mocks.backend.saveProject).toHaveBeenCalled());
    expect(mocks.backend.saveProject).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'First named project',
      }),
    );
    expect(
      mocks.backend.saveProject.mock.calls[0]?.[0].projectId,
    ).toBeUndefined();
  });

  it('saves a name-only edit on the existing project and hides the stale PDF', async () => {
    mount();
    await screen.findByDisplayValue('Original event');
    await screen.findByRole('link', { name: 'Download PDF' });
    fireEvent.change(screen.getByLabelText('Project name'), {
      target: { value: 'Renamed saved project' },
    });
    expect(screen.getByText(/Unsaved changes/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Download PDF' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }));
    await screen.findByText('Saved to this workspace');
    expect(mocks.backend.saveProject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-one',
        title: 'Renamed saved project',
        guests: originalProject.guests,
      }),
    );
    expect(mocks.backend.requestExport).not.toHaveBeenCalled();
  });

  it('disables the header name while loading and when the saved project is unavailable', async () => {
    let completeLoad!: (project: null) => void;
    mocks.backend.getProject.mockReturnValue(
      new Promise((resolve) => {
        completeLoad = resolve;
      }),
    );
    mount();
    expect(screen.getByLabelText('Project name').hasAttribute('disabled')).toBe(
      true,
    );
    await act(async () => completeLoad(null));
    await screen.findByText('Project unavailable in this workspace');
    expect(screen.getByLabelText('Project name').hasAttribute('disabled')).toBe(
      true,
    );
    expect(mocks.backend.saveProject).not.toHaveBeenCalled();
  });

  it('still protects a second name edit after saving on the same route without reloading', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    try {
      const { router } = mount();
      await screen.findByDisplayValue('Original event');
      fireEvent.change(screen.getByLabelText('Project name'), {
        target: { value: 'Saved rename' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Save project' }));
      await screen.findByText('Saved to this workspace');
      fireEvent.change(screen.getByLabelText('Project name'), {
        target: { value: 'Second unsaved rename' },
      });
      await act(async () => router.navigate('/projects'));
      await waitFor(() =>
        expect(confirm).toHaveBeenCalledWith(
          'Discard the unsaved changes to this project?',
        ),
      );
      expect(router.state.location.pathname).toBe('/projects/project-one');
      expect(screen.getByDisplayValue('Second unsaved rename')).toBeTruthy();
    } finally {
      confirm.mockRestore();
    }
  });

  it('disables the header name during saving and enables it after completion', async () => {
    let completeSave!: (project: typeof originalProject) => void;
    mocks.backend.saveProject.mockReturnValue(
      new Promise((resolve) => {
        completeSave = resolve;
      }),
    );
    mount();
    await screen.findByDisplayValue('Original event');
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }));
    await waitFor(() => expect(mocks.backend.saveProject).toHaveBeenCalled());
    expect(screen.getByLabelText('Project name').hasAttribute('disabled')).toBe(
      true,
    );
    await act(async () => completeSave(originalProject));
    await screen.findByText('Saved to this workspace');
    expect(screen.getByLabelText('Project name').hasAttribute('disabled')).toBe(
      false,
    );
  });

  it('saves newly typed input before exporting and hides the previous download while dirty', async () => {
    mount();
    await screen.findByDisplayValue('Original event');
    await screen.findByRole('link', { name: 'Download PDF' });
    fireEvent.change(screen.getByLabelText(/Paste one name/), {
      target: { value: 'Zelda Corrected\nNew Guest' },
    });
    fireEvent.change(screen.getByLabelText('Project name'), {
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
    expect(screen.queryByRole('link', { name: 'Download PDF' })).toBeNull();
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
    expect(screen.getByLabelText('Project name').getAttribute('value')).toBe(
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
  it('allows a new description and operation after a definitive failed AI batch', async () => {
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
    await screen.findByDisplayValue('Original event');
    const prompt = screen.getByLabelText('AI background description');
    fireEvent.change(prompt, { target: { value: '[fail] first description' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'Generate four choices' }),
    );
    expect((await screen.findByRole('alert')).textContent).toContain(
      'This background batch failed. Edit the description and try again.',
    );
    expect(prompt.hasAttribute('disabled')).toBe(false);
    expect(
      screen.queryByRole('button', { name: 'Retry this background batch' }),
    ).toBeNull();
    fireEvent.change(prompt, {
      target: { value: 'Successful revised description' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Generate four choices' }),
    );
    await screen.findByRole('button', { name: 'Use AI choice 1' });
    const first = mocks.backend.generateAi.mock.calls[0]?.[0];
    const second = mocks.backend.generateAi.mock.calls[1]?.[0];
    expect(second.prompt).toBe('Successful revised description');
    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
  });
  it('requires a fresh AI description of 3 to 400 trimmed characters without entering recovery', async () => {
    mount();
    await screen.findByDisplayValue('Original event');
    const prompt = screen.getByLabelText('AI background description');
    for (const invalid of ['   ', ' ab ', 'x'.repeat(401)]) {
      fireEvent.change(prompt, { target: { value: invalid } });
      expect(
        screen
          .getByRole('button', { name: 'Generate four choices' })
          .hasAttribute('disabled'),
      ).toBe(true);
    }
    expect(mocks.backend.generateAi).not.toHaveBeenCalled();
    expect(prompt.hasAttribute('disabled')).toBe(false);
    fireEvent.change(prompt, { target: { value: '  oak  ' } });
    expect(
      screen
        .getByRole('button', { name: 'Generate four choices' })
        .hasAttribute('disabled'),
    ).toBe(false);
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
  it('shows card sheets immediately and preserves the event title without a print-check page', async () => {
    mount();
    await screen.findByDisplayValue('Original event');
    fireEvent.change(screen.getByLabelText('Project name'), {
      target: { value: 'Current edited project name' },
    });
    expect(
      document.querySelector('.creator-preview .paper-preview')?.textContent,
    ).toContain('Ada Original');
    expect(
      screen.getByDisplayValue('Current edited project name'),
    ).toBeTruthy();
    expect(document.querySelector('.preview-count')?.textContent).toMatch(
      /1 cards · 1 PDF pages/,
    );
    expect(
      document.querySelector('.creator-preview .paper-preview')?.textContent,
    ).not.toContain('TableCards print check');
    expect(document.querySelector('.print-callout')?.textContent).toContain(
      'Calibration is available separately',
    );
    expect(document.querySelector('.print-callout')?.textContent).not.toContain(
      'square on page one',
    );
  });
  it.each(['W'.repeat(120), 'Unsupported 🦄 event'])(
    'blocks save and export when the actual project name cannot render: %s',
    async (title) => {
      mount();
      await screen.findByDisplayValue('Original event');
      fireEvent.change(screen.getByLabelText('Project name'), {
        target: { value: title },
      });
      expect(screen.getByRole('alert').textContent).toMatch(
        /title|project name/i,
      );
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
      expect(
        document.querySelector('.creator-preview .paper-preview'),
      ).toBeNull();
      expect(mocks.backend.saveProject).not.toHaveBeenCalled();
    },
  );
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
  it('omits only the toolbar summary when requested, retaining sheet navigation and useful empty copy', () => {
    const view = render(
      <SheetPreview
        guests={[{ name: 'Ada' }]}
        designId="minimal-ivory"
        layoutId="portrait_4"
        showSummary={false}
      />,
    );
    expect(screen.queryByText(/PDF pages including scale check/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Next sheet' })).toBeTruthy();
    view.rerender(
      <SheetPreview
        guests={[]}
        designId="minimal-ivory"
        layoutId="portrait_4"
        showSummary={false}
      />,
    );
    expect(
      screen.getByText(
        'Add at least one valid guest to see every sheet before signing in.',
      ),
    ).toBeTruthy();
  });
});
