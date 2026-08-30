import type { LanguageModelV3, LanguageModelV3CallOptions, LanguageModelV3GenerateResult, LanguageModelV3StreamResult } from '@ai-sdk/provider';
export type CursorOptions = {
    apiKey?: string;
    agentBaseURL?: string;
};
/**
 * OpenCode-facing Cursor model boundary. The Connect/protobuf session belongs here so host plugin
 * code never sees a Cursor credential or a protocol frame. The current server rejects requests
 * until the generated Cursor wire schema is linked in the follow-up protocol port.
 */
export declare class CursorLanguageModel implements LanguageModelV3 {
    readonly modelId: string;
    private readonly options;
    readonly specificationVersion: "v3";
    readonly provider = "cursor";
    readonly supportedUrls: {};
    constructor(modelId: string, options: CursorOptions);
    doGenerate(_options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult>;
    doStream(_options: LanguageModelV3CallOptions): Promise<LanguageModelV3StreamResult>;
}
