import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import {
  FINISHED_CARD,
  LANDSCAPE_LETTER_PAGE,
  LETTER_PAGE,
  createRenderManifest,
  type FillRectangleCommand,
} from './layout';
import {
  convertLogicalPathToPdfSvgPath,
  getFaceBackgroundPlacement,
  renderTableCardsPdf,
} from './pdf';
import { TABLECARDS_FONTS } from './fonts';

const TEST_JPEG = Uint8Array.from(
  Buffer.from(
    '/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgEBAQEBAUFBQUFBQYGBgYGBgYGBgYGBgYHBwcICAgHBwcGBgcHCAgICAkJCQgICAgJCQoKCgwMCwsODg4RERT/xABMAAEBAAAAAAAAAAAAAAAAAAAABwEBAQAAAAAAAAAAAAAAAAAABQcQAQAAAAAAAAAAAAAAAAAAAAARAQAAAAAAAAAAAAAAAAAAAAD/wAARCAAIAA4DASIAAhEAAxEA/9oADAMBAAIRAxEAPwCOAL+Lf//Z',
    'base64',
  ),
);

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(
    crc32(Uint8Array.from(Buffer.concat([typeBytes, data]))),
  );
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function createSolidPng(width: number, height: number): Uint8Array {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const scanline = Buffer.from([
    0,
    ...Array.from({ length: width }, () => [42, 99, 140, 255]).flat(),
  ]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => scanline));
  return Uint8Array.from(
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      pngChunk('IHDR', header),
      pngChunk('IDAT', deflateSync(pixels)),
      pngChunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

describe('deterministic PDF renderer', () => {
  it('adds the calibration page only for an explicitly requested print test', async () => {
    const input = {
      guests: [{ name: 'Calibration Guest' }],
      designId: 'minimal-ivory' as const,
    };
    expect(
      (await PDFDocument.load(await renderTableCardsPdf(input))).getPageCount(),
    ).toBe(1);
    expect(
      (
        await PDFDocument.load(
          await renderTableCardsPdf({ ...input, includeScaleCheck: true }),
        )
      ).getPageCount(),
    ).toBe(2);
  });
  it('renders the paid 500-card ceiling with embedded fonts within private-file response bounds', async () => {
    const fontBytes = new Uint8Array(
      await readFile(
        resolve(
          'projects/tablecards/workloads/web/public',
          `.${TABLECARDS_FONTS.sans.publicPath}`,
        ),
      ),
    );
    const serifFontBytes = new Uint8Array(
      await readFile(
        resolve(
          'projects/tablecards/workloads/web/public',
          `.${TABLECARDS_FONTS.serif.publicPath}`,
        ),
      ),
    );
    const bytes = await renderTableCardsPdf(
      {
        guests: Array.from({ length: 500 }, (_, index) => ({
          name: `Łukasz Dvořák ${index + 1}`,
          table: String((index % 50) + 1),
        })),
        designId: 'garden-sage',
      },
      { fontBytes, serifFontBytes, fontFamilyName: 'Noto Sans' },
    );
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(125);
    expect(bytes.byteLength).toBeLessThan(19 * 1024 * 1024);
  });
  it.each(['sans', 'serif'] as const)(
    'embeds verified Noto %s with broader Latin and combining accents',
    async (font) => {
      const fontBytes = new Uint8Array(
        await readFile(
          resolve(
            'projects/tablecards/workloads/web/public',
            `.${TABLECARDS_FONTS.sans.publicPath}`,
          ),
        ),
      );
      const serifFontBytes = new Uint8Array(
        await readFile(
          resolve(
            'projects/tablecards/workloads/web/public',
            `.${TABLECARDS_FONTS.serif.publicPath}`,
          ),
        ),
      );
      expect(createHash('sha256').update(fontBytes).digest('hex')).toBe(
        TABLECARDS_FONTS.sans.sha256,
      );
      expect(createHash('sha256').update(serifFontBytes).digest('hex')).toBe(
        TABLECARDS_FONTS.serif.sha256,
      );
      const input = {
        guests: [
          { name: 'Łukasz Dvořák' },
          { name: 'Ștefan İpek' },
          { name: 'Jose\u0301 Garci\u0301a' },
        ],
        designId: 'garden-sage' as const,
        nameStyle: {
          font,
          position: 'center' as const,
          color: '#233022',
          size: 'medium' as const,
        },
      };
      const options = {
        fontBytes,
        serifFontBytes,
        fontFamilyName: 'Noto Sans',
      };
      const bytes = await renderTableCardsPdf(input, options);
      expect(await renderTableCardsPdf(input, options)).toEqual(bytes);
      expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
      expect(Buffer.from(bytes).toString('latin1')).toContain(
        font === 'sans' ? '/NotoSans' : '/NotoSerif',
      );
      await expect(
        renderTableCardsPdf(
          { ...input, guests: [{ name: 'Guest 😀' }] },
          options,
        ),
      ).rejects.toThrow();
    },
  );
  it('converts lower-left render paths for pdf-lib SVG drawing', () => {
    expect(
      convertLogicalPathToPdfSvgPath(
        'M 18 306 C 26 318 43 322 54 330 L 60 324 Z',
        LANDSCAPE_LETTER_PAGE.height,
      ),
    ).toBe('M 18 306 C 26 294 43 290 54 282 L 60 288 Z');
    expect(() =>
      convertLogicalPathToPdfSvgPath('M 1 2 Q 3 4 5 6', 100),
    ).toThrow(/Unsupported render path command/u);
  });

  it('produces byte-identical files for identical input', async () => {
    const input = {
      guests: [
        { name: 'José García', table: '12', marker: 'Vegan' },
        { name: 'Zoë Müller', table: '7' },
        { name: 'François Dupont' },
      ],
      designId: 'garden-sage' as const,
      title: 'Autumn Dinner',
    };
    const first = await renderTableCardsPdf(input);
    const second = await renderTableCardsPdf(input);

    expect(createHash('sha256').update(first).digest('hex')).toBe(
      createHash('sha256').update(second).digest('hex'),
    );
    expect(first).toEqual(second);
  });

  it('writes exact page count and MediaBox dimensions', async () => {
    const bytes = await renderTableCardsPdf({
      guests: Array.from({ length: 25 }, (_, index) => ({
        name: `Guest ${index + 1}`,
      })),
      designId: 'minimal-ivory',
    });
    const document = await PDFDocument.load(bytes, { updateMetadata: false });

    expect(document.getPageCount()).toBe(7);
    expect(document.getPages().map((page) => page.getSize())).toEqual(
      Array.from({ length: 7 }, () => ({
        width: LETTER_PAGE.width,
        height: LETTER_PAGE.height,
      })),
    );
    expect(document.getCreationDate()).toEqual(
      new Date('2026-01-01T00:00:00.000Z'),
    );
  });

  it('writes six cards per landscape sheet for the print trial', async () => {
    const bytes = await renderTableCardsPdf({
      guests: Array.from({ length: 25 }, (_, index) => ({
        name: `Guest ${index + 1}`,
      })),
      designId: 'garden-sage',
      layoutId: 'landscape_6',
    });
    const document = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(document.getPageCount()).toBe(5);
    expect(document.getPages().map((page) => page.getSize())).toEqual(
      Array.from({ length: 5 }, () => LANDSCAPE_LETTER_PAGE),
    );
  });

  it.each([
    ['PNG', 'image/png' as const, createSolidPng(14, 8)],
    ['JPEG', 'image/jpeg' as const, TEST_JPEG],
  ])(
    'embeds one deterministic %s background resource behind both card faces',
    async (_label, mimeType, imageBytes) => {
      const input = {
        guests: [{ name: 'Background Guest' }],
        designId: 'minimal-ivory' as const,
      };
      const options = {
        backgroundImage: { bytes: imageBytes, mimeType },
      };
      const first = await renderTableCardsPdf(input, options);
      const second = await renderTableCardsPdf(input, options);
      const predefined = await renderTableCardsPdf(input);

      expect(first).toEqual(second);
      expect(createHash('sha256').update(first).digest('hex')).not.toBe(
        createHash('sha256').update(predefined).digest('hex'),
      );
      expect(
        (
          await PDFDocument.load(first, { updateMetadata: false })
        ).getPageCount(),
      ).toBe(1);
    },
  );

  it('uses full-bleed finished-card geometry on each visible face', () => {
    const manifest = createRenderManifest({
      guests: [{ name: 'Geometry Guest' }],
      designId: 'minimal-ivory',
    });
    const faceBackgrounds = manifest.pages[0]!.commands.filter(
      (command): command is FillRectangleCommand =>
        command.type === 'fill_rectangle' && command.role === 'face_background',
    );

    expect(faceBackgrounds.map(getFaceBackgroundPlacement)).toEqual([
      {
        x: 54,
        y: 396,
        width: FINISHED_CARD.width,
        height: FINISHED_CARD.height,
        rotation: 0,
      },
      {
        x: 54,
        y: 540,
        width: FINISHED_CARD.width,
        height: FINISHED_CARD.height,
        rotation: 180,
      },
    ]);
  });

  it('rejects a background that is not exactly 7:4', async () => {
    await expect(
      renderTableCardsPdf(
        { guests: [{ name: 'Guest' }], designId: 'minimal-ivory' },
        {
          backgroundImage: {
            bytes: createSolidPng(10, 10),
            mimeType: 'image/png',
          },
        },
      ),
    ).rejects.toThrow(/exact 7:4 ratio/u);
  });

  it('fails preflight when the fallback font cannot encode a character', async () => {
    await expect(
      renderTableCardsPdf({
        guests: [{ name: 'Guest ∑' }],
        designId: 'minimal-ivory',
      }),
    ).rejects.toThrow(/unavailable in Helvetica/u);
  });
});
