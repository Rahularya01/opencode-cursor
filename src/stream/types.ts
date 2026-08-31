import type { McpToolDefinition } from '../proto/agent_pb.js';

export interface OpenAIToolDef {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ParsedImageContent {
  data: Uint8Array;
  mimeType: string;
}

export interface ParsedToolResult {
  content: string;
  isError: boolean;
  images?: ParsedImageContent[];
}

export interface ParsedAssistantTextStep {
  kind: 'assistantText';
  text: string;
}

export interface ParsedThinkingStep {
  kind: 'thinking';
  text: string;
}

export interface ParsedToolCallStep {
  kind: 'toolCall';
  toolCallId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  result?: ParsedToolResult;
}

export type ParsedTurnStep = ParsedAssistantTextStep | ParsedThinkingStep | ParsedToolCallStep;

export interface ParsedTurn {
  userText: string;
  steps: ParsedTurnStep[];
  userImages?: ParsedImageContent[];
}

export interface CursorRequestPayload {
  requestBytes: Uint8Array;
  requestBody: Uint8Array;
  blobStore: Map<string, Uint8Array>;
  mcpTools: McpToolDefinition[];
}

export interface CursorRequestDebugSummary {
  systemPrompt: string;
  selectedImages: Array<{ byteLength: number; mimeType: string }>;
}

export interface PendingExec {
  execId: string;
  execMsgId: number;
  toolCallId: string;
  toolName: string;
  decodedArgs: string;
}
