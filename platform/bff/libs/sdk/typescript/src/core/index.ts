import type { CurrentCustomerView } from '@bff/contracts';

export {
  CUSTOMER_AUTH_CALLBACK_PATH,
  CUSTOMER_AUTH_CSRF_HEADER,
  CUSTOMER_AUTH_CSRF_HEADER_VALUE,
  CUSTOMER_AUTH_CONFIGURATION_VERSION,
  CUSTOMER_CONTEXT_VERSION,
  DEFAULT_ACCOUNT_POLICY,
  DEFAULT_BUSINESS_ACCOUNT_POLICY,
  DEFAULT_SESSION_POLICY,
  accountPermissionSchema,
  accountRoleSchema,
  accountSummarySchema,
  accountContextClaimsSchema,
  businessTransportConfigSchema,
  businessEnvironmentAuthConfigSchema,
  composeCustomerAuthConfiguration,
  customerAuthDefaultsSchema,
  customerAuthErrorResponseSchema,
  customerAuthIntentSchema,
  customerAuthPresentationSchema,
  customerAuthCallbackUrl,
  customerAuthConfigurationSchema,
  customerContextAudience,
  customerContextClaimsSchema,
  customerSessionContextResponseSchema,
  customerSessionLogoutResponseSchema,
  currentCustomerViewSchema,
  deriveCustomerAuthCallbackUrl,
  defineCustomerAuthDefaults,
  fingerprintCustomerAuthDefaults,
  normalizeHttpsOrigin,
  onboardingContextClaimsSchema,
  publicIdentifierSchema,
  relativeApplicationPathSchema,
  type AccountContextClaims,
  type AccountPermission,
  type AccountRole,
  type AccountSummary,
  type BusinessTransportConfig,
  type BusinessEnvironmentAuthConfig,
  type CustomerAuthDefaults,
  type CustomerAuthErrorCode,
  type CustomerAuthErrorResponse,
  type CustomerAuthConfiguration,
  type CustomerAuthIntent,
  type CustomerAuthPresentation,
  type CustomerContextClaims,
  type CustomerSessionContextResponse,
  type CustomerSessionLogoutResponse,
  type CurrentCustomerView,
  type OnboardingContextClaims,
} from '@bff/contracts';

export type AuthSessionState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | {
      status: 'onboarding_required';
      token: string;
      expiresAt: number;
      customer: CurrentCustomerView;
    }
  | {
      status: 'account_selection_required';
      customer: CurrentCustomerView;
    }
  | {
      status: 'authenticated';
      token: string;
      accountId: string;
      expiresAt: number;
      customer: CurrentCustomerView;
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
