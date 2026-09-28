import { DESIGN_CATALOG, DESIGN_IDS } from '@tablecards/core';
import { useBffAuth } from '@tofler/bff-auth/react';
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';

import type {
  CurrentProductAccess,
  DesignAsset,
  DesignPreset,
  PresetStyle,
} from '../backend';
import { useTableCardsBackend } from '../use-tablecards-backend';

const defaultStyle: PresetStyle = {
  displayName: 'My reusable design',
  nameColor: '#243026',
  namePosition: 'center',
  nameFont: 'serif',
  nameSize: 'medium',
};

function message(error: unknown) {
  return error instanceof Error ? error.message : 'The design action failed.';
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
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [nextAccess, nextAssets, nextPresets] = await Promise.all([
      backend.getCurrentAccess(),
      backend.listAssets(),
      backend.listPresets(),
    ]);
    setAccess(nextAccess);
    setAssets(nextAssets);
    setPresets(nextPresets);
    setAssetId(
      (current) =>
        current || nextAssets.find((asset) => asset.reusable)?.id || '',
    );
  }, [backend]);

  useEffect(() => {
    void load().catch((error: unknown) => setNotice(message(error)));
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
      setNotice('Artwork validated. You can now save it as a reusable preset.');
    } catch (error) {
      setNotice(message(error));
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    setBusy(true);
    try {
      const batch = await backend.generateAi({
        prompt,
        idempotencyKey: crypto.randomUUID(),
      });
      await load();
      const first = batch.assets?.[0];
      if (first) setAssetId(first.id);
      setNotice(`${batch.assets?.length ?? 0} background choices are ready.`);
    } catch (error) {
      setNotice(message(error));
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
      setNotice('Reusable preset saved.');
    } catch (error) {
      setNotice(message(error));
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
        <p className="notice info" role="status">
          {notice}
        </p>
      ) : null}

      <section className="page-section">
        <h2>Predefined designs</h2>
        <div className="design-library-grid">
          {DESIGN_IDS.map((id) => {
            const design = DESIGN_CATALOG[id];
            const locked =
              design.tier === 'premium' && !access?.premiumDesignsEnabled;
            return (
              <article className="design-library-card" key={id}>
                <div className={`design-swatch design-${id}`}>
                  <strong>Ada Lovelace</strong>
                </div>
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
        {access?.artworkUploadEnabled ? (
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
                  maxLength={500}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                />
                <button
                  className="secondary-button"
                  type="button"
                  disabled={
                    busy || (access.aiBackgroundBatchesRemaining ?? 0) < 1
                  }
                  onClick={() => void generate()}
                >
                  Generate four choices · {access.aiBackgroundBatchesRemaining}{' '}
                  remaining
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="entitlement-callout">
            Custom artwork is available with Event Pass, Planner Pro and Studio.
          </p>
        )}
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
                <button type="button" onClick={() => setAssetId(asset.id)}>
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
        {!access?.reusablePresetsEnabled ? (
          <p className="entitlement-callout">
            Reusable presets are included with Planner Pro and Studio.
          </p>
        ) : (
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
        )}
        <div className="preset-grid">
          {presets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              backend={backend}
              reload={load}
            />
          ))}
        </div>
      </section>
    </section>
  );
}

function PresetCard({
  preset,
  backend,
  reload,
}: {
  readonly preset: DesignPreset;
  readonly backend: ReturnType<typeof useTableCardsBackend>;
  readonly reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<PresetStyle>({
    displayName: preset.displayName,
    nameColor: preset.nameColor,
    namePosition: preset.namePosition,
    nameFont: preset.nameFont,
    nameSize: preset.nameSize,
  });
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
              ? 'Georgia, serif'
              : 'Inter, sans-serif',
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
            type="button"
            onClick={() =>
              void backend.updatePreset(preset.id, editing).then(reload)
            }
          >
            Save changes
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete “${preset.displayName}”?`))
                void backend.deletePreset(preset.id).then(reload);
            }}
          >
            Delete
          </button>
        </div>
      </details>
    </article>
  );
}
