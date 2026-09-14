import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * AdminLayout gates on `loading || (!profile && profileFetching)` — the same
 * condition as the business portal, and it shipped the same stranded-spinner
 * bugs. These assert both flags always settle, whatever the network does.
 */

const { mockAuth, mockFrom, setTableResult } = vi.hoisted(() => {
  const auth = {
    refreshSession: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  };

  let result: () => Promise<unknown> = () => Promise.resolve({ data: null, error: null });

  const makeQueryBuilder = () => {
    const builder: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'limit', 'insert', 'update']) {
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

import { AdminAuthProvider, useAdminAuth } from './AdminAuthContext';

const SESSION = { user: { id: 'admin-1', email: 'admin@example.com' } };
const ADMIN_PROFILE = { user_id: 'admin-1', full_name: 'Platform Admin', role: 'Super Admin' };

function Probe() {
  const { loading, profileFetching, profile, user, profileError } = useAdminAuth();
  const spinnerShowing = loading || (!profile && profileFetching);
  return (
    <div>
      <span data-testid="spinner">{spinnerShowing ? 'spinning' : 'settled'}</span>
      <span data-testid="fetching">{String(profileFetching)}</span>
      <span data-testid="profile">{profile ? profile.full_name : 'none'}</span>
      <span data-testid="role">{profile ? profile.role : 'none'}</span>
      <span data-testid="user">{user ? user.id : 'none'}</span>
      <span data-testid="error">{String(profileError)}</span>
    </div>
  );
}

const renderProvider = () =>
  render(
    <AdminAuthProvider>
      <Probe />
    </AdminAuthProvider>,
  );

beforeEach(() => {
  mockAuth.refreshSession.mockReset();
  mockAuth.getSession.mockReset();
  mockAuth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  setTableResult(() => Promise.resolve({ data: ADMIN_PROFILE, error: null }));
});

describe('AdminAuthProvider — spinner never gets stranded', () => {
  it('settles and exposes the admin profile on a healthy session', async () => {
    mockAuth.refreshSession.mockResolvedValue({ data: { session: SESSION }, error: null });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('spinner')).toHaveTextContent('settled'));
    expect(screen.getByTestId('profile')).toHaveTextContent('Platform Admin');
    // AdminLayout reads this to enforce Admin / Super Admin only.
    expect(screen.getByTestId('role')).toHaveTextContent('Super Admin');
  });

  it('settles to signed-out when the session cannot be established', async () => {
    mockAuth.refreshSession.mockRejectedValue(new Error('refresh failed'));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('spinner')).toHaveTextContent('settled'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('settles even when the profile request never resolves', async () => {
    mockAuth.refreshSession.mockResolvedValue({ data: { session: SESSION }, error: null });
    setTableResult(() => new Promise(() => {})); // stalled fetch

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('spinner')).toHaveTextContent('settled'), {
      timeout: 25_000,
    });
    expect(screen.getByTestId('fetching')).toHaveTextContent('false');
  }, 30_000);

  it('falls back to the retry card when no profile row exists', async () => {
    mockAuth.refreshSession.mockResolvedValue({ data: { session: SESSION }, error: null });
    setTableResult(() => Promise.resolve({ data: null, error: null }));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('spinner')).toHaveTextContent('settled'), {
      timeout: 5000,
    });
    // Signed in but unresolvable role — must be an actionable state, not a spinner.
    expect(screen.getByTestId('error')).toHaveTextContent('true');
    expect(screen.getByTestId('profile')).toHaveTextContent('none');
  }, 10_000);
});
