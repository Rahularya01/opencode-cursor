export const DEFAULT_CONTEXT_WINDOW = 200_000;
export const DEFAULT_MAX_OUTPUT_TOKENS = 64_000;

export function inferCursorContextWindow(id: string, name: string): number {
  const text = `${id} ${name}`.toLowerCase();
  if (/\b1\s*m\b|(?:^|-)1m(?:-|$)/.test(text)) return 1_000_000;
  if (/\b272\s*k\b|(?:^|-)272k(?:-|$)/.test(text)) return 272_000;
  return DEFAULT_CONTEXT_WINDOW;
}

export function inferCursorMaxOutputTokens(id: string, name: string): number {
  const text = `${id} ${name}`.toLowerCase();
  if (/claude-(?:[5-9]|4\.(?:[6-9]|\d{2,}))/.test(text)) return 128_000;
  if (/\b(?:sonnet|opus)\s*(?:[5-9]|4\.(?:[6-9]|\d{2,}))/.test(text)) return 128_000;
  if (/\bgpt-5/.test(text)) return 128_000;
  return DEFAULT_MAX_OUTPUT_TOKENS;
}
