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
  DesignPreset,
  PresetStyle,
} from '../backend';
import { useTableCardsBackend } from '../use-tablecards-backend';
import { useArtwork } from '../use-artwork';
import { aiInputWasRejected, safeProductMessage } from '../product-error';
import { MetadataPageControls, useMetadataPages } from '../metadata-pages';
import {
  AiReferenceInput,
  AiTestProviderControl,
  type AiReferenceImage,
} from '../ai-reference-input';

const defaultStyle: PresetStyle = {
  displayName: 'My reusable design',
  nameColor: '#243026',
  namePosition: 'center',
  nameFont: 'serif',
  nameSize: 'medium',
};

function ArtworkThumbnail({
  backend,
  address,
}: {
  readonly backend: ReturnType<typeof useTableCardsBackend>;
  readonly address?: string | null;
}) {
  const artwork = useArtwork(backend, address, { lazy: true });
  return (
    <div
      ref={artwork.ref}
      className="asset-preview"
      style={
        artwork.url ? { backgroundImage: `url(${artwork.url})` } : undefined
      }
    >
      {artwork.state === 'error' ? (
        <button
          className="secondary-button"
          type="button"
          onClick={artwork.retry}
        >
          Retry artwork preview
        </button>
      ) : null}
    </div>
  );
}

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
  const [style, setStyle] = useState<PresetStyle>(defaultStyle);
  const [assetId, setAssetId] = useState('');
  const assetLibrary = useMetadataPages(
    backend.listAssetPage,
    'artwork',
    assetId,
  );
  const presetLibrary = useMetadataPages(backend.listPresetPage, 'presets');
  const assets = assetLibrary.items;
  const presets = presetLibrary.items;
  const loadGeneration = useRef(0);
  const [prompt, setPrompt] = useState(
    'Elegant watercolor botanicals on warm white paper',
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeKind, setNoticeKind] = useState<'success' | 'error' | 'info'>(
    'info',
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
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
  const notify = (
    text: string,
    kind: 'success' | 'error' | 'info' = 'success',
  ) => {
    setNotice(text);
    setNoticeKind(kind);
  };

  const load = useCallback(async () => {
    const sequence = ++loadGeneration.current;
    setLoading(true);
    try {
      const [nextAccess, nextAssets, , pending] = await Promise.all([
        backend.getCurrentAccess(),
        assetLibrary.refresh(),
        presetLibrary.refresh(),
        backend.getPendingAiBatch(),
      ]);
      if (sequence !== loadGeneration.current) return;
      setAccess(nextAccess);
      if (pending) {
        aiAttempt.current = {
          prompt: pending.prompt,
          key: pending.idempotencyKey,
          developmentMock: pending.developmentMock,
        };
        setPrompt(pending.prompt);
        setDevelopmentMock(pending.developmentMock === true);
        setAiRecovery(true);
      }
      setAssetId(
        (current) =>
          current ||
          nextAssets?.items.find((asset) => asset.reusable)?.id ||
          '',
      );
    } catch (error) {
      if (sequence === loadGeneration.current) throw error;
    } finally {
      if (sequence === loadGeneration.current) setLoading(false);
    }
  }, [assetLibrary.refresh, backend, presetLibrary.refresh]);

  useEffect(() => {
    void load().catch((error: unknown) => {
      setNotice(message(error));
      setNoticeKind('error');
    });
    return () => {
      loadGeneration.current += 1;
    };
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
      !aiRecovery &&
      (prompt.trim().length < 3 || prompt.trim().length > 400)
    ) {
      notify('Describe the background in 3 to 400 characters.', 'error');
      return;
    }
    if (
      !aiAttempt.current ||
      (!aiRecovery &&
        (aiAttempt.current.prompt !== prompt ||
          aiAttempt.current.referenceImage !== referenceImage ||
          aiAttempt.current.developmentMock !== developmentMock))
    )
      aiAttempt.current = {
        prompt,
        key: crypto.randomUUID(),
        referenceImage,
        developmentMock,
      };
    const attempt = aiAttempt.current;
    setBusy(true);
    try {
      const batch = await backend.generateAi({
        prompt: attempt.prompt,
        idempotencyKey: attempt.key,
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
          notify(
            'This batch is still completing. Retry this same batch to recover its choices.',
            'info',
          );
          return;
        }
        aiAttempt.current = null;
        setAiRecovery(false);
        throw new Error(
          'This background batch failed. Edit the description and try again.',
        );
      }
      await load();
      aiAttempt.current = null;
      setAiRecovery(false);
      const first = batch.assets?.[0];
      if (first) setAssetId(first.id);
      notify(`${batch.assets?.length ?? 0} background choices are ready.`);
    } catch (error) {
      if (aiInputWasRejected(error)) aiAttempt.current = null;
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
              onClick={() => {
                setNotice(null);
                void load().catch((caught: unknown) =>
                  notify(message(caught), 'error'),
                );
              }}
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
                  required
                  minLength={3}
                  maxLength={400}
                  value={prompt}
                  disabled={busy || loading || aiRecovery}
                  onChange={(event) => setPrompt(event.target.value)}
                />
                <AiReferenceInput
                  value={referenceImage}
                  onChange={setReferenceImage}
                  onBusyChange={setReferenceBusy}
                  disabled={busy || loading || aiRecovery}
                />
                <AiTestProviderControl
                  developmentMock={developmentMock}
                  onChange={setDevelopmentMock}
                  disabled={busy || loading || aiRecovery}
                />
                <button
                  className="secondary-button"
                  type="button"
                  disabled={
                    busy ||
                    referenceBusy ||
                    loading ||
                    (!aiRecovery &&
                      ((access.aiBackgroundBatchesRemaining ?? 0) < 1 ||
                        prompt.trim().length < 3 ||
                        prompt.trim().length > 400))
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
        {!loading &&
        assetLibrary.page.done &&
        access?.artworkUploadEnabled &&
        assets.length === 0 ? (
          <p className="muted">
            No artwork yet. Upload an image or generate a background batch to
            begin.
          </p>
        ) : null}
        <div className="asset-grid">
          {assets.map((asset) => (
            <article key={asset.id}>
              <ArtworkThumbnail backend={backend} address={asset.url} />
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
        <MetadataPageControls
          label="artwork"
          page={assetLibrary.page}
          onLoadMore={assetLibrary.loadMore}
          disabled={busy || loading}
          showEnd={assets.length > 0}
        />
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
        {!loading &&
        presetLibrary.page.done &&
        access?.reusablePresetsEnabled &&
        presets.length === 0 ? (
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
        {access?.reusablePresetsEnabled ? (
          <MetadataPageControls
            label="presets"
            page={presetLibrary.page}
            onLoadMore={presetLibrary.loadMore}
            disabled={busy || loading}
            showEnd={presets.length > 0}
          />
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
  const artwork = useArtwork(backend, preset.artworkUrl, { lazy: true });
  return (
    <article className="preset-card">
      <div
        ref={artwork.ref}
        className="preset-preview"
        style={{
          ...(artwork.url ? { backgroundImage: `url(${artwork.url})` } : {}),
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
        {artwork.state === 'error' ? 'Artwork unavailable' : 'Ada Lovelace'}
      </div>
      {artwork.state === 'error' ? (
        <button
          className="secondary-button"
          type="button"
          onClick={artwork.retry}
        >
          Retry artwork preview
        </button>
      ) : null}
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
