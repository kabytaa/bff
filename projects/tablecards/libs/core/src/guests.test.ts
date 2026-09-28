import { describe, expect, it } from 'vitest';

import {
  MAX_GUEST_ROWS,
  assertGuestImport,
  classifyImportFilename,
  normalizePastedText,
  normalizeRawGuestRows,
} from './guests';

describe('guest import normalization', () => {
  it('preserves spelling, order, accents, and duplicate names', () => {
    const result = normalizePastedText(
      'José García\nZoë Müller\nJosé García\nFrançois Dupont',
    );

    expect(result).toMatchObject({ ok: true, ignoredBlankRows: 0 });
    expect(result.guests.map((guest) => guest.name)).toEqual([
      'José García',
      'Zoë Müller',
      'José García',
      'François Dupont',
    ]);
    expect(assertGuestImport(result)).toBe(result.guests);
  });

  it('maps pasted grids without reordering rows', () => {
    const result = normalizePastedText(
      'Name\tMeal\tTable\nAda Lovelace\tVegan\t12\nGrace Hopper\tFish\t7',
      { name: 0, marker: 1, table: 2, headerRows: 1 },
    );

    expect(result).toEqual({
      ok: true,
      guests: [
        { name: 'Ada Lovelace', table: '12', marker: 'Vegan' },
        { name: 'Grace Hopper', table: '7', marker: 'Fish' },
      ],
      issues: [],
      ignoredBlankRows: 0,
    });
  });

  it('ignores wholly blank lines but rejects partially populated rows', () => {
    const result = normalizeRawGuestRows(
      [
        ['', '', ''],
        ['', '12', 'Vegan'],
        ['Valid Person', '', ''],
      ],
      { name: 0, table: 1, marker: 2 },
    );

    expect(result.ok).toBe(false);
    expect(result.ignoredBlankRows).toBe(1);
    expect(result.guests).toEqual([{ name: 'Valid Person' }]);
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'empty_name', row: 2 }),
    ]);
    expect(() => assertGuestImport(result)).toThrow(/no guest name/u);
  });

  it('reports unsupported scripts, control characters, and overlong fields', () => {
    const result = normalizeRawGuestRows(
      [
        ['נועה', '', ''],
        ['Jane\u0000Doe', '', ''],
        ['A'.repeat(121), '', ''],
      ],
      { name: 0, table: 1, marker: 2 },
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'unsupported_character',
      'unsupported_character',
      'too_long',
    ]);
  });

  it('rejects duplicate mapping columns before inspecting data', () => {
    const result = normalizeRawGuestRows([['Name']], {
      name: 0,
      table: 0,
    });

    expect(result).toMatchObject({
      ok: false,
      issues: [{ code: 'invalid_mapping' }],
    });
  });

  it('bounds imports without truncating them', () => {
    const rows = Array.from({ length: MAX_GUEST_ROWS + 1 }, (_, index) => [
      `Guest ${index + 1}`,
    ]);
    const result = normalizeRawGuestRows(rows, { name: 0 });

    expect(result.ok).toBe(false);
    expect(result.guests).toHaveLength(MAX_GUEST_ROWS + 1);
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'too_many_rows' }),
    ]);
  });

  it('rejects legacy XLS explicitly while accepting CSV and XLSX', () => {
    expect(classifyImportFilename('guests.CSV')).toEqual({
      ok: true,
      kind: 'csv',
    });
    expect(classifyImportFilename('guests.xlsx')).toEqual({
      ok: true,
      kind: 'xlsx',
    });
    expect(classifyImportFilename('guests.xls')).toMatchObject({
      ok: false,
      issue: { code: 'legacy_xls_unsupported' },
    });
    expect(classifyImportFilename('guests.pdf')).toMatchObject({
      ok: false,
      issue: { code: 'unsupported_file_type' },
    });
  });
});
