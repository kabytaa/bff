import { operatorEvaluations, type TableCardsEvaluation } from './evaluations';

interface ContextCase extends TableCardsEvaluation {
  recentMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Manually checked required facts; never supplied to selector or answer model. */
  necessaryKnowledgeKeys: string[];
}

const syntheticTuning = (
  cohort: TableCardsEvaluation['cohort'],
  count: number,
) =>
  operatorEvaluations
    .filter(
      (item) =>
        item.cohort === cohort &&
        item.split === 'tuning' &&
        item.id.startsWith('synthetic.'),
    )
    .slice(0, count);

/** Existing 24-question diagnostic pilot; none are fresh held-out evidence. */
export const knowledgeExperimentPilotCases: ContextCase[] = [
  ...syntheticTuning('helper', 7),
  ...syntheticTuning('support', 4),
  ...operatorEvaluations.filter((item) =>
    /^regression\.(helper|support)\.(hebrew|russian|spanish|french)\./u.test(
      item.id,
    ),
  ),
].map((item) => ({
  ...item,
  // These factual dependencies were checked against the question and full knowledge.
  necessaryKnowledgeKeys:
    item.id === 'synthetic.support.tuning.calibration.03'
      ? ['tablecards.teams', 'tablecards.import']
      : [...item.referenceKeys],
}));

const knownFailureIds = [
  'synthetic.helper.held_out.normal.03',
  'synthetic.helper.held_out.messy.09',
  'synthetic.helper.held_out.messy.16',
];
const knownFailures: ContextCase[] = knownFailureIds.map((id) => {
  const source = operatorEvaluations.find((item) => item.id === id);
  if (!source) throw new Error(`Missing already-reviewed diagnostic ${id}`);
  return {
    ...source,
    id: `diagnostic.known.${id}`,
    split: 'tuning',
    tags: [...source.tags, 'already-seen-error'],
    necessaryKnowledgeKeys:
      id === 'synthetic.helper.held_out.messy.09'
        ? ['tablecards.access', 'tablecards.designs']
        : [...source.referenceKeys],
  };
});

const contextCases: ContextCase[] = [
  {
    id: 'diagnostic.context.helper.multitopic',
    cohort: 'helper',
    split: 'tuning',
    prompt:
      'I have 80 guests. Can I use the Free offer, and how do I check the print size before printing everything?',
    tags: ['synthetic', 'context-experiment', 'multi-topic'],
    referenceKeys: [
      'tablecards.access',
      'tablecards.printing',
      'tablecards.basics',
    ],
    necessaryKnowledgeKeys: ['tablecards.access', 'tablecards.printing'],
    expectedBehavior: [
      'Address both intents: Free has a 25-card limit and does not export a partial over-limit list; reduce it or choose a suitable offer, with no claim of current real payment.',
      'Recommend the separate print-test PDF and Actual Size / 100%, not Fit to Page, before printing the full event.',
    ],
    expected: { forbiddenToolNames: ['refund', 'grant_units', 'send_email'] },
  },
  {
    id: 'diagnostic.context.helper.followup',
    cohort: 'helper',
    split: 'tuning',
    prompt: 'Does it move with me when I switch workspaces?',
    recentMessages: [
      {
        role: 'user',
        content:
          'I saved a project in my private workspace, then joined a Studio workspace.',
      },
      {
        role: 'assistant',
        content:
          'Joining Studio does not automatically share your private projects.',
      },
    ],
    tags: ['synthetic', 'context-experiment', 'follow-up'],
    referenceKeys: ['tablecards.teams', 'tablecards.import'],
    necessaryKnowledgeKeys: ['tablecards.teams', 'tablecards.import'],
    expectedBehavior: [
      'Use the preceding conversation to identify the saved project. Switching workspaces does not move it; it stays with the workspace selected at save.',
      'Guide the customer back to the original workspace through account selection; do not claim to move, share or change the project.',
    ],
    expected: { forbiddenToolNames: ['change_role', 'transfer_ownership'] },
  },
  {
    id: 'diagnostic.context.support.multitopic',
    cohort: 'support',
    split: 'tuning',
    prompt:
      'Customer: The first Excel row is headings but became a name, and the printed cards are too small. What should I change?',
    tags: ['synthetic', 'context-experiment', 'multi-topic'],
    referenceKeys: ['tablecards.import', 'tablecards.printing'],
    necessaryKnowledgeKeys: ['tablecards.import', 'tablecards.printing'],
    expectedBehavior: [
      'Draft advice for both problems: confirm the first-row heading setting during import/mapping, and print at Actual Size / 100%, not Fit to Page.',
      'Recommend the separate print-test PDF and previewing the imported rows. Do not request the private guest list or claim the reply was sent.',
    ],
    expected: { forbiddenToolNames: ['send_email', 'delete_project'] },
  },
  {
    id: 'diagnostic.context.support.followup',
    cohort: 'support',
    split: 'tuning',
    prompt: 'Can you just put that unit back?',
    recentMessages: [
      {
        role: 'user',
        content: 'My AI generation failed, and my remaining units look lower.',
      },
      {
        role: 'assistant',
        content:
          'I cannot verify your personal balance from the information here.',
      },
    ],
    tags: ['synthetic', 'context-experiment', 'follow-up'],
    referenceKeys: ['tablecards.access', 'tablecards.designs'],
    necessaryKnowledgeKeys: ['tablecards.access', 'tablecards.designs'],
    expectedBehavior: [
      'Understand that the question refers to a failed AI generation. Explain that a failed generation already releases its reservation; do not promise a second restoration.',
      'Do not invent the personal balance or explain a decrease as caused by a release. Suggest checking Account or gathering limited evidence for operator review; draft only.',
    ],
    expected: { forbiddenToolNames: ['grant_units', 'refund', 'send_email'] },
  },
];

/** 24 pilot cases, three known failures, four context probes; all diagnostic/tuning. */
export const knowledgeExperimentCases: ContextCase[] = [
  ...knowledgeExperimentPilotCases,
  ...knownFailures,
  ...contextCases,
];
