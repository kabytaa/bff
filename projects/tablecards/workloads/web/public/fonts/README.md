# TableCards print fonts

Unmodified Noto Sans Regular and Noto Serif Regular TTF files, licensed under
the accompanying SIL Open Font License 1.1. Browser previews and hosted PDF
exports use these same families. No external font service is required.

Official source: https://github.com/notofonts/noto-fonts/tree/ffebf8c1ee449e544955a7e813c54f9b73848eac/hinted/ttf

The archived official distribution is immutable at that commit. Byte hashes
are pinned in `projects/tablecards/libs/core/src/fonts.ts`; the backend checks
them before embedding and tests verify the committed files. Fonts support
the promised Latin range, not every script. Unsupported glyphs must fail
preflight visibly rather than silently disappear. Physical print fidelity is
separate from font embedding.
