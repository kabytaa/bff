/**
 * Reviewed identifiers and configuration that are intentionally identical in
 * every BFF deployment. Add values here only when changing them should require
 * a code review, tests, and a deployment.
 *
 * Do not add credentials or environment-specific values to this module.
 */
export const BACKOFFICE_GOOGLE_CLIENT_ID =
  '701936923122-q2d6lb7aisvcpr8u8hperditskc5jas0.apps.googleusercontent.com';

export const BACKOFFICE_GOOGLE_ISSUER = 'https://accounts.google.com';

/**
 * Public Google Identity Services audience for Business customers. This client
 * is intentionally separate from the operator/backoffice audience above.
 */
export const CUSTOMER_GOOGLE_CLIENT_ID =
  '701936923122-u4vceunu9hoagjilj4raisiqgtme6mmt.apps.googleusercontent.com';

export const CUSTOMER_GOOGLE_ISSUERS = [
  'https://accounts.google.com',
  'accounts.google.com',
] as const;

/**
 * Fixed identity namespace for locally signed customer-development grants.
 * The corresponding private key remains on the operator machine and this
 * provider is never configured in production.
 */
export const CUSTOMER_DEVELOPMENT_AUTOMATION_ISSUER =
  'https://customer-development-auth.tofler.tech';

export const CUSTOMER_DEVELOPMENT_AUTOMATION_SUBJECT =
  'business-factory-customer-auth-automation';

export const BACKOFFICE_OPERATOR_EMAILS = [
  'kabytaa@gmail.com',
  'masha@koomasha.com',
] as const;

export const BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER =
  'https://development-auth.tofler.tech';

export const BACKOFFICE_DEVELOPMENT_AUTOMATION_SUBJECT =
  'business-factory-backoffice-automation';
