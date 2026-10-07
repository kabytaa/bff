import { expect, test } from '@playwright/test';
import { encode } from 'fast-png';
import {
  chooseDevelopmentOffer,
  expectNoHorizontalPageOverflow,
  logInFromLanding,
  uniquePersona,
} from './support/hosted';

test('manual AI test: Cloudflare artwork and optional company-style reference', async ({
  page,
}, info) => {
  test.skip(
    process.env.TABLECARDS_TEST_MANUAL_AI !== 'true',
    'Manual AI test only; ordinary regression must not spend credits.',
  );
  test.setTimeout(240_000);
  await logInFromLanding(
    page,
    uniquePersona('manual-ai-artwork', info.project.name),
  );
  for (const path of ['/', '/create', '/projects', '/designs', '/settings']) {
    await page.goto(path);
    await expect(
      page
        .getByRole('button', { name: 'Sign out', exact: true })
        .or(page.getByRole('link', { name: 'Projects', exact: true }))
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Log in', exact: true }),
    ).toHaveCount(0);
    await expectNoHorizontalPageOverflow(page);
  }
  await chooseDevelopmentOffer(page, 'Planner Pro');
  await page.goto('/designs');
  await expect(page.getByLabel('AI engine (development)')).toHaveValue(
    'cloudflare',
  );
  if (info.project.name === 'mobile-webkit') {
    const width = 640;
    const height = 320;
    const pixels = new Uint8Array(width * height * 4).fill(255);
    for (let y = 60; y < 260; y += 1)
      for (let x = 160; x < 480; x += 1) {
        const offset = (y * width + x) * 4;
        pixels[offset] = 20;
        pixels[offset + 1] = 80;
        pixels[offset + 2] = 170;
      }
    await page
      .getByLabel('Optional style image or company icon')
      .setInputFiles({
        name: 'blue-company-mark.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          encode({ width, height, channels: 4, data: pixels }),
        ),
      });
    await expect(page.getByAltText('Selected style reference')).toBeVisible();
    await page.getByRole('button', { name: 'Remove style image' }).click();
    await expect(page.getByAltText('Selected style reference')).toHaveCount(0);
    await page
      .getByLabel('Optional style image or company icon')
      .setInputFiles({
        name: 'blue-company-mark.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          encode({ width, height, channels: 4, data: pixels }),
        ),
      });
    await expect(page.getByAltText('Selected style reference')).toBeVisible();
  }
  await page
    .getByLabel('AI background description')
    .fill(
      info.project.name === 'mobile-webkit'
        ? 'Blue geometric company icon motifs in the corners, white center, corporate celebration'
        : 'Elegant watercolor sage eucalyptus and delicate botanical flowers in the corners, white center, wedding',
    );
  await page
    .getByRole('button', { name: /Generate four choices · 10 remaining/u })
    .click();
  await expect(page.getByText('4 background choices are ready.')).toBeVisible({
    timeout: 150_000,
  });
  const choices = page
    .locator('.asset-grid article')
    .filter({ hasText: 'AI background' });
  await expect(choices).toHaveCount(4);
  await choices.first().scrollIntoViewIfNeeded();
  await expect
    .poll(async () =>
      choices
        .first()
        .locator('.asset-preview')
        .evaluate(async (element) => {
          const url = getComputedStyle(element).backgroundImage.match(
            /^url\(["']?(.*?)["']?\)$/u,
          )?.[1];
          if (!url) return 0;
          const image = new Image();
          image.src = url;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 72;
          const context = canvas.getContext('2d')!;
          context.drawImage(image, 0, 0, 128, 72);
          const data = context.getImageData(0, 0, 128, 72).data;
          const colors = new Set<number>();
          for (let i = 0; i < data.length; i += 4)
            colors.add((data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!);
          return colors.size;
        }),
    )
    .toBeGreaterThan(64);
  await expectNoHorizontalPageOverflow(page);
  await page.screenshot({
    path: info.outputPath('manual-ai-choices.png'),
    fullPage: true,
  });
  await page.goto('/settings');
  await expect(page.getByText('9 remaining')).toBeVisible();
});
