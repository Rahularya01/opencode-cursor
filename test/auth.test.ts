import { expect, test } from 'bun:test';
import { cursorTokenExpiry, redactSecrets } from '../src/auth.js';

test('redacts authorization values', () => {
  expect(redactSecrets('Authorization: Bearer abcdefghijklmnopqrstuvwxyz')).toContain('[REDACTED]');
});

test('uses JWT expiry with a refresh margin', () => {
  const payload = Buffer.from(JSON.stringify({ exp: 2_000_000_000 })).toString('base64url');
  expect(cursorTokenExpiry(`x.${payload}.x`)).toBe(2_000_000_000_000 - 5 * 60 * 1000);
});
