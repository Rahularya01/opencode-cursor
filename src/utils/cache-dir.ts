import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join as pathJoin } from 'node:path';

let cachedDir: string | undefined;

export function getCacheDir(): string | undefined {
  if (cachedDir !== undefined) return cachedDir || undefined;
  const configured = process.env.OPENCODE_CURSOR_CACHE_DIR?.trim();
  const base =
    configured ||
    pathJoin(
      process.env.XDG_CACHE_HOME?.trim() || pathJoin(homedir(), '.cache'),
      'opencode-cursor',
    );
  try {
    mkdirSync(base, { recursive: true, mode: 0o700 });
    cachedDir = base;
    return base;
  } catch {
    cachedDir = '';
    return undefined;
  }
}

export function cacheFilePath(name: string): string | undefined {
  const dir = getCacheDir();
  return dir ? pathJoin(dir, name) : undefined;
}

export function resetCacheDirForTests(): void {
  cachedDir = undefined;
}
