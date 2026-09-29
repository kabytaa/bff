export const MOCK_CHECKOUT_ENVIRONMENT = {
  enabled: 'BFF_MOCK_CHECKOUT_ENABLED',
} as const;

export function mockCheckoutEnabled(
  environment: Record<string, string | undefined> = process.env,
): boolean {
  return environment[MOCK_CHECKOUT_ENVIRONMENT.enabled] === 'enabled';
}
