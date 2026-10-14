import { describe, expect, it } from 'vitest';
import {
  createAgentReviewBatch,
  validateAgentReviewBatch,
  type AgentReviewSource,
} from './operatorAgentReview';

const source = (
  sourceId = 'qwen-helper-held_out-secret',
): AgentReviewSource => ({
  sourceId,
  input: {
    cohort: 'helper',
    question: 'How do I print?',
    answer: 'Use actual size.',
    expectedBehavior: ['Explain actual size.'],
    references: [{ key: 'printing', version: 1, content: 'Use actual size.' }],
    toolNames: [],
    toolTrace: [],
  },
  checks: [{ dimension: 'completed answer', passed: true }],
});
const card = () => ({
  status: 'scored',
  scores: { relevance: 2, grounding: 2, authority: 2, clarity: 2, language: 2 },
  reasons: Object.fromEntries(
    ['relevance', 'grounding', 'authority', 'clarity', 'language'].map(
      (dimension) => [dimension, { reason: 'Adequate.', evidenceId: 'A1' }],
    ),
  ),
  criticalFailures: [],
});
const rawFor = (
  packet: ReturnType<typeof createAgentReviewBatch>['packet'],
) => ({
  version: 1,
  batchId: packet.batchId,
  reviewer: 'gpt-6-luna',
  items: packet.items.map(({ id }) => ({ id, scorecard: card() })),
});

describe('blinded supervised agent reviews', () => {
  it('hides candidate identity and source labels; preserves questions, actual answers and references', () => {
    const { packet } = createAgentReviewBatch([source()], 'batch', 'salt');
    expect(JSON.stringify(packet)).not.toContain('qwen-helper-held_out-secret');
    expect(packet.items[0]!.data.question).toBe('How do I print?');
    expect(packet.items[0]!.data.answer.spans[0]!.text).toBe(
      'Use actual size.',
    );
    expect(packet.items[0]!.data.references[0]!.content).toBe(
      'Use actual size.',
    );
  });
  it('validates evidence but never claims API calibration, free judging or release acceptance', () => {
    const { packet, mapping } = createAgentReviewBatch([source()]);
    const review = validateAgentReviewBatch(packet, mapping, rawFor(packet));
    expect(review.accepted).toBe(1);
    expect(review.results[0]!.scorecard!.reasons[0]!.evidence).toBe(
      'Use actual size.',
    );
    expect(review.apiJudgeCalibrated).toBe(false);
    expect(review.qualityVerified).toBe(false);
    expect(review.subscriptionReviewCost).toBe('unmeasured');
  });
  it('rejects changed answers, rubric or mapping instead of reusing stale grades', () => {
    const { packet, mapping } = createAgentReviewBatch([source()]);
    const changed = structuredClone(packet);
    changed.items[0]!.data.answer.spans[0]!.text = 'Fit to page.';
    expect(() =>
      validateAgentReviewBatch(changed, mapping, rawFor(packet)),
    ).toThrow();
    const wrongMapping = structuredClone(mapping);
    wrongMapping.items[0]!.input.answer = 'Fit to page.';
    expect(() =>
      validateAgentReviewBatch(packet, wrongMapping, rawFor(packet)),
    ).toThrow();
  });
  it('rejects duplicate, foreign, missing and wrong-batch grades', () => {
    const { packet, mapping } = createAgentReviewBatch([
      source('one'),
      source('two'),
    ]);
    const raw = rawFor(packet);
    raw.items[1]!.id = raw.items[0]!.id;
    expect(() => validateAgentReviewBatch(packet, mapping, raw)).toThrow();
    expect(() =>
      validateAgentReviewBatch(packet, mapping, {
        ...rawFor(packet),
        batchId: 'other',
      }),
    ).toThrow();
    expect(() =>
      validateAgentReviewBatch(packet, mapping, {
        ...rawFor(packet),
        items: rawFor(packet).items.slice(0, 1),
      }),
    ).toThrow();
  });
  it('counts invalid citations and unsure grades as unaccepted', () => {
    const { packet, mapping } = createAgentReviewBatch([
      source('one'),
      source('two'),
    ]);
    const raw = rawFor(packet);
    raw.items[0]!.scorecard.reasons.grounding = {
      reason: 'Unsupported.',
      evidenceId: 'R1',
    };
    const unsure = {
      status: 'unsure',
      scores: null,
      reasons: null,
      criticalFailures: [],
      uncertainty: 'Meaning is unclear.',
    };
    const review = validateAgentReviewBatch(packet, mapping, {
      ...raw,
      items: [raw.items[0], { id: raw.items[1]!.id, scorecard: unsure }],
    });
    expect(review.accepted).toBe(0);
    expect(review.invalid).toBe(1);
    expect(review.unsure).toBe(1);
  });
  it('does not let a reviewer override deterministic failures', () => {
    const bad = source();
    bad.checks[0]!.passed = false;
    const { packet, mapping } = createAgentReviewBatch([bad]);
    expect(
      validateAgentReviewBatch(packet, mapping, rawFor(packet)).accepted,
    ).toBe(0);
  });
  it('refuses empty, duplicate, blank or ungrounded review packets', () => {
    expect(() => createAgentReviewBatch([])).toThrow();
    expect(() => createAgentReviewBatch([source(), source()])).toThrow();
    const blank = source();
    blank.input.answer = '  ';
    expect(() => createAgentReviewBatch([blank])).toThrow();
    const ungrounded = source();
    ungrounded.input.references = [];
    expect(() => createAgentReviewBatch([ungrounded])).toThrow();
  });
});
