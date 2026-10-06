import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import fontkit from '@pdf-lib/fontkit';
import { TABLECARDS_FONTS } from '../src/fonts.ts';

const metrics = {};
for (const [key, definition] of Object.entries(TABLECARDS_FONTS)) {
  const bytes = readFileSync(
    new URL(
      `../../../workloads/web/public${definition.publicPath}`,
      import.meta.url,
    ),
  );
  if (createHash('sha256').update(bytes).digest('hex') !== definition.sha256)
    throw new Error('The font does not match its pinned hash');
  const font = fontkit.create(bytes);
  const advances = {};
  for (const code of font.characterSet) {
    if (
      /^[\p{Script=Latin}\p{Mark}\p{Number}\p{Zs}\p{Punctuation}]$/u.test(
        String.fromCodePoint(code),
      )
    )
      advances[code] = font.glyphForCodePoint(code).advanceWidth;
  }
  metrics[key] = {
    sha256: definition.sha256,
    unitsPerEm: font.unitsPerEm,
    ascent: font.ascent || font.bbox.maxY,
    advances,
  };
}
const source = `// Generated from the pinned OFL fonts by scripts/generate-font-metrics.mjs.\n// PDF/SVG disable kerning and discretionary Latin ligatures for matching advances.\nexport const NOTO_FONT_DATA = ${JSON.stringify(metrics)} as const;\n`;
if (process.argv.includes('--check')) {
  const { NOTO_FONT_DATA } = await import('../src/font-data.ts');
  if (JSON.stringify(NOTO_FONT_DATA) !== JSON.stringify(metrics))
    throw new Error('Regenerate pinned font metrics');
  process.stdout.write('Pinned font metrics match both font files.\n');
} else {
  process.stdout.write(JSON.stringify({ source }));
}
