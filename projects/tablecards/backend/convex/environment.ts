function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function requiredStringArrayEnvironment(name: string): string[] {
  const value = requiredEnvironment(name);
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`${name} must be a JSON string array`);
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    parsed.some((entry) => typeof entry !== 'string')
  ) {
    throw new Error(`${name} must be a non-empty JSON string array`);
  }
  return parsed;
}

export function tablecardsServiceVersion(): string {
  return process.env.TABLECARDS_BUILD_VERSION?.trim() || 'development';
}

export const tablecardsCustomerAuth = {
  issuer: requiredEnvironment('BFF_CUSTOMER_AUTH_ISSUER'),
  environmentKey: requiredEnvironment('BFF_CUSTOMER_ENVIRONMENT_KEY'),
  jwksUrl: requiredEnvironment('BFF_CUSTOMER_JWKS_URL'),
} as const;

export const tablecardsCustomerSession = {
  bffBaseUrl: requiredEnvironment('BFF_CUSTOMER_API_BASE_URL'),
  environmentKey: tablecardsCustomerAuth.environmentKey,
  transport: {
    webOrigins: requiredStringArrayEnvironment('BFF_CUSTOMER_WEB_ORIGINS_JSON'),
    sessionAdapterBaseUrl: requiredEnvironment(
      'BFF_CUSTOMER_SESSION_ADAPTER_BASE_URL',
    ),
    defaultPostLoginPath: requiredEnvironment(
      'BFF_CUSTOMER_DEFAULT_POST_LOGIN_PATH',
    ),
  },
} as const;

export function tablecardsDevelopmentMocksEnabled(): boolean {
  return process.env.TABLECARDS_DEVELOPMENT_MOCKS_ENABLED === 'true';
}
