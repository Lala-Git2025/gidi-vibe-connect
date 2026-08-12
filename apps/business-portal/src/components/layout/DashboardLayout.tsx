import { useState } from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { useBusinessAuth } from '../../contexts/BusinessAuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function DashboardLayout() {
  const { user, profile, loading, profileLoadFailed, refreshProfile, signOut } = useBusinessAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Profile failed to load — offer a way out instead of spinning forever.
  if (profileLoadFailed && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2">Couldn't load your profile</h1>
          <p className="text-sm text-muted-foreground mb-6">
            You're signed in, but we couldn't read your business profile. This is usually a
            temporary network problem.
          </p>
          <div className="flex gap-3 justify-center">
            <button className="bp2-btn bp2-btn-primary" onClick={() => refreshProfile()}>
              Try again
            </button>
            <button className="bp2-btn bp2-btn-ghost" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Wait for profile to load before checking role
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user has an allowed role
  if (profile.role !== 'Business Owner') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-2">
            This portal is only accessible to business owners.
          </p>
          <p className="text-sm text-muted-foreground mb-2">Current role: {profile.role}</p>
          {(profile.role === 'Admin' || profile.role === 'Super Admin') && (
            <p className="text-sm text-muted-foreground mb-4">
              Administrators should use the{' '}
              <a
                href={import.meta.env.VITE_ADMIN_PORTAL_URL || 'https://admin.gidiconnect.com'}
                className="text-primary hover:underline font-medium"
              >
                Admin Portal
              </a>{' '}
              instead.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
            >
              Sign out &amp; use a different account
            </button>
            <Link
              to="/login"
              className="px-4 py-2 border border-input rounded-md text-sm font-medium hover:bg-accent"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bp2-shell">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="md:pl-64 flex flex-col flex-1">
        <Header onOpenMenu={() => setMobileNavOpen(true)} />
        <main className="flex-1 bp2-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
