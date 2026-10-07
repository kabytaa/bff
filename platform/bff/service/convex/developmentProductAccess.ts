export const DEVELOPMENT_PRODUCT_ACCESS_ENVIRONMENT = {
  enabled: 'BFF_DEVELOPMENT_PRODUCT_ACCESS_ENABLED',
} as const;

const ENABLED = 'enabled';

export function developmentProductAccessRouteEnabled(
  environment: Record<string, string | undefined> = process.env,
): boolean {
  return (
    environment[DEVELOPMENT_PRODUCT_ACCESS_ENVIRONMENT.enabled] === ENABLED
  );
}
