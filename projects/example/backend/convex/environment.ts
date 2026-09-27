function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export const exampleCustomerAuth = {
  issuer: requiredEnvironment('BFF_CUSTOMER_AUTH_ISSUER'),
  environmentKey: requiredEnvironment('BFF_CUSTOMER_ENVIRONMENT_KEY'),
  jwksUrl: requiredEnvironment('BFF_CUSTOMER_JWKS_URL'),
} as const;
