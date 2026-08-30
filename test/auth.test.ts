import { expect, test } from 'bun:test';
import { redactSecrets } from '../src/auth.js';

test('redacts authorization values', () => {
  expect(redactSecrets('Authorization: Bearer abcdefghijklmnopqrstuvwxyz')).toContain('[REDACTED]');
});
