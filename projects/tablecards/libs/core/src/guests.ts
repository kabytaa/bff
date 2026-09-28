import { z } from 'zod';

export const MAX_GUEST_ROWS = 500;
export const MAX_PASTED_INPUT_CHARS = 512 * 1024;
export const MAX_GUEST_NAME_CHARS = 120;
export const MAX_TABLE_CHARS = 40;
export const MAX_MARKER_CHARS = 32;

export const guestRowSchema = z
  .object({
    name: z.string().min(1).max(MAX_GUEST_NAME_CHARS),
    table: z.string().min(1).max(MAX_TABLE_CHARS).optional(),
    marker: z.string().min(1).max(MAX_MARKER_CHARS).optional(),
  })
  .strict();

export type GuestRow = z.infer<typeof guestRowSchema>;

export const guestColumnMappingSchema = z
  .object({
    name: z.number().int().min(0).max(31),
    table: z.number().int().min(0).max(31).optional(),
    marker: z.number().int().min(0).max(31).optional(),
    headerRows: z.number().int().min(0).max(10).default(0),
  })
  .strict()
  .superRefine((mapping, context) => {
    const columns = [mapping.name, mapping.table, mapping.marker].filter(
      (column): column is number => column !== undefined,
    );
    if (new Set(columns).size !== columns.length) {
      context.addIssue({
        code: 'custom',
        message: 'Each guest field must use a different column.',
      });
    }
  });

export type GuestColumnMapping = z.input<typeof guestColumnMappingSchema>;

export type GuestField = 'name' | 'table' | 'marker' | 'file' | 'rows';

export type GuestImportIssueCode =
  | 'empty_name'
  | 'input_too_large'
  | 'invalid_cell'
  | 'invalid_mapping'
  | 'legacy_xls_unsupported'
  | 'no_guests'
  | 'too_long'
  | 'too_many_rows'
  | 'unsupported_character'
  | 'unsupported_file_type';

export interface GuestImportIssue {
  readonly code: GuestImportIssueCode;
  readonly field: GuestField;
  /** One-based source row, before removed header rows. */
  readonly row?: number;
  readonly message: string;
}

export interface GuestImportResult {
  readonly ok: boolean;
  readonly guests: readonly GuestRow[];
  readonly issues: readonly GuestImportIssue[];
  readonly ignoredBlankRows: number;
}

export class GuestImportError extends Error {
  public readonly issues: readonly GuestImportIssue[];

  public constructor(issues: readonly GuestImportIssue[]) {
    super(issues.map((issue) => issue.message).join(' '));
    this.name = 'GuestImportError';
    this.issues = issues;
  }
}

type RawCell = string | number | boolean | null | undefined;

const allowedTextCharacter =
  /^[\p{Script=Latin}\p{Mark}\p{Number}\p{Zs}\p{Punctuation}]+$/u;

function toBoundedText(
  cell: unknown,
  field: Exclude<GuestField, 'file' | 'rows'>,
  row: number,
  maximum: number,
): { readonly value?: string; readonly issue?: GuestImportIssue } {
  if (cell === null || cell === undefined) {
    return {};
  }
  if (
    typeof cell !== 'string' &&
    typeof cell !== 'number' &&
    typeof cell !== 'boolean'
  ) {
    return {
      issue: {
        code: 'invalid_cell',
        field,
        row,
        message: `Row ${row} has an unsupported ${field} value.`,
      },
    };
  }

  const value = String(cell).trim();
  if (value.length === 0) {
    return {};
  }
  if (value.length > maximum) {
    return {
      issue: {
        code: 'too_long',
        field,
        row,
        message: `Row ${row} ${field} exceeds ${maximum} characters.`,
      },
    };
  }
  if (!allowedTextCharacter.test(value)) {
    return {
      issue: {
        code: 'unsupported_character',
        field,
        row,
        message: `Row ${row} ${field} contains characters outside the supported Latin-script set.`,
      },
    };
  }
  return { value };
}

function invalidMappingResult(message: string): GuestImportResult {
  const issue: GuestImportIssue = {
    code: 'invalid_mapping',
    field: 'rows',
    message,
  };
  return Object.freeze({
    ok: false,
    guests: Object.freeze([]),
    issues: Object.freeze([issue]),
    ignoredBlankRows: 0,
  });
}

/**
 * Converts parser output into the one canonical guest model. It never sorts,
 * deduplicates, or normalizes spelling. Invalid non-blank rows are reported
 * and never silently included.
 */
export function normalizeRawGuestRows(
  rows: readonly (readonly unknown[])[],
  mappingInput: GuestColumnMapping,
): GuestImportResult {
  const parsedMapping = guestColumnMappingSchema.safeParse(mappingInput);
  if (!parsedMapping.success) {
    return invalidMappingResult(
      parsedMapping.error.issues[0]?.message ?? 'Invalid column mapping.',
    );
  }

  const mapping = parsedMapping.data;
  const dataRows = rows.slice(mapping.headerRows);
  const issues: GuestImportIssue[] = [];
  const guests: GuestRow[] = [];
  let ignoredBlankRows = 0;

  for (let index = 0; index < dataRows.length; index += 1) {
    const rawRow = dataRows[index];
    const sourceRow = mapping.headerRows + index + 1;
    if (!rawRow) {
      ignoredBlankRows += 1;
      continue;
    }

    const nameResult = toBoundedText(
      rawRow[mapping.name],
      'name',
      sourceRow,
      MAX_GUEST_NAME_CHARS,
    );
    const tableResult =
      mapping.table === undefined
        ? {}
        : toBoundedText(
            rawRow[mapping.table],
            'table',
            sourceRow,
            MAX_TABLE_CHARS,
          );
    const markerResult =
      mapping.marker === undefined
        ? {}
        : toBoundedText(
            rawRow[mapping.marker],
            'marker',
            sourceRow,
            MAX_MARKER_CHARS,
          );

    const fieldIssues = [
      nameResult.issue,
      tableResult.issue,
      markerResult.issue,
    ].filter((issue): issue is GuestImportIssue => issue !== undefined);
    if (fieldIssues.length > 0) {
      issues.push(...fieldIssues);
      continue;
    }

    const name = nameResult.value;
    const table = tableResult.value;
    const marker = markerResult.value;
    if (name === undefined) {
      if (table === undefined && marker === undefined) {
        ignoredBlankRows += 1;
      } else {
        issues.push({
          code: 'empty_name',
          field: 'name',
          row: sourceRow,
          message: `Row ${sourceRow} has table or marker data but no guest name.`,
        });
      }
      continue;
    }

    guests.push(
      Object.freeze({
        name,
        ...(table === undefined ? {} : { table }),
        ...(marker === undefined ? {} : { marker }),
      }),
    );
  }

  if (guests.length > MAX_GUEST_ROWS) {
    issues.push({
      code: 'too_many_rows',
      field: 'rows',
      message: `The import contains ${guests.length} guests; the maximum is ${MAX_GUEST_ROWS}.`,
    });
  }
  if (guests.length === 0 && issues.length === 0) {
    issues.push({
      code: 'no_guests',
      field: 'rows',
      message: 'Add at least one guest.',
    });
  }

  return Object.freeze({
    ok: issues.length === 0,
    guests: Object.freeze(guests),
    issues: Object.freeze(issues),
    ignoredBlankRows,
  });
}

export function normalizePastedText(
  input: string,
  mapping?: GuestColumnMapping,
): GuestImportResult {
  if (input.length > MAX_PASTED_INPUT_CHARS) {
    const issue: GuestImportIssue = {
      code: 'input_too_large',
      field: 'rows',
      message: `Pasted input exceeds ${MAX_PASTED_INPUT_CHARS} characters.`,
    };
    return Object.freeze({
      ok: false,
      guests: Object.freeze([]),
      issues: Object.freeze([issue]),
      ignoredBlankRows: 0,
    });
  }

  const usesGrid = input.includes('\t');
  const rows: readonly RawCell[][] = input
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .split('\n')
    .map((line) => (usesGrid ? line.split('\t') : [line]));

  return normalizeRawGuestRows(
    rows,
    mapping ?? { name: 0, ...(usesGrid ? { table: 1, marker: 2 } : {}) },
  );
}

export function assertGuestImport(
  result: GuestImportResult,
): readonly GuestRow[] {
  if (!result.ok) {
    throw new GuestImportError(result.issues);
  }
  return result.guests;
}

export type ImportFileKind = 'csv' | 'xlsx';

export function classifyImportFilename(
  filename: string,
):
  | { readonly ok: true; readonly kind: ImportFileKind }
  | { readonly ok: false; readonly issue: GuestImportIssue } {
  const extension = filename.trim().toLocaleLowerCase('en-US').split('.').pop();
  if (extension === 'csv') {
    return { ok: true, kind: 'csv' };
  }
  if (extension === 'xlsx') {
    return { ok: true, kind: 'xlsx' };
  }
  if (extension === 'xls') {
    return {
      ok: false,
      issue: {
        code: 'legacy_xls_unsupported',
        field: 'file',
        message:
          'Legacy .xls files are not supported. Save the file as .xlsx or .csv.',
      },
    };
  }
  return {
    ok: false,
    issue: {
      code: 'unsupported_file_type',
      field: 'file',
      message: 'Choose a .csv or .xlsx file.',
    },
  };
}
