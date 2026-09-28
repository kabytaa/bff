import {
  getDesignDefinition,
  type DesignDefinition,
  type DesignId,
} from './catalog';
import { guestRowSchema, type GuestRow } from './guests';

export const POINTS_PER_INCH = 72;
export const LETTER_PAGE = Object.freeze({
  width: 8.5 * POINTS_PER_INCH,
  height: 11 * POINTS_PER_INCH,
});
export const LANDSCAPE_LETTER_PAGE = Object.freeze({
  width: LETTER_PAGE.height,
  height: LETTER_PAGE.width,
});
export const UNFOLDED_CARD = Object.freeze({
  width: 3.5 * POINTS_PER_INCH,
  height: 4 * POINTS_PER_INCH,
});
export const FINISHED_CARD = Object.freeze({
  width: 3.5 * POINTS_PER_INCH,
  height: 2 * POINTS_PER_INCH,
});
export const CARDS_PER_SHEET = 4;
export type PrintLayoutId = 'landscape_6' | 'portrait_4';

export interface PrintLayoutDefinition {
  readonly id: PrintLayoutId;
  readonly name: string;
  readonly description: string;
  readonly page: { readonly width: number; readonly height: number };
  readonly columns: number;
  readonly rows: number;
  readonly cardsPerSheet: number;
  readonly minimumMargin: number;
}

export const PRINT_LAYOUTS = Object.freeze({
  portrait_4: Object.freeze({
    id: 'portrait_4',
    name: 'Portrait — 4 cards',
    description: 'Roomy margins for the widest printer compatibility.',
    page: LETTER_PAGE,
    columns: 2,
    rows: 2,
    cardsPerSheet: 4,
    minimumMargin: 54,
  }),
  landscape_6: Object.freeze({
    id: 'landscape_6',
    name: 'Landscape — 6 cards',
    description: 'Print-test layout with quarter-inch outer margins.',
    page: LANDSCAPE_LETTER_PAGE,
    columns: 3,
    rows: 2,
    cardsPerSheet: 6,
    minimumMargin: 18,
  }),
} as const satisfies Record<PrintLayoutId, PrintLayoutDefinition>);

export const PRINT_LAYOUT_IDS = Object.freeze(
  Object.keys(PRINT_LAYOUTS) as PrintLayoutId[],
);

export interface FontMetrics {
  readonly familyName: string;
  supportsText(text: string): boolean;
  widthOfTextAtSize(text: string, fontSize: number): number;
  heightAtSize(fontSize: number): number;
}

/**
 * Browser-preview metrics approximating Noto Sans. The PDF renderer always
 * rebuilds the manifest using the actual embedded PDF font metrics.
 */
export const APPROXIMATE_NOTO_SANS_METRICS: FontMetrics = Object.freeze({
  familyName: 'Noto Sans',
  supportsText: (text: string) =>
    /^[\p{Script=Latin}\p{Mark}\p{Number}\p{Zs}\p{Punctuation}]+$/u.test(text),
  widthOfTextAtSize: (text: string, fontSize: number) => {
    let units = 0;
    for (const character of text) {
      if (/\s/u.test(character)) {
        units += 0.28;
      } else if (/[ilI1.,'’|]/u.test(character)) {
        units += 0.3;
      } else if (/[MW@%]/u.test(character)) {
        units += 0.86;
      } else if (/\p{Lu}/u.test(character)) {
        units += 0.64;
      } else {
        units += 0.54;
      }
    }
    return units * fontSize;
  },
  heightAtSize: (fontSize: number) => fontSize * 1.2,
});

export interface FillRectangleCommand {
  readonly type: 'fill_rectangle';
  readonly role: 'face_background';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
  readonly rotation: 0 | 180;
}

export interface StrokeRectangleCommand {
  readonly type: 'stroke_rectangle';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
  readonly lineWidth: number;
}

export interface LineCommand {
  readonly type: 'line';
  readonly start: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
  readonly color: string;
  readonly lineWidth: number;
  readonly dash?: readonly number[];
}

export interface PathCommand {
  readonly type: 'path';
  readonly path: string;
  readonly fill?: string;
  readonly stroke?: string;
  readonly lineWidth?: number;
}

export interface TextCommand {
  readonly type: 'text';
  readonly text: string;
  readonly centerX: number;
  readonly centerY: number;
  readonly fontSize: number;
  readonly color: string;
  readonly rotation: 0 | 180;
  readonly role: 'instruction' | 'marker' | 'name' | 'table' | 'title';
  readonly fontFamily?: 'sans' | 'serif';
}

export type RenderCommand =
  | FillRectangleCommand
  | StrokeRectangleCommand
  | LineCommand
  | PathCommand
  | TextCommand;

export interface RenderPage {
  readonly kind: 'scale_check' | 'cards';
  readonly width: number;
  readonly height: number;
  readonly commands: readonly RenderCommand[];
}

export interface RenderManifest {
  readonly version: 1;
  readonly designId: DesignId;
  readonly layoutId: PrintLayoutId;
  readonly fontFamily: string;
  readonly guestCount: number;
  readonly pages: readonly RenderPage[];
}

export type RenderPreflightIssueCode =
  'invalid_guest' | 'text_does_not_fit' | 'unsupported_font_character';

export interface RenderPreflightIssue {
  readonly code: RenderPreflightIssueCode;
  readonly guestIndex: number;
  readonly field: 'marker' | 'name' | 'table';
  readonly message: string;
}

export class RenderPreflightError extends Error {
  public readonly issues: readonly RenderPreflightIssue[];

  public constructor(issues: readonly RenderPreflightIssue[]) {
    super(issues.map((issue) => issue.message).join(' '));
    this.name = 'RenderPreflightError';
    this.issues = issues;
  }
}

export interface CreateRenderManifestInput {
  readonly guests: readonly GuestRow[];
  readonly designId: DesignId;
  readonly title?: string;
  readonly layoutId?: PrintLayoutId;
  readonly nameStyle?: NameStyle;
}

export interface NameStyle {
  readonly color: string;
  readonly position: 'top' | 'center' | 'bottom';
  readonly font: 'sans' | 'serif';
  readonly size: 'small' | 'medium' | 'large';
}

interface FittedGuestText {
  readonly nameSize: number;
  readonly tableSize?: number;
  readonly markerSize?: number;
}

function fitText(
  text: string,
  metrics: FontMetrics,
  maximumWidth: number,
  maximumSize: number,
  minimumSize: number,
): number | undefined {
  for (let size = maximumSize; size >= minimumSize; size -= 0.25) {
    if (
      metrics.widthOfTextAtSize(text, size) <= maximumWidth &&
      metrics.heightAtSize(size) <= FINISHED_CARD.height * 0.34
    ) {
      return size;
    }
  }
  return undefined;
}

function fitGuest(
  guest: GuestRow,
  guestIndex: number,
  metrics: FontMetrics,
  nameMetrics: FontMetrics = metrics,
  nameStyle?: NameStyle,
):
  | { readonly ok: true; readonly fitted: FittedGuestText }
  | { readonly ok: false; readonly issues: readonly RenderPreflightIssue[] } {
  const issues: RenderPreflightIssue[] = [];
  const fields = [
    ['name', guest.name],
    ['table', guest.table],
    ['marker', guest.marker],
  ] as const;
  for (const [field, value] of fields) {
    const fieldMetrics = field === 'name' ? nameMetrics : metrics;
    if (value !== undefined && !fieldMetrics.supportsText(value)) {
      issues.push({
        code: 'unsupported_font_character',
        guestIndex,
        field,
        message: `Guest ${guestIndex + 1} ${field} contains a character unavailable in ${fieldMetrics.familyName}.`,
      });
    }
  }

  const nameSupported = nameMetrics.supportsText(guest.name);
  const tableSupported =
    guest.table === undefined || metrics.supportsText(guest.table);
  const markerSupported =
    guest.marker === undefined || metrics.supportsText(guest.marker);
  const nameSize = nameSupported
    ? fitText(
        guest.name,
        nameMetrics,
        220,
        nameStyle?.size === 'small'
          ? 18
          : nameStyle?.size === 'medium'
            ? 22
            : 26,
        8,
      )
    : undefined;
  const tableSize =
    guest.table === undefined || !tableSupported
      ? undefined
      : fitText(guest.table, metrics, 200, 11, 7);
  const markerSize =
    guest.marker === undefined || !markerSupported
      ? undefined
      : fitText(guest.marker, metrics, 200, 9, 6);

  for (const [field, value, size] of [
    ['name', guest.name, nameSize],
    ['table', guest.table, tableSize],
    ['marker', guest.marker, markerSize],
  ] as const) {
    const isSupported =
      field === 'name'
        ? nameSupported
        : field === 'table'
          ? tableSupported
          : markerSupported;
    if (value !== undefined && isSupported && size === undefined) {
      issues.push({
        code: 'text_does_not_fit',
        guestIndex,
        field,
        message: `Guest ${guestIndex + 1} ${field} cannot fit without clipping.`,
      });
    }
  }

  if (issues.length > 0 || nameSize === undefined) {
    return { ok: false, issues: Object.freeze(issues) };
  }
  return {
    ok: true,
    fitted: Object.freeze({
      nameSize,
      ...(tableSize === undefined ? {} : { tableSize }),
      ...(markerSize === undefined ? {} : { markerSize }),
    }),
  };
}

export function preflightRender(
  input: CreateRenderManifestInput,
  metrics: FontMetrics = APPROXIMATE_NOTO_SANS_METRICS,
  nameMetrics: FontMetrics = metrics,
): readonly RenderPreflightIssue[] {
  const issues: RenderPreflightIssue[] = [];
  const selectedNameMetrics =
    input.nameStyle?.font === 'serif' ? nameMetrics : metrics;
  for (let index = 0; index < input.guests.length; index += 1) {
    const guest = input.guests[index];
    const parsed = guestRowSchema.safeParse(guest);
    if (!parsed.success) {
      issues.push({
        code: 'invalid_guest',
        guestIndex: index,
        field: 'name',
        message: `Guest ${index + 1} is invalid: ${parsed.error.issues[0]?.message ?? 'invalid guest'}.`,
      });
      continue;
    }
    const fitted = fitGuest(
      parsed.data,
      index,
      metrics,
      selectedNameMetrics,
      input.nameStyle,
    );
    if (!fitted.ok) {
      issues.push(...fitted.issues);
    }
  }
  return Object.freeze(issues);
}

function addFace(
  commands: RenderCommand[],
  guest: GuestRow,
  fitted: FittedGuestText,
  design: DesignDefinition,
  x: number,
  y: number,
  rotation: 0 | 180,
  nameStyle?: NameStyle,
): void {
  commands.push(
    Object.freeze({
      type: 'fill_rectangle',
      role: 'face_background',
      x,
      y,
      width: FINISHED_CARD.width,
      height: FINISHED_CARD.height,
      color: design.palette.background,
      rotation,
    }),
  );
  const direction = rotation === 0 ? 1 : -1;
  const centerY = y + FINISHED_CARD.height / 2;
  const hasDetails = guest.table !== undefined || guest.marker !== undefined;
  const nameOffset =
    nameStyle?.position === 'top'
      ? 38
      : nameStyle?.position === 'bottom'
        ? -28
        : hasDetails
          ? 10
          : 0;
  const detailsDirection =
    nameStyle?.position === 'bottom' ? -direction : direction;
  commands.push(
    Object.freeze({
      type: 'text',
      text: guest.name,
      centerX: x + FINISHED_CARD.width / 2,
      centerY: centerY + direction * nameOffset,
      fontSize: fitted.nameSize,
      color: nameStyle?.color ?? design.palette.text,
      rotation,
      role: 'name',
      fontFamily: nameStyle?.font ?? 'sans',
    }),
  );
  if (guest.table !== undefined && fitted.tableSize !== undefined) {
    commands.push(
      Object.freeze({
        type: 'text',
        text: guest.table,
        centerX: x + FINISHED_CARD.width / 2,
        centerY: centerY - detailsDirection * 20,
        fontSize: fitted.tableSize,
        color: design.palette.secondaryText,
        rotation,
        role: 'table',
      }),
    );
  }
  if (guest.marker !== undefined && fitted.markerSize !== undefined) {
    commands.push(
      Object.freeze({
        type: 'text',
        text: guest.marker,
        centerX: x + FINISHED_CARD.width / 2,
        centerY:
          centerY - detailsDirection * (guest.table === undefined ? 20 : 34),
        fontSize: fitted.markerSize,
        color: design.palette.accent,
        rotation,
        role: 'marker',
      }),
    );
  }
}

function createScaleCheckPage(
  metrics: FontMetrics,
  title: string,
  layout: PrintLayoutDefinition,
): RenderPage {
  const page = layout.page;
  const upperBand = page.height * 0.82;
  const squareY = page.height * 0.58;
  const cardY = page.height * 0.27;
  const titleSize = metrics.supportsText(title)
    ? fitText(title, metrics, page.width - 112, 24, 10)
    : undefined;
  if (titleSize === undefined) {
    throw new Error(
      'The print-check title cannot be rendered without clipping.',
    );
  }
  const commands: RenderCommand[] = [
    Object.freeze({
      type: 'text',
      text: title,
      centerX: page.width / 2,
      centerY: upperBand + 24,
      fontSize: titleSize,
      color: '#111111',
      rotation: 0,
      role: 'title',
    }),
    Object.freeze({
      type: 'text',
      text: 'Print at 100% / Actual Size. Do not use Fit or Shrink.',
      centerX: page.width / 2,
      centerY: upperBand - 14,
      fontSize: 12,
      color: '#333333',
      rotation: 0,
      role: 'instruction',
    }),
    Object.freeze({
      type: 'stroke_rectangle',
      x: (page.width - POINTS_PER_INCH) / 2,
      y: squareY,
      width: POINTS_PER_INCH,
      height: POINTS_PER_INCH,
      color: '#111111',
      lineWidth: 1,
    }),
    Object.freeze({
      type: 'text',
      text: 'This square must measure exactly 1 inch on every side.',
      centerX: page.width / 2,
      centerY: squareY - 26,
      fontSize: 10,
      color: '#333333',
      rotation: 0,
      role: 'instruction',
    }),
    Object.freeze({
      type: 'stroke_rectangle',
      x: (page.width - FINISHED_CARD.width) / 2,
      y: cardY,
      width: FINISHED_CARD.width,
      height: FINISHED_CARD.height,
      color: '#111111',
      lineWidth: 1,
    }),
    Object.freeze({
      type: 'text',
      text: 'Finished card: 3.5 x 2 inches',
      centerX: page.width / 2,
      centerY: cardY - 24,
      fontSize: 10,
      color: '#333333',
      rotation: 0,
      role: 'instruction',
    }),
  ];

  for (const command of commands) {
    if (command.type === 'text' && !metrics.supportsText(command.text)) {
      throw new Error(
        `The selected font cannot render scale-page text: ${command.text}`,
      );
    }
  }
  return Object.freeze({
    kind: 'scale_check',
    width: page.width,
    height: page.height,
    commands: Object.freeze(commands),
  });
}

function createCardsPage(
  guests: readonly GuestRow[],
  guestOffset: number,
  design: DesignDefinition,
  metrics: FontMetrics,
  nameMetrics: FontMetrics,
  layout: PrintLayoutDefinition,
  nameStyle?: NameStyle,
): RenderPage {
  const commands: RenderCommand[] = [];
  const origin = {
    x: (layout.page.width - UNFOLDED_CARD.width * layout.columns) / 2,
    y: (layout.page.height - UNFOLDED_CARD.height * layout.rows) / 2,
  };
  for (let slot = 0; slot < guests.length; slot += 1) {
    const guest = guests[slot];
    if (!guest) {
      continue;
    }
    const column = slot % layout.columns;
    const rowFromTop = Math.floor(slot / layout.columns);
    const x = origin.x + column * UNFOLDED_CARD.width;
    const y = origin.y + (layout.rows - 1 - rowFromTop) * UNFOLDED_CARD.height;
    const fitted = fitGuest(
      guest,
      guestOffset + slot,
      metrics,
      nameMetrics,
      nameStyle,
    );
    if (!fitted.ok) {
      throw new RenderPreflightError(fitted.issues);
    }

    addFace(commands, guest, fitted.fitted, design, x, y, 0, nameStyle);
    addFace(
      commands,
      guest,
      fitted.fitted,
      design,
      x,
      y + FINISHED_CARD.height,
      180,
      nameStyle,
    );
    commands.push(
      Object.freeze({
        type: 'stroke_rectangle',
        x,
        y,
        width: UNFOLDED_CARD.width,
        height: UNFOLDED_CARD.height,
        color: '#686868',
        lineWidth: 0.5,
      }),
      Object.freeze({
        type: 'line',
        start: Object.freeze({ x, y: y + FINISHED_CARD.height }),
        end: Object.freeze({
          x: x + UNFOLDED_CARD.width,
          y: y + FINISHED_CARD.height,
        }),
        color: '#777777',
        lineWidth: 0.5,
        dash: Object.freeze([4, 3]),
      }),
    );
  }

  return Object.freeze({
    kind: 'cards',
    width: layout.page.width,
    height: layout.page.height,
    commands: Object.freeze(commands),
  });
}

export function createRenderManifest(
  input: CreateRenderManifestInput,
  metrics: FontMetrics = APPROXIMATE_NOTO_SANS_METRICS,
  nameMetrics: FontMetrics = metrics,
): RenderManifest {
  const issues = preflightRender(input, metrics, nameMetrics);
  if (issues.length > 0) {
    throw new RenderPreflightError(issues);
  }
  const design = getDesignDefinition(input.designId);
  const layout = PRINT_LAYOUTS[input.layoutId ?? 'portrait_4'];
  const selectedNameMetrics =
    input.nameStyle?.font === 'serif' ? nameMetrics : metrics;
  const pages: RenderPage[] = [
    createScaleCheckPage(
      metrics,
      input.title?.trim() || 'TableCards print check',
      layout,
    ),
  ];
  for (
    let offset = 0;
    offset < input.guests.length;
    offset += layout.cardsPerSheet
  ) {
    pages.push(
      createCardsPage(
        input.guests.slice(offset, offset + layout.cardsPerSheet),
        offset,
        design,
        metrics,
        selectedNameMetrics,
        layout,
        input.nameStyle,
      ),
    );
  }
  return Object.freeze({
    version: 1,
    designId: input.designId,
    layoutId: layout.id,
    fontFamily: metrics.familyName,
    guestCount: input.guests.length,
    pages: Object.freeze(pages),
  });
}

export interface SvgRenderOptions {
  readonly backgroundImageHref?: string;
}

export function renderDesignFaceToSvg(
  designId: DesignId,
  options: SvgRenderOptions = {},
): string {
  const design = getDesignDefinition(designId);
  const guest = { name: 'Alex Morgan', table: 'TABLE 8' };
  const fitted = fitGuest(guest, 0, APPROXIMATE_NOTO_SANS_METRICS);
  if (!fitted.ok) throw new RenderPreflightError(fitted.issues);
  const commands: RenderCommand[] = [];
  addFace(commands, guest, fitted.fitted, design, 0, 0, 0);
  return renderManifestPageToSvg(
    Object.freeze({
      version: 1,
      designId,
      layoutId: 'portrait_4',
      fontFamily: APPROXIMATE_NOTO_SANS_METRICS.familyName,
      guestCount: 1,
      pages: Object.freeze([
        Object.freeze({
          kind: 'cards',
          width: FINISHED_CARD.width,
          height: FINISHED_CARD.height,
          commands: Object.freeze(commands),
        }),
      ]),
    }),
    0,
    options,
  );
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function renderManifestPageToSvg(
  manifest: RenderManifest,
  pageIndex: number,
  options: SvgRenderOptions = {},
): string {
  const page = manifest.pages[pageIndex];
  if (!page) {
    throw new RangeError(`Page ${pageIndex} does not exist.`);
  }
  const body = page.commands
    .map((command) => {
      if (command.type === 'fill_rectangle') {
        if (options.backgroundImageHref !== undefined) {
          const y = page.height - command.y - command.height;
          const centerX = command.x + command.width / 2;
          const centerY = y + command.height / 2;
          const transform =
            command.rotation === 0
              ? ''
              : ` transform="rotate(180 ${centerX} ${centerY})"`;
          return `<image href="${escapeXml(options.backgroundImageHref)}" x="${command.x}" y="${y}" width="${command.width}" height="${command.height}" preserveAspectRatio="none"${transform}/>`;
        }
        return `<rect x="${command.x}" y="${page.height - command.y - command.height}" width="${command.width}" height="${command.height}" fill="${command.color}"/>`;
      }
      if (command.type === 'stroke_rectangle') {
        return `<rect x="${command.x}" y="${page.height - command.y - command.height}" width="${command.width}" height="${command.height}" fill="none" stroke="${command.color}" stroke-width="${command.lineWidth}"/>`;
      }
      if (command.type === 'line') {
        const dash = command.dash
          ? ` stroke-dasharray="${command.dash.join(' ')}"`
          : '';
        return `<line x1="${command.start.x}" y1="${page.height - command.start.y}" x2="${command.end.x}" y2="${page.height - command.end.y}" stroke="${command.color}" stroke-width="${command.lineWidth}"${dash}/>`;
      }
      if (command.type === 'path') {
        const fill = command.fill ?? 'none';
        const stroke = command.stroke ?? 'none';
        const lineWidth = command.lineWidth ?? 0;
        return `<path d="${escapeXml(command.path)}" fill="${fill}" stroke="${stroke}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 ${page.height}) scale(1 -1)"/>`;
      }
      const y = page.height - command.centerY;
      const transform =
        command.rotation === 0
          ? ''
          : ` transform="rotate(180 ${command.centerX} ${y})"`;
      const family =
        command.fontFamily === 'serif' ? 'Georgia, serif' : manifest.fontFamily;
      return `<text x="${command.centerX}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="${escapeXml(family)}" font-size="${command.fontSize}" fill="${command.color}"${transform}>${escapeXml(command.text)}</text>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.width} ${page.height}" role="img" aria-label="TableCards ${page.kind === 'scale_check' ? 'scale check' : `print sheet ${pageIndex}`}">${body}</svg>`;
}
