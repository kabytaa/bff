import { createBffAuthBrowserClient } from '@tofler/bff-auth/browser';

const environmentKey = 'browser-contract-development';
const adapterOrigin = 'https://127.0.0.1:4411';
const client = createBffAuthBrowserClient({
  bffBaseUrl: 'https://bff.test.invalid',
  environmentKey,
  sessionAdapterBaseUrl: adapterOrigin,
});

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing test element: ${selector}`);
  return element;
}

const stateElement = requiredElement<HTMLElement>('[data-testid="state"]');
const accountElement = requiredElement<HTMLElement>('[data-testid="account"]');
const tokenElement = requiredElement<HTMLElement>('[data-testid="token"]');
const signIn = requiredElement<HTMLAnchorElement>('[data-testid="sign-in"]');
const accountSelect = requiredElement<HTMLSelectElement>(
  '[data-testid="account-select"]',
);
const refresh = requiredElement<HTMLButtonElement>('[data-testid="refresh"]');
const signOut = requiredElement<HTMLButtonElement>('[data-testid="sign-out"]');

signIn.href = client.getSignInUrl('/');

function render() {
  const state = client.getSnapshot().state;
  stateElement.textContent = state.status;
  const customer =
    state.status === 'authenticated' ||
    state.status === 'account_selection_required' ||
    state.status === 'onboarding_required'
      ? state.customer
      : undefined;
  accountSelect.replaceChildren(
    ...(customer?.accounts ?? []).map((account) => {
      const option = document.createElement('option');
      option.value = account.id;
      option.textContent = account.displayName ?? account.id;
      return option;
    }),
  );
  if (state.status === 'authenticated') {
    accountSelect.value = state.accountId;
    accountElement.textContent = state.accountId;
    tokenElement.textContent = state.token;
  } else {
    accountElement.textContent = 'none';
    tokenElement.textContent = 'none';
  }
  accountSelect.disabled = (customer?.accounts.length ?? 0) < 2;
  refresh.disabled = state.status !== 'authenticated';
  signOut.disabled =
    state.status === 'signed_out' || state.status === 'loading';
}

client.subscribe(render);
accountSelect.addEventListener('change', () => {
  void client.selectAccount(accountSelect.value).catch(() => undefined);
});
refresh.addEventListener('click', () => {
  void client.getAccessToken(true).then((token) => {
    tokenElement.textContent = token ?? 'none';
  });
});
signOut.addEventListener('click', () => {
  void client.logout().catch(() => undefined);
});
window.addEventListener('pagehide', () => client.dispose(), { once: true });

render();
void client.bootstrap();
