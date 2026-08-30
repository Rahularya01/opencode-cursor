import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  LanguageModelV3Usage,
} from '@ai-sdk/provider';
import { resolveCursorToken } from './auth.js';
import { PROVIDER_ID } from './models.js';

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
 * OpenCode-facing Cursor model boundary. The Connect/protobuf session belongs here so host plugin
 * code never sees a Cursor credential or a protocol frame. The current server rejects requests
 * until the generated Cursor wire schema is linked in the follow-up protocol port.
 */
export class CursorLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'v3' as const;
  readonly provider = PROVIDER_ID;
  readonly supportedUrls = {};

  constructor(
    readonly modelId: string,
    private readonly options: CursorOptions,
  ) {}

  async doGenerate(_options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult> {
    const streamed = await this.doStream(_options);
    let text = '';
    const reader = streamed.stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.type === 'text-delta') text += value.delta;
    }
    return {
      content: text ? [{ type: 'text', text }] : [],
      finishReason: { unified: 'stop', raw: undefined },
      usage: emptyUsage,
      warnings: [],
    };
  }

  async doStream(_options: LanguageModelV3CallOptions): Promise<LanguageModelV3StreamResult> {
    void _options;
    resolveCursorToken(this.options);
    const endpoint =
      this.options.agentBaseURL ??
      process.env.CURSOR_AGENT_URL ??
      'https://agentn.us.api5.cursor.sh';
    const error = new Error(
      `Cursor Connect transport is not linked in this build (endpoint ${new URL(endpoint).origin}).`,
    );
    const stream = new ReadableStream<LanguageModelV3StreamPart>({
      start(controller) {
        controller.enqueue({ type: 'stream-start', warnings: [] });
        controller.enqueue({ type: 'error', error });
        controller.error(error);
      },
    });
    return { stream };
  }
}
