import { resolveCursorToken } from './auth.js';
import { PROVIDER_ID } from './models.js';
const emptyUsage = {
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
export class CursorLanguageModel {
    modelId;
    options;
    specificationVersion = 'v3';
    provider = PROVIDER_ID;
    supportedUrls = {};
    constructor(modelId, options) {
        this.modelId = modelId;
        this.options = options;
    }
    async doGenerate(_options) {
        const streamed = await this.doStream(_options);
        let text = '';
        const reader = streamed.stream.getReader();
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                break;
            if (value.type === 'text-delta')
                text += value.delta;
        }
        return {
            content: text ? [{ type: 'text', text }] : [],
            finishReason: { unified: 'stop', raw: undefined },
            usage: emptyUsage,
            warnings: [],
        };
    }
    async doStream(_options) {
        void _options;
        resolveCursorToken(this.options);
        const endpoint = this.options.agentBaseURL ??
            process.env.CURSOR_AGENT_URL ??
            'https://agentn.us.api5.cursor.sh';
        const error = new Error(`Cursor Connect transport is not linked in this build (endpoint ${new URL(endpoint).origin}).`);
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue({ type: 'stream-start', warnings: [] });
                controller.enqueue({ type: 'error', error });
                controller.error(error);
            },
        });
        return { stream };
    }
}
