import { encode } from 'fast-png';
import { zlibSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { validateArtworkPixels } from './validateArtwork';

function chunk(type: string, data: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(data.length + 12);
  new DataView(bytes.buffer).setUint32(0, data.length);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(data, 8);
  return bytes;
}

function withCompressedChunk(type: string, data: Uint8Array): Uint8Array {
  const png = encode({
    width: 7,
    height: 4,
    channels: 4,
    data: new Uint8Array(112),
  });
  const injected = chunk(type, data);
  const result = new Uint8Array(png.length + injected.length);
  result.set(png.subarray(0, 33));
  result.set(injected, 33);
  result.set(png.subarray(33), 33 + injected.length);
  return result;
}

describe('bounded artwork pixel validation', () => {
  it('rejects oversized IDAT expansion before attempting full decode', () => {
    const bomb = withCompressedChunk('IDAT', zlibSync(new Uint8Array(100_000)));
    expect(() => validateArtworkPixels(bomb, 'image/png', 7, 4)).toThrow(
      /decompression/u,
    );
  });

  it('rejects oversized compressed color profiles before attempting full decode', () => {
    const compressed = zlibSync(new Uint8Array(100_000));
    const data = new Uint8Array(compressed.length + 4);
    data.set([73, 67, 0, 0]);
    data.set(compressed, 4);
    const bomb = withCompressedChunk('iCCP', data);
    expect(() => validateArtworkPixels(bomb, 'image/png', 7, 4)).toThrow(
      /decompression/u,
    );
  });

  it('rejects 16-bit pixels before decoder allocation', () => {
    const png = encode({
      width: 7,
      height: 4,
      channels: 4,
      data: new Uint8Array(112),
    });
    png[24] = 16;
    expect(() => validateArtworkPixels(png, 'image/png', 7, 4)).toThrow(
      /8-bit/u,
    );
  });
});
