#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  buildConvexInvocation,
  classifyConvexFailure,
  CliError,
  HELP,
  parseCommand,
  type ConvexInvocation,
} from './cli';
import { resolveCustomerAuthConfigurationArgs } from './customerAuthConfiguration';
import { resolveOperatorWorkArgs } from './operatorWorkConfiguration';
import { evaluationExitCode, runEvaluationCommand } from './operatorEvaluation';
import {
  knowledgeExperimentExitCode,
  runKnowledgeExperimentCommand,
} from './operatorKnowledgeExperiment';
import { runGenerationControlExperimentCommand } from './operatorGenerationExperiment';
import { isSupportCommand, runSupportCommand } from './supportOperations';

const execFileAsync = promisify(execFile);

export interface InvocationResult {
  stdout: string;
}

export type InvocationRunner = (
  invocation: ConvexInvocation,
) => Promise<InvocationResult>;

async function invokeConvex(
  invocation: ConvexInvocation,
): Promise<InvocationResult> {
  return await execFileAsync(invocation.executable, invocation.args, {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 1024 * 1024,
  });
}

export async function run(
  argv: string[],
  invoke: InvocationRunner = invokeConvex,
): Promise<number> {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv;
  if (isSupportCommand(normalizedArgv[0]))
    return await runSupportCommand(normalizedArgv);
  if (normalizedArgv[0] === 'experiment-operator-knowledge') {
    try {
      const result = await runKnowledgeExperimentCommand(
        normalizedArgv.slice(1),
      );
      console.info(
        `Knowledge experiment ${result.report.mode} UNJUDGED capture saved to ${result.jsonPath} and ${result.markdownPath}; live quality remains unverified.`,
      );
      return knowledgeExperimentExitCode(result.report);
    } catch {
      console.error(
        'Knowledge experiment refused or failed. Check matched fixtures/configuration, mandatory knowledge and the combined capped-provider allowance; private provider output was withheld.',
      );
      return 2;
    }
  }
  if (normalizedArgv[0] === 'experiment-generation-control') {
    try {
      const result = await runGenerationControlExperimentCommand(
        normalizedArgv.slice(1),
      );
      console.info(
        `Generation control UNJUDGED capture saved to ${result.jsonPath} with ${result.report.usage.attemptedCalls} attempted calls and ${result.batchPaths.length} blinded review packet(s).`,
      );
      return result.report.usage.failedCalls ? 1 : 0;
    } catch {
      console.error(
        'Generation control experiment refused or failed. Verify matched fixtures/configuration, explicit authority, enabled development route and verified caps; private provider output was withheld.',
      );
      return 2;
    }
  }
  if (normalizedArgv[0] === 'evaluate-operator-work') {
    try {
      const result = await runEvaluationCommand(normalizedArgv.slice(1));
      console.info(
        `Evaluation ${result.report.mode} ${result.report.captureOnly ? 'UNJUDGED answer capture' : 'diagnostics'} saved to ${result.jsonPath} and ${result.markdownPath}; live quality remains unverified.`,
      );
      return evaluationExitCode(result.report);
    } catch {
      console.error(
        'Evaluation refused or failed. Verify fixture/defaults/report paths and explicit capped-provider authority; no private provider output was printed.',
      );
      return 2;
    }
  }
  let command;
  try {
    command = parseCommand(
      await resolveCustomerAuthConfigurationArgs(
        await resolveOperatorWorkArgs(argv),
      ),
    );
  } catch (error) {
    if (error instanceof CliError) {
      const output = error.message === HELP ? console.info : console.error;
      output(error.message);
      return error.message === HELP ? 0 : 2;
    }
    console.error('Unable to parse operator command.');
    return 2;
  }

  console.info(
    `Running ${command.name} against BFF deployment ${command.deployment}`,
  );
  const invocation = buildConvexInvocation(command);

  try {
    const { stdout } = await invoke(invocation);
    console.info(stdout.trim());
    return 0;
  } catch (error) {
    const failure = classifyConvexFailure(error);
    console.error(failure.message);
    return failure.exitCode;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await run(process.argv.slice(2));
}
