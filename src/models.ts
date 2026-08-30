export const PROVIDER_ID = 'cursor';

export const models = {
  'composer-2': { name: 'Composer 2', context: 200_000, output: 64_000 },
  'composer-1.5': { name: 'Composer 1.5', context: 200_000, output: 64_000 },
  'claude-sonnet-5': { name: 'Claude Sonnet 5', context: 200_000, output: 128_000 },
  'gpt-5.5': { name: 'GPT-5.5', context: 200_000, output: 128_000 },
  'grok-4.5': { name: 'Grok 4.5', context: 200_000, output: 64_000 },
} as const;

export function isCursorModel(id: string): boolean {
  return id in models;
}
