import type { Page } from '@playwright/test';
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  decodePDFRawStream,
} from 'pdf-lib';

/** Reads an authenticated browser Blob URL without treating it as a public link. */
export async function readBrowserDownload(
  page: Page,
  url: string,
): Promise<Uint8Array> {
  const bytes = await page.evaluate(async (href) => {
    const response = await fetch(href);
    if (!response.ok) throw new Error('Download was unavailable');
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  }, url);
  return Uint8Array.from(bytes);
}

/** Extracts pdf-lib's text using each embedded font's own ToUnicode map. */
export async function readPdfText(
  bytes: Uint8Array,
): Promise<{ title: string | undefined; text: string; pageCount: number }> {
  const document = await PDFDocument.load(bytes);
  const texts: string[] = [];
  for (const page of document.getPages()) {
    const resources = page.node.Resources();
    const fonts = resources?.lookup(PDFName.of('Font'), PDFDict);
    const maps = new Map<string, Map<string, string>>();
    for (const [name, reference] of fonts?.entries() ?? []) {
      const font = document.context.lookup(reference, PDFDict);
      const cmapReference = font.get(PDFName.of('ToUnicode'));
      const cmap = cmapReference
        ? document.context.lookup(cmapReference)
        : undefined;
      if (!(cmap instanceof PDFRawStream)) continue;
      const mapping = new Map<string, string>();
      const source = Buffer.from(decodePDFRawStream(cmap).decode()).toString(
        'utf8',
      );
      const bfchar = source.match(/beginbfchar([\s\S]*?)endbfchar/u)?.[1] ?? '';
      for (const pair of bfchar.matchAll(/<([\da-f]+)>\s*<([\da-f]+)>/giu)) {
        const value = (pair[2]!.match(/.{4}/gu) ?? [])
          .map((hex) => String.fromCharCode(Number.parseInt(hex, 16)))
          .join('');
        mapping.set(pair[1]!.toUpperCase(), value);
      }
      maps.set(name.asString().slice(1), mapping);
    }
    const contents = page.node.Contents();
    const streams =
      contents instanceof PDFArray
        ? contents.asArray()
        : contents
          ? [contents]
          : [];
    let selectedFont: string | undefined;
    for (const reference of streams) {
      const stream = document.context.lookup(reference);
      if (!(stream instanceof PDFRawStream))
        throw new Error('PDF content stream was unavailable');
      const source = Buffer.from(decodePDFRawStream(stream).decode()).toString(
        'utf8',
      );
      for (const operation of source.matchAll(
        /\/([^\s]+)\s+[\d.]+\s+Tf|<([\da-f]+)>\s*Tj/giu,
      )) {
        if (operation[1]) selectedFont = operation[1];
        else if (selectedFont && operation[2]) {
          const map = maps.get(selectedFont);
          texts.push(
            (operation[2].match(/.{4}/gu) ?? [])
              .map((hex) => map?.get(hex.toUpperCase()) ?? '')
              .join(''),
          );
        }
      }
    }
  }
  return {
    title: document.getTitle(),
    text: texts.join('\n'),
    pageCount: document.getPageCount(),
  };
}
