import type { LanguageModelV3CallOptions, LanguageModelV3FunctionTool } from '@ai-sdk/provider';
import type { OpenAIToolDef, ParsedTurn, ParsedTurnStep } from './types.js';

function toolOutputText(output: unknown): string {
  if (!output || typeof output !== 'object') return String(output ?? '');
  const record = output as { type?: string; value?: unknown };
  if (record.type === 'text' && typeof record.value === 'string') return record.value;
  if (record.type === 'json') {
    try {
      return JSON.stringify(record.value);
    } catch {
      return String(record.value);
    }
  }
  if (typeof record.value === 'string') return record.value;
  try {
    return JSON.stringify(output);
  } catch {
    return String(output);
  }
}

export function toolsFromCall(options: LanguageModelV3CallOptions): OpenAIToolDef[] {
  return (options.tools ?? [])
    .filter((tool): tool is LanguageModelV3FunctionTool => tool.type === 'function')
    .map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema as Record<string, unknown>,
      },
    }));
}

export function promptToCursorTurns(options: LanguageModelV3CallOptions): {
  systemPrompt: string;
  userText: string;
  turns: ParsedTurn[];
} {
  const system: string[] = [];
  const turns: ParsedTurn[] = [];
  let current: ParsedTurn | undefined;

  for (const message of options.prompt) {
    if (message.role === 'system') {
      system.push(message.content);
      continue;
    }
    if (message.role === 'user') {
      if (current) turns.push(current);
      current = {
        userText: message.content
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join('\n'),
        steps: [],
      };
      continue;
    }
    if (!current) current = { userText: '', steps: [] };
    if (message.role === 'assistant') {
      for (const part of message.content) {
        if (part.type === 'text' && part.text.trim()) {
          current.steps.push({ kind: 'assistantText', text: part.text });
        } else if (part.type === 'reasoning' && part.text.trim()) {
          current.steps.push({ kind: 'thinking', text: part.text });
        } else if (part.type === 'tool-call') {
          const args =
            typeof part.input === 'object' && part.input
              ? (part.input as Record<string, unknown>)
              : {};
          current.steps.push({
            kind: 'toolCall',
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            arguments: args,
          });
        }
      }
      continue;
    }
    if (message.role === 'tool') {
      for (const part of message.content) {
        if (part.type !== 'tool-result') continue;
        const existing = [...current.steps]
          .reverse()
          .find(
            (step): step is Extract<ParsedTurnStep, { kind: 'toolCall' }> =>
              step.kind === 'toolCall' && step.toolCallId === part.toolCallId && !step.result,
          );
        const result = { content: toolOutputText(part.output), isError: false };
        if (existing) existing.result = result;
        else {
          current.steps.push({
            kind: 'toolCall',
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            arguments: {},
            result,
          });
        }
      }
    }
  }

  if (current && current.steps.length > 0) turns.push(current);
  const userText =
    current && current.steps.length === 0 ? current.userText || 'Continue.' : 'Continue.';

  return { systemPrompt: system.join('\n\n'), userText, turns };
}
