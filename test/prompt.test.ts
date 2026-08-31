import { expect, test } from 'bun:test';
import { promptToCursorTurns } from '../src/stream/prompt.js';

test('maps OpenCode history into Cursor turns', () => {
  const result = promptToCursorTurns({
    prompt: [
      { role: 'system', content: 'sys' },
      { role: 'user', content: [{ type: 'text', text: 'first' }] },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'ok' },
          { type: 'tool-call', toolCallId: '1', toolName: 'read', input: { path: 'a.ts' } },
        ],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: '1',
            toolName: 'read',
            output: { type: 'text', value: 'file' },
          },
        ],
      },
      { role: 'user', content: [{ type: 'text', text: 'next' }] },
    ],
  });
  expect(result.systemPrompt).toBe('sys');
  expect(result.userText).toBe('next');
  expect(result.turns).toHaveLength(1);
  expect(result.turns[0]?.steps.some((step) => step.kind === 'toolCall')).toBe(true);
});
