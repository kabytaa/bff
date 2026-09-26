export const SERVICE_NAME = 'business-factory-bff' as const;

export function getServiceVersion(): string {
  const configured = process.env.BFF_BUILD_VERSION?.trim();
  return configured || 'development';
}
