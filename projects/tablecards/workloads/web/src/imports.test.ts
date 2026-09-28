import { describe, expect, it } from 'vitest';

import {
  applyGuestMapping,
  parseCsvText,
  parsePastedGrid,
  suggestGuestMapping,
} from './imports';

describe('browser import preparation', () => {
  it('recognizes common headers without changing row order or duplicates', () => {
    const table = parseCsvText(
      'Guest Name,Table,Meal\nAda Lovelace,2,Vegan\nAda Lovelace,4,Fish',
    );
    const result = applyGuestMapping(table, table.suggestedMapping);

    expect(table.suggestedMapping).toEqual({
      name: 0,
      table: 1,
      marker: 2,
      headerRows: 1,
    });
    expect(result.ok).toBe(true);
    expect(result.guests).toEqual([
      { name: 'Ada Lovelace', table: '2', marker: 'Vegan' },
      { name: 'Ada Lovelace', table: '4', marker: 'Fish' },
    ]);
  });

  it('defaults an unlabelled sheet to the first column as the name', () => {
    expect(
      suggestGuestMapping([
        ['Ada', '1'],
        ['Lin', '2'],
      ]),
    ).toEqual({ name: 0, headerRows: 0 });
  });

  it('prepares a pasted spreadsheet grid for explicit mapping', () => {
    const table = parsePastedGrid('Name\tTable\nAda\t1');
    expect(table.kind).toBe('pasted');
    expect(table.suggestedMapping).toEqual({
      name: 0,
      table: 1,
      headerRows: 1,
    });
    expect(applyGuestMapping(table, table.suggestedMapping).guests).toEqual([
      { name: 'Ada', table: '1' },
    ]);
  });

  it('returns a clear parser error for malformed CSV', () => {
    expect(() => parseCsvText('name\n"unfinished')).toThrow();
  });
});
