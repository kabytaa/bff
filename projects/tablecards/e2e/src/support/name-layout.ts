import { expect, type Locator } from '@playwright/test';

export const MIXED_EXAMPLE_NAMES = [
  'Anaïs Dubois',
  'Alexandria Catherine Montgomery-Sinclair',
  'Björn Hansen',
  'Olivia Rose Bennett',
  'María Fernanda de la Cruz Hernández',
  'José García',
] as const;

/** Checks actual SVG text, not a second call to the renderer under test. */
export async function expectExampleNameLayout(
  preview: Locator,
  names: readonly string[],
): Promise<string[]> {
  const text = await preview.locator('svg text').evaluateAll((elements) =>
    elements.map((element) => {
      const bounds = (element as SVGTextElement).getBBox();
      const style = getComputedStyle(element);
      return {
        text: element.textContent ?? '',
        size: Number(element.getAttribute('font-size')),
        inverted: element.hasAttribute('transform'),
        centerX: Number(element.getAttribute('x')),
        x: bounds.x,
        width: bounds.width,
        kerning: style.fontKerning,
        ligatures: style.fontVariantLigatures,
        rendering: style.textRendering.toLowerCase(),
        weight: style.fontWeight,
        letterSpacing: style.letterSpacing,
      };
    }),
  );
  const uprightLines: string[] = [];
  for (const name of names) {
    const lines = text.filter((line) => line.text && name.includes(line.text));
    const upright = lines.filter((line) => !line.inverted);
    const inverted = lines.filter((line) => line.inverted);
    const long = name.length > 25;
    expect(upright).toHaveLength(long ? 2 : 1);
    expect(inverted.map((line) => line.text)).toEqual(
      upright.map((line) => line.text),
    );
    expect(upright.map((line) => line.text).join(' ')).toBe(name);
    for (const line of lines) {
      expect(line.kerning).toBe('none');
      expect(line.ligatures).toBe('none');
      expect(line.rendering).toBe('geometricprecision');
      expect(line.weight).toBe('400');
      expect(line.letterSpacing).toBe('normal');
      expect(line.size).toBeGreaterThanOrEqual(long ? 18 : 22);
      expect(line.width).toBeLessThanOrEqual(204.5);
      expect(line.x).toBeGreaterThanOrEqual(line.centerX - 102.5);
      expect(line.x + line.width).toBeLessThanOrEqual(line.centerX + 102.5);
    }
    uprightLines.push(...upright.map((line) => line.text));
  }
  return uprightLines;
}
