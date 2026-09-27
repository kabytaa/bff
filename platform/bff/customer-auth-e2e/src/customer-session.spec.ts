import { expect, test, type Page } from '@playwright/test';

const firstAccount = 'account_00000000000001';
const secondAccount = 'account_00000000000002';

async function signIn(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('state')).toHaveText('signed_out');
  await page.getByTestId('sign-in').click();
  await expect(page).toHaveURL(/:4410\/$/u);
  await expect(page.getByTestId('state')).toHaveText(
    'account_selection_required',
  );
}

async function selectAccount(page: Page, accountId: string) {
  await page.getByTestId('account-select').selectOption(accountId);
  await expect(page.getByTestId('state')).toHaveText('authenticated');
  await expect(page.getByTestId('account')).toHaveText(accountId);
}

test('completes callback, survives reload and renews the tab token', async ({
  page,
}) => {
  await signIn(page);
  await selectAccount(page, firstAccount);
  const firstToken = await page.getByTestId('token').textContent();

  await page.reload();
  await expect(page.getByTestId('state')).toHaveText('authenticated');
  await expect(page.getByTestId('account')).toHaveText(firstAccount);

  await page.getByTestId('refresh').click();
  await expect(page.getByTestId('token')).not.toHaveText(firstToken ?? 'none');
});

test('keeps account context per tab and broadcasts logout', async ({
  context,
  page,
}) => {
  await signIn(page);
  await selectAccount(page, firstAccount);

  const secondTab = await context.newPage();
  await secondTab.goto('/');
  await expect(secondTab.getByTestId('state')).toHaveText('authenticated');
  await selectAccount(secondTab, secondAccount);
  await expect(page.getByTestId('account')).toHaveText(firstAccount);
  await expect(secondTab.getByTestId('account')).toHaveText(secondAccount);

  await page.getByTestId('sign-out').click();
  await expect(page.getByTestId('state')).toHaveText('signed_out');
  await expect(secondTab.getByTestId('state')).toHaveText('signed_out');
  await secondTab.reload();
  await expect(secondTab.getByTestId('state')).toHaveText('signed_out');
});

test('rejects an unregistered browser origin before session access', async ({
  page,
}) => {
  await page.goto('https://localhost:4413');
  const result = await page.evaluate(async () => {
    try {
      await fetch('https://127.0.0.1:4411/_tofler/auth/context', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-tofler-csrf': '1',
        },
        body: '{}',
      });
      return 'unexpected-response';
    } catch {
      return 'blocked';
    }
  });
  expect(result).toBe('blocked');
});
