import {
  classifyImportFilename,
  normalizeRawGuestRows,
  type GuestColumnMapping,
  type GuestImportResult,
} from '@tablecards/core';
import Papa from 'papaparse';
import { readSheet } from 'read-excel-file/browser';

export interface ParsedGuestTable {
  readonly filename: string;
  readonly kind: 'csv' | 'pasted' | 'xlsx';
  readonly rows: readonly (readonly unknown[])[];
  readonly suggestedMapping: GuestColumnMapping;
}

const headerNames = {
  name: new Set(['name', 'guest', 'guest name', 'full name']),
  table: new Set(['table', 'table name', 'table number', 'table no']),
  marker: new Set(['marker', 'note', 'meal', 'dietary', 'short marker']),
};

function normalizedHeader(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : '';
}

export function parsePastedGrid(text: string): ParsedGuestTable {
  const rows = text
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .split('\n')
    .map((line) => line.split('\t'));
  return {
    filename: 'Pasted spreadsheet grid',
    kind: 'pasted',
    rows,
    suggestedMapping: suggestGuestMapping(rows),
  };
}

export function suggestGuestMapping(
  rows: readonly (readonly unknown[])[],
): GuestColumnMapping {
  const first = rows[0] ?? [];
  const headers = first.map(normalizedHeader);
  const find = (candidates: ReadonlySet<string>) =>
    headers.findIndex((header) => candidates.has(header));
  const name = find(headerNames.name);
  const table = find(headerNames.table);
  const marker = find(headerNames.marker);
  const hasRecognizedHeader = name >= 0 || table >= 0 || marker >= 0;
  return {
    name: name >= 0 ? name : 0,
    ...(table < 0 ? {} : { table }),
    ...(marker < 0 ? {} : { marker }),
    headerRows: hasRecognizedHeader ? 1 : 0,
  };
}

export function parseCsvText(text: string, filename = 'guests.csv') {
  const parsed = Papa.parse<unknown[]>(text, {
    delimiter: '',
    dynamicTyping: false,
    skipEmptyLines: false,
  });
  if (parsed.errors.length > 0) {
    throw new Error(
      parsed.errors[0]?.message ?? 'The CSV file could not be read.',
    );
  }
  const rows = parsed.data as readonly (readonly unknown[])[];
  return {
    filename,
    kind: 'csv' as const,
    rows,
    suggestedMapping: suggestGuestMapping(rows),
  };
}

async function parseCsvFile(file: File): Promise<readonly unknown[][]> {
  return await new Promise((resolve, reject) => {
    Papa.parse<unknown[]>(file, {
      delimiter: '',
      dynamicTyping: false,
      skipEmptyLines: false,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(
            new Error(
              results.errors[0]?.message ?? 'The CSV file could not be read.',
            ),
          );
          return;
        }
        resolve(results.data);
      },
      error: () => reject(new Error('The CSV file could not be read.')),
    });
  });
}

export async function parseGuestFile(file: File): Promise<ParsedGuestTable> {
  const classification = classifyImportFilename(file.name);
  if (!classification.ok) throw new Error(classification.issue.message);
  const rows =
    classification.kind === 'csv'
      ? await parseCsvFile(file)
      : ((await readSheet(file)) as readonly (readonly unknown[])[]);
  if (rows.length === 0) throw new Error('The file has no guest rows.');
  return {
    filename: file.name,
    kind: classification.kind,
    rows,
    suggestedMapping: suggestGuestMapping(rows),
  };
}

export function applyGuestMapping(
  table: ParsedGuestTable,
  mapping: GuestColumnMapping,
): GuestImportResult {
  return normalizeRawGuestRows(table.rows, mapping);
}
