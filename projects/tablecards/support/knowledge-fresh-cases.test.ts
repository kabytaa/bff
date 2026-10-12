import { describe, expect, it } from 'vitest';
import { operatorEvaluations } from './evaluations';
import { tableCardsSupportSkills } from './knowledge';
import { knowledgeExperimentCases } from './knowledge-experiment';
import { knowledgeFreshCases } from './knowledge-fresh-cases';

describe('fresh Business-owned knowledge cases', () => {
  it('keeps twelve unique held-out cases with six cases per role and the requested language balance', () => {
    expect(knowledgeFreshCases).toHaveLength(12);
    expect(new Set(knowledgeFreshCases.map(({ id }) => id)).size).toBe(12);
    for (const cohort of ['helper', 'support'])
      expect(
        knowledgeFreshCases.filter((item) => item.cohort === cohort),
      ).toHaveLength(6);
    for (const [language, count] of Object.entries({
      en: 4,
      he: 2,
      ru: 2,
      es: 2,
      fr: 2,
    }))
      expect(
        knowledgeFreshCases.filter((item) =>
          item.tags.includes(`language:${language}`),
        ),
      ).toHaveLength(count);
    for (const item of knowledgeFreshCases) {
      expect(item.id).toMatch(
        new RegExp(`^fresh\\.20261011\\.${item.cohort}\\.[a-z0-9-]+$`, 'u'),
      );
      expect(item.split).toBe('held_out');
      expect(item.tags).toContain('fresh');
      expect(
        item.tags.filter((tag) => tag.startsWith('language:')),
      ).toHaveLength(1);
      expect(
        item.tags.some((tag) =>
          ['normal', 'messy', 'adversarial'].includes(tag),
        ),
      ).toBe(true);
      expect(item.expected.requiredPhrases).toBeUndefined();
    }
  });

  it('uses approved reference keys and does not overlap the saved or diagnostic fixtures', () => {
    const previousCases = [...operatorEvaluations, ...knowledgeExperimentCases];
    const previousIds = new Set(previousCases.map(({ id }) => id));
    const previousPrompts = new Set(previousCases.map(({ prompt }) => prompt));
    const approvedKeys = new Set(tableCardsSupportSkills.map(({ key }) => key));
    for (const item of knowledgeFreshCases) {
      expect(previousIds.has(item.id)).toBe(false);
      expect(previousPrompts.has(item.prompt)).toBe(false);
      expect(item.referenceKeys.length).toBeGreaterThan(0);
      expect(new Set(item.referenceKeys).size).toBe(item.referenceKeys.length);
      for (const key of item.referenceKeys)
        expect(approvedKeys.has(key)).toBe(true);
    }
    expect(
      knowledgeFreshCases.filter((item) => item.recentMessages),
    ).toHaveLength(2);
    for (const item of knowledgeFreshCases.filter(
      (candidate) => candidate.recentMessages,
    )) {
      expect(item.tags).toContain('follow-up');
      expect(item.tags).toContain('multi-topic');
      expect(item.recentMessages!.length).toBeLessThanOrEqual(4);
    }
  });

  it('keeps evaluator expectations and source identifiers out of customer questions and history', () => {
    for (const item of knowledgeFreshCases) {
      const customerInput = [
        item.prompt,
        ...(item.recentMessages ?? []).map(({ content }) => content),
      ].join('\n');
      expect(customerInput).not.toMatch(
        /tablecards\.(?:basics|printing|import|access|designs|teams|contact)|expectedBehavior|referenceKeys|held_out|necessaryKnowledgeKeys|operator-answer-quality/iu,
      );
      for (const behavior of item.expectedBehavior)
        expect(customerInput).not.toContain(behavior);
      for (const skill of tableCardsSupportSkills)
        expect(customerInput).not.toContain(skill.content);
      expect(item.expectedBehavior.length).toBeGreaterThan(0);
    }
  });
});
