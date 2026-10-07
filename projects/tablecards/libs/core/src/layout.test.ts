import { describe, expect, it } from 'vitest';

import {
  APPROXIMATE_NOTO_SANS_METRICS,
  FINISHED_CARD,
  LANDSCAPE_LETTER_PAGE,
  LETTER_PAGE,
  NOTO_SANS_METRICS,
  NOTO_SERIF_METRICS,
  RenderPreflightError,
  UNFOLDED_CARD,
  createRenderManifest,
  preflightRender,
  renderManifestPageToSvg,
  renderDesignFaceToSvg,
  type TextCommand,
} from './layout';

function guests(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    name: `Guest ${index + 1}`,
    table: `${(index % 20) + 1}`,
    marker: index % 2 === 0 ? 'Vegan' : 'Standard',
  }));
}

describe('print manifest', () => {
  it('includes a measuring guide only in the explicit print-test download', () => {
    const input = { guests: guests(4), designId: 'minimal-ivory' as const };
    expect(createRenderManifest(input).pages.map((page) => page.kind)).toEqual([
      'cards',
    ]);
    expect(
      createRenderManifest({ ...input, includeScaleCheck: true }).pages.map(
        (page) => page.kind,
      ),
    ).toEqual(['scale_check', 'cards']);
    expect(renderManifestPageToSvg(createRenderManifest(input), 0)).toContain(
      'print sheet 1',
    );
    expect(renderManifestPageToSvg(createRenderManifest(input), 0)).toContain(
      'style="font-kerning:none;font-variant-ligatures:none;text-rendering:geometricPrecision"',
    );
  });
  it('uses exact US Letter and folded card geometry', () => {
    expect(LETTER_PAGE).toEqual({ width: 612, height: 792 });
    expect(FINISHED_CARD).toEqual({ width: 252, height: 144 });
    expect(UNFOLDED_CARD).toEqual({ width: 252, height: 288 });

    const manifest = createRenderManifest({
      guests: guests(4),
      designId: 'minimal-ivory',
    });
    expect(manifest.pages).toHaveLength(1);
    expect(manifest.pages.every((page) => Object.isFrozen(page))).toBe(true);
    const cardPage = manifest.pages[0]!;
    const outlines = cardPage.commands.filter(
      (command) =>
        command.type === 'stroke_rectangle' &&
        command.width === UNFOLDED_CARD.width,
    );
    expect(outlines).toHaveLength(4);
    expect(
      outlines.map((outline) =>
        outline.type === 'stroke_rectangle'
          ? [outline.x, outline.y, outline.width, outline.height]
          : [],
      ),
    ).toEqual([
      [54, 396, 252, 288],
      [306, 396, 252, 288],
      [54, 108, 252, 288],
      [306, 108, 252, 288],
    ]);
  });

  it.each([
    [25, 7],
    [500, 125],
  ])('creates only four cards per sheet for %i guests', (count, pages) => {
    const manifest = createRenderManifest({
      guests: guests(count),
      designId: 'garden-sage',
    });
    expect(manifest.pages).toHaveLength(pages);
    expect(manifest.guestCount).toBe(count);
  });

  it.each([
    [25, 5],
    [500, 84],
  ])(
    'creates only six landscape cards per sheet for %i guests',
    (count, pages) => {
      const manifest = createRenderManifest({
        guests: guests(count),
        designId: 'garden-sage',
        layoutId: 'landscape_6',
      });
      expect(manifest.layoutId).toBe('landscape_6');
      expect(manifest.pages).toHaveLength(pages);
      expect(manifest.pages[0]).toMatchObject(LANDSCAPE_LETTER_PAGE);
      const outlines = manifest.pages[0]!.commands.filter(
        (command) =>
          command.type === 'stroke_rectangle' &&
          command.width === UNFOLDED_CARD.width &&
          command.height === UNFOLDED_CARD.height,
      );
      expect(
        outlines.map((outline) =>
          outline.type === 'stroke_rectangle' ? [outline.x, outline.y] : [],
        ),
      ).toEqual([
        [18, 306],
        [270, 306],
        [522, 306],
        [18, 18],
        [270, 18],
        [522, 18],
      ]);
    },
  );

  it('renders equal guest data on the two visible faces around the fold', () => {
    const manifest = createRenderManifest({
      guests: [{ name: 'José García', table: '12', marker: 'Vegan' }],
      designId: 'midnight-gold',
    });
    const texts = manifest.pages[0]!.commands.filter(
      (command): command is TextCommand => command.type === 'text',
    );

    expect(texts.filter((command) => command.role === 'name')).toEqual([
      expect.objectContaining({ text: 'José García', rotation: 0 }),
      expect.objectContaining({ text: 'José García', rotation: 180 }),
    ]);
    expect(texts.filter((command) => command.role === 'table')).toHaveLength(2);
    expect(texts.filter((command) => command.role === 'marker')).toHaveLength(
      2,
    );
  });

  it('preserves duplicate guests as separate cards', () => {
    const manifest = createRenderManifest({
      guests: [{ name: 'Same Name' }, { name: 'Same Name' }],
      designId: 'minimal-ivory',
    });
    const nameCommands = manifest.pages[0]!.commands.filter(
      (command) => command.type === 'text' && command.role === 'name',
    );
    expect(nameCommands).toHaveLength(4);
  });

  it('applies a constrained reusable-preset style to both printed faces', () => {
    const manifest = createRenderManifest({
      guests: [{ name: 'Ada Lovelace', table: '12' }],
      designId: 'minimal-ivory',
      nameStyle: {
        color: '#224466',
        position: 'top',
        font: 'serif',
        size: 'small',
      },
    });
    const names = manifest.pages[0]!.commands.filter(
      (command): command is TextCommand =>
        command.type === 'text' && command.role === 'name',
    );
    expect(names).toHaveLength(2);
    expect(names).toEqual([
      expect.objectContaining({
        color: '#224466',
        fontFamily: 'serif',
        fontSize: 18,
      }),
      expect.objectContaining({
        color: '#224466',
        fontFamily: 'serif',
        fontSize: 18,
      }),
    ]);
    expect(renderManifestPageToSvg(manifest, 0)).toContain(
      'font-family="Noto Serif, serif"',
    );
  });

  it('rejects text that cannot fit rather than clipping it', () => {
    const input = {
      guests: [{ name: 'W'.repeat(120) }],
      designId: 'minimal-ivory' as const,
    };
    expect(preflightRender(input)).toEqual([
      expect.objectContaining({ code: 'text_does_not_fit', field: 'name' }),
    ]);
    expect(() => createRenderManifest(input)).toThrow(RenderPreflightError);
    expect(() =>
      createRenderManifest({
        guests: [{ name: 'Valid Name' }],
        designId: 'minimal-ivory',
        title: 'W'.repeat(500),
      }),
    ).toThrow(/event name is too long/u);
  });

  it('rejects characters absent from the selected font metrics', () => {
    const issues = preflightRender(
      { guests: [{ name: 'Valid Name' }], designId: 'minimal-ivory' },
      {
        ...APPROXIMATE_NOTO_SANS_METRICS,
        familyName: 'Tiny Test Font',
        supportsText: () => false,
      },
    );
    expect(issues).toEqual([
      expect.objectContaining({ code: 'unsupported_font_character' }),
    ]);
  });

  it('escapes SVG content and rotates the upper face', () => {
    const manifest = createRenderManifest({
      guests: [{ name: 'Anne & O’Connor' }],
      designId: 'minimal-ivory',
    });
    const svg = renderManifestPageToSvg(manifest, 0);
    expect(svg).toContain('Anne &amp;');
    expect(svg).toContain('O’Connor</text>');
    expect(
      manifest.pages[0]!.commands.filter(
        (command): command is TextCommand =>
          command.type === 'text' &&
          command.role === 'name' &&
          command.rotation === 0,
      )
        .map((command) => command.text)
        .join(' '),
    ).toBe('Anne & O’Connor');
    expect(svg).toContain('rotate(180');
    expect(svg).not.toContain('Anne & O’Connor');
    expect(() => renderManifestPageToSvg(manifest, 1)).toThrow(RangeError);
  });

  it('keeps short names large and balances long names over two matching faces', () => {
    for (const [name, count] of [
      ['Anaïs Dubois', 1],
      ['Alexandria Catherine Montgomery-Sinclair', 2],
      ['María Fernanda de la Cruz Hernández', 2],
      ['Jean-Baptiste Alexandre de Villeneuve', 2],
      ['Christopher Bartholomew Worthington III', 2],
    ] as const) {
      const manifest = createRenderManifest({
        guests: [{ name }],
        designId: 'garden-sage',
      });
      const names = manifest.pages[0]!.commands.filter(
        (command): command is TextCommand =>
          command.type === 'text' && command.role === 'name',
      );
      const lower = names.filter((command) => command.rotation === 0);
      const upper = names.filter((command) => command.rotation === 180);
      expect(lower).toHaveLength(count);
      expect(upper.map((command) => command.text)).toEqual(
        lower.map((command) => command.text),
      );
      expect(lower.map((command) => command.text).join(' ')).toBe(name);
      expect(lower[0]!.fontSize).toBeGreaterThanOrEqual(16);
      if (count === 1) expect(lower[0]!.fontSize).toBe(26);
      else {
        expect(lower[0]!.centerY).toBeGreaterThan(lower[1]!.centerY);
        expect(upper[0]!.centerY).toBeLessThan(upper[1]!.centerY);
      }
    }
  });

  it('preserves compound and nonbreaking names without inventing breaks or losing text', () => {
    for (const name of [
      'Alexandria Catherine Montgomery-Sinclair',
      'Christopher-Bartholomew-Worthington',
      'Alexandria\u00a0Catherine',
      'Alexandria\u202fCatherine',
      'Christopher\u2011Bartholomew',
      'W'.repeat(20),
    ]) {
      const names = createRenderManifest({
        guests: [{ name }],
        designId: 'minimal-ivory',
      }).pages[0]!.commands.filter(
        (command): command is TextCommand =>
          command.type === 'text' &&
          command.role === 'name' &&
          command.rotation === 0,
      );
      expect(names.length).toBeLessThanOrEqual(2);
      expect(
        names
          .map((command) => command.text)
          .join(name.includes(' ') ? ' ' : ''),
      ).toBe(name);
      if (!name.includes(' ') && !name.includes('-'))
        expect(names).toHaveLength(1);
      if (name.includes('Montgomery-Sinclair'))
        expect(
          names.some((command) => command.text.endsWith('Montgomery-Sinclair')),
        ).toBe(true);
    }
  });

  it('bounds both name lines and keeps a detail gap for every font, position and size', () => {
    for (const font of ['sans', 'serif'] as const) {
      const metrics = font === 'sans' ? NOTO_SANS_METRICS : NOTO_SERIF_METRICS;
      for (const position of ['top', 'center', 'bottom'] as const) {
        for (const size of ['small', 'medium', 'large'] as const) {
          for (const details of [
            {},
            { table: 'TABLE 12' },
            { marker: 'Vegan' },
            { table: 'TABLE 12', marker: 'Vegan' },
          ]) {
            const name = 'María Fernanda de la Cruz Hernández';
            const page = createRenderManifest({
              guests: [{ name, ...details }],
              designId: 'garden-sage',
              nameStyle: { font, position, size, color: '#223322' },
            }).pages[0]!;
            for (const rotation of [0, 180] as const) {
              const face = page.commands.find(
                (command) =>
                  command.type === 'fill_rectangle' &&
                  command.rotation === rotation,
              );
              if (face?.type !== 'fill_rectangle')
                throw new Error('Missing face');
              const direction = rotation === 0 ? 1 : -1;
              const texts = page.commands.filter(
                (command): command is TextCommand =>
                  command.type === 'text' && command.rotation === rotation,
              );
              const names = texts.filter((command) => command.role === 'name');
              expect(names).toHaveLength(2);
              expect(names.map((command) => command.text).join(' ')).toBe(name);
              const bounds = (command: TextCommand) => {
                const fontMetrics =
                  command.role === 'name' ? metrics : NOTO_SANS_METRICS;
                const center =
                  FINISHED_CARD.height / 2 +
                  direction *
                    (command.centerY - face.y - FINISHED_CARD.height / 2);
                const halfHeight =
                  fontMetrics.heightAtSize(command.fontSize) / 2;
                return {
                  lower: center - halfHeight - 0.35 * command.fontSize,
                  upper: center + halfHeight,
                };
              };
              for (const command of names) {
                expect(
                  metrics.widthOfTextAtSize(command.text, command.fontSize),
                ).toBeLessThanOrEqual(204 + 1e-8);
                expect(bounds(command).lower).toBeGreaterThanOrEqual(16 - 1e-8);
                expect(bounds(command).upper).toBeLessThanOrEqual(128 + 1e-8);
                expect(command.centerX).toBe(face.x + FINISHED_CARD.width / 2);
              }
              const extra = texts.filter((command) => command.role !== 'name');
              if (extra.length > 0) {
                const lowerName = Math.min(
                  ...names.map((command) => bounds(command).lower),
                );
                const upperName = Math.max(
                  ...names.map((command) => bounds(command).upper),
                );
                if (position === 'bottom')
                  expect(upperName + 6).toBeLessThanOrEqual(
                    Math.min(...extra.map((command) => bounds(command).lower)) +
                      1e-8,
                  );
                else
                  expect(lowerName - 6).toBeGreaterThanOrEqual(
                    Math.max(...extra.map((command) => bounds(command).upper)) -
                      1e-8,
                  );
              }
            }
          }
        }
      }
    }
  });

  it('renders catalog artwork in truthful picker and print-sheet SVGs', () => {
    const botanical = renderDesignFaceToSvg('garden-sage', {
      backgroundImageHref: '/designs/predefined/garden-sage.jpg?x=1&y=2',
    });
    const formal = renderDesignFaceToSvg('midnight-gold', {
      backgroundImageHref: '/designs/predefined/midnight-gold.jpg',
    });
    expect(botanical).toContain('<image');
    expect(botanical).toContain(
      'href="/designs/predefined/garden-sage.jpg?x=1&amp;y=2"',
    );
    expect(botanical).toContain('Alex Morgan');
    expect(botanical).not.toContain('<path');
    expect(formal).toContain('<image');
    expect(botanical).not.toBe(formal);
  });
});
