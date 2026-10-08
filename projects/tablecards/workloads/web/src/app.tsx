import {
  DESIGN_CATALOG,
  DESIGN_IDS,
  PRINT_LAYOUTS,
  createRenderManifest,
  normalizePastedText,
  preflightRender,
  renderDesignFaceToSvg,
  renderManifestPageToSvg,
  type DesignId,
  type GuestColumnMapping,
  type GuestImportIssue,
  type GuestRow,
  type NameStyle,
  type PrintLayoutId,
} from '@tablecards/core';
import { useBffAuth } from '@tofler/bff-auth/react';
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useBlocker } from 'react-router-dom';

import {
  type CurrentProductAccess,
  type DesignAsset,
  type SavedProject,
  type TableCardsBackend,
} from './backend';
import { createTableCardsDraftStore } from './draft';
import {
  applyGuestMapping,
  parseGuestFile,
  parsePastedGrid,
  type ParsedGuestTable,
} from './imports';
import { aiInputWasRejected, safeProductMessage } from './product-error';
import { ACCOUNT_CHANGE_EVENT, WorkspaceSelector } from './auth-navigation';
import { PreviewDialog } from './preview-dialog';
import { useTableCardsBackend } from './use-tablecards-backend';
import { useArtwork } from './use-artwork';
import { MetadataPageControls, useMetadataPages } from './metadata-pages';
import {
  AiReferenceInput,
  AiTestProviderControl,
  type AiReferenceImage,
} from './ai-reference-input';

const SAMPLE_GUESTS = `Anaïs Dubois
Alexandria Catherine Montgomery-Sinclair
Björn Hansen
Olivia Rose Bennett
María Fernanda de la Cruz Hernández
José García`;

const GUEST_LIST_PLACEHOLDER = `Paste one name per line, for example:
Olivia Bennett
Alexandria Catherine Montgomery-Sinclair
José García`;

function ArtworkThumbnail({
  backend,
  address,
  className,
}: {
  readonly backend: TableCardsBackend;
  readonly address?: string | null;
  readonly className?: string;
}) {
  const artwork = useArtwork(backend, address, { lazy: true });
  return (
    <span
      ref={artwork.ref}
      className={className}
      style={
        artwork.url ? { backgroundImage: `url(${artwork.url})` } : undefined
      }
      aria-label={artwork.state === 'error' ? 'Artwork unavailable' : undefined}
    >
      {artwork.state === 'error' ? 'Artwork unavailable' : null}
    </span>
  );
}

interface Notice {
  readonly kind: 'error' | 'success' | 'info';
  readonly message: string;
}

export function guestRowsToText(guests: readonly GuestRow[]) {
  if (
    !guests.some(
      (guest) => guest.table !== undefined || guest.marker !== undefined,
    )
  )
    return guests.map((guest) => guest.name).join('\n');
  return [
    'Name\tTable\tMarker',
    ...guests.map((guest) =>
      [guest.name, guest.table ?? '', guest.marker ?? ''].join('\t'),
    ),
  ].join('\n');
}

function ImportMapping({
  table,
  onApply,
  onCancel,
}: {
  readonly table: ParsedGuestTable;
  readonly onApply: (mapping: GuestColumnMapping) => void;
  readonly onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    panelRef.current?.querySelector('select')?.focus({ preventScroll: true });
  }, []);
  const maximumColumns = Math.max(
    ...table.rows.slice(0, 20).map((row) => row.length),
    1,
  );
  const [mapping, setMapping] = useState<
    Required<Pick<GuestColumnMapping, 'name'>> & GuestColumnMapping
  >(table.suggestedMapping);
  const options = Array.from({ length: maximumColumns }, (_, index) => ({
    index,
    preview: table.rows
      .slice(0, 3)
      .map((row) => String(row[index] ?? '').trim())
      .filter(Boolean)
      .join(' · '),
  }));
  const setOptional = (field: 'table' | 'marker', value: string) => {
    setMapping((current) => {
      const next = { ...current };
      if (value === '') delete next[field];
      else next[field] = Number(value);
      return next;
    });
  };
  return (
    <div
      className="mapping-panel"
      id="column-mapping"
      ref={panelRef}
      role="region"
      aria-label="Column mapping"
    >
      <div>
        <p className="eyebrow">One more step — map columns</p>
        <h3>{table.filename}</h3>
        <p>
          Tell us which columns belong on the card. Nothing is reordered or
          merged.
        </p>
      </div>
      <div className="mapping-grid">
        <label>
          Guest name <span>required</span>
          <select
            value={mapping.name}
            onChange={(event) =>
              setMapping((current) => ({
                ...current,
                name: Number(event.target.value),
              }))
            }
          >
            {options.map((option) => (
              <option key={option.index} value={option.index}>
                Column {option.index + 1}
                {option.preview ? ` — ${option.preview}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Table <span>optional</span>
          <select
            value={mapping.table ?? ''}
            onChange={(event) => setOptional('table', event.target.value)}
          >
            <option value="">Not included</option>
            {options.map((option) => (
              <option key={option.index} value={option.index}>
                Column {option.index + 1}
                {option.preview ? ` — ${option.preview}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Short marker <span>optional</span>
          <select
            value={mapping.marker ?? ''}
            onChange={(event) => setOptional('marker', event.target.value)}
          >
            <option value="">Not included</option>
            {options.map((option) => (
              <option key={option.index} value={option.index}>
                Column {option.index + 1}
                {option.preview ? ` — ${option.preview}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={(mapping.headerRows ?? 0) === 1}
            onChange={(event) =>
              setMapping((current) => ({
                ...current,
                headerRows: event.target.checked ? 1 : 0,
              }))
            }
          />
          First row contains headings
        </label>
      </div>
      <div className="inline-actions">
        <button
          className="button"
          type="button"
          onClick={() => onApply(mapping)}
        >
          Use these columns
        </button>
        <button className="text-button" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function DesignPicker({
  selected,
  onSelect,
}: {
  readonly selected: DesignId;
  readonly onSelect: (designId: DesignId) => void;
}) {
  return (
    <div className="design-grid">
      {DESIGN_IDS.map((designId) => {
        const design = DESIGN_CATALOG[designId];
        return (
          <button
            className={`design-option${selected === designId ? ' selected' : ''}`}
            key={design.id}
            type="button"
            onClick={() => onSelect(designId)}
            aria-pressed={selected === designId}
          >
            <span
              className="design-swatch"
              aria-hidden="true"
              dangerouslySetInnerHTML={{
                __html: renderDesignFaceToSvg(designId, {
                  backgroundImageHref: design.artwork.publicPath,
                }),
              }}
            />
            <span className="design-copy">
              <strong>{design.name}</strong>
              <small>
                {design.tier === 'premium' ? 'Premium' : 'Included'}
              </small>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SheetPreview({
  guests,
  designId,
  layoutId,
  backgroundImageHref,
  nameStyle,
  title,
  showSummary = true,
  artworkState,
}: {
  readonly guests: readonly GuestRow[];
  readonly designId: DesignId;
  readonly layoutId: PrintLayoutId;
  readonly backgroundImageHref?: string;
  readonly nameStyle?: NameStyle;
  readonly title?: string;
  readonly showSummary?: boolean;
  readonly artworkState?: 'loading' | 'error';
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const fitIssues = useMemo(
    () =>
      preflightRender({
        guests,
        designId,
        layoutId,
        ...(title === undefined ? {} : { title }),
        ...(nameStyle ? { nameStyle } : {}),
      }),
    [guests, designId, layoutId, nameStyle, title],
  );
  const preview = useMemo(() => {
    if (guests.length === 0 || artworkState) return null;
    try {
      const manifest = createRenderManifest({
        guests,
        designId,
        layoutId,
        ...(title === undefined ? {} : { title }),
        ...(nameStyle === undefined ? {} : { nameStyle }),
      });
      return {
        manifest,
        svg: renderManifestPageToSvg(
          manifest,
          Math.min(pageIndex, manifest.pages.length - 1),
          {
            backgroundImageHref:
              backgroundImageHref ??
              DESIGN_CATALOG[designId].artwork.publicPath,
          },
        ),
      };
    } catch {
      return null;
    }
  }, [
    artworkState,
    backgroundImageHref,
    designId,
    guests,
    layoutId,
    nameStyle,
    pageIndex,
    title,
  ]);
  const totalPages = preview?.manifest.pages.length ?? 0;
  useEffect(() => {
    setPageIndex((current) => Math.min(current, Math.max(totalPages - 1, 0)));
  }, [totalPages]);

  if (!preview) {
    if (artworkState)
      return (
        <div className="empty-preview">
          <h3>
            {artworkState === 'loading'
              ? 'Loading selected artwork…'
              : 'Selected artwork is unavailable'}
          </h3>
          <p>
            The preview cannot be shown until this event's selected artwork is
            loaded. Your guest-list and styling edits are preserved.
          </p>
        </div>
      );
    if (fitIssues.length > 0)
      return (
        <div className="empty-preview">
          <h3>These cards need an adjustment</h3>
          <ul className="issue-list" aria-label="Print fit issues">
            {fitIssues.slice(0, 8).map((issue, index) => (
              <li key={index}>
                {issue.message}{' '}
                {issue.field === 'title'
                  ? 'Shorten the project name or use supported characters.'
                  : 'Shorten this field or choose a smaller name size.'}
              </li>
            ))}
          </ul>
        </div>
      );
    return (
      <div className="empty-preview">
        <span aria-hidden="true">✦</span>
        <h3>Your print preview appears here</h3>
        <p>
          Add at least one valid guest to see every sheet before signing in.
        </p>
      </div>
    );
  }
  return (
    <div className="sheet-preview">
      <div className="preview-toolbar">
        {showSummary ? (
          <p>
            <strong>{guests.length}</strong> cards ·{' '}
            <strong>{totalPages}</strong> PDF pages
          </p>
        ) : null}
        <div>
          <button
            type="button"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((page) => page - 1)}
            aria-label="Previous sheet"
          >
            ←
          </button>
          <span>
            Sheet {pageIndex + 1} · {pageIndex + 1}/{totalPages}
          </span>
          <button
            type="button"
            disabled={pageIndex >= totalPages - 1}
            onClick={() => setPageIndex((page) => page + 1)}
            aria-label="Next sheet"
          >
            →
          </button>
        </div>
      </div>
      <div
        className="paper-preview"
        dangerouslySetInnerHTML={{ __html: preview.svg }}
      />
    </div>
  );
}

function AuthGate() {
  const { client, state } = useBffAuth();
  if (state.status === 'loading')
    return <p className="auth-note">Checking your session…</p>;
  if (state.status === 'recoverable_error') {
    return (
      <div className="notice error" role="alert">
        <p>We could not check your session. Your draft is still in this tab.</p>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void client.bootstrap()}
        >
          Retry session
        </button>
      </div>
    );
  }
  if (state.status === 'onboarding_required') {
    return (
      <div className="auth-note">
        <strong>Your workspace is not available yet</strong>
        <p>
          TableCards creates your private workspace during sign-in. Retry setup,
          or open a valid invitation from your Studio owner. Creating extra
          workspaces is not enabled.
        </p>
        <button
          className="button button-small"
          type="button"
          onClick={() => void client.bootstrap()}
        >
          Retry workspace setup
        </button>
      </div>
    );
  }
  if (state.status === 'account_selection_required') {
    return (
      <div className="auth-note">
        <strong>Choose where to save this event</strong>
        <WorkspaceSelector className="account-select wide" label="Account" />
      </div>
    );
  }
  return null;
}

export function Creator({
  developmentControlsEnabled,
  initialProjectId,
  onProjectSaved,
  initialStep = 1,
}: {
  readonly developmentControlsEnabled: boolean;
  readonly initialProjectId?: string;
  readonly initialStep?: 1 | 2 | 3;
  readonly onProjectSaved?: (project: SavedProject) => void;
}) {
  const { client, snapshot, state } = useBffAuth();
  const backend = useTableCardsBackend();
  const draftAccount =
    state.status === 'authenticated' ? state.accountId : 'visitor';
  const draftStore = useMemo(
    () =>
      createTableCardsDraftStore(
        undefined,
        Date.now,
        `tablecards:protected-draft:v1:${draftAccount}:${initialProjectId ?? 'new'}`,
      ),
    [draftAccount, initialProjectId],
  );
  const restored = useRef(false);
  const wasAuthenticated = useRef(false);
  const allowNavigation = useRef(false);
  const [pastedText, setPastedText] = useState('');
  const [validatedText, setValidatedText] = useState('');
  const [guests, setGuests] = useState<readonly GuestRow[]>([]);
  const [issues, setIssues] = useState<readonly GuestImportIssue[]>([]);
  const [fileTable, setFileTable] = useState<ParsedGuestTable | null>(null);
  const [title, setTitle] = useState('My event');
  const [designId, setDesignId] = useState<DesignId>('minimal-ivory');
  const [layoutId, setLayoutId] = useState<PrintLayoutId>('portrait_4');
  const [customDesign, setCustomDesign] = useState<{
    readonly kind: 'uploaded' | 'ai';
    readonly reference: string;
    readonly label: string;
    readonly artworkUrl?: string;
    readonly nameStyle?: NameStyle;
  } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [savedProject, setSavedProject] = useState<SavedProject | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [access, setAccess] = useState<CurrentProductAccess | null>(null);
  const [accessLoadFailed, setAccessLoadFailed] = useState(false);
  const presetLibrary = useMetadataPages(backend.listPresetPage, 'presets');
  const presets = presetLibrary.items;
  const [assets, setAssets] = useState<readonly DesignAsset[]>([]);
  const [assetLoadState, setAssetLoadState] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const presetLoadState = presetLibrary.page.loading
    ? 'loading'
    : presetLibrary.page.error
      ? 'error'
      : 'ready';
  const [artworkRetry, setArtworkRetry] = useState(0);
  const [exactArtwork, setExactArtwork] = useState<{
    readonly key: string;
    readonly state: 'loading' | 'ready' | 'error';
    readonly address?: string;
  } | null>(null);
  const [generatedChoices, setGeneratedChoices] = useState<
    readonly { readonly id: string; readonly url: string }[]
  >([]);
  const [aiPrompt, setAiPrompt] = useState(
    'Elegant watercolor botanicals on warm white paper',
  );
  const [activeProjectCount, setActiveProjectCount] = useState<number | null>(
    null,
  );
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(initialStep);
  const [dirty, setDirty] = useState(false);
  const [projectUnavailable, setProjectUnavailable] = useState(false);
  const [projectLoading, setProjectLoading] = useState(
    Boolean(initialProjectId),
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const loadedProject = useRef<string | null>(null);
  const fetchedLatestExport = useRef(false);
  const [referenceImage, setReferenceImage] = useState<AiReferenceImage | null>(
    null,
  );
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [developmentMock, setDevelopmentMock] = useState(false);
  const aiAttempt = useRef<{
    prompt: string;
    key: string;
    referenceImage?: AiReferenceImage | null;
    developmentMock?: boolean;
  } | null>(null);
  const [aiRecovery, setAiRecovery] = useState(false);
  const [aiRecoveryLoading, setAiRecoveryLoading] = useState(
    Boolean(initialProjectId),
  );
  const editorRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!initialProjectId || state.status !== 'authenticated') return;
    let cancelled = false;
    let checked = false;
    setAiRecoveryLoading(true);
    void backend
      .getPendingAiBatch(initialProjectId)
      .then((pending) => {
        checked = true;
        if (cancelled || !pending) return;
        aiAttempt.current = {
          prompt: pending.prompt,
          key: pending.idempotencyKey,
          developmentMock: pending.developmentMock,
        };
        setAiPrompt(pending.prompt);
        setDevelopmentMock(pending.developmentMock === true);
        setAiRecovery(true);
        setNotice({
          kind: 'info',
          message:
            'An unfinished background batch was recovered. Retry this same batch to retrieve its choices without starting another.',
        });
      })
      .catch(() => {
        if (!cancelled)
          setNotice({
            kind: 'error',
            message:
              'Unfinished background batches could not be checked. Reload before starting a new batch.',
          });
      })
      .finally(() => {
        if (!cancelled && checked) setAiRecoveryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backend, initialProjectId, state.status]);
  useEffect(() => {
    const heading = editorRef.current?.querySelector<HTMLElement>(
      `[data-creator-step="${activeStep}"] h3`,
    );
    heading?.focus({ preventScroll: true });
  }, [activeStep]);
  const blocker = useBlocker(() => dirty && !allowNavigation.current);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('Discard the unsaved changes to this project?')) {
      draftStore.clear();
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker, draftStore]);

  useEffect(() => {
    const beforeSwitch = (event: Event) => {
      if (
        !dirty ||
        window.confirm('Discard unsaved changes before switching workspaces?')
      ) {
        draftStore.clear();
        return;
      }
      event.preventDefault();
    };
    window.addEventListener(ACCOUNT_CHANGE_EVENT, beforeSwitch);
    return () => window.removeEventListener(ACCOUNT_CHANGE_EVENT, beforeSwitch);
  }, [dirty, draftStore]);

  useEffect(() => {
    if (dirty) setDownloadUrl(null);
  }, [dirty, pastedText, title, designId, customDesign, layoutId]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty || allowNavigation.current) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (initialProjectId) return;
    const visitorStore = createTableCardsDraftStore(
      undefined,
      Date.now,
      'tablecards:protected-draft:v1:visitor:new',
    );
    const visitorDraft =
      draftAccount !== 'visitor' ? visitorStore.read() : null;
    const draft =
      draftStore.read() ?? visitorDraft ?? createTableCardsDraftStore().read();
    if (!draft) return;
    setTitle(draft.title);
    setDesignId(draft.designId);
    setLayoutId(draft.layoutId);
    setGuests(draft.guests);
    setPastedText(draft.pastedText ?? guestRowsToText(draft.guests));
    setValidatedText(draft.validatedText ?? guestRowsToText(draft.guests));
    setCustomDesign(draft.customDesign ?? null);
    setActiveStep(draft.activeStep ?? 3);
    if (
      draft.pastedText?.includes('\t') &&
      draft.pastedText !== draft.validatedText
    ) {
      setFileTable(parsePastedGrid(draft.pastedText));
      setActiveStep(1);
    }
    setDirty(true);
    setNotice({
      kind: 'info',
      message:
        visitorDraft && draft === visitorDraft
          ? 'Your guest list was restored after sign-in.'
          : 'Your draft was restored in this tab.',
    });
    if (draftAccount !== 'visitor') visitorStore.clear();
    createTableCardsDraftStore().clear();
  }, [draftAccount, draftStore, initialProjectId]);

  useEffect(() => {
    if (!dirty || projectLoading || projectUnavailable) return;
    try {
      draftStore.write({
        title,
        designId,
        layoutId,
        guests,
        pastedText,
        validatedText,
        activeStep,
        ...(customDesign
          ? {
              customDesign: {
                kind: customDesign.kind,
                reference: customDesign.reference,
                label: customDesign.label,
                ...(customDesign.nameStyle
                  ? { nameStyle: customDesign.nameStyle }
                  : {}),
              },
            }
          : {}),
      });
    } catch {
      setNotice({
        kind: 'info',
        message:
          'This browser could not retain your draft on reload. Keep this tab open and save before leaving.',
      });
    }
  }, [
    activeStep,
    customDesign,
    designId,
    dirty,
    draftStore,
    guests,
    layoutId,
    pastedText,
    projectLoading,
    projectUnavailable,
    title,
    validatedText,
  ]);

  useEffect(() => {
    if (state.status === 'authenticated') wasAuthenticated.current = true;
    if (wasAuthenticated.current && state.status === 'signed_out') {
      draftStore.clear();
      setSavedProject(null);
      setDownloadUrl(null);
      setAccess(null);
      setAccessLoadFailed(false);
      presetLibrary.clear();
      setAssets([]);
      setGeneratedChoices([]);
      setActiveProjectCount(null);
      setGuests([]);
      setPastedText('');
      setValidatedText('');
      setCustomDesign(null);
      setDirty(false);
      wasAuthenticated.current = false;
    }
  }, [draftStore, presetLibrary.clear, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated') return;
    let cancelled = false;
    setAccess(null);
    setAccessLoadFailed(false);
    setActiveProjectCount(null);
    setAssetLoadState('loading');
    void backend
      .getCurrentAccess()
      .then((nextAccess) => {
        if (cancelled) return;
        setAccess(nextAccess);
      })
      .catch(() => {
        if (!cancelled) setAccessLoadFailed(true);
      });
    void presetLibrary.refresh();
    void backend
      .listAssets()
      .then((nextAssets) => {
        if (!cancelled) {
          setAssets(nextAssets);
          setAssetLoadState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssets([]);
          setAssetLoadState('error');
        }
      });
    void backend
      .listProjects('active')
      .then((nextProjects) => {
        if (!cancelled) setActiveProjectCount(nextProjects.length);
      })
      .catch(() => {
        if (!cancelled) setActiveProjectCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    artworkRetry,
    backend,
    presetLibrary.refresh,
    snapshot.generation,
    state.status,
  ]);

  useEffect(() => {
    if (state.status !== 'authenticated' || !initialProjectId) return;
    if (loadedProject.current === initialProjectId) return;
    let cancelled = false;
    setProjectLoading(true);
    setProjectUnavailable(false);
    setDownloadUrl(null);
    fetchedLatestExport.current = false;
    void backend
      .getProject(initialProjectId)
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded?.guests) {
          setProjectUnavailable(true);
          setNotice({
            kind: 'error',
            message: 'The saved project was not found in this account.',
          });
          return;
        }
        setProjectUnavailable(false);
        loadedProject.current = initialProjectId;
        setSavedProject(loaded);
        const draft = draftStore.read();
        setTitle(draft?.title ?? loaded.title);
        setGuests(draft?.guests ?? loaded.guests);
        const text = draft?.pastedText ?? guestRowsToText(loaded.guests);
        setPastedText(text);
        setValidatedText(draft?.validatedText ?? text);
        setDirty(Boolean(draft));
        if (draft) {
          setDesignId(draft.designId);
          setLayoutId(draft.layoutId);
          setCustomDesign(draft.customDesign ?? null);
          setActiveStep(draft.activeStep ?? 1);
          if (
            draft.pastedText?.includes('\t') &&
            draft.pastedText !== draft.validatedText
          ) {
            setFileTable(parsePastedGrid(draft.pastedText));
            setActiveStep(1);
          }
          setNotice({
            kind: 'info',
            message:
              'Your unsaved edits were restored. Save them before exporting.',
          });
          return;
        }
        if (
          loaded.designKind === 'predefined' &&
          loaded.designId in DESIGN_CATALOG
        ) {
          setDesignId(loaded.designId as DesignId);
          setCustomDesign(null);
        } else if (loaded.designKind !== 'predefined') {
          setCustomDesign({
            kind: loaded.designKind,
            reference: loaded.designId,
            label: 'Saved custom background',
            ...(loaded.nameStyle === undefined
              ? {}
              : { nameStyle: loaded.nameStyle }),
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setNotice({
            kind: 'error',
            message: safeProductMessage(
              error,
              'The saved project could not be loaded.',
            ),
          });
          setProjectUnavailable(true);
        }
      })
      .finally(() => {
        if (!cancelled) setProjectLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    backend,
    draftStore,
    initialProjectId,
    snapshot.generation,
    state.status,
  ]);

  useEffect(() => {
    if (
      !initialProjectId ||
      projectLoading ||
      projectUnavailable ||
      dirty ||
      fetchedLatestExport.current
    )
      return;
    fetchedLatestExport.current = true;
    let cancelled = false;
    void backend
      .getLatestExport(initialProjectId)
      .then((latest) => {
        if (!cancelled && latest?.status === 'ready' && latest.storageUrl)
          setDownloadUrl(latest.storageUrl);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [backend, dirty, initialProjectId, projectLoading, projectUnavailable]);

  // A restored draft can select artwork different from the last saved project.
  // Resolve that current reference only from authorized reads or this session's
  // already-delivered selection; never persist or invent a private file URL.
  const listedArtworkAddress = customDesign
    ? (assets.find(
        (asset) =>
          asset.id === customDesign.reference &&
          asset.source === customDesign.kind,
      )?.url ??
      presets.find(
        (preset) =>
          preset.assetId === customDesign.reference &&
          preset.assetSource === customDesign.kind,
      )?.artworkUrl ??
      customDesign.artworkUrl)
    : undefined;
  const currentArtworkKey = customDesign
    ? `${customDesign.kind}:${customDesign.reference}`
    : null;
  const currentExactArtwork =
    exactArtwork?.key === currentArtworkKey ? exactArtwork : null;
  useEffect(() => {
    if (
      !customDesign ||
      !currentArtworkKey ||
      listedArtworkAddress ||
      state.status !== 'authenticated' ||
      assetLoadState === 'loading' ||
      presetLoadState === 'loading'
    )
      return;
    let cancelled = false;
    const key = currentArtworkKey;
    setExactArtwork({ key, state: 'loading' });
    void backend
      .getAsset(customDesign.reference)
      .then((asset) => {
        if (cancelled) return;
        if (
          asset?.id === customDesign.reference &&
          asset.source === customDesign.kind &&
          asset.url
        )
          setExactArtwork({ key, state: 'ready', address: asset.url });
        else setExactArtwork({ key, state: 'error' });
      })
      .catch(() => {
        if (!cancelled) setExactArtwork({ key, state: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [
    backend,
    currentArtworkKey,
    customDesign?.reference,
    customDesign?.kind,
    listedArtworkAddress,
    state.status,
    assetLoadState,
    presetLoadState,
    artworkRetry,
  ]);
  const customArtworkAddress =
    listedArtworkAddress ?? currentExactArtwork?.address;
  const selectedArtwork = useArtwork(
    state.status === 'authenticated' ? backend : null,
    customArtworkAddress,
  );
  const customArtworkUrl = selectedArtwork.url;
  const customArtworkState = customDesign
    ? !customArtworkAddress
      ? assetLoadState === 'loading' ||
        presetLoadState === 'loading' ||
        !currentExactArtwork ||
        currentExactArtwork.state === 'loading'
        ? 'loading'
        : 'error'
      : selectedArtwork.state === 'ready'
        ? undefined
        : selectedArtwork.state === 'error'
          ? 'error'
          : 'loading'
    : undefined;

  const useImportResult = (result: ReturnType<typeof normalizePastedText>) => {
    setIssues(result.issues);
    if (result.ok) {
      setGuests(result.guests);
      setDirty(true);
      setNotice({
        kind: 'success',
        message: `${result.guests.length} guest${result.guests.length === 1 ? '' : 's'} ready to preview.`,
      });
    } else {
      setGuests([]);
      setValidatedText('');
      setNotice({
        kind: 'error',
        message: 'Fix the highlighted guest-list issues before continuing.',
      });
    }
  };

  const previewPastedText = () => {
    if (pastedText.includes('\t')) {
      setFileTable(parsePastedGrid(pastedText));
      setNotice({
        kind: 'info',
        message: 'Review the detected columns, then choose Use these columns.',
      });
      return;
    }
    useImportResult(normalizePastedText(pastedText));
    setValidatedText(pastedText);
  };

  const continueFromGuestList = () => {
    if (pastedText.includes('\t')) {
      previewPastedText();
      return;
    }
    const result = normalizePastedText(pastedText);
    useImportResult(result);
    if (result.ok) {
      setValidatedText(pastedText);
      setActiveStep(2);
    }
  };

  const loadSampleGuests = () => {
    setPastedText(SAMPLE_GUESTS);
    setFileTable(null);
    useImportResult(normalizePastedText(SAMPLE_GUESTS));
    setValidatedText(SAMPLE_GUESTS);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy('Reading spreadsheet');
    try {
      const table = await parseGuestFile(file);
      setFileTable(table);
      setPastedText(
        table.rows
          .map((row) => row.map((cell) => String(cell ?? '')).join('\t'))
          .join('\n'),
      );
      setDirty(true);
      setGuests([]);
      setValidatedText('');
      setNotice(null);
    } catch (error) {
      setNotice({
        kind: 'error',
        message: safeProductMessage(
          error,
          'The spreadsheet could not be read.',
        ),
      });
    } finally {
      setBusy(null);
    }
  };

  const preserveAndSignIn = () => {
    try {
      draftStore.write({
        title,
        designId,
        layoutId,
        guests,
        pastedText,
        validatedText,
        activeStep,
        ...(customDesign
          ? {
              customDesign: {
                kind: customDesign.kind,
                reference: customDesign.reference,
                label: customDesign.label,
                ...(customDesign.nameStyle
                  ? { nameStyle: customDesign.nameStyle }
                  : {}),
              },
            }
          : {}),
      });
    } catch {
      setNotice({
        kind: 'error',
        message:
          'Your draft could not be retained for sign-in. Save a copy of the guest list, then try again.',
      });
      return;
    }
    allowNavigation.current = true;
    window.location.assign(
      client.getSignInUrl({
        returnPath: initialProjectId
          ? `/projects/${initialProjectId}`
          : '/create',
        intent: 'continue',
      }),
    );
  };

  const requireAccount = () => {
    if (state.status === 'authenticated') return true;
    if (state.status === 'signed_out') preserveAndSignIn();
    else
      setNotice({
        kind: 'info',
        message: 'Finish account setup before saving or exporting.',
      });
    return false;
  };

  const selectedDesign = DESIGN_CATALOG[designId];
  const selectedPremiumDesign =
    customDesign === null && selectedDesign.tier === 'premium';
  const premiumAccessPending =
    selectedPremiumDesign &&
    state.status === 'authenticated' &&
    access === null &&
    !accessLoadFailed;
  const premiumAccessUnverified =
    selectedPremiumDesign &&
    state.status === 'authenticated' &&
    access === null &&
    accessLoadFailed;
  const premiumDesignUnavailable =
    selectedPremiumDesign && access?.premiumDesignsEnabled === false;
  const activeProjectLimitReached =
    initialProjectId === undefined &&
    savedProject === null &&
    activeProjectCount !== null &&
    access?.maxActiveProjects !== undefined &&
    activeProjectCount >= access.maxActiveProjects;
  const saveUnavailable =
    premiumAccessPending ||
    premiumAccessUnverified ||
    premiumDesignUnavailable ||
    activeProjectLimitReached ||
    projectUnavailable ||
    projectLoading ||
    customArtworkState !== undefined;

  const currentInput = useMemo(
    () =>
      pastedText === validatedText
        ? guests
        : pastedText.includes('\t')
          ? []
          : (() => {
              const parsed = normalizePastedText(pastedText);
              return parsed.ok ? parsed.guests : [];
            })(),
    [guests, pastedText, validatedText],
  );
  const fitIssues = useMemo(
    () =>
      preflightRender({
        guests: currentInput,
        title: title.trim() || 'Untitled event',
        designId,
        layoutId,
        ...(customDesign?.nameStyle
          ? { nameStyle: customDesign.nameStyle }
          : {}),
      }),
    [currentInput, customDesign?.nameStyle, designId, layoutId, title],
  );
  const resolveCurrentGuests = () => {
    if (fileTable) {
      setActiveStep(1);
      setNotice({
        kind: 'error',
        message: 'Confirm the spreadsheet columns before saving or exporting.',
      });
      return null;
    }
    if (pastedText === validatedText && guests.length > 0) return guests;
    if (pastedText.includes('\t')) {
      previewPastedText();
      setActiveStep(1);
      return null;
    }
    const result = normalizePastedText(pastedText);
    useImportResult(result);
    if (!result.ok) {
      setActiveStep(1);
      return null;
    }
    setValidatedText(pastedText);
    return result.guests;
  };

  const save = async (navigateAfterSave = true) => {
    const currentGuests = resolveCurrentGuests();
    if (!currentGuests) return null;
    if (currentGuests.length === 0) {
      setNotice({
        kind: 'error',
        message: 'Add at least one guest before saving.',
      });
      return null;
    }
    const currentFitIssues = preflightRender({
      guests: currentGuests,
      title: title.trim() || 'Untitled event',
      designId,
      layoutId,
      ...(customDesign?.nameStyle ? { nameStyle: customDesign.nameStyle } : {}),
    });
    if (currentFitIssues.length) {
      setNotice({
        kind: 'error',
        message: `${currentFitIssues[0]?.message ?? 'A field does not fit.'} ${currentFitIssues[0]?.field === 'title' ? 'Shorten the project name or use supported characters.' : 'Shorten it or choose a smaller name size.'}`,
      });
      return null;
    }
    if (projectLoading || projectUnavailable) return null;
    if (customArtworkState) {
      setNotice({
        kind: customArtworkState === 'loading' ? 'info' : 'error',
        message:
          customArtworkState === 'loading'
            ? 'Wait for the selected artwork to load before saving or exporting.'
            : 'The selected artwork is unavailable. Retry loading it or choose a predefined design before saving or exporting.',
      });
      return null;
    }
    if (premiumAccessPending || premiumAccessUnverified) {
      setNotice({
        kind: 'info',
        message: premiumAccessPending
          ? 'Checking whether this Premium design is included in your plan.'
          : 'Your plan could not be checked. Refresh this page before saving this Premium design.',
      });
      return null;
    }
    if (premiumDesignUnavailable) {
      setNotice({
        kind: 'info',
        message: `${selectedDesign.name} is a Premium design. Choose an included design or change your plan before saving.`,
      });
      return null;
    }
    if (activeProjectLimitReached) {
      const projectLimit = access?.maxActiveProjects ?? 0;
      setNotice({
        kind: 'info',
        message: `Your ${access?.offerName ?? 'current'} plan allows ${projectLimit} active ${projectLimit === 1 ? 'project' : 'projects'}. Open or archive an existing project before creating another.`,
      });
      return null;
    }
    if (!requireAccount()) return null;
    setBusy('Saving project');
    try {
      const saved = await backend.saveProject({
        ...(savedProject === null ? {} : { projectId: savedProject.id }),
        title: title.trim() || 'Untitled event',
        guests: currentGuests,
        design: customDesign
          ? {
              kind: customDesign.kind,
              reference: customDesign.reference,
              ...(customDesign.nameStyle === undefined
                ? {}
                : { nameStyle: customDesign.nameStyle }),
            }
          : ({ kind: 'predefined', reference: designId } as const),
      });
      const project = { ...saved, guests: currentGuests };
      setSavedProject(project);
      setDownloadUrl(null);
      setDirty(false);
      draftStore.clear();
      setNotice({
        kind: 'success',
        message: 'Project saved securely to your account.',
      });
      if (
        navigateAfterSave &&
        onProjectSaved &&
        (!initialProjectId || project.id !== initialProjectId)
      ) {
        // Bypass departure protection only for the intended route change.
        // Saving this same project stays here; later edits still need a warning.
        allowNavigation.current = true;
        onProjectSaved(project);
      }
      return project;
    } catch (error) {
      setNotice({
        kind: 'error',
        message: safeProductMessage(error, 'The project could not be saved.'),
      });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    // Always validate and persist the current editor before requesting its PDF.
    const project = await save(false);
    if (!project) return;
    setBusy('Preparing print-ready PDF');
    setDownloadUrl(null);
    try {
      const requested = await backend.requestExport(project.id, layoutId);
      for (let attempt = 0; attempt < 45; attempt += 1) {
        const exportState = await backend.getExport(requested.exportId);
        if (exportState?.status === 'ready' && exportState.storageUrl) {
          if (!initialProjectId && onProjectSaved) {
            // The destination owns a new backend/file cache. Do not expose a
            // link from this route just before its cleanup revokes that Blob.
            allowNavigation.current = true;
            onProjectSaved(project);
            return;
          }
          setDownloadUrl(exportState.storageUrl);
          setNotice({
            kind: 'success',
            message: 'Your PDF is ready. Print it at Actual Size / 100%.',
          });
          return;
        }
        if (exportState?.status === 'failed')
          throw new Error(
            exportState.errorMessage ?? 'PDF preparation failed.',
          );
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
      throw new Error('The PDF is still preparing. Try again in a moment.');
    } catch (error) {
      setNotice({
        kind: 'error',
        message: safeProductMessage(error, 'The PDF could not be prepared.'),
      });
    } finally {
      setBusy(null);
    }
  };

  const uploadProjectArtwork = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !initialProjectId) return;
    setBusy('Uploading artwork');
    setNotice(null);
    try {
      const uploaded = await backend.uploadArtwork(file, initialProjectId);
      const nextAssets = await backend.listAssets();
      setAssets(nextAssets);
      const asset = nextAssets.find(
        (candidate) => candidate.id === uploaded.publicId,
      );
      setCustomDesign({
        kind: 'uploaded',
        reference: uploaded.publicId,
        label: file.name,
        ...(asset?.url ? { artworkUrl: asset.url } : {}),
      });
      setDirty(true);
      setNotice({
        kind: 'success',
        message: 'Artwork validated and applied to this event.',
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        message: safeProductMessage(
          error,
          'The artwork could not be uploaded.',
        ),
      });
    } finally {
      setBusy(null);
    }
  };

  const generateProjectBackgrounds = async () => {
    if (!initialProjectId) return;
    if (
      !aiRecovery &&
      (aiPrompt.trim().length < 3 || aiPrompt.trim().length > 400)
    ) {
      setNotice({
        kind: 'error',
        message: 'Describe the background in 3 to 400 characters.',
      });
      return;
    }
    if (
      !aiAttempt.current ||
      (!aiRecovery &&
        (aiAttempt.current.prompt !== aiPrompt ||
          aiAttempt.current.referenceImage !== referenceImage ||
          aiAttempt.current.developmentMock !== developmentMock))
    )
      aiAttempt.current = {
        prompt: aiPrompt,
        key: crypto.randomUUID(),
        referenceImage,
        developmentMock,
      };
    const attempt = aiAttempt.current;
    setBusy('Generating four backgrounds');
    setNotice(null);
    try {
      const batch = await backend.generateAi({
        prompt: attempt.prompt,
        idempotencyKey: attempt.key,
        projectId: initialProjectId,
        ...(attempt.referenceImage
          ? {
              referenceImage: {
                bytes: attempt.referenceImage.bytes,
                mimeType: attempt.referenceImage.mimeType,
              },
            }
          : {}),
        ...(attempt.developmentMock ? { developmentMock: true } : {}),
      });
      if (batch.status !== 'ready' || !batch.assets?.length) {
        if (batch.status !== 'failed') {
          setAiRecovery(true);
          setNotice({
            kind: 'info',
            message:
              'This batch is still completing. Retry this same batch to recover its choices; do not start another.',
          });
          return;
        }
        aiAttempt.current = null;
        setAiRecovery(false);
        throw new Error(
          'This background batch failed. Edit the description and try again.',
        );
      }
      setGeneratedChoices(batch.assets);
      aiAttempt.current = null;
      setAiRecovery(false);
      const [nextAccess, nextAssets] = await Promise.all([
        backend.getCurrentAccess(),
        backend.listAssets(),
      ]);
      setAccess(nextAccess);
      setAssets(nextAssets);
      setNotice({
        kind: 'success',
        message:
          'Four background choices are ready. Choose one for this event.',
      });
    } catch (error) {
      if (aiInputWasRejected(error)) aiAttempt.current = null;
      setAiRecovery(aiAttempt.current !== null);
      const nextAccess = await backend.getCurrentAccess().catch(() => null);
      if (nextAccess) setAccess(nextAccess);
      setNotice({
        kind: 'error',
        message: safeProductMessage(
          error,
          'The background choices could not be generated.',
        ),
      });
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    const signIn = () => preserveAndSignIn();
    window.addEventListener('tablecards:creator-sign-in', signIn);
    return () =>
      window.removeEventListener('tablecards:creator-sign-in', signIn);
  });

  return (
    <section
      ref={editorRef}
      className="creator-section"
      id="creator"
      aria-labelledby="creator-title"
      data-active-step={activeStep}
    >
      <div className="section-intro">
        <p className="eyebrow">
          {state.status === 'authenticated'
            ? 'Your place cards'
            : 'Try it before you sign in'}
        </p>
        <h2 id="creator-title">
          {initialProjectId || savedProject
            ? 'Edit your sheet'
            : state.status === 'authenticated'
              ? 'Create your place cards'
              : 'Build your first sheet'}
        </h2>
        <div className="project-name-field">
          <label htmlFor="project-title">Project name</label>
          <input
            id="project-title"
            value={title}
            maxLength={120}
            disabled={projectLoading || projectUnavailable || busy !== null}
            onChange={(event) => {
              setTitle(event.target.value);
              setDirty(true);
            }}
          />
        </div>
        <p>
          {initialProjectId || savedProject
            ? 'Changes stay in this tab until you save or export an updated PDF.'
            : 'Guest-list content stays in this tab until you choose to save or export.'}
        </p>
        <p className="save-state" role="status">
          {projectLoading
            ? 'Loading saved project…'
            : projectUnavailable
              ? 'Project unavailable in this workspace'
              : dirty
                ? 'Unsaved changes — save or export to keep this version'
                : savedProject
                  ? 'Saved to this workspace'
                  : 'Not saved yet'}
        </p>
        <button
          className="secondary-button complete-preview-action"
          type="button"
          disabled={
            currentInput.length === 0 ||
            Boolean(fileTable) ||
            customArtworkState !== undefined
          }
          onClick={() => setPreviewOpen(true)}
        >
          Open complete preview
        </button>
        {currentInput.length > 0 && fitIssues.length === 0 ? (
          <p className="preview-count">
            <strong>{currentInput.length}</strong> cards ·{' '}
            <strong>
              {Math.ceil(
                currentInput.length / PRINT_LAYOUTS[layoutId].cardsPerSheet,
              )}
            </strong>{' '}
            PDF pages
          </p>
        ) : null}
      </div>
      {busy ? (
        <p className="busy creator-feedback" role="status">
          <span />
          {busy}…
        </p>
      ) : null}
      {notice ? (
        <p
          className={`notice ${notice.kind} creator-feedback`}
          role={notice.kind === 'error' ? 'alert' : 'status'}
        >
          {notice.message}
        </p>
      ) : null}
      {fitIssues.length ? (
        <p className="notice error creator-feedback" role="alert">
          {fitIssues[0]?.message}{' '}
          {fitIssues[0]?.field === 'title'
            ? 'Shorten the project name or use supported characters before saving or exporting.'
            : 'Shorten this field or choose a smaller name size before saving or exporting.'}
        </p>
      ) : null}
      {customArtworkState ? (
        <div
          className={`notice ${customArtworkState === 'loading' ? 'info' : 'error'} creator-feedback`}
          role={customArtworkState === 'loading' ? 'status' : 'alert'}
        >
          <p>
            {customArtworkState === 'loading'
              ? 'Loading your selected artwork. Save, export and complete preview are unavailable until it is ready.'
              : 'The selected artwork could not be loaded in this workspace. Your edits are preserved. Retry artwork or choose a predefined design.'}
          </p>
          {customArtworkState === 'error' ? (
            <button
              className="secondary-button"
              type="button"
              disabled={state.status !== 'authenticated'}
              onClick={() => {
                selectedArtwork.retry();
                setArtworkRetry((attempt) => attempt + 1);
              }}
            >
              Retry artwork
            </button>
          ) : null}
        </div>
      ) : null}
      {projectUnavailable ? (
        <p className="notice info">
          <Link to="/projects">Return to Projects</Link> to open a project in
          this workspace.
        </p>
      ) : null}
      <div className="creator-layout">
        <div
          className="creator-controls"
          inert={projectLoading || projectUnavailable || busy !== null}
        >
          <nav className="creator-step-navigation" aria-label="Creator steps">
            {([1, 2, 3] as const).map((step) => (
              <button
                key={step}
                type="button"
                className={activeStep === step ? 'active' : ''}
                aria-current={activeStep === step ? 'step' : undefined}
                onClick={() => setActiveStep(step)}
              >
                {step === 1 ? 'Guests' : step === 2 ? 'Design' : 'Review'}
              </button>
            ))}
          </nav>
          <div
            className="step-card"
            data-creator-step="1"
            data-active={activeStep === 1}
          >
            <span className="step-number">1</span>
            <div className="step-heading">
              <h3 tabIndex={-1}>Add your guest list</h3>
              <span>up to 500 rows</span>
            </div>
            <div className="guest-list-heading">
              <label htmlFor="guest-list">
                Paste one name per line, or copy columns from a spreadsheet
              </label>
              <button
                className="text-button"
                type="button"
                onClick={loadSampleGuests}
              >
                Try an example list
              </button>
            </div>
            <textarea
              id="guest-list"
              value={pastedText}
              placeholder={GUEST_LIST_PLACEHOLDER}
              onChange={(event) => {
                setPastedText(event.target.value);
                setFileTable(null);
                setIssues([]);
                setDirty(true);
              }}
              rows={8}
            />
            <div className="inline-actions wrap">
              <button
                className="button desktop-preview-action"
                type="button"
                onClick={previewPastedText}
              >
                {pastedText.includes('\t')
                  ? 'Review spreadsheet columns'
                  : 'Preview names'}
              </button>
              <label className="file-button">
                Upload CSV or XLSX
                <input
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) => void handleFile(event)}
                />
              </label>
            </div>
            {fileTable ? (
              <ImportMapping
                table={fileTable}
                onCancel={() => setFileTable(null)}
                onApply={(mapping) => {
                  const result = applyGuestMapping(fileTable, mapping);
                  useImportResult(result);
                  if (result.ok) {
                    const text = guestRowsToText(result.guests);
                    setPastedText(text);
                    setValidatedText(text);
                    setFileTable(null);
                    setActiveStep(2);
                  }
                }}
              />
            ) : null}
            {issues.length > 0 ? (
              <ul
                className="issue-list"
                aria-label="Import issues"
                role="alert"
              >
                {issues.slice(0, 8).map((issue, index) => (
                  <li key={`${issue.code}-${issue.row ?? 0}-${index}`}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              className="mobile-step-next button"
              type="button"
              disabled={pastedText.trim().length === 0 && guests.length === 0}
              onClick={continueFromGuestList}
            >
              {pastedText.includes('\t')
                ? 'Review spreadsheet columns'
                : 'Continue to design'}
            </button>
          </div>
          <div
            className="step-card"
            data-creator-step="2"
            data-active={activeStep === 2}
          >
            <span className="step-number">2</span>
            <div className="step-heading">
              <h3 tabIndex={-1}>Choose the look</h3>
              <span>three designs are free</span>
            </div>
            <DesignPicker
              selected={designId}
              onSelect={(nextDesignId) => {
                setDesignId(nextDesignId);
                setCustomDesign(null);
                setDirty(true);
              }}
            />
            {selectedPremiumDesign && access?.premiumDesignsEnabled !== true ? (
              <p className="notice info design-access-note" role="status">
                <strong>{selectedDesign.name} is a Premium design.</strong>{' '}
                {premiumAccessPending ? (
                  <>Checking whether it is included in your plan…</>
                ) : premiumAccessUnverified ? (
                  <>
                    We could not check your plan. Refresh this page before
                    saving.
                  </>
                ) : premiumDesignUnavailable ? (
                  <>
                    Choose one of the three included designs, or{' '}
                    <Link to="/settings">view your plan</Link> before saving.
                  </>
                ) : (
                  <>Sign in with a paid plan to save or export this design.</>
                )}
              </p>
            ) : null}
            {state.status === 'authenticated' ? (
              <div className="preset-chooser">
                <div className="step-heading">
                  <h4>Reusable presets</h4>
                  <span>
                    {access?.aiBackgroundBatchesRemaining ?? 0} AI batches
                    remaining
                  </span>
                </div>
                {access?.reusablePresetsEnabled && presets.length > 0 ? (
                  <div className="preset-choice-row">
                    {presets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={
                          customDesign?.reference === preset.assetId
                            ? 'active'
                            : ''
                        }
                        onClick={() => {
                          setCustomDesign({
                            kind: preset.assetSource,
                            reference: preset.assetId,
                            label: preset.displayName,
                            ...(preset.artworkUrl
                              ? { artworkUrl: preset.artworkUrl }
                              : {}),
                            nameStyle: {
                              color: preset.nameColor,
                              position: preset.namePosition,
                              font: preset.nameFont,
                              size: preset.nameSize,
                            },
                          });
                          setDirty(true);
                        }}
                      >
                        <ArtworkThumbnail
                          backend={backend}
                          address={preset.artworkUrl}
                        />
                        {preset.displayName}
                      </button>
                    ))}
                  </div>
                ) : access?.reusablePresetsEnabled &&
                  presetLibrary.page.done ? (
                  <p className="muted">No reusable presets yet.</p>
                ) : null}
                {access?.reusablePresetsEnabled ? (
                  <MetadataPageControls
                    label="presets"
                    page={presetLibrary.page}
                    onLoadMore={presetLibrary.loadMore}
                    disabled={busy !== null}
                    showEnd={presets.length > 0}
                  />
                ) : null}
                {access?.reusablePresetsEnabled ? (
                  <Link className="text-button" to="/designs">
                    Manage uploads, AI backgrounds and presets
                  </Link>
                ) : null}
              </div>
            ) : null}
            {state.status === 'authenticated' && access ? (
              <section
                className="project-creative-tools"
                aria-labelledby="project-background-title"
              >
                <div className="step-heading">
                  <h4 id="project-background-title">This event's background</h4>
                  <span>
                    {access.aiBackgroundBatchesRemaining ?? 0} AI batches
                    remaining
                  </span>
                </div>
                {!initialProjectId ? (
                  <p className="muted">
                    Save the project first, then reopen it to add event artwork
                    or generate four background choices.
                  </p>
                ) : (
                  <div className="creative-tools-grid">
                    {access.artworkUploadEnabled ? (
                      <label className="file-button full-width">
                        Upload artwork for this event
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={(event) => void uploadProjectArtwork(event)}
                        />
                      </label>
                    ) : null}
                    <div>
                      <label htmlFor="project-ai-prompt">
                        AI background description
                      </label>
                      <textarea
                        id="project-ai-prompt"
                        rows={3}
                        required
                        minLength={3}
                        maxLength={400}
                        value={aiPrompt}
                        disabled={
                          busy !== null || aiRecovery || aiRecoveryLoading
                        }
                        onChange={(event) => setAiPrompt(event.target.value)}
                      />
                      <AiReferenceInput
                        value={referenceImage}
                        onChange={setReferenceImage}
                        onBusyChange={setReferenceBusy}
                        disabled={
                          busy !== null || aiRecovery || aiRecoveryLoading
                        }
                      />
                      <AiTestProviderControl
                        developmentMock={developmentMock}
                        onChange={setDevelopmentMock}
                        disabled={
                          busy !== null || aiRecovery || aiRecoveryLoading
                        }
                      />
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={
                          busy !== null ||
                          referenceBusy ||
                          aiRecoveryLoading ||
                          (!aiRecovery &&
                            ((access.aiBackgroundBatchesRemaining ?? 0) < 1 ||
                              aiPrompt.trim().length < 3 ||
                              aiPrompt.trim().length > 400))
                        }
                        onClick={() => void generateProjectBackgrounds()}
                      >
                        {aiRecovery
                          ? 'Retry this background batch'
                          : 'Generate four choices'}
                      </button>
                    </div>
                  </div>
                )}
                {initialProjectId && access.artworkUploadEnabled ? (
                  <p className="muted">
                    Static PNG (8-bit or lower) or JPEG, unrotated 7:4. Minimum
                    1050 × 600; maximum 2 megapixels and 10 MiB.
                  </p>
                ) : null}
                {generatedChoices.length > 0 ? (
                  <div
                    className="asset-grid"
                    aria-label="AI background choices"
                  >
                    {generatedChoices.map((choice, index) => (
                      <button
                        type="button"
                        key={choice.id}
                        className="ai-choice"
                        aria-pressed={customDesign?.reference === choice.id}
                        onClick={() => {
                          setCustomDesign({
                            kind: 'ai',
                            reference: choice.id,
                            label: `AI choice ${index + 1}`,
                            artworkUrl: choice.url,
                          });
                          setDirty(true);
                        }}
                      >
                        <ArtworkThumbnail
                          backend={backend}
                          address={choice.url}
                          className="asset-preview"
                        />
                        Use AI choice {index + 1}
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
            {developmentControlsEnabled ? (
              <fieldset className="print-layout-options">
                <legend>Print layout to test</legend>
                {(Object.keys(PRINT_LAYOUTS) as PrintLayoutId[]).map(
                  (optionId) => {
                    const option = PRINT_LAYOUTS[optionId];
                    return (
                      <label key={option.id}>
                        <input
                          type="radio"
                          name="print-layout"
                          value={option.id}
                          checked={layoutId === option.id}
                          onChange={() => {
                            setLayoutId(option.id);
                            setDirty(true);
                          }}
                        />
                        <span>
                          <strong>{option.name}</strong>
                          <small>{option.description}</small>
                        </span>
                      </label>
                    );
                  },
                )}
                <p>
                  Landscape is a development print trial. Measure the one-inch
                  square and confirm all quarter-inch edges print cleanly.
                </p>
                <a
                  className="text-button print-test-download"
                  href="/six-card-landscape-print-test.pdf"
                  download
                >
                  Download the ready six-card print-test PDF
                </a>
              </fieldset>
            ) : null}
            {customDesign ? (
              <p className="custom-selection">
                Using{' '}
                {customDesign.kind === 'ai'
                  ? 'AI background'
                  : 'uploaded artwork'}
                : <strong>{customDesign.label}</strong>{' '}
                <button
                  type="button"
                  onClick={() => {
                    setCustomDesign(null);
                    setDirty(true);
                  }}
                >
                  Use predefined design instead
                </button>
              </p>
            ) : null}
            {customDesign && access?.artworkUploadEnabled ? (
              <fieldset className="name-style-fields">
                <legend>Name styling for this event</legend>
                <label>
                  Font
                  <select
                    value={customDesign.nameStyle?.font ?? 'sans'}
                    onChange={(event) => {
                      setCustomDesign({
                        ...customDesign,
                        nameStyle: {
                          color: '#243026',
                          position: 'center',
                          size: 'medium',
                          ...customDesign.nameStyle,
                          font: event.target.value as NameStyle['font'],
                        },
                      });
                      setDirty(true);
                    }}
                  >
                    <option value="sans">Clean sans</option>
                    <option value="serif">Classic serif</option>
                  </select>
                </label>
                <label>
                  Size
                  <select
                    value={customDesign.nameStyle?.size ?? 'medium'}
                    onChange={(event) => {
                      setCustomDesign({
                        ...customDesign,
                        nameStyle: {
                          color: '#243026',
                          position: 'center',
                          font: 'sans',
                          ...customDesign.nameStyle,
                          size: event.target.value as NameStyle['size'],
                        },
                      });
                      setDirty(true);
                    }}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </label>
                <label>
                  Position
                  <select
                    value={customDesign.nameStyle?.position ?? 'center'}
                    onChange={(event) => {
                      setCustomDesign({
                        ...customDesign,
                        nameStyle: {
                          color: '#243026',
                          size: 'medium',
                          font: 'sans',
                          ...customDesign.nameStyle,
                          position: event.target.value as NameStyle['position'],
                        },
                      });
                      setDirty(true);
                    }}
                  >
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </label>
                <label>
                  Color
                  <input
                    type="color"
                    value={customDesign.nameStyle?.color ?? '#243026'}
                    onChange={(event) => {
                      setCustomDesign({
                        ...customDesign,
                        nameStyle: {
                          position: 'center',
                          size: 'medium',
                          font: 'sans',
                          ...customDesign.nameStyle,
                          color: event.target.value,
                        },
                      });
                      setDirty(true);
                    }}
                  />
                </label>
              </fieldset>
            ) : null}
            <button
              className="mobile-step-next button"
              type="button"
              onClick={() => setActiveStep(3)}
            >
              Review and export
            </button>
          </div>
          <div
            className="step-card action-card"
            data-creator-step="3"
            data-active={activeStep === 3}
          >
            <span className="step-number">3</span>
            <div className="step-heading">
              <h3 tabIndex={-1}>Save and export</h3>
              <span>PDF only — you print it</span>
            </div>
            <AuthGate />
            {activeProjectLimitReached ? (
              <p className="notice info save-access-note" role="status">
                Your {access?.offerName ?? 'current'} plan allows{' '}
                {access?.maxActiveProjects ?? 0} active{' '}
                {access?.maxActiveProjects === 1 ? 'project' : 'projects'}.{' '}
                <Link to="/projects">Open or archive an existing project</Link>{' '}
                before creating another.
              </p>
            ) : null}
            {premiumDesignUnavailable ? (
              <p className="notice info save-access-note" role="status">
                {selectedDesign.name} requires a paid plan.{' '}
                <button
                  className="inline-link-button"
                  type="button"
                  onClick={() => setActiveStep(2)}
                >
                  Choose an included design
                </button>{' '}
                or <Link to="/settings">view your plan</Link>.
              </p>
            ) : null}
            {premiumAccessPending || premiumAccessUnverified ? (
              <p className="notice info save-access-note" role="status">
                {premiumAccessPending
                  ? 'Checking whether this Premium design is included in your plan…'
                  : 'Your plan could not be checked. Refresh this page before saving or exporting this Premium design.'}
              </p>
            ) : null}
            <div className="inline-actions wrap">
              <button
                className="secondary-button"
                type="button"
                disabled={
                  busy !== null ||
                  pastedText.trim().length === 0 ||
                  saveUnavailable ||
                  fitIssues.length > 0
                }
                onClick={() => void save(true)}
              >
                Save project
              </button>
              <button
                className="button"
                type="button"
                disabled={
                  busy !== null ||
                  pastedText.trim().length === 0 ||
                  saveUnavailable ||
                  fitIssues.length > 0
                }
                onClick={() => void exportPdf()}
              >
                Create print-ready PDF
              </button>
              {downloadUrl && !dirty ? (
                <a
                  className="button success-button"
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download PDF
                </a>
              ) : null}
            </div>
          </div>
        </div>
        <div className="creator-preview">
          <SheetPreview
            showSummary={false}
            guests={currentInput}
            title={title.trim() || 'Untitled event'}
            designId={designId}
            layoutId={layoutId}
            artworkState={customArtworkState}
            {...(customArtworkUrl
              ? { backgroundImageHref: customArtworkUrl }
              : {})}
            {...(customDesign?.nameStyle === undefined
              ? {}
              : { nameStyle: customDesign.nameStyle })}
          />
          <div className="print-callout">
            <strong>Before you print</strong>
            <p>
              Use US Letter paper and select <b>Actual Size</b> or <b>100%</b>.
              Test-print one sheet before printing the full set. Calibration is
              available separately in the print-test PDF, not your export.
            </p>
          </div>
        </div>
      </div>
      {previewOpen ? (
        <PreviewDialog onClose={() => setPreviewOpen(false)}>
          <SheetPreview
            showSummary={false}
            guests={currentInput}
            title={title.trim() || 'Untitled event'}
            designId={designId}
            layoutId={layoutId}
            artworkState={customArtworkState}
            {...(customArtworkUrl
              ? { backgroundImageHref: customArtworkUrl }
              : {})}
            {...(customDesign?.nameStyle
              ? { nameStyle: customDesign.nameStyle }
              : {})}
          />
        </PreviewDialog>
      ) : null}
    </section>
  );
}

export function StaticNotice({ children }: { readonly children: ReactNode }) {
  return <p className="notice info">{children}</p>;
}
