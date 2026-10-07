import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { TABLECARDS_FONTS } from './fonts';
import { NOTO_FONT_DATA } from './font-data';
import {
  NOTO_SANS_METRICS,
  NOTO_SERIF_METRICS,
  FINISHED_CARD,
  createRenderManifest,
  preflightRender,
  type FontMetrics,
} from './layout';
import { renderTableCardsPdf } from './pdf';

describe('pinned browser/PDF font metrics', () => {
  it('chooses the same balanced name lines and positions with browser and embedded PDF metrics', async () => {
    const document = await PDFDocument.create();
    document.registerFontkit(fontkit);
    const embedded: FontMetrics[] = [];
    for (const key of ['sans', 'serif'] as const) {
      const bytes = readFileSync(
        new URL(
          `../../../workloads/web/public${TABLECARDS_FONTS[key].publicPath}`,
          import.meta.url,
        ),
      );
      const font = await document.embedFont(bytes, {
        subset: true,
        features: { liga: false, clig: false, kern: false },
      });
      const supported = new Set(font.getCharacterSet());
      embedded.push({
        familyName: key === 'sans' ? 'Noto Sans' : 'Noto Serif',
        supportsText: (text) =>
          [...text.normalize('NFC')].every((character) =>
            supported.has(character.codePointAt(0)!),
          ),
        widthOfTextAtSize: (text, size) =>
          font.widthOfTextAtSize(text.normalize('NFC'), size),
        heightAtSize: (size) => font.heightAtSize(size, { descender: false }),
      });
    }
    for (const font of ['sans', 'serif'] as const) {
      for (const position of ['top', 'center', 'bottom'] as const) {
        const input = {
          guests: [
            { name: 'Anaïs Dubois' },
            {
              name: 'Alexandria Catherine Montgomery-Sinclair',
              table: '14',
              marker: 'Vegetarian',
            },
            { name: 'María Fernanda de la Cruz Hernández' },
          ],
          designId: 'garden-sage' as const,
          nameStyle: {
            font,
            position,
            size: 'large' as const,
            color: '#20251f',
          },
        };
        const names = (manifest: ReturnType<typeof createRenderManifest>) =>
          manifest.pages[0]!.commands.filter(
            (command) => command.type === 'text' && command.role === 'name',
          );
        expect(
          names(createRenderManifest(input, embedded[0]!, embedded[1]!)),
        ).toEqual(names(createRenderManifest(input)));
      }
    }
  });

  it('regenerates every advance from the hash-verified font bytes', () => {
    expect(NOTO_FONT_DATA.sans.sha256).toBe(TABLECARDS_FONTS.sans.sha256);
    expect(NOTO_FONT_DATA.serif.sha256).toBe(TABLECARDS_FONTS.serif.sha256);
    const output = execFileSync(
      process.execPath,
      [
        'projects/tablecards/libs/core/scripts/generate-font-metrics.mjs',
        '--check',
      ],
      { encoding: 'utf8' },
    );
    expect(output).toContain('match both font files');
  });

  it('matches shaped Latin PDF advances, including wide glyphs and combining accents', () => {
    for (const key of ['sans', 'serif'] as const) {
      const bytes = readFileSync(
        new URL(
          `../../../workloads/web/public${TABLECARDS_FONTS[key].publicPath}`,
          import.meta.url,
        ),
      );
      const font = fontkit.create(bytes);
      expect(Math.abs(font.descent) / font.unitsPerEm).toBeLessThanOrEqual(
        0.35,
      );
      const metrics = key === 'sans' ? NOTO_SANS_METRICS : NOTO_SERIF_METRICS;
      for (const text of [
        'W'.repeat(30),
        'M'.repeat(30),
        'Olivia office Griffin',
        'Łukasz Dvořák Ștefan İpek',
        'Jose\u0301 A\u0308nne',
        'Th\u0075\u031b Hoa\u0300ng Nguy\u00ea\u0303n',
        'mwmwmwmwmw',
        'François Björn — Table 14',
        '_J'.repeat(38),
        'f)'.repeat(30),
      ]) {
        const shapedWidth =
          (font
            .layout(text.normalize('NFC'), {
              liga: false,
              clig: false,
              kern: false,
            })
            .glyphs.reduce(
              (sum: number, glyph: { advanceWidth: number }) =>
                sum + glyph.advanceWidth,
              0,
            ) *
            8) /
          font.unitsPerEm;
        expect(metrics.widthOfTextAtSize(text, 8)).toBeCloseTo(shapedWidth, 8);
      }
      expect(
        preflightRender({
          guests: [{ name: 'W'.repeat(30) }],
          designId: 'minimal-ivory',
          nameStyle: {
            font: key,
            color: '#20251f',
            size: 'medium',
            position: 'center',
          },
        }),
      ).toContainEqual(
        expect.objectContaining({ field: 'name', code: 'text_does_not_fit' }),
      );
    }
  });

  it('renders canonical-equivalent accents without mutating imported names and rejects unsafe residual marks', async () => {
    const fontBytes = readFileSync(
      new URL(
        `../../../workloads/web/public${TABLECARDS_FONTS.sans.publicPath}`,
        import.meta.url,
      ),
    );
    const serifFontBytes = readFileSync(
      new URL(
        `../../../workloads/web/public${TABLECARDS_FONTS.serif.publicPath}`,
        import.meta.url,
      ),
    );
    const original = 'Thu\u031b Hoa\u0300ng Nguy\u00ea\u0303n';
    for (const font of ['sans', 'serif'] as const) {
      const input = {
        title: 'Jose\u0301 Wedding',
        guests: [{ name: original }],
        designId: 'minimal-ivory' as const,
        nameStyle: {
          font,
          color: '#20251f',
          size: 'medium' as const,
          position: 'center' as const,
        },
      };
      expect(preflightRender(input)).toEqual([]);
      expect(createRenderManifest(input).pages[0]?.commands).toContainEqual(
        expect.objectContaining({
          role: 'name',
          text: original.normalize('NFC'),
        }),
      );
      const bytes = await renderTableCardsPdf(input, {
        fontBytes,
        serifFontBytes,
      });
      expect(bytes.byteLength).toBeGreaterThan(1000);
      expect(input.guests[0]?.name).toBe(original);
      for (const mark of ['\u0334', '\u0335', '\u0336', '\u0337', '\u0338']) {
        const invalid = { ...input, guests: [{ name: `A${mark}` }] };
        expect(preflightRender(invalid)).toContainEqual(
          expect.objectContaining({
            field: 'name',
            code: 'unsupported_font_character',
          }),
        );
        await expect(
          renderTableCardsPdf(invalid, { fontBytes, serifFontBytes }),
        ).rejects.toThrow('character unavailable');
      }
    }
  });

  it('preflights the current event title instead of failing only in the PDF job', () => {
    expect(
      preflightRender({
        title: 'W'.repeat(120),
        guests: [{ name: 'Ada Lovelace' }],
        designId: 'minimal-ivory',
      }),
    ).toContainEqual(
      expect.objectContaining({ field: 'title', code: 'text_does_not_fit' }),
    );
    expect(
      preflightRender({
        title: 'Event 🎉',
        guests: [{ name: 'Ada Lovelace' }],
        designId: 'minimal-ivory',
      }),
    ).toContainEqual(
      expect.objectContaining({
        field: 'title',
        code: 'unsupported_font_character',
      }),
    );
  });

  it('exports browser-accepted positive-kerning edge names with the same width contract', async () => {
    const fontBytes = readFileSync(
      new URL(
        `../../../workloads/web/public${TABLECARDS_FONTS.sans.publicPath}`,
        import.meta.url,
      ),
    );
    const serifFontBytes = readFileSync(
      new URL(
        `../../../workloads/web/public${TABLECARDS_FONTS.serif.publicPath}`,
        import.meta.url,
      ),
    );
    for (const [font, pair, metrics] of [
      ['sans', '_J', NOTO_SANS_METRICS],
      ['serif', 'f)', NOTO_SERIF_METRICS],
    ] as const) {
      const count = Math.floor(
        (FINISHED_CARD.width - 48) / metrics.widthOfTextAtSize(pair, 8),
      );
      const input = {
        guests: [{ name: pair.repeat(count) }],
        designId: 'minimal-ivory' as const,
        nameStyle: {
          font,
          color: '#20251f',
          size: 'medium' as const,
          position: 'center' as const,
        },
      };
      expect(preflightRender(input)).toEqual([]);
      const bytes = await renderTableCardsPdf(input, {
        fontBytes,
        serifFontBytes,
      });
      expect(bytes.byteLength).toBeGreaterThan(1000);
    }
  });
});
