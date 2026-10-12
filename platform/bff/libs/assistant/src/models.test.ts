import { describe, expect, it } from 'vitest';
import {
  REVIEWED_TEXT_MODELS,
  estimatedModelCostUsd,
  reviewedAnswerModel,
  reviewedJudgeModel,
  reviewedTextModel,
  RUNTIME_ANSWER_MODEL_KEY,
} from './models';

describe('reviewed text model catalog', () => {
  it('keeps inexpensive answer candidates separate from evaluation-only judges', () => {
    expect(
      REVIEWED_TEXT_MODELS.filter(({ usage }) => usage === 'answer'),
    ).toHaveLength(3);
    expect(
      REVIEWED_TEXT_MODELS.filter(({ usage }) => usage === 'judge'),
    ).toHaveLength(3);
    expect(reviewedAnswerModel().key).toBe('qwen3-30b');
    expect(reviewedAnswerModel(RUNTIME_ANSWER_MODEL_KEY).nativeId).toBe(
      '@cf/google/gemma-4-26b-a4b-it',
    );
    expect(reviewedJudgeModel().key).toBe('gpt-oss-120b');
    for (const judge of REVIEWED_TEXT_MODELS.filter(
      ({ usage }) => usage === 'judge',
    )) {
      expect(reviewedJudgeModel(judge.key)).toBe(judge);
      expect(() => reviewedAnswerModel(judge.key)).toThrow(
        'Unreviewed assistant answer model',
      );
    }
    expect(() => reviewedJudgeModel('qwen3-30b')).toThrow(
      'Unreviewed evaluation judge model',
    );
    expect(() => reviewedTextModel('arbitrary-provider/model')).toThrow(
      'Unreviewed provider model',
    );
    expect(
      new Set(REVIEWED_TEXT_MODELS.map(({ nativeId }) => nativeId)).size,
    ).toBe(6);
  });
  it('computes per-call price estimates from input and output usage', () => {
    expect(estimatedModelCostUsd(reviewedAnswerModel(), 5000, 500)).toBeCloseTo(
      0.000422,
    );
    expect(
      estimatedModelCostUsd(reviewedAnswerModel('glm-4.7-flash'), 5000, 500),
    ).toBeCloseTo(0.0005025);
    expect(
      estimatedModelCostUsd(reviewedAnswerModel('gemma4-26b'), 5000, 500),
    ).toBeCloseTo(0.00065);
    expect(estimatedModelCostUsd(reviewedJudgeModel(), 5000, 500)).toBeCloseTo(
      0.002125,
    );
    expect(
      estimatedModelCostUsd(reviewedJudgeModel('kimi-k2.6'), 5000, 500),
    ).toBeCloseTo(0.00675);
    expect(
      estimatedModelCostUsd(
        reviewedJudgeModel('deepseek-v4-flash-0731'),
        5000,
        500,
      ),
    ).toBeCloseTo(0.00286);
    expect(() => estimatedModelCostUsd(reviewedAnswerModel(), -1, 0)).toThrow(
      'Invalid model token estimate',
    );
    expect(() => estimatedModelCostUsd(reviewedAnswerModel(), 10.5, 0)).toThrow(
      'Invalid model token estimate',
    );
  });
});
