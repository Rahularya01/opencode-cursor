import type { LanguageModelV3 } from '@ai-sdk/provider';
import { CursorLanguageModel, type CursorOptions } from './language-model.js';

export type CreateCursorOptions = CursorOptions;
export function createCursor(options: CreateCursorOptions = {}) {
  return {
    languageModel(modelId: string): LanguageModelV3 {
      return new CursorLanguageModel(modelId, options);
    },
  };
}
