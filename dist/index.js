import { CursorLanguageModel } from './language-model.js';
export function createCursor(options = {}) {
    return {
        languageModel(modelId) {
            return new CursorLanguageModel(modelId, options);
        },
    };
}
