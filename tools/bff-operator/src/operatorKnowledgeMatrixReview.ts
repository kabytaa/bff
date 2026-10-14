import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  createAgentReviewBatch,
  validateAgentReviewBatch,
} from './operatorAgentReview';
import type { AgentReviewSource } from './operatorAgentReview';
import {
  judgeCalibrationSchema,
  scorecardPasses,
} from './operatorEvaluationJudge';
import type { EvaluationReference } from './operatorEvaluationJudge';

/** Authored Business controls stay outside the blind packet and never reach answer models. */
export function prepareMatrixControlBatch(
  cases: readonly unknown[],
  references: readonly EvaluationReference[],
  batchId: string,
) {
  const parsed = judgeCalibrationSchema.parse(cases);
  const sources: AgentReviewSource[] = parsed
    .filter((item) => item.answer.trim())
    .map((item) => ({
      sourceId: item.id,
      input: {
        cohort: item.cohort,
        question: item.prompt,
        answer: item.answer,
        expectedBehavior: item.expectedBehavior,
        references: item.referenceKeys.map((key) => {
          const reference = references.find((value) => value.key === key);
          if (!reference) throw new Error('Control reference is missing');
          return reference;
        }),
        toolNames: [],
        toolTrace: [],
      },
      checks: [{ dimension: 'nonempty', passed: true }],
    }));
  const batch = createAgentReviewBatch(sources, batchId, `${batchId}:controls`);
  return { ...batch, controls: parsed };
}

export async function saveMatrixControlBatch(
  directory: string,
  batch: ReturnType<typeof prepareMatrixControlBatch>,
) {
  await mkdir(resolve(directory), { recursive: true });
  for (const [suffix, value] of Object.entries(batch))
    await writeFile(
      resolve(directory, `${batch.packet.batchId}-${suffix}.json`),
      `${JSON.stringify(value, null, 2)}\n`,
      { flag: 'wx' },
    );
}

/** Immutable raw grades are retained beside an independently validated result. */
export async function validateMatrixReviewFiles(
  directory: string,
  prefix: string,
) {
  if (!/^[a-zA-Z0-9_.-]+$/u.test(prefix))
    throw new Error('Invalid review prefix');
  const read = async (suffix: string) =>
    JSON.parse(
      await readFile(resolve(directory, `${prefix}-${suffix}.json`), 'utf8'),
    );
  const result = validateAgentReviewBatch(
    await read('packet'),
    await read('mapping'),
    await read('astra'),
  );
  await writeFile(
    resolve(directory, `${prefix}-validation.json`),
    `${JSON.stringify(result, null, 2)}\n`,
    { flag: 'wx' },
  );
  return result;
}

export function matrixControlAgreement(
  batch: ReturnType<typeof prepareMatrixControlBatch>,
  validation: ReturnType<typeof validateAgentReviewBatch>,
) {
  const outcomes = validation.results.map((result) => {
    const control = batch.controls.find((item) => item.id === result.sourceId)!;
    const scored =
      result.status === 'reviewed' && result.scorecard?.status === 'scored';
    const actualPass = !!result.scorecard && scorecardPasses(result.scorecard);
    const codes =
      result.scorecard?.criticalFailures.map((item) => item.code) ?? [];
    const taxonomyMatches = control.expectedCriticalCodes.every((code) =>
      codes.includes(code),
    );
    const dimensionsMatch = (control.expectedFailingDimensions ?? []).every(
      (key) => result.scorecard?.scores && result.scorecard.scores[key] < 2,
    );
    return {
      id: result.sourceId,
      expectedPass: control.expectedPass,
      actualPass,
      matches:
        !!scored &&
        actualPass === control.expectedPass &&
        taxonomyMatches &&
        dimensionsMatch,
      taxonomyMatches,
      dimensionsMatch,
    };
  });
  return {
    method: 'supervised-subscription-controls',
    apiJudgeCalibrated: false,
    matched: outcomes.filter((item) => item.matches).length,
    total: outcomes.length,
    deterministicBlankChecks: batch.controls
      .filter((item) => !item.answer.trim())
      .map((item) => ({
        id: item.id,
        expectedPass: item.expectedPass,
        actualPass: false,
        matches: !item.expectedPass,
      })),
    outcomes,
  };
}

export async function saveMatrixControlAgreement(
  directory: string,
  batch: ReturnType<typeof prepareMatrixControlBatch>,
  validation: ReturnType<typeof validateAgentReviewBatch>,
) {
  const agreement = matrixControlAgreement(batch, validation);
  await writeFile(
    resolve(directory, `${batch.packet.batchId}-agreement.json`),
    `${JSON.stringify(agreement, null, 2)}\n`,
    { flag: 'wx' },
  );
  return agreement;
}
