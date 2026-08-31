/** Explicit environment credentials take precedence over local application state. */
export declare function resolveCursorToken(options: {
    apiKey?: string;
}): string;
export declare function redactSecrets(value: string): string;
export type CursorOAuthCredentials = {
    access: string;
    refresh: string;
    expires: number;
};
export declare function beginCursorLogin(): Promise<{
    url: string;
    complete(): Promise<CursorOAuthCredentials>;
}>;
export declare function refreshCursorToken(refresh: string): Promise<CursorOAuthCredentials>;
export declare function cursorTokenExpiry(token: string): number;
