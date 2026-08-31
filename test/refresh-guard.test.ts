import { expect, test } from 'bun:test';
import {
  isRefreshKnownBad,
  markRefreshFailed,
  markRefreshSucceeded,
  resetRefreshGuardForTests,
} from '../src/auth/refresh-guard.js';
import { resetCacheDirForTests } from '../src/utils/cache-dir.js';

test('backs off a failed Cursor refresh token', () => {
  resetCacheDirForTests();
  resetRefreshGuardForTests();
  const token = 'refresh-token-for-guard-test-0001';
  expect(isRefreshKnownBad(token)).toBe(false);
  markRefreshFailed(token);
  expect(isRefreshKnownBad(token)).toBe(true);
  markRefreshSucceeded(token);
  expect(isRefreshKnownBad(token)).toBe(false);
});
