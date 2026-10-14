import type { OperatorWorkConfiguration } from '@bff/contracts';
import { tableCardsCompactSupportSkills } from './support/knowledge.compact';
import { tableCardsOperatorWorkFullReference } from './support/operator-work.full-reference';

/** Disabled Gemma/Jev definition. Bind a real environment before revision-checked activation. */
export const tableCardsOperatorWorkDefaults: OperatorWorkConfiguration = {
  ...tableCardsOperatorWorkFullReference,
  bots: tableCardsOperatorWorkFullReference.bots.map((bot) => ({
    ...bot,
    version: 6,
    model: 'gemma4-26b',
    knowledgeSelection: {
      strategy: 'jev',
      mandatorySkillKeys: ['tablecards.basics', 'tablecards.contact'],
    },
  })),
  skills: tableCardsCompactSupportSkills,
};

export function createTableCardsOperatorWorkConfiguration(bindings: {
  enabled: boolean;
  contactEmail: string;
  fromEmail: string;
  receivingAddress: string;
  replyDomain: string;
  helpUrl: string;
}): OperatorWorkConfiguration {
  return {
    ...tableCardsOperatorWorkDefaults,
    enabled: bindings.enabled,
    presentation: {
      ...tableCardsOperatorWorkDefaults.presentation,
      contactEmail: bindings.contactEmail,
      helpUrl: bindings.helpUrl,
    },
    support: {
      ...tableCardsOperatorWorkDefaults.support,
      fromEmail: bindings.fromEmail,
      receivingAddress: bindings.receivingAddress,
      replyDomain: bindings.replyDomain,
    },
  };
}

export default tableCardsOperatorWorkDefaults;
