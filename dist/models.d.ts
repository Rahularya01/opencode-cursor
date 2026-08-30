export declare const PROVIDER_ID = "cursor";
export declare const models: {
    readonly 'composer-2': {
        readonly name: "Composer 2";
        readonly context: 200000;
        readonly output: 64000;
    };
    readonly 'composer-1.5': {
        readonly name: "Composer 1.5";
        readonly context: 200000;
        readonly output: 64000;
    };
    readonly 'claude-sonnet-5': {
        readonly name: "Claude Sonnet 5";
        readonly context: 200000;
        readonly output: 128000;
    };
    readonly 'gpt-5.5': {
        readonly name: "GPT-5.5";
        readonly context: 200000;
        readonly output: 128000;
    };
    readonly 'grok-4.5': {
        readonly name: "Grok 4.5";
        readonly context: 200000;
        readonly output: 64000;
    };
};
export declare function isCursorModel(id: string): boolean;
