import { useEffect, useRef, useState } from 'react';

export interface AiReferenceImage {
  readonly bytes: ArrayBuffer;
  readonly mimeType: 'image/jpeg' | 'image/png';
  readonly name: string;
  readonly preview: string;
}

function readFile(file: Blob, asDataUrl: true): Promise<string>;
function readFile(file: Blob, asDataUrl: false): Promise<ArrayBuffer>;
function readFile(
  file: Blob,
  asDataUrl: boolean,
): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error('The style image could not be read.'));
    reader.onload = () =>
      reader.result
        ? resolve(reader.result)
        : reject(new Error('The style image is empty.'));
    if (asDataUrl) reader.readAsDataURL(file);
    else reader.readAsArrayBuffer(file);
  });
}

export async function prepareAiReference(
  file: File,
): Promise<AiReferenceImage> {
  if (
    !['image/png', 'image/jpeg'].includes(file.type) ||
    file.size > 10 * 1024 * 1024 ||
    file.size === 0
  )
    throw new Error('Choose a PNG or JPEG style image, up to 10 MB.');
  const source = await readFile(file, true);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(
        new Error('This image cannot be read. Choose another PNG or JPEG.'),
      );
    image.src = source;
  });
  if (
    image.naturalWidth < 1 ||
    image.naturalHeight < 1 ||
    image.naturalWidth * image.naturalHeight > 16_000_000
  )
    throw new Error('Choose a style image smaller than 16 megapixels.');
  const scale = Math.min(
    1,
    512 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot prepare the style image.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.9),
  );
  if (!blob || blob.size > 512 * 1024)
    throw new Error('The style image is too large. Choose a smaller image.');
  return {
    bytes: await readFile(blob, false),
    mimeType: 'image/jpeg',
    name: file.name,
    preview: await readFile(blob, true),
  };
}

export function AiReferenceInput({
  value,
  onChange,
  onBusyChange,
  disabled = false,
}: {
  readonly value: AiReferenceImage | null;
  readonly onChange: (value: AiReferenceImage | null) => void;
  readonly onBusyChange: (busy: boolean) => void;
  readonly disabled?: boolean;
}) {
  const generation = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );
  return (
    <div className="ai-reference-input">
      <label className="file-button full-width">
        Optional style image or company icon
        <input
          type="file"
          accept="image/png,image/jpeg"
          disabled={disabled || busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            const sequence = ++generation.current;
            setError(null);
            setBusy(true);
            onBusyChange(true);
            void prepareAiReference(file)
              .then((next) => {
                if (sequence === generation.current) onChange(next);
              })
              .catch((failure: unknown) => {
                if (sequence === generation.current)
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : 'The style image could not be prepared.',
                  );
              })
              .finally(() => {
                if (sequence === generation.current) {
                  setBusy(false);
                  onBusyChange(false);
                }
              });
          }}
        />
      </label>
      <p className="muted">
        PNG or JPEG, up to 10 MB. We send a small copy to Cloudflare for style
        inspiration, not your guest list. Exact logo reproduction is not
        guaranteed.
      </p>
      {busy ? <p role="status">Preparing style image…</p> : null}
      {error ? (
        <p className="notice error" role="alert">
          {error}
        </p>
      ) : null}
      {value ? (
        <div className="ai-reference-preview">
          <img src={value.preview} alt="Selected style reference" />
          <span>{value.name}</span>
          <button
            className="text-button"
            type="button"
            disabled={disabled || busy}
            onClick={() => onChange(null)}
          >
            Remove style image
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AiTestProviderControl({
  developmentMock,
  onChange,
  disabled,
}: {
  readonly developmentMock: boolean;
  readonly onChange: (value: boolean) => void;
  readonly disabled: boolean;
}) {
  if (
    import.meta.env.VITE_TABLECARDS_DEV_CONTROLS !== 'true' &&
    !import.meta.env.DEV
  )
    return null;
  return (
    <label>
      AI engine (development)
      <select
        value={developmentMock ? 'mock' : 'cloudflare'}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value === 'mock')}
      >
        <option value="cloudflare">Cloudflare — real generated artwork</option>
        <option value="mock">Test fixture — color samples, no AI calls</option>
      </select>
    </label>
  );
}
