import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamResult,
  LanguageModelV3Usage,
} from '@ai-sdk/provider';
import { resolveCursorToken } from './auth.js';
import { PROVIDER_ID } from './models.js';
import { runCursorConnectStream } from './stream/run.js';

export type CursorOptions = { apiKey?: string; agentBaseURL?: string };
const emptyUsage: LanguageModelV3Usage = {
  inputTokens: {
    total: undefined,
    noCache: undefined,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: undefined, text: undefined, reasoning: undefined },
};

/**
 * OpenCode-facing Cursor model boundary. Connect/protobuf stays inside this class so host
 * plugin code never sees a Cursor credential or a protocol frame.
 */
export class CursorLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'v3' as const;
  readonly provider = PROVIDER_ID;
  readonly supportedUrls = {};

  constructor(
    readonly modelId: string,
    private readonly options: CursorOptions,
  ) {}

  async doGenerate(options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult> {
    const streamed = await this.doStream(options);
    let text = '';
    const toolCalls: LanguageModelV3GenerateResult['content'] = [];
    let finishReason: LanguageModelV3GenerateResult['finishReason'] = {
      unified: 'stop',
      raw: undefined,
    };
    let usage = emptyUsage;
    const reader = streamed.stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.type === 'text-delta') text += value.delta;
      if (value.type === 'tool-call') toolCalls.push(value);
      if (value.type === 'finish') {
        finishReason = value.finishReason;
        usage = value.usage;
      }
    }
    return {
      content: [...(text ? [{ type: 'text' as const, text }] : []), ...toolCalls],
      finishReason,
      usage,
      warnings: [],
    };
  }

  async doStream(options: LanguageModelV3CallOptions): Promise<LanguageModelV3StreamResult> {
    const accessToken = resolveCursorToken(this.options);
    const stream = runCursorConnectStream({
      accessToken,
      modelId: this.modelId,
      options,
    });
    return { stream };
  }
}
