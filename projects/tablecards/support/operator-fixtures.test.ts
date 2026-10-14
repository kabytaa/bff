import {
  operatorWorkConfigurationSchema,
  operatorWorkSeedSchema,
  validateOperationProperties,
} from '@bff/contracts';
import { describe, expect, it } from 'vitest';
import defaults, {
  createTableCardsOperatorWorkConfiguration,
} from '../operator-work.defaults';
import seed from './synthetic-seed';
import {
  operatorEvaluations,
  languageRegressions,
  multilingualRegressions,
} from './evaluations';
import { judgeCalibrationCases } from './judge-calibration';
import { tableCardsCompactSupportSkills } from './knowledge.compact';
import { tableCardsSupportSkills } from './knowledge';
import fullReference from './operator-work.full-reference';

describe('Business-owned Operator work data', () => {
  it('keeps configuration disabled until environment-specific mail bindings are supplied', () => {
    expect(operatorWorkConfigurationSchema.parse(defaults).enabled).toBe(false);
    expect(defaults.support.receivingAddress).toMatch(/\.example\.invalid$/u);
    expect(defaults.bots.every((bot) => bot.model === 'gemma4-26b')).toBe(true);
    expect(defaults.skills).toBe(tableCardsCompactSupportSkills);
    for (const bot of defaults.bots) {
      expect(bot.version).toBe(6);
      expect(bot.knowledgeSelection).toEqual({
        strategy: 'jev',
        mandatorySkillKeys: ['tablecards.basics', 'tablecards.contact'],
      });
      expect(bot.skillKeys).toEqual(
        tableCardsCompactSupportSkills.map(({ key }) => key),
      );
    }
  });
  it('preserves full/Qwen/v5 benchmark facts separately from deployable compact Gemma/Jev defaults', () => {
    expect(operatorWorkConfigurationSchema.parse(fullReference)).toEqual(
      fullReference,
    );
    expect(fullReference.enabled).toBe(false);
    expect(fullReference.skills).toBe(tableCardsSupportSkills);
    for (const bot of fullReference.bots) {
      expect(bot.model).toBe('qwen3-30b');
      expect(bot.version).toBe(5);
      expect(bot.knowledgeSelection).toBeUndefined();
    }
    expect({
      ...defaults,
      bots: fullReference.bots,
      skills: fullReference.skills,
    }).toEqual(fullReference);
  });
  it('binds only real environment activation and mailbox/presentation values without changing Business behavior', () => {
    const bindings = {
      enabled: true,
      contactEmail: 'support@tablecards.example.invalid',
      fromEmail: 'help@tablecards.example.invalid',
      receivingAddress: 'inbox@tablecards.example.invalid',
      replyDomain: 'reply.tablecards.example.invalid',
      helpUrl: 'https://tablecards-dev.tofler.app/support/feedback',
    };
    const configured = createTableCardsOperatorWorkConfiguration(bindings);
    expect(operatorWorkConfigurationSchema.parse(configured)).toEqual(
      configured,
    );
    expect(configured.enabled).toBe(true);
    expect(configured.presentation.contactEmail).toBe(bindings.contactEmail);
    expect(configured.presentation.helpUrl).toBe(bindings.helpUrl);
    expect(configured.support.fromEmail).toBe(bindings.fromEmail);
    expect(configured.support.receivingAddress).toBe(bindings.receivingAddress);
    expect(configured.support.replyDomain).toBe(bindings.replyDomain);
    expect(configured.bots).toBe(defaults.bots);
    expect(configured.skills).toBe(defaults.skills);
    expect(configured.events).toBe(defaults.events);
    expect(configured.kpis).toBe(defaults.kpis);
    expect(configured.pageCapabilities).toBe(defaults.pageCapabilities);
    expect(defaults.enabled).toBe(false);
  });
  it('validates synthetic chronology and registered event payloads without real recipients', () => {
    const parsed = operatorWorkSeedSchema.parse(seed);
    for (const item of parsed.cases) {
      expect(item.contactEmail).toMatch(/\.example\.invalid$/u);
      expect(item.key).toMatch(/^synthetic\./u);
      expect(
        item.entries.every((entry) => entry.createdAt >= item.createdAt),
      ).toBe(true);
      expect(item.entries.map((entry) => entry.createdAt)).toEqual(
        item.entries.map((entry) => entry.createdAt).sort((a, b) => a - b),
      );
    }
    for (const event of parsed.events ?? []) {
      const definition = defaults.events.find(
        (item) => item.name === event.name && item.version === event.version,
      );
      expect(definition).toBeDefined();
      expect(() =>
        validateOperationProperties(definition!.properties, event.properties),
      ).not.toThrow();
    }
  });
  it('separates independent held-out cohorts from tuning and runtime knowledge', () => {
    expect(operatorEvaluations).toHaveLength(157);
    expect(new Set(operatorEvaluations.map((item) => item.id)).size).toBe(157);
    expect(new Set(operatorEvaluations.map((item) => item.prompt)).size).toBe(
      157,
    );
    for (const cohort of ['helper', 'support']) {
      expect(
        operatorEvaluations.filter(
          (item) => item.cohort === cohort && item.split === 'held_out',
        ),
      ).toHaveLength(60);
      expect(
        operatorEvaluations.filter(
          (item) => item.cohort === cohort && item.split === 'tuning',
        ),
      ).toHaveLength(cohort === 'helper' ? 24 : 13);
    }
    const runtime = JSON.stringify(defaults);
    expect(runtime).not.toContain('expectedBehavior');
    expect(runtime).not.toContain('synthetic.helper.held_out');
  });
  it('retains Hebrew production regressions without placing test expectations in runtime content', () => {
    expect(languageRegressions).toHaveLength(4);
    expect(languageRegressions.every((item) => item.split === 'tuning')).toBe(
      true,
    );
    expect(
      languageRegressions.some((item) => item.prompt === 'איך זה עובד?'),
    ).toBe(true);
    for (const bot of defaults.bots) {
      expect(bot.version).toBe(6);
      expect(bot.instructions).not.toMatch(/Hebrew|Russian|Spanish|French/u);
      expect(bot.instructions).not.toContain('regression.helper.hebrew');
    }
  });
  it('keeps Russian, Spanish and French checks separate from runtime content and held-out cohorts', () => {
    expect(multilingualRegressions).toHaveLength(9);
    for (const language of ['russian', 'spanish', 'french']) {
      const cases = multilingualRegressions.filter((item) =>
        item.tags.includes(language),
      );
      expect(cases).toHaveLength(3);
      expect(cases.every((item) => item.split === 'tuning')).toBe(true);
      expect(cases.every((item) => item.cohort === 'helper')).toBe(true);
      expect(cases.map((item) => item.tags.at(-1))).toEqual([
        'overview',
        'printing',
        'payment',
      ]);
      expect(JSON.stringify(defaults)).not.toContain(
        `regression.helper.${language}`,
      );
    }
  });
  it('resolves semantic references and keeps controlled judge calibration separate from held-out questions', () => {
    for (const item of [...operatorEvaluations, ...judgeCalibrationCases]) {
      expect(item.expectedBehavior.length).toBeGreaterThan(0);
      for (const key of item.referenceKeys)
        expect(
          defaults.skills.some(
            (skill) => skill.key === key && skill.content.length > 0,
          ),
        ).toBe(true);
    }
    expect(judgeCalibrationCases).toHaveLength(24);
    expect(judgeCalibrationCases.some((item) => item.expectedPass)).toBe(true);
    expect(judgeCalibrationCases.some((item) => !item.expectedPass)).toBe(true);
    expect(
      judgeCalibrationCases.some(
        (item) => item.expectedCriticalCodes.length > 0,
      ),
    ).toBe(true);
    expect(JSON.stringify(defaults)).not.toContain('judge.printing-paraphrase');
    expect(
      judgeCalibrationCases.every(
        (item) =>
          !operatorEvaluations.some(
            (evaluation) => evaluation.prompt === item.prompt,
          ),
      ),
    ).toBe(true);
  });
});
