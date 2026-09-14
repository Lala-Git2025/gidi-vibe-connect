import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withTimeout, RequestTimeoutError, REQUEST_TIMEOUT_MS } from './withTimeout';

describe('withTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('passes through the value when the request wins', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 'test');
    expect(result).toBe('ok');
  });

  it('propagates a rejection unchanged rather than masking it as a timeout', async () => {
    const boom = new Error('network refused');
    await expect(withTimeout(Promise.reject(boom), 'test')).rejects.toThrow('network refused');
  });

  // The whole point of the helper: supabase-js never times out on its own, so
  // a stalled request used to hang forever and strand the caller's `finally`.
  it('rejects a request that never settles', async () => {
    const neverSettles = new Promise<string>(() => {});
    const pending = withTimeout(neverSettles, 'profile', 5000);
    const assertion = expect(pending).rejects.toBeInstanceOf(RequestTimeoutError);

    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });

  it('names the operation in the timeout error so logs are diagnosable', async () => {
    const pending = withTimeout(new Promise<string>(() => {}), 'subscription', 1000);
    const assertion = expect(pending).rejects.toThrow(/subscription timed out after 1000ms/);

    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('does not fire the timer after the request already resolved', async () => {
    const result = await withTimeout(Promise.resolve('fast'), 'test', 1000);
    expect(result).toBe('fast');

    // If the timer were still armed it would reject unhandled here.
    await vi.advanceTimersByTimeAsync(5000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('defaults to a bounded timeout rather than waiting indefinitely', () => {
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
    expect(REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });
});
