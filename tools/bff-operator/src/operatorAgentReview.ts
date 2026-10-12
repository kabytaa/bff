import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  judgeData,
  judgeInstructions,
  judgeRubricVersion,
  parseJudgeScorecard,
  scorecardPasses,
  type JudgeInput,
  type JudgeScorecard,
} from './operatorEvaluationJudge';

export interface AgentReviewSource {
  /** Kept in the local mapping, never in the blinded reviewer packet. */
  sourceId: string;
  input: JudgeInput;
  checks: Array<{ dimension: string; passed: boolean }>;
  /** Retrieval strategy/versions stay in local provenance, not semantic packets. */
  hiddenKnowledgeToolEvidence?: { toolNames: string[]; toolTrace: unknown[] };
}

export interface AgentReviewPacket {
  version: 1;
  batchId: string;
  rubricVersion: string;
  instructions: string;
  items: Array<{ id: string; data: ReturnType<typeof judgeData> }>;
}

export interface AgentReviewMapping {
  batchId: string;
  packetHash: string;
  items: Array<AgentReviewSource & { id: string }>;
}

export interface AgentReviewRecord {
  id: string;
  sourceId: string;
  status: 'reviewed' | 'unsure' | 'invalid';
  checksPassed: boolean;
  passed: boolean;
  scorecard?: JudgeScorecard;
  error?: string;
}

const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** The reviewer gets no candidate names, prices, timing, old grades or split labels. */
export function createAgentReviewBatch(
  sources: readonly AgentReviewSource[],
  batchId: string = randomUUID(),
  shuffleSalt: string = randomUUID(),
): { packet: AgentReviewPacket; mapping: AgentReviewMapping } {
  if (
    !sources.length ||
    sources.length > 32 ||
    new Set(sources.map(({ sourceId }) => sourceId)).size !== sources.length ||
    sources.some(
      ({ sourceId, input }) =>
        !sourceId ||
        !input.answer.trim() ||
        !input.references.length ||
        !input.expectedBehavior.length,
    )
  )
    throw new Error('Invalid or incomplete agent review sources');
  const items = sources
    .map((source) => ({ source, sort: digest([shuffleSalt, source.sourceId]) }))
    .sort((a, b) => a.sort.localeCompare(b.sort))
    .map(({ source }, index) => ({
      ...structuredClone(source),
      id: `review-${String(index + 1).padStart(3, '0')}`,
    }));
  const packet: AgentReviewPacket = {
    version: 1,
    batchId,
    rubricVersion: judgeRubricVersion,
    instructions: judgeInstructions,
    items: items.map(({ id, input }) => ({ id, data: judgeData(input) })),
  };
  return {
    packet,
    mapping: { batchId, packetHash: digest(packet), items },
  };
}

const gradesSchema = z
  .object({
    version: z.literal(1),
    batchId: z.string().min(1),
    reviewer: z.string().min(1).max(100),
    items: z
      .array(
        z
          .object({
            id: z.string().regex(/^review-\d{3}$/u),
            scorecard: z.unknown(),
          })
          .strict(),
      )
      .min(1)
      .max(32),
  })
  .strict();

/** Invalid or unsure judgments never count as acceptable answers. No API gate changes. */
export function validateAgentReviewBatch(
  packet: AgentReviewPacket,
  mapping: AgentReviewMapping,
  raw: unknown,
) {
  const grades = gradesSchema.parse(raw);
  const expectedIds = new Set(packet.items.map(({ id }) => id));
  if (
    packet.rubricVersion !== judgeRubricVersion ||
    packet.instructions !== judgeInstructions ||
    mapping.packetHash !== digest(packet) ||
    grades.batchId !== packet.batchId ||
    mapping.batchId !== packet.batchId ||
    grades.items.length !== expectedIds.size ||
    mapping.items.length !== expectedIds.size ||
    new Set(grades.items.map(({ id }) => id)).size !== expectedIds.size ||
    new Set(mapping.items.map(({ id }) => id)).size !== expectedIds.size ||
    grades.items.some(({ id }) => !expectedIds.has(id)) ||
    mapping.items.some(({ id, input }) => {
      const item = packet.items.find((item) => item.id === id);
      return !item || digest(item.data) !== digest(judgeData(input));
    })
  )
    throw new Error('Agent review identity, content or completeness mismatch');
  const results: AgentReviewRecord[] = mapping.items.map((item) => {
    const grade = grades.items.find((grade) => grade.id === item.id)!;
    const checksPassed = item.checks.every((check) => check.passed);
    try {
      const scorecard = parseJudgeScorecard(
        JSON.stringify(grade.scorecard),
        item.input,
      );
      return {
        id: item.id,
        sourceId: item.sourceId,
        status: scorecard.status === 'scored' ? 'reviewed' : 'unsure',
        checksPassed,
        passed: checksPassed && scorecardPasses(scorecard),
        scorecard,
      };
    } catch {
      return {
        id: item.id,
        sourceId: item.sourceId,
        status: 'invalid',
        checksPassed,
        passed: false,
        error: 'Invalid reviewer schema, evidence or score invariants',
      };
    }
  });
  return {
    version: 1 as const,
    reviewMethod: 'blinded-supervised-sub-agent' as const,
    reviewer: grades.reviewer,
    batchId: packet.batchId,
    packetHash: mapping.packetHash,
    rubricVersion: judgeRubricVersion,
    qualityVerified: false as const,
    apiJudgeCalibrated: false as const,
    primaryCrossCheckRequired: true as const,
    subscriptionReviewCost: 'unmeasured' as const,
    results,
    accepted: results.filter((item) => item.passed).length,
    invalid: results.filter((item) => item.status === 'invalid').length,
    unsure: results.filter((item) => item.status === 'unsure').length,
  };
}
