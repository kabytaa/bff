# TableCards core

Pure TableCards product logic shared by the browser and backend:

- bounded guest-row normalization for pasted lines/grids and parser-produced
  CSV/XLSX arrays;
- versioned offer and predefined-design catalogs;
- immutable US Letter / 3.5 × 2 inch folded-card render manifests for canonical
  four-card portrait and development six-card landscape layouts;
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
called at build or runtime. Any later reviewed replacement must use another
versioned public path and update the catalog hash rather than overwriting
cached artwork.

## Fonts

Hosted `renderTableCardsPdf` calls supply the unmodified, licensed Noto Sans
and Noto Serif TTF bytes vendored in the web `public/fonts/` directory. Provenance
and OFL 1.1 are alongside those assets; `fonts.ts` pins both SHA-256 hashes.
Browser preview uses the same font families; PDF preflight uses actual embedded
font coverage and metrics. Tests cover broader Latin, combining accents,
unsupported glyph rejection and deterministic bytes for both families.

The optional `fontBytes`/`serifFontBytes` arguments keep the core independent of
HTTP/filesystem access. The backend fetches only registered public assets and
verifies their hashes. Omitting them retains Helvetica/Times for isolated
geometry fixtures, not the supported hosted product path. Preview fit uses
approximate metrics and remains advisory; server preflight is authoritative.

## Commands

```bash
pnpm exec nx run tablecards-core:test
pnpm exec nx run tablecards-core:typecheck
pnpm exec nx run tablecards-core:lint
pnpm exec nx run tablecards-core:build
```
