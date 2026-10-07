import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Raster fallbacks use the same source as the browser-tab SVG, not a second logo.
const publicDirectory = new URL('../public/', import.meta.url);
const svg = await readFile(new URL('favicon.svg', publicDirectory), 'utf8');
const browser = await chromium.launch();
try {
  for (const [size, name] of [
    [32, 'favicon-32.png'],
    [180, 'apple-touch-icon.png'],
  ] as const) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:100%;height:100%}</style>${svg}`,
    );
    await page.screenshot({
      path: fileURLToPath(new URL(name, publicDirectory)),
      omitBackground: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
