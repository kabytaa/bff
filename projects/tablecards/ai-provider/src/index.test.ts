import { describe, expect, it, vi } from 'vitest';
import worker, { type Environment } from './index';

function environment() {
  return {
    PROVIDER_SECRET: 'synthetic_secret_for_provider_tests_00000001',
    AI: { run: vi.fn().mockResolvedValue({ image: 'YWJjZA==' }) },
  };
}
function request(env: Environment, input: object) {
  return new Request('https://provider.invalid/generate', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.PROVIDER_SECRET}` },
    body: JSON.stringify(input),
  });
}
describe('private Cloudflare image adapter', () => {
  it('rejects anonymous, wrong-secret, wrong-path and browser preflight without inference', async () => {
    const env = environment();
    for (const candidate of [
      new Request('https://provider.invalid/generate', { method: 'POST' }),
      new Request('https://provider.invalid/generate', {
        method: 'POST',
        headers: { authorization: 'Bearer wrong' },
      }),
      new Request('https://provider.invalid/'),
      new Request('https://provider.invalid/generate', { method: 'OPTIONS' }),
    ]) {
      expect(
        (await worker.fetch(candidate, env)).status,
      ).toBeGreaterThanOrEqual(400);
    }
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it('passes only bounded fixed-model multipart generation with the optional image', async () => {
    const env = environment();
    const response = await worker.fetch(
      request(env, {
        prompt: 'Blue watercolor leaves',
        seed: 42,
        reference: { base64: 'YWJjZA==', mimeType: 'image/png' },
        model: 'expensive-model',
        width: 10000,
      }),
      env,
    );
    expect(response.status).toBe(200);
    const [model, input] = env.AI.run.mock.calls[0]!;
    expect(model).toBe('@cf/black-forest-labs/flux-2-klein-4b');
    const form = await new Response(input.multipart.body, {
      headers: { 'content-type': input.multipart.contentType },
    }).formData();
    expect(form.get('width')).toBe('1344');
    expect(form.get('height')).toBe('768');
    expect(form.get('prompt')).toBe('Blue watercolor leaves');
    expect(form.get('input_image_0')).toBeInstanceOf(File);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
  it.each([
    { prompt: 'ok', seed: 1 },
    { prompt: 'valid prompt', seed: -1 },
    {
      prompt: 'valid prompt',
      seed: 2,
      reference: { base64: 'invalid data', mimeType: 'image/svg+xml' },
    },
    { prompt: 'a'.repeat(750_001), seed: 2 },
  ])('rejects invalid input before inference', async (input) => {
    const env = environment();
    expect((await worker.fetch(request(env, input), env)).status).toBe(400);
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it('redacts provider failures', async () => {
    const env = environment();
    env.AI.run.mockRejectedValue(new Error('private provider details'));
    const response = await worker.fetch(
      request(env, { prompt: 'Valid prompt', seed: 1 }),
      env,
    );
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('private');
  });
});
