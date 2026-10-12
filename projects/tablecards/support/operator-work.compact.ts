import type { OperatorWorkConfiguration } from '@bff/contracts';
import { tableCardsCompactSupportSkills } from './knowledge.compact';
import { tableCardsOperatorWorkFullReference } from './operator-work.full-reference';

/**
 * Historical matched experiment: disabled original full-reference bots/bindings,
 * with only compact skill content/versions replaced. Use operator-work.defaults.ts
 * for the current deployable Gemma/Jev definition, not this benchmark input.
 */
export const tableCardsOperatorWorkCompactExperiment: OperatorWorkConfiguration =
  {
    ...tableCardsOperatorWorkFullReference,
    skills: tableCardsCompactSupportSkills,
  };

export default tableCardsOperatorWorkCompactExperiment;
