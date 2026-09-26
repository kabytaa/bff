export {
  CUSTOMER_AUTH_CALLBACK_PATH,
  CUSTOMER_CONTEXT_VERSION,
  accountContextClaimsSchema,
  businessTransportConfigSchema,
  customerAuthErrorResponseSchema,
  customerContextClaimsSchema,
  deriveCustomerAuthCallbackUrl,
  onboardingContextClaimsSchema,
  type AccountContextClaims,
  type BusinessTransportConfig,
  type CustomerAuthErrorCode,
  type CustomerAuthErrorResponse,
  type CustomerContextClaims,
  type OnboardingContextClaims,
} from '@bff/contracts';

export type AuthSessionState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'onboarding_required'; token: string }
  | {
      status: 'account_selection_required';
      accountIds: readonly string[];
    }
  | {
      status: 'authenticated';
      token: string;
      accountId: string;
      expiresAt: number;
    }
  | {
      status: 'recoverable_error';
      message: string;
      correlationId?: string;
    };

export function isAuthenticatedState(
  state: AuthSessionState,
): state is Extract<AuthSessionState, { status: 'authenticated' }> {
  return state.status === 'authenticated';
}
