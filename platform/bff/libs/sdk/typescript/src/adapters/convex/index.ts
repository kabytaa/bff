export interface ConvexAuthTokenFetcher {
  fetchAccessToken(options: { forceRefreshToken: boolean }): Promise<
    string | null
  >;
}

export function createConvexAuthTokenFetcher(
  fetchToken: (forceRefreshToken: boolean) => Promise<string | null>,
): ConvexAuthTokenFetcher {
  return {
    fetchAccessToken: async ({ forceRefreshToken }) =>
      await fetchToken(forceRefreshToken),
  };
}
