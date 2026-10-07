export const CHECKOUT_SERVICE_AUTH_ENVIRONMENT = {
  secretsJson: 'BFF_CHECKOUT_SERVICE_SECRETS_JSON',
} as const;

function configuredSecret(environmentKey: string): string | undefined {
  const serialized = process.env[CHECKOUT_SERVICE_AUTH_ENVIRONMENT.secretsJson];
  if (!serialized) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return undefined;
  }
  const value = (parsed as Record<string, unknown>)[environmentKey];
  return typeof value === 'string' && value.length >= 32 && value.length <= 256
    ? value
    : undefined;
}

async function digest(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
  );
}

export async function verifyCheckoutServiceAuthorization(
  environmentKey: string,
  authorization: string | null,
) {
  const expected = configuredSecret(environmentKey);
  const supplied = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined;
  if (!expected || !supplied || supplied.length > 256) return false;
  const [expectedDigest, suppliedDigest] = await Promise.all([
    digest(expected),
    digest(supplied),
  ]);
  if (expectedDigest.byteLength !== suppliedDigest.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < expectedDigest.byteLength; index += 1) {
    difference |= expectedDigest[index]! ^ suppliedDigest[index]!;
  }
  return difference === 0;
}
