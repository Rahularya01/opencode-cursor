import type { CursorRequestDebugSummary } from './types.js';

export const requestDebugByBody = new WeakMap<Uint8Array, CursorRequestDebugSummary>();

export function debugLog(event: string, data?: Record<string, unknown>): void {
  void event;
  void data;
}

export function lifecycleLog(event: string, data?: Record<string, unknown>): void {
  void event;
  void data;
}
