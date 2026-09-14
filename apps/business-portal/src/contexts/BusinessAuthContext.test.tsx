import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * Regression tests for the infinite-spinner class of bug.
 *
 * DashboardLayout gates on `loading || (!profile && profileFetching)`. Four
 * separate production incidents came from one of those flags never clearing —
 * an unhandled refreshSession rejection, a hung profile fetch, a safety timeout
 * that only reset `loading`. These assert the contract the layout depends on:
 * whatever the network does, both flags settle.
 */

// vi.mock is hoisted above every import, so anything its factory closes over
// must be built inside vi.hoisted rather than as plain top-level consts.
const { mockAuth, mockFrom, setTableResult } = vi.hoisted(() => {
  const auth = {
    refreshSession: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  };

  // Each test swaps this to decide what a terminal query call does.
  let result: () => Promise<unknown> = () => Promise.resolve({ data: null, error: null });

  // Chainable PostgREST stub: builder methods return `this`, terminal calls
  // resolve with whatever the current test queued.
  const makeQueryBuilder = () => {
    const builder: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'upsert']) {
      builder[m] = vi.fn(() => builder);
    }
    builder.maybeSingle = vi.fn(() => result());
    builder.single = vi.fn(() => result());
    return builder;
  };

  return {
    mockAuth: auth,
    mockFrom: vi.fn(() => makeQueryBuilder()),
    setTableResult: (fn: () => Promise<unknown>) => {
      result = fn;
    },
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: { auth: mockAuth, from: mockFrom },
}));

import { BusinessAuthProvider, useBusinessAuth } from './BusinessAuthContext';

const SESSION = { user: { id: 'user-1', email: 'owner@example.com' } };
const PROFILE = { user_id: 'user-1', full_name: 'Test Owner', role: 'Business Owner' };

/** Surfaces the flags the layout actually gates on. */
function Probe() {
  const { loading, profileFetching, profile, user, profileLoadFailed } = useBusinessAuth();
  const spinnerShowing = loading || (!profile && profileFetching);
  return (
    <div>
      <span data-testid="spinner">{spinnerShowing ? 'spinning' : 'settled'}</span>
      <span data-testid="fetching">{String(profileFetching)}</span>
      <span data-testid="profile">{profile ? profile.full_name : 'none'}</span>
      <span data-testid="user">{user ? user.id : 'none'}</span>
      <span data-testid="failed">{String(profileLoadFailed)}</span>
    </div>
  );
}

const renderProvider = () =>
  render(
    <BusinessAuthProvider>
      <Probe />
    </BusinessAuthProvider>,
  );

beforeEach(() => {
  mockAuth.refreshSession.mockReset();
  mockAuth.getSession.mockReset();
  mockAuth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  setTableResult(() => Promise.resolve({ data: PROFILE, error: null }));
});

describe('BusinessAuthProvider — spinner never gets stranded', () => {
  it('settles and exposes the profile on a healthy session', async () => {
    mockAuth.refreshSession.mockResolvedValue({ data: { session: SESSION }, error: null });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('spinner')).toHaveTextContent('settled'));
    expect(screen.getByTestId('profile')).toHaveTextContent('Test Owner');
    expect(screen.getByTestId('user')).toHaveTextContent('user-1');
  });

  // The bug that broke the portal for a full day: refreshSession rejects when
  // the stored refresh token was already rotated. Before the fix the whole
  // promise chain died silently and `loading` never cleared.
  it('recovers when refreshSession rejects, falling back to the stored session', async () => {
    mockAuth.refreshSession.mockRejectedValue(new Error('refresh token already used'));
    mockAuth.getSession.mockResolvedValue({ data: { session: SESSION }, error: null });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('spinner')).toHaveTextContent('settled'));
    expect(screen.getByTestId('profile')).toHaveTextContent('Test Owner');
  });

  it('settles to signed-out when both session calls reject', async () => {
    mockAuth.refreshSession.mockRejectedValue(new Error('refresh failed'));
    mockAuth.getSession.mockRejectedValue(new Error('no session'));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('spinner')).toHaveTextContent('settled'));
    // Settled with no user is the cue for DashboardLayout to redirect to /login.
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  // The bug fixed in 6ca6a2c: supabase-js has no request timeout, so a stalled
  // profile fetch left `profileFetching` true forever. `loading` cleared via the
  // safety timeout, but the second half of the gate kept the spinner up alone.
  it('settles even when the profile request never resolves', async () => {
    mockAuth.refreshSession.mockResolvedValue({ data: { session: SESSION }, error: null });
    setTableResult(() => new Promise(() => {})); // never settles, like a stalled fetch

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('spinner')).toHaveTextContent('settled'), {
      timeout: 15_000,
    });
    // No profile, but reachable UI: the layout renders its retry card here.
    expect(screen.getByTestId('profile')).toHaveTextContent('none');
    expect(screen.getByTestId('fetching')).toHaveTextContent('false');
  }, 20_000);

  it('settles and flags failure when the profile query errors', async () => {
    mockAuth.refreshSession.mockResolvedValue({ data: { session: SESSION }, error: null });
    setTableResult(() => Promise.resolve({ data: null, error: { message: 'permission denied' } }));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('spinner')).toHaveTextContent('settled'), {
      timeout: 5000,
    });
    expect(screen.getByTestId('failed')).toHaveTextContent('true');
  }, 10_000);

  it('never reports a spinner and a loaded profile at the same time', async () => {
    mockAuth.refreshSession.mockResolvedValue({ data: { session: SESSION }, error: null });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('profile')).toHaveTextContent('Test Owner'));
    // Once a profile exists the gate must be open, whatever profileFetching says.
    expect(screen.getByTestId('spinner')).toHaveTextContent('settled');
  });
});
