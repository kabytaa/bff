import {
  DESIGN_CATALOG,
  DESIGN_IDS,
  renderDesignFaceToSvg,
} from '@tablecards/core';
import { useBffAuth } from '@tofler/bff-auth/react';
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  CurrentProductAccess,
  DesignAsset,
  DesignPreset,
  PresetStyle,
} from '../backend';
import { useTableCardsBackend } from '../use-tablecards-backend';
import { safeProductMessage } from '../product-error';

const defaultStyle: PresetStyle = {
  displayName: 'My reusable design',
  nameColor: '#243026',
  namePosition: 'center',
  nameFont: 'serif',
  nameSize: 'medium',
};

function message(error: unknown) {
  return safeProductMessage(
    error,
    'The design action could not be completed. Please try again.',
  );
}

function StyleFields({
  style,
  onChange,
}: {
  readonly style: PresetStyle;
  readonly onChange: (style: PresetStyle) => void;
}) {
  return (
    <div className="preset-fields">
      <label>
        Name
        <input
          value={style.displayName}
          maxLength={80}
          onChange={(event) =>
            onChange({ ...style, displayName: event.target.value })
          }
        />
      </label>
      <label>
        Font
        <select
          value={style.nameFont}
          onChange={(event) =>
            onChange({
              ...style,
              nameFont: event.target.value as PresetStyle['nameFont'],
            })
          }
        >
          <option value="sans">Clean sans</option>
          <option value="serif">Classic serif</option>
        </select>
      </label>
      <label>
        Size
        <select
          value={style.nameSize}
          onChange={(event) =>
            onChange({
              ...style,
              nameSize: event.target.value as PresetStyle['nameSize'],
            })
          }
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </label>
      <label>
        Position
        <select
          value={style.namePosition}
          onChange={(event) =>
            onChange({
              ...style,
              namePosition: event.target.value as PresetStyle['namePosition'],
            })
          }
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
          value={style.nameColor}
          onChange={(event) =>
            onChange({ ...style, nameColor: event.target.value })
          }
        />
      </label>
    </div>
  );
}

export function Component() {
  const backend = useTableCardsBackend();
  const { snapshot } = useBffAuth();
  const [access, setAccess] = useState<CurrentProductAccess | null>(null);
  const [assets, setAssets] = useState<readonly DesignAsset[]>([]);
  const [presets, setPresets] = useState<readonly DesignPreset[]>([]);
  const [style, setStyle] = useState<PresetStyle>(defaultStyle);
  const [assetId, setAssetId] = useState('');
  const [prompt, setPrompt] = useState(
    'Elegant watercolor botanicals on warm white paper',
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeKind, setNoticeKind] = useState<'success' | 'error' | 'info'>(
    'info',
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const aiAttempt = useRef<{ prompt: string; key: string } | null>(null);
  const [aiRecovery, setAiRecovery] = useState(false);
  const notify = (
    text: string,
    kind: 'success' | 'error' | 'info' = 'success',
  ) => {
    setNotice(text);
    setNoticeKind(kind);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextAccess, nextAssets, nextPresets, pending] = await Promise.all([
        backend.getCurrentAccess(),
        backend.listAssets(),
        backend.listPresets(),
        backend.getPendingAiBatch(),
      ]);
      setAccess(nextAccess);
      setAssets(nextAssets);
      setPresets(nextPresets);
      if (pending) {
        aiAttempt.current = {
          prompt: pending.prompt,
          key: pending.idempotencyKey,
        };
        setPrompt(pending.prompt);
        setAiRecovery(true);
      }
      setAssetId(
        (current) =>
          current || nextAssets.find((asset) => asset.reusable)?.id || '',
      );
    } finally {
      setLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    void load().catch((error: unknown) => {
      setNotice(message(error));
      setNoticeKind('error');
    });
  }, [load, snapshot.generation]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const asset = await backend.uploadArtwork(file);
      setAssetId(asset.publicId);
      await load();
      notify('Artwork validated. You can now save it as a reusable preset.');
    } catch (error) {
      notify(message(error), 'error');
      await load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (
      !aiAttempt.current ||
      (!aiRecovery && aiAttempt.current.prompt !== prompt)
    )
      aiAttempt.current = { prompt, key: crypto.randomUUID() };
    const attempt = aiAttempt.current;
    setBusy(true);
    try {
      const batch = await backend.generateAi({
        prompt: attempt.prompt,
        idempotencyKey: attempt.key,
      });
      if (batch.status !== 'ready' || !batch.assets?.length) {
        if (batch.status !== 'failed') {
          setAiRecovery(true);
          notify(
            'This batch is still completing. Retry this same batch to recover its choices.',
            'info',
          );
          return;
        }
        aiAttempt.current = null;
        setAiRecovery(false);
        throw new Error(
          batch.errorMessage ?? 'The image provider did not finish the batch.',
        );
      }
      await load();
      aiAttempt.current = null;
      setAiRecovery(false);
      const first = batch.assets?.[0];
      if (first) setAssetId(first.id);
      notify(`${batch.assets?.length ?? 0} background choices are ready.`);
    } catch (error) {
      setAiRecovery(aiAttempt.current !== null);
      notify(message(error), 'error');
      await load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const createPreset = async (event: FormEvent) => {
    event.preventDefault();
    if (!assetId) return;
    setBusy(true);
    try {
      await backend.createPreset(assetId, style);
      await load();
      notify('Reusable preset saved.');
    } catch (error) {
      notify(message(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="app-page" aria-labelledby="designs-title">
      <header className="page-header">
        <div>
          <p className="eyebrow">Design library</p>
          <h1 id="designs-title">Designs</h1>
          <p>
            Choose included artwork or keep a constrained custom style for
            future projects.
          </p>
        </div>
      </header>
      {notice ? (
        <p
          className={`notice ${noticeKind}`}
          role={noticeKind === 'error' ? 'alert' : 'status'}
        >
          {notice}
          {noticeKind === 'error' ? (
            <button
              className="secondary-button"
              type="button"
              disabled={busy || loading}
              onClick={() =>
                void load().catch((caught: unknown) =>
                  notify(message(caught), 'error'),
                )
              }
            >
              Retry library
            </button>
          ) : null}
        </p>
      ) : null}
      {loading ? <p role="status">Loading your design library…</p> : null}

      <section className="page-section">
        <h2>Predefined designs</h2>
        <div className="design-library-grid">
          {DESIGN_IDS.map((id) => {
            const design = DESIGN_CATALOG[id];
            const locked =
              design.tier === 'premium' && !access?.premiumDesignsEnabled;
            return (
              <article className="design-library-card" key={id}>
                <div
                  className="design-swatch"
                  aria-label={`${design.name} artwork preview`}
                  dangerouslySetInnerHTML={{
                    __html: renderDesignFaceToSvg(id, {
                      backgroundImageHref: design.artwork.publicPath,
                    }),
                  }}
                />
                <h3>{design.name}</h3>
                <p>
                  {design.tier === 'premium' ? 'Premium' : 'Included'}
                  {locked ? ' · Upgrade required' : ''}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page-section">
        <h2>Custom artwork</h2>
        {access?.artworkUploadEnabled && access.offerKey !== 'event_pass' ? (
          <div className="creative-tools-grid">
            <label className="file-button full-width">
              Upload a 7:4 PNG or JPEG
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) => void upload(event)}
              />
            </label>
            {access.aiBackgroundBatchesRemaining !== undefined ? (
              <div>
                <label htmlFor="design-ai-prompt">
                  AI background description
                </label>
                <textarea
                  id="design-ai-prompt"
                  rows={3}
                  maxLength={400}
                  value={prompt}
                  disabled={busy || loading || aiRecovery}
                  onChange={(event) => setPrompt(event.target.value)}
                />
                <button
                  className="secondary-button"
                  type="button"
                  disabled={
                    busy ||
                    loading ||
                    (!aiRecovery &&
                      (access.aiBackgroundBatchesRemaining ?? 0) < 1)
                  }
                  onClick={() => void generate()}
                >
                  {aiRecovery
                    ? 'Retry this background batch'
                    : `Generate four choices · ${access.aiBackgroundBatchesRemaining} remaining`}
                </button>
              </div>
            ) : null}
          </div>
        ) : access ? (
          <p className="entitlement-callout">
            {access?.offerKey === 'event_pass'
              ? 'Event Pass artwork belongs to its saved event. Open that project to upload and use artwork.'
              : 'Custom artwork is available with Event Pass, Planner Pro and Studio.'}
          </p>
        ) : null}
        {access?.artworkUploadEnabled && access.offerKey !== 'event_pass' ? (
          <p className="muted">
            Static PNG (8-bit or lower) or JPEG, unrotated 7:4. Minimum 1050 ×
            600; maximum 2 megapixels and 10 MiB.
          </p>
        ) : null}
        {!loading && access?.artworkUploadEnabled && assets.length === 0 ? (
          <p className="muted">
            No artwork yet. Upload an image or generate a background batch to
            begin.
          </p>
        ) : null}
        <div className="asset-grid">
          {assets.map((asset) => (
            <article key={asset.id}>
              <div
                className="asset-preview"
                style={
                  asset.url
                    ? { backgroundImage: `url(${asset.url})` }
                    : undefined
                }
              />
              <p>
                {asset.source === 'ai' ? 'AI background' : 'Uploaded artwork'}
              </p>
              {asset.reusable ? (
                <button
                  className="secondary-button"
                  type="button"
                  aria-pressed={assetId === asset.id}
                  onClick={() => setAssetId(asset.id)}
                >
                  Use for preset
                </button>
              ) : (
                <small>Event-only artwork</small>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="page-section">
        <h2>Reusable presets</h2>
        {access && !access.reusablePresetsEnabled ? (
          <p className="entitlement-callout">
            Reusable presets are included with Planner Pro and Studio.
          </p>
        ) : access?.reusablePresetsEnabled ? (
          <form
            className="preset-form"
            onSubmit={(event) => void createPreset(event)}
          >
            <label>
              Artwork
              <select
                value={assetId}
                onChange={(event) => setAssetId(event.target.value)}
              >
                <option value="">Choose validated artwork</option>
                {assets
                  .filter((asset) => asset.reusable)
                  .map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.source} ·{' '}
                      {new Date(asset.createdAt).toLocaleDateString()}
                    </option>
                  ))}
              </select>
            </label>
            <StyleFields style={style} onChange={setStyle} />
            <button
              className="button"
              type="submit"
              disabled={busy || !assetId}
            >
              Save reusable preset
            </button>
          </form>
        ) : null}
        {!loading && access?.reusablePresetsEnabled && presets.length === 0 ? (
          <p className="muted">
            No reusable presets yet. Choose validated artwork and save a preset
            above.
          </p>
        ) : null}
        {access?.reusablePresetsEnabled ? (
          <div className="preset-grid">
            {presets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                backend={backend}
                reload={load}
                onNotice={notify}
              />
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}

function PresetCard({
  preset,
  backend,
  reload,
  onNotice,
}: {
  readonly preset: DesignPreset;
  readonly backend: ReturnType<typeof useTableCardsBackend>;
  readonly reload: () => Promise<void>;
  readonly onNotice: (
    message: string,
    kind?: 'success' | 'error' | 'info',
  ) => void;
}) {
  const [editing, setEditing] = useState<PresetStyle>({
    displayName: preset.displayName,
    nameColor: preset.nameColor,
    namePosition: preset.namePosition,
    nameFont: preset.nameFont,
    nameSize: preset.nameSize,
  });
  const [busy, setBusy] = useState(false);
  return (
    <article className="preset-card">
      <div
        className="preset-preview"
        style={{
          ...(preset.artworkUrl
            ? { backgroundImage: `url(${preset.artworkUrl})` }
            : {}),
          color: editing.nameColor,
          fontFamily:
            editing.nameFont === 'serif'
              ? '"Noto Serif", Georgia, serif'
              : '"Noto Sans", sans-serif',
          fontSize:
            editing.nameSize === 'small'
              ? '1rem'
              : editing.nameSize === 'large'
                ? '1.6rem'
                : '1.25rem',
          alignItems:
            editing.namePosition === 'top'
              ? 'flex-start'
              : editing.namePosition === 'bottom'
                ? 'flex-end'
                : 'center',
        }}
      >
        Ada Lovelace
      </div>
      <details>
        <summary>{preset.displayName}</summary>
        <StyleFields style={editing} onChange={setEditing} />
        <div className="inline-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void backend
                .updatePreset(preset.id, editing)
                .then(reload)
                .then(() => onNotice('Preset changes saved.'))
                .catch((error: unknown) => onNotice(message(error), 'error'))
                .finally(() => setBusy(false));
            }}
          >
            Save changes
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Delete “${preset.displayName}”?`)) {
                setBusy(true);
                void backend
                  .deletePreset(preset.id)
                  .then(reload)
                  .then(() => onNotice('Preset deleted.'))
                  .catch((error: unknown) => onNotice(message(error), 'error'))
                  .finally(() => setBusy(false));
              }
            }}
          >
            Delete
          </button>
        </div>
      </details>
    </article>
  );
}
