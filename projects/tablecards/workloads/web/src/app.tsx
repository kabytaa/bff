import {
  DESIGN_CATALOG,
  DESIGN_IDS,
  PRINT_LAYOUTS,
  createRenderManifest,
  normalizePastedText,
  renderDesignFaceToSvg,
  renderManifestPageToSvg,
  type DesignId,
  type GuestColumnMapping,
  type GuestImportIssue,
  type GuestRow,
  type NameStyle,
  type PrintLayoutId,
} from '@tablecards/core';
import { BffAccountSelector, useBffAuth } from '@tofler/bff-auth/react';
import { useConvex } from 'convex/react';
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
  createTableCardsBackend,
  type CurrentProductAccess,
  type DesignPreset,
  type SavedProject,
} from './backend';
import { createTableCardsDraftStore } from './draft';
import {
  applyGuestMapping,
  parseGuestFile,
  parsePastedGrid,
  type ParsedGuestTable,
} from './imports';

const SAMPLE_GUESTS = `Ada Lovelace
Lin Manuel
Grace Hopper
James Baldwin`;

const GUEST_LIST_PLACEHOLDER = `Paste one name per line, for example:
Olivia Bennett
José García
Zoë Martin`;

interface Notice {
  readonly kind: 'error' | 'success' | 'info';
  readonly message: string;
}

function safeMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.length <= 240
    ? error.message
    : fallback;
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

function SheetPreview({
  guests,
  designId,
  layoutId,
  backgroundImageHref,
  nameStyle,
}: {
  readonly guests: readonly GuestRow[];
  readonly designId: DesignId;
  readonly layoutId: PrintLayoutId;
  readonly backgroundImageHref?: string;
  readonly nameStyle?: NameStyle;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const preview = useMemo(() => {
    if (guests.length === 0) return null;
    try {
      const manifest = createRenderManifest({
        guests,
        designId,
        layoutId,
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
  }, [backgroundImageHref, designId, guests, layoutId, nameStyle, pageIndex]);
  const totalPages = preview?.manifest.pages.length ?? 0;
  useEffect(() => {
    setPageIndex((current) => Math.min(current, Math.max(totalPages - 1, 0)));
  }, [totalPages]);

  if (!preview) {
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
        <p>
          <strong>{guests.length}</strong> cards · <strong>{totalPages}</strong>{' '}
          PDF pages including scale check
        </p>
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
            {pageIndex === 0 ? 'Scale guide' : `Sheet ${pageIndex}`} ·{' '}
            {pageIndex + 1}/{totalPages}
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

function AuthGate({
  onCreateAccount,
}: {
  readonly onCreateAccount: () => Promise<void>;
}) {
  const { state } = useBffAuth();
  if (state.status === 'loading')
    return <p className="auth-note">Checking your session…</p>;
  if (state.status === 'recoverable_error') {
    return <p className="notice error">{state.message}</p>;
  }
  if (state.status === 'onboarding_required') {
    return (
      <div className="auth-note">
        <strong>One quick setup step</strong>
        <p>Create your TableCards account before saving this project.</p>
        <button
          className="button button-small"
          type="button"
          onClick={() => void onCreateAccount()}
        >
          Create my account
        </button>
      </div>
    );
  }
  if (state.status === 'account_selection_required') {
    return (
      <div className="auth-note">
        <strong>Choose where to save this event</strong>
        <BffAccountSelector className="account-select wide" label="Account" />
      </div>
    );
  }
  return null;
}

export function Creator({
  developmentControlsEnabled,
  initialProjectId,
  onProjectSaved,
}: {
  readonly developmentControlsEnabled: boolean;
  readonly initialProjectId?: string;
  readonly onProjectSaved?: (project: SavedProject) => void;
}) {
  const { client, snapshot, state } = useBffAuth();
  const convex = useConvex();
  const backend = useMemo(
    () => createTableCardsBackend(convex, client),
    [client, convex],
  );
  const draftStore = useMemo(() => createTableCardsDraftStore(), []);
  const restored = useRef(false);
  const wasAuthenticated = useRef(false);
  const allowNavigation = useRef(false);
  const [pastedText, setPastedText] = useState('');
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
  const [presets, setPresets] = useState<readonly DesignPreset[]>([]);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [dirty, setDirty] = useState(false);
  const blocker = useBlocker(() => dirty && !allowNavigation.current);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('Discard the unsaved changes to this project?')) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

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
    const draft = draftStore.read();
    if (!draft) return;
    setTitle(draft.title);
    setDesignId(draft.designId);
    setLayoutId(draft.layoutId);
    setGuests(draft.guests);
    setDirty(true);
    setNotice({
      kind: 'info',
      message: 'Your guest list was restored after sign-in.',
    });
  }, [draftStore]);

  useEffect(() => {
    if (state.status === 'authenticated') wasAuthenticated.current = true;
    if (wasAuthenticated.current && state.status === 'signed_out') {
      draftStore.clear();
      setSavedProject(null);
      setDownloadUrl(null);
      wasAuthenticated.current = false;
    }
  }, [draftStore, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated') return;
    let cancelled = false;
    void Promise.all([backend.getCurrentAccess(), backend.listPresets()])
      .then(([nextAccess, nextPresets]) => {
        if (cancelled) return;
        setAccess(nextAccess);
        setPresets(nextPresets);
        setCustomDesign((current) => {
          if (!current || current.artworkUrl) return current;
          const preset = nextPresets.find(
            (candidate) => candidate.assetId === current.reference,
          );
          return preset?.artworkUrl
            ? { ...current, artworkUrl: preset.artworkUrl }
            : current;
        });
      })
      .catch(() => {
        if (!cancelled) setPresets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [backend, snapshot.generation, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated' || !initialProjectId) return;
    let cancelled = false;
    void backend
      .getProject(initialProjectId)
      .then((loaded) => {
        if (cancelled || !loaded?.guests) return;
        setSavedProject(loaded);
        setTitle(loaded.title);
        setGuests(loaded.guests);
        setDirty(false);
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
            message: safeMessage(
              error,
              'The saved project could not be loaded.',
            ),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [backend, initialProjectId, snapshot.generation, state.status]);

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
  };

  const loadSampleGuests = () => {
    setPastedText(SAMPLE_GUESTS);
    setFileTable(null);
    useImportResult(normalizePastedText(SAMPLE_GUESTS));
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy('Reading spreadsheet');
    try {
      setFileTable(await parseGuestFile(file));
      setNotice(null);
    } catch (error) {
      setNotice({
        kind: 'error',
        message: safeMessage(error, 'The spreadsheet could not be read.'),
      });
    } finally {
      setBusy(null);
    }
  };

  const preserveAndSignIn = () => {
    if (guests.length > 0)
      draftStore.write({ title, designId, layoutId, guests });
    allowNavigation.current = true;
    window.location.assign(
      client.getSignInUrl({ returnPath: '/create', intent: 'continue' }),
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

  const save = async (navigateAfterSave = true) => {
    if (guests.length === 0) {
      setNotice({
        kind: 'error',
        message: 'Add at least one guest before saving.',
      });
      return null;
    }
    if (!requireAccount()) return null;
    setBusy('Saving project');
    try {
      const saved = await backend.saveProject({
        ...(savedProject === null ? {} : { projectId: savedProject.id }),
        title: title.trim() || 'Untitled event',
        guests,
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
      const project = { ...saved, guests };
      setSavedProject(project);
      setDirty(false);
      draftStore.clear();
      setNotice({
        kind: 'success',
        message: 'Project saved securely to your account.',
      });
      if (navigateAfterSave) {
        allowNavigation.current = true;
        onProjectSaved?.(project);
      }
      return project;
    } catch (error) {
      setNotice({
        kind: 'error',
        message: safeMessage(error, 'The project could not be saved.'),
      });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    const project = savedProject ?? (await save(false));
    if (!project) return;
    setBusy('Preparing print-ready PDF');
    setDownloadUrl(null);
    try {
      const requested = await backend.requestExport(project.id, layoutId);
      for (let attempt = 0; attempt < 45; attempt += 1) {
        const exportState = await backend.getExport(requested.exportId);
        if (exportState?.status === 'ready' && exportState.storageUrl) {
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
        message: safeMessage(error, 'The PDF could not be prepared.'),
      });
    } finally {
      setBusy(null);
    }
  };

  const createAccount = async () => {
    setBusy('Creating account');
    try {
      await client.createAccount('My TableCards account');
    } catch (error) {
      setNotice({
        kind: 'error',
        message: safeMessage(error, 'The account could not be created.'),
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      className="creator-section"
      id="creator"
      aria-labelledby="creator-title"
      data-active-step={activeStep}
    >
      <div className="section-intro">
        <p className="eyebrow">Try it before you sign in</p>
        <h2 id="creator-title">Build your first sheet</h2>
        <p>
          Guest-list content stays in this tab until you choose to save or
          export.
        </p>
      </div>
      <div className="creator-layout">
        <div className="creator-controls">
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
              <h3>Add your guest list</h3>
              <span>up to 500 rows</span>
            </div>
            <label htmlFor="guest-list">
              Paste one name per line, or copy columns from a spreadsheet
            </label>
            <textarea
              id="guest-list"
              value={pastedText}
              placeholder={GUEST_LIST_PLACEHOLDER}
              onChange={(event) => setPastedText(event.target.value)}
              rows={8}
            />
            <div className="inline-actions wrap">
              <button
                className="button"
                type="button"
                onClick={previewPastedText}
              >
                {pastedText.includes('\t')
                  ? 'Review spreadsheet columns'
                  : 'Preview names'}
              </button>
              <button
                className="text-button"
                type="button"
                onClick={loadSampleGuests}
              >
                Try an example list
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
                  useImportResult(applyGuestMapping(fileTable, mapping));
                  setFileTable(null);
                }}
              />
            ) : null}
            {issues.length > 0 ? (
              <ul className="issue-list" aria-label="Import issues">
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
              disabled={guests.length === 0}
              onClick={() => setActiveStep(2)}
            >
              Continue to design
            </button>
          </div>
          <div
            className="step-card"
            data-creator-step="2"
            data-active={activeStep === 2}
          >
            <span className="step-number">2</span>
            <div className="step-heading">
              <h3>Choose the look</h3>
              <span>three designs are free</span>
            </div>
            <label htmlFor="project-title">Event name</label>
            <input
              id="project-title"
              value={title}
              maxLength={120}
              onChange={(event) => {
                setTitle(event.target.value);
                setDirty(true);
              }}
            />
            <DesignPicker
              selected={designId}
              onSelect={(nextDesignId) => {
                setDesignId(nextDesignId);
                setCustomDesign(null);
                setDirty(true);
              }}
            />
            {state.status === 'authenticated' ? (
              <div className="preset-chooser">
                <div className="step-heading">
                  <h4>Reusable presets</h4>
                  <span>
                    {access?.aiBackgroundBatchesRemaining ?? 0} AI batches
                    remaining
                  </span>
                </div>
                {presets.length > 0 ? (
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
                        <span
                          style={
                            preset.artworkUrl
                              ? {
                                  backgroundImage: `url(${preset.artworkUrl})`,
                                }
                              : undefined
                          }
                        />
                        {preset.displayName}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No reusable presets yet.</p>
                )}
                <Link className="text-button" to="/designs">
                  Manage uploads, AI backgrounds and presets
                </Link>
              </div>
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
              <h3>Save and export</h3>
              <span>PDF only — you print it</span>
            </div>
            <AuthGate onCreateAccount={createAccount} />
            <div className="inline-actions wrap">
              <button
                className="secondary-button"
                type="button"
                disabled={busy !== null || guests.length === 0}
                onClick={() => void save(true)}
              >
                Save project
              </button>
              <button
                className="button"
                type="button"
                disabled={busy !== null || guests.length === 0}
                onClick={() => void exportPdf()}
              >
                Create print-ready PDF
              </button>
              {downloadUrl ? (
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
            {busy ? (
              <p className="busy" role="status">
                <span />
                {busy}…
              </p>
            ) : null}
            {notice ? (
              <p
                className={`notice ${notice.kind}`}
                role={notice.kind === 'error' ? 'alert' : 'status'}
              >
                {notice.message}
              </p>
            ) : null}
          </div>
        </div>
        <div className="creator-preview">
          <SheetPreview
            guests={guests}
            designId={designId}
            layoutId={layoutId}
            {...(customDesign?.artworkUrl
              ? { backgroundImageHref: customDesign.artworkUrl }
              : {})}
            {...(customDesign?.nameStyle === undefined
              ? {}
              : { nameStyle: customDesign.nameStyle })}
          />
          <div className="print-callout">
            <strong>Before you print</strong>
            <p>
              Use US Letter paper and select <b>Actual Size</b> or <b>100%</b>.
              Measure the 1-inch square on page one before printing the full
              set.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StaticNotice({ children }: { readonly children: ReactNode }) {
  return <p className="notice info">{children}</p>;
}
