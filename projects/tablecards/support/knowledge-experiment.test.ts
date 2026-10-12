import { describe, expect, it } from 'vitest';
import defaults from '../operator-work.defaults';
import { operatorEvaluations } from './evaluations';
import {
  knowledgeExperimentCases,
  knowledgeExperimentPilotCases,
} from './knowledge-experiment';

describe('Business-owned matched knowledge diagnostic', () => {
  it('keeps the 24 pilot questions and 157 saved bank cases unchanged', () => {
    expect(knowledgeExperimentPilotCases).toHaveLength(24);
    expect(operatorEvaluations).toHaveLength(157);
    expect(
      knowledgeExperimentPilotCases.filter((item) => item.cohort === 'helper'),
    ).toHaveLength(19);
    expect(
      knowledgeExperimentPilotCases.every((item) => item.split === 'tuning'),
    ).toBe(true);
  });
  it('adds already-seen and multi-topic/follow-up diagnostics without pretending they are held-out', () => {
    expect(knowledgeExperimentCases).toHaveLength(31);
    expect(new Set(knowledgeExperimentCases.map((item) => item.id)).size).toBe(
      31,
    );
    expect(
      knowledgeExperimentCases.every((item) => item.split === 'tuning'),
    ).toBe(true);
    expect(
      knowledgeExperimentCases.filter((item) =>
        item.tags.includes('already-seen-error'),
      ),
    ).toHaveLength(3);
    expect(
      knowledgeExperimentCases.filter((item) => item.recentMessages),
    ).toHaveLength(2);
    for (const item of knowledgeExperimentCases)
      for (const key of [...item.referenceKeys, ...item.necessaryKnowledgeKeys])
        expect(defaults.skills.some((skill) => skill.key === key)).toBe(true);
    expect(JSON.stringify(defaults)).not.toContain('necessaryKnowledgeKeys');
    expect(JSON.stringify(defaults)).not.toContain('diagnostic.context');
    expect(
      knowledgeExperimentCases.find(
        (item) =>
          item.id === 'diagnostic.known.synthetic.helper.held_out.messy.09',
      )!.necessaryKnowledgeKeys,
    ).toEqual(['tablecards.access', 'tablecards.designs']);
  });
});
