import {
  DESIGN_IDS,
  PRINT_LAYOUT_IDS,
  guestRowSchema,
  type DesignId,
  type GuestRow,
  type NameStyle,
  type PrintLayoutId,
} from '@tablecards/core';
import { z } from 'zod';

const DRAFT_VERSION = 1;
const DRAFT_MAX_AGE_MS = 60 * 60 * 1000;
const DRAFT_MAX_BYTES = 160 * 1024;

const tableCardsDraftSchema = z
  .object({
    version: z.literal(DRAFT_VERSION),
    savedAt: z.number().int().nonnegative(),
    title: z.string().max(120),
    designId: z
      .string()
      .min(1)
      .max(64)
      .refine((value) => DESIGN_IDS.includes(value as DesignId)),
    layoutId: z
      .string()
      .refine((value) => PRINT_LAYOUT_IDS.includes(value as PrintLayoutId)),
    guests: z.array(guestRowSchema).max(500),
    pastedText: z
      .string()
      .max(160 * 1024)
      .optional(),
    validatedText: z
      .string()
      .max(160 * 1024)
      .optional(),
    activeStep: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    customDesign: z
      .object({
        kind: z.enum(['uploaded', 'ai']),
        reference: z.string().min(1).max(128),
        label: z.string().max(120),
        nameStyle: z
          .object({
            color: z.string().regex(/^#[0-9a-f]{6}$/iu),
            position: z.enum(['top', 'center', 'bottom']),
            font: z.enum(['sans', 'serif']),
            size: z.enum(['small', 'medium', 'large']),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export interface TableCardsDraft {
  readonly version: typeof DRAFT_VERSION;
  readonly savedAt: number;
  readonly title: string;
  readonly designId: DesignId;
  readonly layoutId: PrintLayoutId;
  readonly guests: readonly GuestRow[];
  readonly pastedText?: string;
  readonly validatedText?: string;
  readonly activeStep?: 1 | 2 | 3;
  readonly customDesign?: {
    readonly kind: 'uploaded' | 'ai';
    readonly reference: string;
    readonly label: string;
    readonly nameStyle?: NameStyle;
  };
}

export interface DraftStore {
  clear(): void;
  read(): TableCardsDraft | null;
  write(input: Omit<TableCardsDraft, 'version' | 'savedAt'>): TableCardsDraft;
}

export function createTableCardsDraftStore(
  storage:
    | Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
    | undefined = typeof sessionStorage === 'undefined'
    ? undefined
    : sessionStorage,
  now: () => number = Date.now,
  key = 'tablecards:protected-draft:v1',
): DraftStore {
  return {
    clear() {
      try {
        storage?.removeItem(key);
      } catch {
        // A draft is convenience state. Private modes can reject storage.
      }
    },
    read() {
      if (!storage) return null;
      try {
        const raw = storage.getItem(key);
        if (
          !raw ||
          new TextEncoder().encode(raw).byteLength > DRAFT_MAX_BYTES
        ) {
          if (raw) storage.removeItem(key);
          return null;
        }
        const parsed = tableCardsDraftSchema.safeParse(JSON.parse(raw));
        if (
          !parsed.success ||
          now() - parsed.data.savedAt > DRAFT_MAX_AGE_MS ||
          parsed.data.savedAt > now() + 60_000
        ) {
          storage.removeItem(key);
          return null;
        }
        return parsed.data as TableCardsDraft;
      } catch {
        try {
          storage.removeItem(key);
        } catch {
          // The invalid draft is already ignored.
        }
        return null;
      }
    },
    write(input) {
      const draft = tableCardsDraftSchema.parse({
        ...input,
        version: DRAFT_VERSION,
        savedAt: now(),
      }) as TableCardsDraft;
      const raw = JSON.stringify(draft);
      if (new TextEncoder().encode(raw).byteLength > DRAFT_MAX_BYTES) {
        throw new Error('The protected draft is too large to store safely.');
      }
      storage?.setItem(key, raw);
      return draft;
    },
  };
}
