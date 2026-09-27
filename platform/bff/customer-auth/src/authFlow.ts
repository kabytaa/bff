import {
  completeCustomerAuthResponseSchema,
  completeGoogleCustomerAuthRequestSchema,
  customerAuthErrorResponseSchema,
  customerAuthTransactionChallengeSchema,
  type CustomerAuthTransactionChallenge,
} from '@bff/contracts';

export interface CustomerAuthLocation {
  readonly environmentKey: string;
  readonly reference: string;
}

export interface CustomerAuthFailure {
  readonly message: string;
  readonly correlationId?: string;
}

export class CustomerAuthFlowError extends Error {
  public constructor(
    failure: CustomerAuthFailure,
    public readonly retryable: boolean,
  ) {
    super(failure.message);
    this.name = 'CustomerAuthFlowError';
    this.correlationId = failure.correlationId;
  }

  public readonly correlationId?: string;
}

function normalizeBffSiteUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('BFF site URL must be an exact HTTPS origin');
  }
  return url.origin;
}

export function customerAuthLocation(search: string): CustomerAuthLocation {
  const params = new URLSearchParams(search);
  const environmentKey = params.get('environment');
  const reference = params.get('transaction');
  if (
    !environmentKey ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(environmentKey) ||
    !reference ||
    !/^[A-Za-z0-9_-]{16,128}$/u.test(reference)
  ) {
    throw new CustomerAuthFlowError(
      { message: 'This sign-in request is invalid or has expired.' },
      false,
    );
  }
  return { environmentKey, reference };
}

async function responseFailure(
  response: Response,
): Promise<CustomerAuthFlowError> {
  try {
    const body: unknown = await response.json();
    const parsed = customerAuthErrorResponseSchema.safeParse(body);
    if (parsed.success) {
      return new CustomerAuthFlowError(
        {
          message: parsed.data.error.message,
          correlationId: parsed.data.error.correlationId,
        },
        response.status >= 500 || response.status === 429,
      );
    }
  } catch {
    // The public UI deliberately falls back to a generic error.
  }
  return new CustomerAuthFlowError(
    { message: 'Sign-in could not be completed. Please try again.' },
    response.status >= 500 || response.status === 429,
  );
}

export async function loadCustomerAuthChallenge(input: {
  readonly bffSiteUrl: string;
  readonly fetch: typeof globalThis.fetch;
  readonly location: CustomerAuthLocation;
  readonly now?: number;
}): Promise<CustomerAuthTransactionChallenge> {
  const url = new URL(
    '/v1/auth/transactions',
    normalizeBffSiteUrl(input.bffSiteUrl),
  );
  url.searchParams.set('environment', input.location.environmentKey);
  url.searchParams.set('transaction', input.location.reference);
  const response = await input.fetch(url, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw await responseFailure(response);

  const body: unknown = await response.json();
  const parsed = customerAuthTransactionChallengeSchema.safeParse(body);
  if (
    !parsed.success ||
    parsed.data.environmentKey !== input.location.environmentKey ||
    parsed.data.reference !== input.location.reference ||
    parsed.data.expiresAt <= (input.now ?? Date.now())
  ) {
    throw new CustomerAuthFlowError(
      { message: 'This sign-in request is invalid or has expired.' },
      false,
    );
  }
  return parsed.data;
}

export async function completeGoogleCustomerAuth(input: {
  readonly bffSiteUrl: string;
  readonly challenge: CustomerAuthTransactionChallenge;
  readonly credential: string;
  readonly fetch: typeof globalThis.fetch;
}): Promise<URL> {
  const request = completeGoogleCustomerAuthRequestSchema.parse({
    environmentKey: input.challenge.environmentKey,
    reference: input.challenge.reference,
    credential: input.credential,
  });
  const response = await input.fetch(
    new URL(
      '/v1/auth/transactions/google',
      normalizeBffSiteUrl(input.bffSiteUrl),
    ),
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(request),
    },
  );
  if (!response.ok) throw await responseFailure(response);

  return validateCompletionDestination(
    input.challenge,
    (await response.json()) as unknown,
  );
}

function validateCompletionDestination(
  challenge: CustomerAuthTransactionChallenge,
  body: unknown,
): URL {
  const completion = completeCustomerAuthResponseSchema.safeParse(body);
  if (!completion.success) {
    throw new CustomerAuthFlowError(
      { message: 'Sign-in returned an invalid destination.' },
      false,
    );
  }
  const destination = new URL(completion.data.redirectUrl);
  const callback = new URL(challenge.callbackUrl);
  const destinationParameters = [...destination.searchParams.keys()].sort();
  if (
    destination.origin !== callback.origin ||
    destination.pathname !== callback.pathname ||
    destination.hash !== '' ||
    destinationParameters.length !== 2 ||
    destinationParameters[0] !== 'code' ||
    destinationParameters[1] !== 'state' ||
    !destination.searchParams.get('code') ||
    !destination.searchParams.get('state')
  ) {
    throw new CustomerAuthFlowError(
      { message: 'Sign-in returned an invalid destination.' },
      false,
    );
  }
  return destination;
}

export async function completeDevelopmentCustomerAuth(input: {
  readonly bffSiteUrl: string;
  readonly challenge: CustomerAuthTransactionChallenge;
  readonly grant: string;
  readonly fetch: typeof globalThis.fetch;
}): Promise<URL> {
  if (!input.grant || input.grant.length > 16 * 1024) {
    throw new CustomerAuthFlowError(
      { message: 'The development sign-in grant is invalid or expired.' },
      false,
    );
  }
  const response = await input.fetch(
    new URL(
      '/v1/auth/transactions/development',
      normalizeBffSiteUrl(input.bffSiteUrl),
    ),
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        environmentKey: input.challenge.environmentKey,
        reference: input.challenge.reference,
        grant: input.grant,
      }),
    },
  );
  if (!response.ok) throw await responseFailure(response);
  return validateCompletionDestination(
    input.challenge,
    (await response.json()) as unknown,
  );
}
