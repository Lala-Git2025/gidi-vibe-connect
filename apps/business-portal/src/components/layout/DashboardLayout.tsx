import { Navigate, Outlet, Link } from 'react-router-dom';
import { useBusinessAuth } from '../../contexts/BusinessAuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function DashboardLayout() {
  const { user, profile, loading, signOut } = useBusinessAuth();

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

  // Wait for profile to load before checking role
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user has an allowed role
  const allowedRoles = ['Business Owner', 'Admin', 'Super Admin'];
  if (!allowedRoles.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            This portal is only accessible to business owners.
          </p>
          <p className="text-sm text-muted-foreground mb-6">Current role: {profile?.role}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:pl-64 flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
