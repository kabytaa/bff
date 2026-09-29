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

`renderTableCardsPdf` accepts licensed Noto Sans TTF bytes through
`fontBytes`. The repository does not currently vendor a binary font asset;
callers must supply the reviewed font bytes for broad Latin coverage. Without
them the renderer uses PDF Helvetica and rejects any unsupported character
before drawing, so it never clips or silently substitutes text.

## Commands

```bash
pnpm exec nx run tablecards-core:test
pnpm exec nx run tablecards-core:typecheck
pnpm exec nx run tablecards-core:lint
pnpm exec nx run tablecards-core:build
```
