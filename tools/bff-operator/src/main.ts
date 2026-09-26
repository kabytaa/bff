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
  let command;
  try {
    command = parseCommand(argv);
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
