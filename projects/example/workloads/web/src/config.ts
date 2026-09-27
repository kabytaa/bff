import { normalizeHttpsOrigin } from '@tofler/bff-auth/core';

export interface ExampleWebConfiguration {
  readonly bffBaseUrl: string;
  readonly convexSiteUrl: string;
  readonly convexUrl: string;
  readonly environmentKey: string;
}

function required(name: string): string {
  const value = import.meta.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function readExampleWebConfiguration(): ExampleWebConfiguration {
  const environmentKey = required('VITE_BFF_CUSTOMER_ENVIRONMENT_KEY');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(environmentKey)) {
    throw new Error('VITE_BFF_CUSTOMER_ENVIRONMENT_KEY must be kebab-case');
  }
  return {
    bffBaseUrl: normalizeHttpsOrigin(required('VITE_BFF_CUSTOMER_API_URL')),
    convexSiteUrl: normalizeHttpsOrigin(required('VITE_CONVEX_SITE_URL')),
    convexUrl: normalizeHttpsOrigin(required('VITE_CONVEX_URL')),
    environmentKey,
  };
}
