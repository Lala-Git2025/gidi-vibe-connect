/**
 * supabase-js sets no request timeout, so a stalled connection produces a
 * promise that never settles. Any `finally` waiting on it never runs, which is
 * how a loading flag gets stuck true and the layout spins forever.
 *
 * Wrapping a request guarantees it settles: either the request wins, or the
 * timer rejects and the caller's error path takes over.
 */
export const REQUEST_TIMEOUT_MS = 8_000;

export class RequestTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = 'RequestTimeoutError';
  }
}

export function withTimeout<T>(
  work: PromiseLike<T>,
  label: string,
  ms: number = REQUEST_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    Promise.resolve(work),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new RequestTimeoutError(label, ms)), ms);
    }),
    // Clearing the timer keeps a resolved request from holding the event loop.
  ]).finally(() => clearTimeout(timer)) as Promise<T>;
}
