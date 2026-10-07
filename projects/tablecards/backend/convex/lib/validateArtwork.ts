import { decode as decodePng } from 'fast-png';
import { Unzlib } from 'fflate';
import { decode as decodeJpeg } from 'jpeg-js';

// The Convex HTTP runtime has a 64 MiB ceiling. Keep image decode/copies
// comfortably below it rather than accepting arbitrary high-resolution files.
export const MAX_ARTWORK_PIXELS = 2_000_000;

function boundedInflator(maximum: number) {
  let total = 0;
  const stream = new Unzlib((chunk) => {
    total += chunk.byteLength;
    if (total > maximum)
      throw new Error('Artwork decompression exceeds its bounds');
  });
  return {
    push(data: Uint8Array) {
      // A large compressed chunk could allocate its whole expanded output
      // before the callback. Small input slices bound that intermediate work.
      for (let offset = 0; offset < data.length; offset += 256)
        stream.push(data.subarray(offset, offset + 256), false);
    },
    finish() {
      stream.push(new Uint8Array(), true);
    },
  };
}

function checkPngExpansion(bytes: Uint8Array, width: number, height: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const pixels = boundedInflator(width * height * 4 + height * 8);
  let offset = 8;
  let chunks = 0;
  let hasData = false;
  let hasProfile = false;
  let ended = false;
  while (offset + 12 <= bytes.length) {
    if (++chunks > 4096) throw new Error('Too many PNG chunks');
    const length = view.getUint32(offset);
    const end = offset + length + 12;
    if (end > bytes.length) throw new Error('Truncated PNG chunk');
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const data = bytes.subarray(offset + 8, end - 4);
    if (chunks === 1 && (type !== 'IHDR' || length !== 13))
      throw new Error('Invalid PNG header');
    if (type === 'IHDR' && chunks !== 1)
      throw new Error('Duplicate PNG header');
    if (type === 'IHDR' && (data[8] ?? 16) > 8)
      throw new Error('Artwork must use 8-bit or lower PNG color');
    if (type === 'PLTE' && length > 768) throw new Error('Invalid PNG palette');
    if (type === 'acTL' || type === 'fcTL' || type === 'fdAT')
      throw new Error('Animated artwork is not supported');
    if (type === 'IDAT') {
      pixels.push(data);
      hasData = true;
    }
    if (type === 'iCCP') {
      if (hasProfile) throw new Error('Duplicate PNG color profile');
      hasProfile = true;
      const separator = data.indexOf(0);
      if (separator < 1 || separator > 79 || data[separator + 1] !== 0)
        throw new Error('Invalid PNG color profile');
      const profile = boundedInflator(64 * 1024);
      profile.push(data.subarray(separator + 2));
      profile.finish();
    }
    if (type === 'IEND') {
      if (length !== 0 || !hasData || end !== bytes.length)
        throw new Error('Invalid PNG ending');
      ended = true;
      break;
    }
    offset = end;
  }
  if (!ended) throw new Error('Incomplete PNG image');
  pixels.finish();
}

/** Decode bounded real pixels before publishing the original private bytes. */
export function validateArtworkPixels(
  bytes: Uint8Array,
  mimeType: 'image/png' | 'image/jpeg',
  width: number,
  height: number,
): void {
  if (width * height > MAX_ARTWORK_PIXELS)
    throw new Error('Artwork must be 2 megapixels or smaller');
  if (mimeType === 'image/png') checkPngExpansion(bytes, width, height);
  const decoded =
    mimeType === 'image/png'
      ? decodePng(bytes, { checkCrc: true })
      : decodeJpeg(bytes, {
          useTArray: true,
          tolerantDecoding: false,
          maxResolutionInMP: 2,
          maxMemoryUsageInMB: 32,
        });
  if (
    decoded.width !== width ||
    decoded.height !== height ||
    decoded.data.length === 0
  )
    throw new Error('Artwork pixels do not match the declared dimensions');
}
