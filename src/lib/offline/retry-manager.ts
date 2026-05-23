export const MAX_SYNC_ATTEMPTS = 6;

export function getRetryDelayMs(attempts: number) {
  const base = Math.min(30_000, 750 * 2 ** Math.max(0, attempts - 1));
  const jitter = typeof crypto !== "undefined" ? crypto.getRandomValues(new Uint32Array(1))[0] % 350 : 0;
  return base + jitter;
}

export function getNextRetryAt(attempts: number) {
  return new Date(Date.now() + getRetryDelayMs(attempts)).toISOString();
}

export function shouldRetry(attempts: number) {
  return attempts < MAX_SYNC_ATTEMPTS;
}

