import { Navigate, Outlet } from 'react-router-dom';
import { useBusinessAuth } from '../../contexts/BusinessAuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function DashboardLayout() {
  const { user, profile, loading } = useBusinessAuth();

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

  // Check if user is a Business Owner
  if (profile && profile.role !== 'Business Owner') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            This portal is only accessible to business owners.
          </p>
          <p className="text-sm">Current role: {profile.role}</p>
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
