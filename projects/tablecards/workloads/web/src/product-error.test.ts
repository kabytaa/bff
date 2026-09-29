import { ConvexError } from 'convex/values';
import { describe, expect, it } from 'vitest';

import { safeProductMessage } from './product-error';

describe('safeProductMessage', () => {
  it('shows safe entitlement and limit explanations from Convex', () => {
    expect(
      safeProductMessage(
        new ConvexError({
          code: 'ENTITLEMENT_REQUIRED',
          message: 'The selected design requires a paid offer',
        }),
        'Fallback',
      ),
    ).toBe('The selected design requires a paid offer');
    expect(
      safeProductMessage(
        new ConvexError({
          code: 'LIMIT_EXCEEDED',
          message: 'The active project limit has been reached',
        }),
        'Fallback',
      ),
    ).toBe('The active project limit has been reached');
  });

  it('does not expose security-sensitive or generic server errors', () => {
    expect(
      safeProductMessage(
        new ConvexError({
          code: 'FORBIDDEN',
          message: 'Internal authorization detail',
        }),
        'Fallback',
      ),
    ).toBe('Fallback');
    expect(
      safeProductMessage(
        new Error('[CONVEX A(projects:save)] Server Error'),
        'Fallback',
      ),
    ).toBe('Fallback');
  });

  it('keeps short local errors actionable', () => {
    expect(
      safeProductMessage(
        new Error('The spreadsheet format is invalid.'),
        'Fallback',
      ),
    ).toBe('The spreadsheet format is invalid.');
  });
});
