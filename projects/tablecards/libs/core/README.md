# TableCards core

Pure TableCards product logic shared by the browser and backend:

- bounded guest-row normalization for pasted lines/grids and parser-produced
  CSV/XLSX arrays;
- versioned offer and predefined-design catalogs;
- immutable US Letter / 3.5 × 2 inch folded-card render manifests for canonical
  four-card portrait and development six-card landscape layouts;
- customer exports/preview contain only card sheets; `includeScaleCheck: true`
  is reserved for the separate public print-test PDF;
- one code-owned raster-artwork catalog used by browser previews and
  deterministic `pdf-lib` output, plus optional fixed-ratio PNG/JPEG custom
  artwork on both correctly oriented faces. The catalog pins each public asset
  path and SHA-256 so backend exports cannot silently use different artwork.

The library accepts parsed rows rather than browser `File` objects. CSV and
XLSX parsing therefore stay at the browser edge, while every input path uses
the same normalization and validation rules.

The six `v1` predefined JPEGs were supplied as selected design artwork and
mechanically normalized to the exact 1050 × 600 contract. The active `v2`
assets preserve that artwork while replacing the neutral paper field with
print-friendly white; `v1` remains immutable for cache safety. No image API is
called by this predefined catalog at build or runtime. Customer-requested AI
artwork is handled separately by the backend/AI adapter. Any later reviewed replacement must use another
versioned public path and update the catalog hash rather than overwriting
cached artwork.

## Fonts

Hosted `renderTableCardsPdf` calls supply the unmodified, licensed Noto Sans
and Noto Serif TTF bytes vendored in the web `public/fonts/` directory. Provenance
and OFL 1.1 are alongside those assets; `fonts.ts` pins both SHA-256 hashes.
Browser preview uses the same font families and checked Latin advances generated
from these exact font bytes; PDF preflight uses actual embedded
font coverage and metrics. Kerning and discretionary ligatures are disabled in
SVG and PDF so their widths agree. Rendered text uses canonical-equivalent NFC
without changing stored/imported names. Coverage is bounded to common Latin
(including Vietnamese), supported punctuation and spaces; decomposed accents
that compose are supported, remaining combining marks fail explicitly rather
than reaching unsafe font shaping. Tests cover those boundaries, wide glyphs,
unsupported glyph rejection and deterministic bytes for both families.

Printable SVG text explicitly sets `font-kerning: none`,
`font-variant-ligatures: none` and `text-rendering: geometricPrecision` as CSS.
Font presentation attributes alone are not reliable across browsers; the
precision setting prevents inherited UI hinting from changing preview advances.

The optional `fontBytes`/`serifFontBytes` arguments keep the core independent of
HTTP/filesystem access. The backend fetches only registered public assets and
verifies their hashes. Omitting them retains Helvetica/Times for isolated
geometry fixtures, not the supported hosted product path. The normal core test
verifies every generated advance against the font files and pins both hashes;
changing a font requires regenerating `font-data.ts`, not hand-adjusting widths.
Both guest text and the actual event title are preflighted. Server checks remain
authoritative for authorization and rendering.

Names use one line at the selected size, allowing at most a 15% reduction before
trying two balanced lines. The split minimizes the widest line, then imbalance;
ordinary whitespace is preferred, preserving compound surnames. An existing
ordinary hyphen is a fallback break only when a whitespace split cannot fit,
and remains printed. Nonbreaking spaces/hyphens and unbroken words are never
split arbitrarily. Two lines can shrink further to the existing 8 pt minimum;
unbreakable names use the single-line fallback or explicit fit error, not
truncation. Names have 24 pt side insets, 16 pt vertical bounds and at least
6 pt clearance from table/marker text. The name block stays as close as possible
to the selected top/center/bottom position within those bounds.

Each line is an ordinary centered text command in the shared manifest, including
mirrored offsets on the rotated upper face. SVG preview and PDF therefore use
the same line decisions, size and placement. This is a rendering change only:
guest strings, project snapshots, manifest shape and database schema are not
migrated. Existing saved projects receive this policy when previewed/re-exported;
already downloaded PDF files do not change.

## Commands

```bash
pnpm exec nx run tablecards-core:test
pnpm exec nx run tablecards-core:typecheck
pnpm exec nx run tablecards-core:lint
pnpm exec nx run tablecards-core:build
node projects/tablecards/libs/core/scripts/generate-font-metrics.mjs --check
```
