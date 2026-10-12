/** Browser-safe protocol only: never import the server provider entry point here. */
export type { UIMessage, ModelMessage, ToolSet } from 'ai';

export interface AssistantContext {
  accountId: string | null;
  pageId: string;
  revision: string;
}

export interface AssistantToolRequest {
  toolCallId: string;
  toolName: string;
  input: unknown;
  context: AssistantContext;
}

export interface AssistantToolResult {
  toolCallId: string;
  context: AssistantContext;
  output?: unknown;
  error?: string;
}

export const assistantLimits = Object.freeze({
  maxSteps: 4,
  maxOutputTokens: 1200,
  maxInputCharacters: 24_000,
  maxToolResultCharacters: 8000,
  maxMessages: 40,
});

export function sameAssistantContext(
  a: AssistantContext,
  b: AssistantContext,
): boolean {
  return (
    a.accountId === b.accountId &&
    a.pageId === b.pageId &&
    a.revision === b.revision
  );
}

/** Correlation is necessary; the caller still authenticates and authorizes the request. */
export function acceptsAssistantToolResult(
  pending: AssistantToolRequest,
  result: AssistantToolResult,
  current: AssistantContext,
): boolean {
  return (
    pending.toolCallId === result.toolCallId &&
    sameAssistantContext(pending.context, current) &&
    sameAssistantContext(result.context, current) &&
    JSON.stringify(result.output ?? result.error ?? '').length <=
      assistantLimits.maxToolResultCharacters
  );
}
