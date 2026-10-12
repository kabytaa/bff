/**
 * Reviewed Workers AI candidates; pricing is an estimate, not a billing ledger.
 * Verified against the linked provider model pages on 2026-10-11.
 * Keys are server/operator-owned configuration, never customer input.
 */
export const REVIEWED_TEXT_MODELS = [
  {
    key: 'qwen3-30b',
    nativeId: '@cf/qwen/qwen3-30b-a3b-fp8',
    inputUsdPerMillion: 0.0509,
    outputUsdPerMillion: 0.335,
    contextTokens: 32_768,
    usage: 'answer',
    source:
      'https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/',
  },
  {
    key: 'glm-4.7-flash',
    nativeId: '@cf/zai-org/glm-4.7-flash',
    inputUsdPerMillion: 0.0605,
    outputUsdPerMillion: 0.4,
    contextTokens: 131_072,
    usage: 'answer',
    source:
      'https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/',
  },
  {
    key: 'gemma4-26b',
    nativeId: '@cf/google/gemma-4-26b-a4b-it',
    inputUsdPerMillion: 0.1,
    outputUsdPerMillion: 0.3,
    contextTokens: 256_000,
    usage: 'answer',
    source:
      'https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/',
  },
  {
    key: 'gpt-oss-120b',
    nativeId: '@cf/openai/gpt-oss-120b',
    inputUsdPerMillion: 0.35,
    outputUsdPerMillion: 0.75,
    contextTokens: 128_000,
    usage: 'judge',
    source: 'https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/',
  },
  {
    key: 'kimi-k2.6',
    nativeId: '@cf/moonshotai/kimi-k2.6',
    inputUsdPerMillion: 0.95,
    outputUsdPerMillion: 4,
    contextTokens: 262_144,
    usage: 'judge',
    source: 'https://developers.cloudflare.com/workers-ai/models/kimi-k2.6/',
  },
  {
    key: 'deepseek-v4-flash-0731',
    nativeId: '@cf/deepseek-ai/deepseek-v4-flash-0731',
    inputUsdPerMillion: 0.44,
    outputUsdPerMillion: 1.32,
    contextTokens: 1_048_576,
    usage: 'judge',
    source:
      'https://developers.cloudflare.com/workers-ai/models/deepseek-v4-flash-0731/',
  },
] as const;

export type ReviewedTextModel = (typeof REVIEWED_TEXT_MODELS)[number];
export type ReviewedAnswerModel = Extract<
  ReviewedTextModel,
  { usage: 'answer' }
>;
export type ReviewedJudgeModel = Extract<ReviewedTextModel, { usage: 'judge' }>;
export type AnswerModelKey = ReviewedAnswerModel['key'];
export type JudgeModelKey = ReviewedJudgeModel['key'];
export const DEFAULT_ANSWER_MODEL_KEY: AnswerModelKey = 'qwen3-30b';
/** Reviewed customer checkpoint; separate from historical experiment defaults. */
export const RUNTIME_ANSWER_MODEL_KEY: AnswerModelKey = 'gemma4-26b';
export const DEFAULT_JUDGE_MODEL_KEY: JudgeModelKey = 'gpt-oss-120b';

export function reviewedAnswerModel(
  key: string = DEFAULT_ANSWER_MODEL_KEY,
): ReviewedAnswerModel {
  const model = REVIEWED_TEXT_MODELS.find(
    (candidate): candidate is ReviewedAnswerModel =>
      candidate.key === key && candidate.usage === 'answer',
  );
  if (!model) throw new Error('Unreviewed assistant answer model');
  return model;
}

export function reviewedJudgeModel(
  key: string = DEFAULT_JUDGE_MODEL_KEY,
): ReviewedJudgeModel {
  const model = REVIEWED_TEXT_MODELS.find(
    (candidate): candidate is ReviewedJudgeModel =>
      candidate.key === key && candidate.usage === 'judge',
  );
  if (!model) throw new Error('Unreviewed evaluation judge model');
  return model;
}

export function reviewedTextModel(nativeId: string): ReviewedTextModel {
  const model = REVIEWED_TEXT_MODELS.find(
    (candidate) => candidate.nativeId === nativeId,
  );
  if (!model) throw new Error('Unreviewed provider model');
  return model;
}

export function estimatedModelCostUsd(
  model: ReviewedTextModel,
  inputTokens: number,
  outputTokens: number,
): number {
  if (
    !Number.isSafeInteger(inputTokens) ||
    !Number.isSafeInteger(outputTokens) ||
    inputTokens < 0 ||
    outputTokens < 0
  )
    throw new Error('Invalid model token estimate');
  return (
    (inputTokens * model.inputUsdPerMillion +
      outputTokens * model.outputUsdPerMillion) /
    1_000_000
  );
}
