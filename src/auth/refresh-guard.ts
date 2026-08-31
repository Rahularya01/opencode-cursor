import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { cacheFilePath } from '../utils/cache-dir.js';

export const REFRESH_FAILURE_TTL_MS = 10 * 60 * 1000;
const CACHE_FILE = 'refresh-failures.json';
type FailureMap = Record<string, number>;
let failures: FailureMap | undefined;

function tokenKey(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex').slice(0, 16);
}

function load(): FailureMap {
  if (failures) return failures;
  failures = {};
  const path = cacheFilePath(CACHE_FILE);
  if (!path) return failures;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const now = Date.now();
      for (const [key, expiresAt] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof expiresAt === 'number' && expiresAt > now) failures[key] = expiresAt;
      }
    }
  } catch {
    /* missing cache is fine */
  }
  return failures;
}

function persist(map: FailureMap): void {
  const path = cacheFilePath(CACHE_FILE);
  if (!path) return;
  try {
    writeFileSync(path, JSON.stringify(map), { mode: 0o600 });
  } catch {
    /* best effort */
  }
}

export function isRefreshKnownBad(refreshToken: string): boolean {
  const map = load();
  const expiresAt = map[tokenKey(refreshToken)];
  if (expiresAt === undefined) return false;
  if (Date.now() >= expiresAt) {
    delete map[tokenKey(refreshToken)];
    persist(map);
    return false;
  }
  return true;
}

export function markRefreshFailed(refreshToken: string, ttlMs = REFRESH_FAILURE_TTL_MS): void {
  const map = load();
  map[tokenKey(refreshToken)] = Date.now() + ttlMs;
  persist(map);
}

export function markRefreshSucceeded(refreshToken: string): void {
  const map = load();
  if (map[tokenKey(refreshToken)] === undefined) return;
  delete map[tokenKey(refreshToken)];
  persist(map);
}

export function resetRefreshGuardForTests(): void {
  failures = undefined;
}
