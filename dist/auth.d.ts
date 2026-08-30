/** Explicit environment credentials take precedence over local application state. */
export declare function resolveCursorToken(options: {
    apiKey?: string;
}): string;
export declare function redactSecrets(value: string): string;
