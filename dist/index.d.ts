import type { LanguageModelV3 } from '@ai-sdk/provider';
import { type CursorOptions } from './language-model.js';
export type CreateCursorOptions = CursorOptions;
export declare function createCursor(options?: CreateCursorOptions): {
    languageModel(modelId: string): LanguageModelV3;
};
