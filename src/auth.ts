/** Explicit environment credentials take precedence over local application state. */
export function resolveCursorToken(options: { apiKey?: string }): string {
  const token = options.apiKey ?? process.env.CURSOR_ACCESS_TOKEN;
  if (!token) throw new Error('No Cursor credential. Set CURSOR_ACCESS_TOKEN or configure apiKey.');
  return token;
}

export function redactSecrets(value: string): string {
  return value
    .replace(/(Bearer\s+)[^\s]+/gi, '$1[REDACTED]')
    .replace(/\b[a-zA-Z0-9._-]{24,}\b/g, '[REDACTED]');
}
