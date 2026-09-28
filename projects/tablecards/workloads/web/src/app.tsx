import {
  DESIGN_CATALOG,
  DESIGN_IDS,
  OFFER_CATALOG,
  PRINT_LAYOUTS,
  createRenderManifest,
  normalizePastedText,
  renderDesignFaceToSvg,
  renderManifestPageToSvg,
  type DesignId,
  type GuestColumnMapping,
  type GuestImportIssue,
  type GuestRow,
  type OfferId,
  type PrintLayoutId,
} from '@tablecards/core';
import {
  BffAccountSelector,
  BffAuthLink,
  BffSignOutButton,
  useBffAuth,
} from '@tofler/bff-auth/react';
import { useConvex } from 'convex/react';
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  createTableCardsBackend,
  type AiAsset,
  type CurrentProductAccess,
  type ProjectSummary,
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

function scrollToCreator() {
  document.getElementById('creator')?.scrollIntoView({ behavior: 'smooth' });
}

function Header() {
  const { state } = useBffAuth();
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="TableCards home">
        <span className="brand-mark" aria-hidden="true">
          TC
        </span>
        <span>TableCards</span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#pricing">Pricing</a>
        <a href="#faq">FAQ</a>
      </nav>
      <div className="header-actions">
        {state.status === 'authenticated' ? (
          <>
            <BffAccountSelector
              className="account-select"
              label={<span className="sr-only">Account</span>}
            />
            <BffSignOutButton className="text-button">
              Sign out
            </BffSignOutButton>
          </>
        ) : state.status === 'signed_out' ? (
          <BffAuthLink
            className="text-button"
            intent="login"
            returnPath="/create"
          >
            Log in
          </BffAuthLink>
        ) : null}
        <button
          className="button button-small"
          type="button"
          onClick={scrollToCreator}
        >
          Make place cards
        </button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">Your guest list, ready for the table</p>
        <h1 id="hero-title">
          Place cards that print <em>right</em> the first time.
        </h1>
        <p className="hero-lead">
          Paste a list or upload your spreadsheet. Preview every folded card,
          then download a precise US Letter PDF you can print anywhere.
        </p>
        <div className="hero-actions">
          <button className="button" type="button" onClick={scrollToCreator}>
            Create free — up to 25 cards
          </button>
          <span>No card details. No watermark.</span>
        </div>
        <dl className="trust-row">
          <div>
            <dt>4</dt>
            <dd>folded cards per sheet</dd>
          </div>
          <div>
            <dt>3.5 × 2 in</dt>
            <dd>finished card size</dd>
          </div>
          <div>
            <dt>100%</dt>
            <dd>actual-size print guide</dd>
          </div>
        </dl>
      </div>
      <div className="hero-art" aria-label="Example folded place cards">
        <div className="linen" />
        <div className="place-card place-card-back">
          <span>Table 12</span>
          <strong>Lin Manuel</strong>
        </div>
        <div className="place-card place-card-front">
          <span>Table 12 · Vegan</span>
          <strong>Ada Lovelace</strong>
          <i aria-hidden="true">✦</i>
        </div>
        <p className="hero-note">
          Designed for folding, cutting and clear names
        </p>
      </div>
    </section>
  );
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
}: {
  readonly guests: readonly GuestRow[];
  readonly designId: DesignId;
  readonly layoutId: PrintLayoutId;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const preview = useMemo(() => {
    if (guests.length === 0) return null;
    try {
      const manifest = createRenderManifest({
        guests,
        designId,
        layoutId,
      });
      return {
        manifest,
        svg: renderManifestPageToSvg(
          manifest,
          Math.min(pageIndex, manifest.pages.length - 1),
          {
            backgroundImageHref: DESIGN_CATALOG[designId].artwork.publicPath,
          },
        ),
      };
    } catch {
      return null;
    }
  }, [designId, guests, layoutId, pageIndex]);
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

function Creator({
  developmentControlsEnabled,
}: {
  readonly developmentControlsEnabled: boolean;
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
  } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [savedProject, setSavedProject] = useState<SavedProject | null>(null);
  const [projects, setProjects] = useState<readonly ProjectSummary[]>([]);
  const [access, setAccess] = useState<CurrentProductAccess | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState(
    'Soft watercolor wildflowers on warm ivory, subtle and elegant',
  );
  const [aiAssets, setAiAssets] = useState<readonly AiAsset[]>([]);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const draft = draftStore.read();
    if (!draft) return;
    setTitle(draft.title);
    setDesignId(draft.designId);
    setLayoutId(draft.layoutId);
    setGuests(draft.guests);
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
      setAccess(null);
      setProjects([]);
      setDownloadUrl(null);
      setAiAssets([]);
      wasAuthenticated.current = false;
    }
  }, [draftStore, state.status]);

  useEffect(() => {
    if (state.status !== 'authenticated') return;
    let cancelled = false;
    void Promise.all([backend.getCurrentAccess(), backend.listProjects()])
      .then(([nextAccess, nextProjects]) => {
        if (!cancelled) {
          setAccess(nextAccess);
          setProjects(nextProjects);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setNotice({
            kind: 'error',
            message: safeMessage(
              error,
              'Your saved projects could not be loaded.',
            ),
          });
      });
    return () => {
      cancelled = true;
    };
  }, [backend, snapshot.generation, state.status]);

  const useImportResult = (result: ReturnType<typeof normalizePastedText>) => {
    setIssues(result.issues);
    if (result.ok) {
      setGuests(result.guests);
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

  const save = async () => {
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
      const project = await backend.saveProject({
        ...(savedProject === null ? {} : { projectId: savedProject.id }),
        title: title.trim() || 'Untitled event',
        guests,
        design:
          customDesign ??
          ({ kind: 'predefined', reference: designId } as const),
      });
      setSavedProject(project);
      draftStore.clear();
      setProjects(await backend.listProjects());
      setNotice({
        kind: 'success',
        message: 'Project saved securely to your account.',
      });
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
    const project = savedProject ?? (await save());
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

  const switchOffer = async (offerKey: OfferId) => {
    if (!requireAccount()) return;
    setBusy('Applying development offer');
    try {
      setAccess(await backend.selectDevelopmentOffer(offerKey));
      setNotice({
        kind: 'success',
        message: `${OFFER_CATALOG[offerKey].name} is active for this development account.`,
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        message: safeMessage(
          error,
          'The development offer could not be applied.',
        ),
      });
    } finally {
      setBusy(null);
    }
  };

  const generateAi = async () => {
    if (!requireAccount()) return;
    if (aiPrompt.trim().length < 8) {
      setNotice({
        kind: 'error',
        message: 'Describe the visual style in at least eight characters.',
      });
      return;
    }
    setBusy('Generating four background choices');
    try {
      const batch = await backend.generateAi({
        prompt: aiPrompt.trim(),
        idempotencyKey: crypto.randomUUID(),
        ...(savedProject === null ? {} : { projectId: savedProject.id }),
      });
      setAiAssets(batch.assets ?? []);
      setNotice({
        kind: 'success',
        message:
          batch.assets?.length === 4
            ? 'Four background choices are ready.'
            : 'Generation started. The choices will appear when ready.',
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        message: safeMessage(
          error,
          'AI backgrounds are temporarily unavailable. Your unit was returned.',
        ),
      });
    } finally {
      setBusy(null);
    }
  };

  const uploadArtwork = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !requireAccount()) return;
    setBusy('Checking artwork');
    try {
      const uploaded = await backend.uploadArtwork(file, savedProject?.id);
      setCustomDesign({
        kind: 'uploaded',
        reference: uploaded.publicId,
        label: file.name,
      });
      setNotice({
        kind: 'success',
        message: 'Artwork uploaded and validated. Save the project to use it.',
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        message: safeMessage(error, 'The artwork could not be used.'),
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
          <div className="step-card">
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
          </div>
          <div className="step-card">
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
              onChange={(event) => setTitle(event.target.value)}
            />
            <DesignPicker
              selected={designId}
              onSelect={(nextDesignId) => {
                setDesignId(nextDesignId);
                setCustomDesign(null);
              }}
            />
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
                          onChange={() => setLayoutId(option.id)}
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
                <button type="button" onClick={() => setCustomDesign(null)}>
                  Use predefined design instead
                </button>
              </p>
            ) : null}
          </div>
          <div className="step-card action-card">
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
                onClick={() => void save()}
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
          {state.status === 'authenticated' ? (
            <details className="account-tools">
              <summary>Saved projects and creative tools</summary>
              <div className="tool-content">
                <p className="tool-label">Current offer</p>
                <strong>
                  {access
                    ? (OFFER_CATALOG[access.offerKey]?.name ?? access.offerKey)
                    : 'Loading…'}
                </strong>
                {projects.length > 0 ? (
                  <ul className="project-list">
                    {projects.map((project) => (
                      <li key={project.id}>
                        <button
                          type="button"
                          onClick={() =>
                            void backend
                              .getProject(project.id)
                              .then((loaded) => {
                                if (loaded?.guests) {
                                  setSavedProject(loaded);
                                  setTitle(loaded.title);
                                  setGuests(loaded.guests);
                                  if (
                                    loaded.designKind === 'predefined' &&
                                    loaded.designId in DESIGN_CATALOG
                                  ) {
                                    setDesignId(loaded.designId as DesignId);
                                    setCustomDesign(null);
                                  } else if (
                                    loaded.designKind !== 'predefined'
                                  ) {
                                    setCustomDesign({
                                      kind: loaded.designKind,
                                      reference: loaded.designId,
                                      label: 'Saved custom background',
                                    });
                                  }
                                }
                              })
                          }
                        >
                          {project.title}
                          <span>{project.guestCount} cards</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No saved events yet.</p>
                )}
                <hr />
                <label className="file-button full-width">
                  Upload your own artwork
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(event) => void uploadArtwork(event)}
                  />
                </label>
                <label htmlFor="ai-prompt">AI background style</label>
                <textarea
                  id="ai-prompt"
                  value={aiPrompt}
                  maxLength={500}
                  rows={3}
                  onChange={(event) => setAiPrompt(event.target.value)}
                />
                <button
                  className="secondary-button"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void generateAi()}
                >
                  Generate four choices
                </button>
                {aiAssets.length > 0 ? (
                  <div className="ai-grid">
                    {aiAssets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => {
                          setCustomDesign({
                            kind: 'ai',
                            reference: asset.id,
                            label: 'Generated choice',
                          });
                          setNotice({
                            kind: 'info',
                            message:
                              'AI background selected. Save the project to apply it.',
                          });
                        }}
                      >
                        <img
                          src={asset.url}
                          alt="Generated background option"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </details>
          ) : null}
          {developmentControlsEnabled && state.status === 'authenticated' ? (
            <aside className="development-panel">
              <p className="eyebrow">Development only</p>
              <h3>Mock an offer</h3>
              <p>
                Exercises the real access contract without charging a payment
                method.
              </p>
              <div className="offer-buttons">
                {(Object.keys(OFFER_CATALOG) as OfferId[]).map((offerKey) => (
                  <button
                    key={offerKey}
                    className={access?.offerKey === offerKey ? 'active' : ''}
                    type="button"
                    onClick={() => void switchOffer(offerKey)}
                  >
                    {OFFER_CATALOG[offerKey].name}
                  </button>
                ))}
              </div>
            </aside>
          ) : null}
        </div>
        <div className="creator-preview">
          <SheetPreview
            guests={guests}
            designId={designId}
            layoutId={layoutId}
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

export function PricingSection() {
  const offers: {
    readonly id: OfferId;
    readonly description: string;
    readonly features: readonly string[];
    readonly emphasis?: string;
  }[] = [
    {
      id: 'free',
      description: 'Try a real event from start to finish.',
      features: [
        '25 cards per project',
        '1 active project',
        '3 clean designs',
        '1 AI background batch, lifetime',
      ],
    },
    {
      id: 'event_pass',
      description: 'For one larger celebration.',
      emphasis: 'Most popular for one event',
      features: [
        'Up to 500 cards',
        '1 editable event for 90 days',
        'All designs + artwork upload',
        '2 AI background batches',
      ],
    },
    {
      id: 'planner_pro',
      description: 'For independent planners with repeat events.',
      features: [
        '25 active projects',
        'Up to 500 cards each',
        'Reusable styles and uploads',
        '10 AI batches each month',
      ],
    },
    {
      id: 'studio',
      description: 'For teams producing events together.',
      features: [
        '100 active projects',
        'Up to 5 team members',
        'All premium tools',
        '30 shared AI batches each month',
      ],
    },
  ];
  return (
    <section
      className="pricing-section"
      id="pricing"
      aria-labelledby="pricing-title"
    >
      <div className="section-intro centered">
        <p className="eyebrow">Simple pilot pricing</p>
        <h2 id="pricing-title">Pay for the workflow you need</h2>
        <p>
          Every plan creates the same precise downloadable PDF. We do not print
          or ship physical cards.
        </p>
      </div>
      <div className="pricing-grid">
        {offers.map(({ id, description, features, emphasis }) => {
          const offer = OFFER_CATALOG[id];
          return (
            <article
              className={`price-card${emphasis ? ' featured' : ''}`}
              key={id}
            >
              {emphasis ? <p className="price-badge">{emphasis}</p> : null}
              <h3>{offer.name}</h3>
              <p>{description}</p>
              <p className="price">
                <strong>${offer.priceUsd}</strong>
                {offer.billing === 'monthly' ? (
                  <span>/ month</span>
                ) : offer.billing === 'one_time' ? (
                  <span>one time</span>
                ) : (
                  <span>forever</span>
                )}
              </p>
              <ul>
                {features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button
                className={emphasis ? 'button' : 'secondary-button'}
                type="button"
                onClick={scrollToCreator}
              >
                {id === 'free' ? 'Start free' : 'Try in the creator'}
              </button>
            </article>
          );
        })}
      </div>
      <p className="pricing-note">
        No annual contract. Cancel subscriptions any time. Professional projects
        remain available for read/export for 30 days after cancellation.
      </p>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="how-section" id="how-it-works">
      <div className="section-intro centered">
        <p className="eyebrow">No layout wrestling</p>
        <h2>From spreadsheet to scissors in three steps</h2>
      </div>
      <div className="how-grid">
        <article>
          <span>01</span>
          <h3>Bring the list</h3>
          <p>
            Paste names, copy a table grid, or upload CSV/XLSX. Map optional
            table and short marker columns explicitly.
          </p>
        </article>
        <article>
          <span>02</span>
          <h3>Inspect every sheet</h3>
          <p>
            Check spelling, duplicates, accents, folds and page count in the
            complete preview before you save.
          </p>
        </article>
        <article>
          <span>03</span>
          <h3>Print with confidence</h3>
          <p>
            Download the deterministic US Letter PDF, verify the scale square,
            then print locally at Actual Size.
          </p>
        </article>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="faq-section" id="faq">
      <div className="section-intro">
        <p className="eyebrow">Good to know</p>
        <h2>Questions before you print</h2>
      </div>
      <div className="faq-list">
        <details open>
          <summary>Do you mail printed place cards?</summary>
          <p>
            No. TableCards creates a downloadable PDF. You print it yourself or
            send it to a local print shop you choose.
          </p>
        </details>
        <details>
          <summary>What paper and settings should I use?</summary>
          <p>
            The launch format is US Letter with four 3.5 × 2 inch folded cards
            per sheet. Print at Actual Size / 100%, never “Fit to page,” and
            measure the scale square first.
          </p>
        </details>
        <details>
          <summary>Can I try it without creating an account?</summary>
          <p>
            Yes. Import, map, design and preview are public. Sign in only when
            you save, export, upload artwork, generate a background or choose a
            paid offer.
          </p>
        </details>
        <details>
          <summary>Will duplicate names be removed?</summary>
          <p>
            No. Your order, spelling and duplicate rows are preserved. Invalid
            or unsupported rows are shown as issues instead of silently changed.
          </p>
        </details>
        <details>
          <summary>Does AI see my guest list?</summary>
          <p>
            No. AI background generation receives only the bounded style
            description you write. Guest names, tables and event data are never
            included in its prompt.
          </p>
        </details>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <a className="brand" href="#top">
        <span className="brand-mark">TC</span>
        <span>TableCards</span>
      </a>
      <p>A Tofler Business Factory product. Digital PDF only.</p>
      <a href="#faq">Help</a>
    </footer>
  );
}

export function TableCardsApp({
  developmentControlsEnabled = false,
}: {
  readonly developmentControlsEnabled?: boolean;
}) {
  return (
    <div id="top">
      <Header />
      <main>
        <Hero />
        <Creator developmentControlsEnabled={developmentControlsEnabled} />
        <HowItWorks />
        <PricingSection />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}

export function StaticNotice({ children }: { readonly children: ReactNode }) {
  return <p className="notice info">{children}</p>;
}
