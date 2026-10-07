// A private provider adapter, not a browser API or a second product backend.
export interface Environment {
  PROVIDER_SECRET: string;
  AI: {
    run(
      model: string,
      input: {
        multipart: { body: ReadableStream<Uint8Array>; contentType: string };
      },
    ): Promise<{ image?: string }>;
  };
}
const MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
const MAX_REQUEST_BYTES = 750_000;

function sameSecret(actual: string, expected: string): boolean {
  if (expected.length < 32 || actual.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i += 1)
    difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}

async function boundedBody(request: Request) {
  if (!request.body) throw new Error('Missing body');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > MAX_REQUEST_BYTES) throw new Error('Body too large');
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
}

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const headers = { 'cache-control': 'no-store' };
    if (
      new URL(request.url).pathname !== '/generate' ||
      request.method !== 'POST'
    )
      return new Response(null, { status: 404, headers });
    if (
      !sameSecret(
        request.headers.get('authorization')?.replace(/^Bearer /u, '') ?? '',
        env.PROVIDER_SECRET ?? '',
      )
    )
      return new Response(null, { status: 401, headers });
    let form: FormData;
    try {
      const input = await boundedBody(request);
      if (
        typeof input.prompt !== 'string' ||
        input.prompt.length < 3 ||
        input.prompt.length > 1400 ||
        !Number.isInteger(input.seed) ||
        (input.seed as number) < 0 ||
        (input.seed as number) > 2_147_483_647
      )
        throw new Error('Invalid input');
      form = new FormData();
      form.set('prompt', input.prompt);
      form.set('width', '1344');
      form.set('height', '768');
      form.set('seed', String(input.seed));
      if (input.reference !== undefined) {
        const reference = input.reference as Record<string, unknown>;
        if (
          !reference ||
          !['image/png', 'image/jpeg'].includes(String(reference.mimeType)) ||
          typeof reference.base64 !== 'string' ||
          reference.base64.length > 700_000 ||
          !/^[A-Za-z0-9+/]+={0,2}$/u.test(reference.base64)
        )
          throw new Error('Invalid reference');
        const bytes = Uint8Array.from(atob(reference.base64), (character) =>
          character.charCodeAt(0),
        );
        if (bytes.length > 512 * 1024) throw new Error('Reference too large');
        form.set(
          'input_image_0',
          new Blob([bytes], { type: String(reference.mimeType) }),
          'reference',
        );
      }
    } catch {
      return Response.json(
        { error: 'INVALID_INPUT' },
        { status: 400, headers },
      );
    }
    try {
      const serialized = new Response(form);
      const output = await env.AI.run(MODEL, {
        multipart: {
          body: serialized.body!,
          contentType: serialized.headers.get('content-type')!,
        },
      });
      if (!output.image || output.image.length > 12_000_000)
        throw new Error('Invalid output');
      return Response.json({ image: output.image }, { headers });
    } catch {
      // Do not expose/log provider payloads, prompts, images or credentials.
      return Response.json(
        { error: 'PROVIDER_UNAVAILABLE' },
        { status: 502, headers },
      );
    }
  },
};
