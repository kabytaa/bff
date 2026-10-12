import { describe, expect, it } from 'vitest';
import { prepareMatrixControlBatch } from './operatorKnowledgeMatrixReview';

describe('matrix subscription controls', () => {
  it('keeps expected grades and blank controls out of reviewer data', () => {
    const control = {
      id: 'control.good',
      cohort: 'helper',
      prompt: 'How?',
      answer: 'Use actual size.',
      referenceKeys: ['printing'],
      expectedBehavior: ['Give print settings.'],
      expectedPass: true,
      expectedCriticalCodes: [],
    };
    const batch = prepareMatrixControlBatch(
      [
        control,
        { ...control, id: 'control.blank', answer: '', expectedPass: false },
      ],
      [{ key: 'printing', version: 1, content: 'Use actual size.' }],
      'test-controls',
    );
    expect(batch.packet.items).toHaveLength(1);
    expect(batch.controls).toHaveLength(2);
    expect(JSON.stringify(batch.packet)).not.toContain('expectedPass');
    expect(JSON.stringify(batch.packet)).not.toContain('control.good');
  });
  it('refuses missing approved references', () => {
    const control = {
      id: 'control.good',
      cohort: 'helper',
      prompt: 'How?',
      answer: 'Use actual size.',
      referenceKeys: ['printing'],
      expectedBehavior: ['Give print settings.'],
      expectedPass: true,
      expectedCriticalCodes: [],
    };
    expect(() =>
      prepareMatrixControlBatch(
        [control, { ...control, id: 'control.bad', expectedPass: false }],
        [],
        'test-controls',
      ),
    ).toThrow('Control reference');
  });
});
