import { fail } from './errors';

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KEY_MIN_LENGTH = 3;
const KEY_MAX_LENGTH = 64;
const LABEL_MAX_LENGTH = 80;

export function validateBusinessEnvironmentKey(value: string): string {
  const key = value.trim();

  if (
    key.length < KEY_MIN_LENGTH ||
    key.length > KEY_MAX_LENGTH ||
    !KEY_PATTERN.test(key)
  ) {
    return fail(
      'VALIDATION_ERROR',
      'key must be 3-64 lowercase kebab-case characters',
    );
  }

  return key;
}

export function validateDisplayName(field: string, value: string): string {
  const label = value.trim();

  if (label.length === 0 || label.length > LABEL_MAX_LENGTH) {
    return fail(
      'VALIDATION_ERROR',
      `${field} must be between 1 and 80 characters`,
    );
  }

  return label;
}
