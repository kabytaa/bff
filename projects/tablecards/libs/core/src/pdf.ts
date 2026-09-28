import fontkit from '@pdf-lib/fontkit';
import {
  PDFDocument,
  type PDFFont,
  type PDFImage,
  StandardFonts,
  degrees,
  rgb,
} from 'pdf-lib';

import {
  createRenderManifest,
  type CreateRenderManifestInput,
  type FontMetrics,
  type RenderManifest,
} from './layout';

const FIXED_PDF_DATE = new Date('2026-01-01T00:00:00.000Z');

export interface RenderTableCardsPdfOptions {
  /**
   * A caller may inject licensed Noto Sans TTF bytes. When omitted, pdf-lib's
   * built-in Helvetica is used and preflight rejects unsupported glyphs.
   */
  readonly fontBytes?: Uint8Array;
  readonly fontFamilyName?: string;
  readonly backgroundImage?: {
    readonly bytes: Uint8Array;
    readonly mimeType: 'image/jpeg' | 'image/png';
  };
}

export interface FaceBackgroundPlacement {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: 0 | 180;
}

function createPdfFontMetrics(font: PDFFont, familyName: string): FontMetrics {
  const supported = new Set(font.getCharacterSet());
  return Object.freeze({
    familyName,
    supportsText: (text: string) => {
      for (const character of text) {
        const codePoint = character.codePointAt(0);
        if (codePoint === undefined || !supported.has(codePoint)) {
          return false;
        }
      }
      return true;
    },
    widthOfTextAtSize: (text: string, fontSize: number) =>
      font.widthOfTextAtSize(text, fontSize),
    heightAtSize: (fontSize: number) =>
      font.heightAtSize(fontSize, { descender: false }),
  });
}

function parseHexColor(value: string): ReturnType<typeof rgb> {
  if (!/^#[0-9A-Fa-f]{6}$/u.test(value)) {
    throw new Error(`Invalid render color: ${value}`);
  }
  return rgb(
    Number.parseInt(value.slice(1, 3), 16) / 255,
    Number.parseInt(value.slice(3, 5), 16) / 255,
    Number.parseInt(value.slice(5, 7), 16) / 255,
  );
}

/**
 * Render commands use PDF-style coordinates (origin at the lower left), while
 * pdf-lib's SVG-path helper expects SVG coordinates and flips the Y axis. Turn
 * the absolute M/L/C path coordinates into page-relative SVG coordinates so
 * pdf-lib's flip restores the intended printed position.
 */
export function convertLogicalPathToPdfSvgPath(
  path: string,
  pageHeight: number,
): string {
  const tokens = path.match(
    /[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:[Ee][+-]?\d+)?/gu,
  );
  if (tokens === null) {
    throw new Error('Render path is empty.');
  }
  let coordinateIndex = 0;
  const converted = tokens.map((token) => {
    if (/^[A-Za-z]$/u.test(token)) {
      if (!/^[CMLZ]$/u.test(token)) {
        throw new Error(`Unsupported render path command: ${token}`);
      }
      return token;
    }
    const value = Number(token);
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid render path coordinate: ${token}`);
    }
    const output = coordinateIndex % 2 === 1 ? pageHeight - value : value;
    coordinateIndex += 1;
    return Number(output.toFixed(2)).toString();
  });
  if (coordinateIndex % 2 !== 0) {
    throw new Error('Render path must contain complete coordinate pairs.');
  }
  return converted.join(' ');
}

function drawManifest(
  pdfDocument: PDFDocument,
  font: PDFFont,
  manifest: RenderManifest,
  backgroundImage?: PDFImage,
): void {
  for (const manifestPage of manifest.pages) {
    const page = pdfDocument.addPage([manifestPage.width, manifestPage.height]);
    for (const command of manifestPage.commands) {
      if (command.type === 'fill_rectangle') {
        const placement = getFaceBackgroundPlacement(command);
        if (backgroundImage === undefined) {
          page.drawRectangle({
            x: placement.x,
            y: placement.y,
            width: placement.width,
            height: placement.height,
            color: parseHexColor(command.color),
          });
        } else {
          const rotated = placement.rotation === 180;
          page.drawImage(backgroundImage, {
            x: placement.x + (rotated ? placement.width : 0),
            y: placement.y + (rotated ? placement.height : 0),
            width: placement.width,
            height: placement.height,
            rotate: degrees(placement.rotation),
          });
        }
        continue;
      }
      if (command.type === 'stroke_rectangle') {
        page.drawRectangle({
          x: command.x,
          y: command.y,
          width: command.width,
          height: command.height,
          borderColor: parseHexColor(command.color),
          borderWidth: command.lineWidth,
        });
        continue;
      }
      if (command.type === 'line') {
        page.drawLine({
          start: command.start,
          end: command.end,
          color: parseHexColor(command.color),
          thickness: command.lineWidth,
          ...(command.dash === undefined
            ? {}
            : { dashArray: [...command.dash] }),
        });
        continue;
      }
      if (command.type === 'path') {
        page.drawSvgPath(
          convertLogicalPathToPdfSvgPath(command.path, manifestPage.height),
          {
            y: manifestPage.height,
            ...(command.fill === undefined
              ? {}
              : { color: parseHexColor(command.fill) }),
            ...(command.stroke === undefined
              ? {}
              : { borderColor: parseHexColor(command.stroke) }),
            borderWidth: command.lineWidth ?? 0,
          },
        );
        continue;
      }

      const textWidth = font.widthOfTextAtSize(command.text, command.fontSize);
      const textHeight = font.heightAtSize(command.fontSize, {
        descender: false,
      });
      const rotated = command.rotation === 180;
      page.drawText(command.text, {
        x: command.centerX + (rotated ? textWidth / 2 : -textWidth / 2),
        y: command.centerY + (rotated ? textHeight / 2 : -textHeight / 2),
        size: command.fontSize,
        font,
        color: parseHexColor(command.color),
        rotate: degrees(command.rotation),
      });
    }
  }
}

export function getFaceBackgroundPlacement(command: {
  readonly type: 'fill_rectangle';
  readonly role: 'face_background';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: 0 | 180;
}): FaceBackgroundPlacement {
  return Object.freeze({
    x: command.x,
    y: command.y,
    width: command.width,
    height: command.height,
    rotation: command.rotation,
  });
}

async function embedBackgroundImage(
  pdfDocument: PDFDocument,
  image: NonNullable<RenderTableCardsPdfOptions['backgroundImage']>,
): Promise<PDFImage> {
  const embedded =
    image.mimeType === 'image/png'
      ? await pdfDocument.embedPng(image.bytes)
      : await pdfDocument.embedJpg(image.bytes);
  if (embedded.width * 4 !== embedded.height * 7) {
    throw new Error(
      `Background image must have an exact 7:4 ratio; received ${embedded.width}:${embedded.height}.`,
    );
  }
  return embedded;
}

export async function renderTableCardsPdf(
  input: CreateRenderManifestInput,
  options: RenderTableCardsPdfOptions = {},
): Promise<Uint8Array> {
  const pdfDocument = await PDFDocument.create({ updateMetadata: false });
  let font: PDFFont;
  let familyName: string;
  if (options.fontBytes === undefined) {
    font = await pdfDocument.embedFont(StandardFonts.Helvetica);
    familyName = options.fontFamilyName ?? 'Helvetica';
  } else {
    pdfDocument.registerFontkit(fontkit);
    font = await pdfDocument.embedFont(options.fontBytes, {
      customName: options.fontFamilyName ?? 'NotoSans',
      subset: false,
    });
    familyName = options.fontFamilyName ?? 'Noto Sans';
  }
  const backgroundImage =
    options.backgroundImage === undefined
      ? undefined
      : await embedBackgroundImage(pdfDocument, options.backgroundImage);

  const manifest = createRenderManifest(
    input,
    createPdfFontMetrics(font, familyName),
  );
  pdfDocument.setTitle(input.title?.trim() || 'TableCards place cards', {
    showInWindowTitleBar: false,
  });
  pdfDocument.setAuthor('TableCards');
  pdfDocument.setSubject('Print-ready folded place cards');
  pdfDocument.setKeywords(['TableCards', 'place cards', 'print-ready PDF']);
  pdfDocument.setProducer('TableCards deterministic PDF engine');
  pdfDocument.setCreator('TableCards');
  pdfDocument.setCreationDate(FIXED_PDF_DATE);
  pdfDocument.setModificationDate(FIXED_PDF_DATE);
  drawManifest(pdfDocument, font, manifest, backgroundImage);

  return pdfDocument.save({
    addDefaultPage: false,
    objectsPerTick: Number.POSITIVE_INFINITY,
    updateFieldAppearances: false,
    useObjectStreams: false,
  });
}
