import { describe, expect, it } from 'vitest';

import {
  operatorWorkConfigurationSchema,
  validateOperationProperties,
  type OperatorWorkConfiguration,
} from './operations';

const configuration: OperatorWorkConfiguration = {
  version: 1,
  enabled: true,
  presentation: {
    productName: 'Example',
    helpUrl: 'https://example.invalid/help',
    contactEmail: 'help@example.invalid',
  },
  support: {
    botKey: 'support',
    fromEmail: 'help@example.invalid',
    fromName: 'Example support',
    receivingAddress: 'help@receive.example.invalid',
    replyDomain: 'receive.example.invalid',
    receiptText: 'We received your message.',
    surveyQuestion: 'Did this help?',
  },
  bots: [
    {
      key: 'support',
      name: 'Support',
      version: 1,
      kind: 'support',
      instructions: 'Suggest a useful reply.',
      skillKeys: ['help'],
      model: 'qwen3-30b',
    },
  ],
  skills: [
    {
      key: 'help',
      name: 'Help',
      version: 1,
      whenToUse: 'When answering product questions.',
      content: 'Reviewed product facts.',
    },
  ],
  events: [],
  pageCapabilities: [],
};

describe('operator work contracts', () => {
  it('limits Jev to 16 sections without reducing the legacy inline limit', () => {
    const skills = Array.from({ length: 20 }, (_, index) => ({
      ...configuration.skills[0]!,
      key: `section_${index}`,
    }));
    const withSections = (count: number, strategy: 'inline' | 'jev') => ({
      ...configuration,
      skills,
      bots: [
        {
          ...configuration.bots[0]!,
          skillKeys: skills.slice(0, count).map(({ key }) => key),
          knowledgeSelection: {
            strategy,
            mandatorySkillKeys: skills.slice(0, count).map(({ key }) => key),
          },
        },
      ],
    });
    expect(
      operatorWorkConfigurationSchema.safeParse(withSections(16, 'jev'))
        .success,
    ).toBe(true);
    expect(
      operatorWorkConfigurationSchema.safeParse(withSections(17, 'jev'))
        .success,
    ).toBe(false);
    expect(
      operatorWorkConfigurationSchema.safeParse(withSections(20, 'inline'))
        .success,
    ).toBe(true);
  });
  it('accepts optional Gemma/Jev settings while preserving legacy bot configurations', () => {
    expect(operatorWorkConfigurationSchema.parse(configuration)).toEqual(
      configuration,
    );
    const input = {
      ...configuration,
      bots: [
        {
          ...configuration.bots[0],
          model: 'gemma4-26b',
          knowledgeSelection: { strategy: 'jev', mandatorySkillKeys: ['help'] },
        },
      ],
    };
    expect(operatorWorkConfigurationSchema.parse(input)).toEqual(input);
  });
  it('rejects unassigned or duplicated mandatory knowledge and unreviewed models', () => {
    for (const knowledgeSelection of [
      { strategy: 'jev', mandatorySkillKeys: ['other_business.help'] },
      { strategy: 'jev', mandatorySkillKeys: ['help', 'help'] },
      { strategy: 'execute_code', mandatorySkillKeys: ['help'] },
      {
        strategy: 'jev',
        mandatorySkillKeys: ['help'],
        apiKey: 'not-permitted',
      },
    ])
      expect(
        operatorWorkConfigurationSchema.safeParse({
          ...configuration,
          bots: [
            {
              ...configuration.bots[0],
              model: 'gemma4-26b',
              knowledgeSelection,
            },
          ],
        }).success,
      ).toBe(false);
    expect(
      operatorWorkConfigurationSchema.safeParse({
        ...configuration,
        bots: [{ ...configuration.bots[0], model: 'frontier-model' }],
      }).success,
    ).toBe(false);
  });
  it('accepts optional declarative KPIs only for registered unique events', () => {
    const input = {
      ...configuration,
      events: [
        { name: 'item.saved', version: 1, label: 'Saved', properties: [] },
      ],
      kpis: [
        {
          key: 'saves',
          label: 'Saves',
          description: 'Recorded saves.',
          measure: 'event_count',
          eventNames: ['item.saved'],
        },
      ],
    };
    expect(operatorWorkConfigurationSchema.safeParse(input).success).toBe(true);
    for (const kpis of [
      [...input.kpis, ...input.kpis],
      [{ ...input.kpis[0], eventNames: ['unknown'] }],
      [{ ...input.kpis[0], eventNames: ['item.saved', 'item.saved'] }],
      [{ ...input.kpis[0], measure: 'execute_code' }],
    ])
      expect(
        operatorWorkConfigurationSchema.safeParse({ ...input, kpis }).success,
      ).toBe(false);
  });
  it('accepts bounded Business data and refuses duplicate or unassigned definitions', () => {
    expect(operatorWorkConfigurationSchema.parse(configuration)).toEqual(
      configuration,
    );
    expect(
      operatorWorkConfigurationSchema.safeParse({
        ...configuration,
        skills: [],
      }).success,
    ).toBe(false);
    expect(
      operatorWorkConfigurationSchema.safeParse({
        ...configuration,
        bots: [...configuration.bots, ...configuration.bots],
      }).success,
    ).toBe(false);
    expect(
      operatorWorkConfigurationSchema.safeParse({
        ...configuration,
        skills: [{ ...configuration.skills[0], content: 'x'.repeat(20_001) }],
      }).success,
    ).toBe(false);
  });
  it('refuses header injection and executable or secret-bearing configuration extensions', () => {
    expect(
      operatorWorkConfigurationSchema.safeParse({
        ...configuration,
        support: {
          ...configuration.support,
          fromName: 'Support\nBcc: stranger@example.invalid',
        },
      }).success,
    ).toBe(false);
    expect(
      operatorWorkConfigurationSchema.safeParse({
        ...configuration,
        apiKey: 'not-permitted',
      }).success,
    ).toBe(false);
    expect(
      operatorWorkConfigurationSchema.safeParse({
        ...configuration,
        events: [
          {
            name: 'saved',
            version: 1,
            label: 'Saved',
            properties: [],
            validate: 'eval()',
          },
        ],
      }).success,
    ).toBe(false);
  });
  it('validates required declarative properties and refuses unregistered fields and wrong types', () => {
    const descriptors = [
      {
        name: 'outcome',
        type: 'string' as const,
        required: true,
        maxLength: 10,
        allowedValues: ['ready', 'failed'],
      },
      { name: 'count', type: 'number' as const, required: false },
    ];
    expect(
      validateOperationProperties(descriptors, { outcome: 'ready', count: 4 }),
    ).toEqual({ outcome: 'ready', count: 4 });
    for (const input of [
      {},
      { outcome: 'unknown' },
      { outcome: 'ready', count: 'four' },
      { outcome: 'ready', private: 'secret' },
      { outcome: { nested: true } },
    ])
      expect(() => validateOperationProperties(descriptors, input)).toThrow();
  });
});
