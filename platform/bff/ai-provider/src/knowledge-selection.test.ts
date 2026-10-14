import { describe, expect, it, vi } from 'vitest';
import worker, { type Environment } from './index';
import {
  buildKnowledgeSelectionInput,
  KNOWLEDGE_SELECTION_MODEL,
} from '@bff/assistant/knowledge-selection';

const secret = 'synthetic-private-selector-test-secret-only';
const body = {
  question: 'How should I print my cards?',
  skills: [
    { key: 'basics', name: 'Basics', whenToUse: 'Product overview' },
    { key: 'printing', name: 'Printing', whenToUse: 'Print settings' },
  ],
};
const nativeOutput = {
  model: 'jev-1.13.0',
  answers: {
    skill_0: { type: 'noul', noul: 0.1 },
    skill_1: { type: 'noul', noul: 0.95 },
  },
  usage: { input_tokens: 120, output_tokens: 0 },
};
function environment(): Environment {
  return {
    PROVIDER_SECRET: secret,
    LIVE_TEXT_ENABLED: 'true',
    CAPS_VERIFIED: 'true',
    KNOWLEDGE_SELECTION_ENABLED: 'true',
    AI_GATEWAY_ID: 'operator-dev',
    AI: { run: vi.fn(async () => nativeOutput) },
    IMAGES: {
      input() {
        throw new Error('No image work in selector tests');
      },
    },
  };
}
function request(input: unknown = body, authorized = true): Request {
  return new Request('https://private.example/v1/knowledge-selection', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authorized ? { authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(input),
  });
}
describe('private evaluation-only Jev bridge', () => {
  it('keeps customer selector and experiment flags independent and requires an explicit runtime role', async () => {
    const env = environment();
    const runtime = (input: unknown = { ...body, kind: 'helper' }) =>
      new Request('https://private.example/v1/runtime/knowledge-selection', {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}` },
        body: JSON.stringify(input),
      });
    expect((await worker.fetch(runtime(), env)).status).toBe(503);
    expect(env.AI.run).not.toHaveBeenCalled();
    env.RUNTIME_KNOWLEDGE_SELECTION_ENABLED = 'true';
    env.KNOWLEDGE_SELECTION_ENABLED = 'false';
    for (const kind of ['helper', 'support']) {
      const response = await worker.fetch(runtime({ ...body, kind }), env);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(nativeOutput);
    }
    expect((await worker.fetch(request(), env)).status).toBe(503);
    for (const input of [
      body,
      { ...body, kind: 'judge' },
      { ...body, kind: 'helper', model: 'expensive' },
      {
        ...body,
        kind: 'support',
        skills: [{ ...body.skills[0], content: 'Private content' }],
      },
    ])
      expect((await worker.fetch(runtime(input), env)).status).toBe(400);
    expect(env.AI.run).toHaveBeenCalledTimes(2);
    env.CAPS_VERIFIED = 'false';
    expect((await worker.fetch(runtime(), env)).status).toBe(503);
    expect(env.AI.run).toHaveBeenCalledTimes(2);
  });
  it('builds fixed metadata-only questions on the existing capped gateway', async () => {
    const env = environment();
    const response = await worker.fetch(request(), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(nativeOutput);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(env.AI.run).toHaveBeenCalledExactlyOnceWith(
      KNOWLEDGE_SELECTION_MODEL,
      buildKnowledgeSelectionInput(body),
      { gateway: { id: 'operator-dev', skipCache: true } },
    );
  });
  it('normalizes the actual Cloudflare third-party binding result envelope', async () => {
    const env = environment();
    env.AI.run = vi.fn(async () => ({
      result: nativeOutput,
      success: true,
      errors: [],
      messages: [],
      providerMetadata: secret,
    }));
    const response = await worker.fetch(request(), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(nativeOutput);
  });
  it.each([{ success: false }, { errors: [{ message: secret }] }])(
    'rejects a failed result envelope without echoing error details: %j',
    async (failure) => {
      const env = environment();
      env.AI.run = vi.fn(async () => ({ result: nativeOutput, ...failure }));
      const response = await worker.fetch(request(), env);
      expect(response.status).toBe(502);
      expect(await response.text()).not.toContain(secret);
    },
  );
  it.each([
    { LIVE_TEXT_ENABLED: 'false' },
    { CAPS_VERIFIED: 'false' },
    { AI_GATEWAY_ID: '' },
    { KNOWLEDGE_SELECTION_ENABLED: 'false' },
    { KNOWLEDGE_SELECTION_ENABLED: undefined },
  ])('fails closed before inference for %j', async (override) => {
    const env = { ...environment(), ...override };
    expect((await worker.fetch(request(), env)).status).toBe(503);
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it('denies missing bearer before body parsing or inference', async () => {
    const env = environment();
    expect((await worker.fetch(request(body, false), env)).status).toBe(401);
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it.each([
    { ...body, model: 'expensive' },
    { ...body, gateway: 'uncapped' },
    { ...body, expectedAnswer: 'Test expectations' },
    { ...body, skills: [{ ...body.skills[0], content: 'Knowledge contents' }] },
    { ...body, skills: [body.skills[0], body.skills[0]] },
    { ...body, question: '' },
    { ...body, questions: { arbitrary: { instructions: 'Custom rules' } } },
  ])('rejects unsupported input before paid work: %j', async (input) => {
    const env = environment();
    expect((await worker.fetch(request(input), env)).status).toBe(400);
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it('bounds combined multibyte native input before inference', async () => {
    const env = environment();
    const input = {
      question: '日'.repeat(4_000),
      skills: Array.from({ length: 16 }, (_, i) => ({
        key: `section_${i}`,
        name: '日'.repeat(200),
        whenToUse: '日'.repeat(1_000),
      })),
    };
    expect((await worker.fetch(request(input), env)).status).toBe(400);
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it.each([
    { model: 'jev-1.13.0', answers: {} },
    { ...nativeOutput, answers: { skill_0: { type: 'noul', noul: 1 } } },
    {
      ...nativeOutput,
      answers: { ...nativeOutput.answers, skill_2: { type: 'noul', noul: 1 } },
    },
    {
      ...nativeOutput,
      answers: {
        ...nativeOutput.answers,
        skill_0: { type: 'noul', noul: 1.1 },
      },
    },
    { ...nativeOutput, usage: { input_tokens: -1 } },
    { ...nativeOutput, secret: 'synthetic-provider-secret' },
    undefined,
  ])(
    'rejects malformed native output without echoing it: %j',
    async (output) => {
      const env = environment();
      env.AI.run = vi.fn(async () => output);
      const response = await worker.fetch(request(), env);
      expect(response.status).toBe(502);
      expect(response.headers.has('x-provider-error-codes')).toBe(false);
      expect(await response.json()).toMatchObject({
        error: { code: 'INVALID_PROVIDER_OUTPUT' },
      });
    },
  );
  it('does not invent missing usage or resolve ambiguity itself', async () => {
    const env = environment();
    const output = {
      model: 'jev-1.13.0',
      answers: {
        skill_0: { type: 'noul', noul: 0.5 },
        skill_1: { type: 'noul', noul: 0.9 },
      },
    };
    env.AI.run = vi.fn(async () => output);
    const response = await worker.fetch(request(), env);
    expect(await response.json()).toEqual(output);
  });
  it('diagnoses malformed output using fixed types only, never values or unknown keys', async () => {
    const env = environment();
    env.AI.run = vi.fn(async () => ({
      result: {
        model: secret,
        answers: privateBody(),
        usage: { input_tokens: 1 },
      },
      [secret]: 'private-provider-data',
    }));
    const response = await worker.fetch(request(), env);
    expect(response.status).toBe(502);
    const shape = response.headers.get('x-provider-output-shape');
    expect(shape).toContain('model:string');
    expect(shape).toContain('answers:object');
    expect(shape).not.toContain(secret);
    expect(shape).not.toContain('private-provider-data');
    expect(await response.text()).not.toContain(secret);
  });
  it('keeps Jev out of the customer answer route', async () => {
    const env = environment();
    const response = await worker.fetch(
      new Request('https://private.example/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}` },
        body: JSON.stringify({
          model: KNOWLEDGE_SELECTION_MODEL,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      }),
      env,
    );
    expect(response.status).toBe(400);
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it('sanitizes provider errors without leaking question or credentials', async () => {
    const env = environment();
    const privateDetail = 'synthetic-private-question';
    env.AI.run = vi.fn(async () => {
      throw new Error(`401: ${privateDetail} ${secret}`);
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const response = await worker.fetch(request(), env);
      expect(response.status).toBe(502);
      expect(log).toHaveBeenCalledExactlyOnceWith(
        'KNOWLEDGE_SELECTOR_FAILURE',
        {
          name: 'Error',
          codes: ['401'],
        },
      );
      expect(response.headers.get('x-provider-error-codes')).toBe('401');
      const output = await response.text();
      expect(output).not.toContain(secret);
      expect(output).not.toContain(privateDetail);
      expect(JSON.stringify(log.mock.calls)).not.toContain(secret);
      expect([...response.headers.values()].join(' ')).not.toContain(secret);
    } finally {
      log.mockRestore();
    }
  });
});

function privateBody() {
  return { [secret]: 'private-provider-data' };
}
