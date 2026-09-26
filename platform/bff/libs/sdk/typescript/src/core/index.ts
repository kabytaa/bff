export {
  CUSTOMER_AUTH_CALLBACK_PATH,
  CUSTOMER_AUTH_CONFIGURATION_VERSION,
  CUSTOMER_CONTEXT_VERSION,
  accountContextClaimsSchema,
  businessTransportConfigSchema,
  customerAuthErrorResponseSchema,
  customerAuthCallbackUrl,
  customerAuthConfigurationSchema,
  customerContextClaimsSchema,
  deriveCustomerAuthCallbackUrl,
  onboardingContextClaimsSchema,
  publicIdentifierSchema,
  relativeApplicationPathSchema,
  type AccountContextClaims,
  type BusinessTransportConfig,
  type CustomerAuthErrorCode,
  type CustomerAuthErrorResponse,
  type CustomerAuthConfiguration,
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
