/** Explicit environment credentials take precedence over local application state. */
export function resolveCursorToken(options) {
    const token = options.apiKey ?? process.env.CURSOR_ACCESS_TOKEN;
    if (!token)
        throw new Error('No Cursor credential. Set CURSOR_ACCESS_TOKEN or configure apiKey.');
    return token;
}
export function redactSecrets(value) {
    return value
        .replace(/(Bearer\s+)[^\s]+/gi, '$1[REDACTED]')
        .replace(/\b[a-zA-Z0-9._-]{24,}\b/g, '[REDACTED]');
}
const LOGIN_URL = 'https://cursor.com/loginDeepControl';
const POLL_URL = 'https://api2.cursor.sh/auth/poll';
const REFRESH_URL = 'https://api2.cursor.sh/auth/exchange_user_api_key';
export async function beginCursorLogin() {
    const verifierBytes = new Uint8Array(96);
    crypto.getRandomValues(verifierBytes);
    const verifier = Buffer.from(verifierBytes).toString('base64url');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = Buffer.from(digest).toString('base64url');
    const uuid = crypto.randomUUID();
    const params = new URLSearchParams({
        challenge,
        uuid,
        mode: 'login',
        redirectTarget: 'cli',
    });
    return {
        url: `${LOGIN_URL}?${params.toString()}`,
        async complete() {
            let delay = 1000;
            let consecutiveErrors = 0;
            for (let attempt = 0; attempt < 150; attempt++) {
                await Bun.sleep(delay);
                try {
                    const response = await fetch(`${POLL_URL}?uuid=${uuid}&verifier=${verifier}`, {
                        signal: AbortSignal.timeout(15_000),
                    });
                    if (response.status === 404) {
                        consecutiveErrors = 0;
                        delay = Math.min(delay * 1.2, 10_000);
                        continue;
                    }
                    if (!response.ok)
                        throw new Error(`Cursor login polling failed (${response.status})`);
                    const data = (await response.json());
                    if (!data.accessToken || !data.refreshToken) {
                        throw new Error('Cursor login returned incomplete credentials');
                    }
                    return {
                        access: data.accessToken,
                        refresh: data.refreshToken,
                        expires: cursorTokenExpiry(data.accessToken),
                    };
                }
                catch (error) {
                    consecutiveErrors++;
                    if (consecutiveErrors >= 3) {
                        throw new Error(`Cursor login failed: ${redactSecrets(String(error))}`);
                    }
                }
            }
            throw new Error('Cursor login timed out');
        },
    };
}
export async function refreshCursorToken(refresh) {
    const response = await fetch(REFRESH_URL, {
        method: 'POST',
        headers: { authorization: `Bearer ${refresh}`, 'content-type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
        throw new Error(`Cursor token refresh failed: ${redactSecrets(await response.text())}`);
    }
    const data = (await response.json());
    if (!data.accessToken)
        throw new Error('Cursor token refresh returned no access token');
    return {
        access: data.accessToken,
        refresh: data.refreshToken || refresh,
        expires: cursorTokenExpiry(data.accessToken),
    };
}
export function cursorTokenExpiry(token) {
    try {
        const payload = token.split('.')[1];
        if (payload) {
            const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
            if (typeof decoded.exp === 'number')
                return decoded.exp * 1000 - 5 * 60 * 1000;
        }
    }
    catch { }
    return Date.now() + 60 * 60 * 1000;
}
