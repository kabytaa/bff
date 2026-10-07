import { fail } from './productErrors';

/** Retry only immutable GET reads, never export writes or provider generation. */
export async function readPrintAsset(
  url: URL,
  headers?: HeadersInit,
): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) {
        return {
          bytes: new Uint8Array(await response.arrayBuffer()),
          contentType:
            response.headers.get('content-type')?.split(';')[0] ?? null,
        };
      }
    } catch (error) {
      // Includes network failure while reading a successful response's body.
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      continue;
    }
    if ((response.status !== 429 && response.status < 500) || attempt === 2) {
      fail('PROVIDER_UNAVAILABLE', 'The print asset is unavailable');
    }
    await response.body?.cancel().catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  // All paths above either return verified-read bytes or throw after three tries.
  throw new Error('The print asset is unavailable');
}
