import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

export function AdminLayout() {
  const { user, profile, loading, signOut } = useAdminAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#333' }}>Loading admin portal…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wait for profile before checking role
  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#333' }}>Loading profile…</p>
      </div>
    );
  }

  // Admin/Super Admin only
  if (profile.role !== 'Admin' && profile.role !== 'Super Admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-2">
            This portal is only accessible to platform administrators.
          </p>
          <p className="text-sm text-muted-foreground mb-1">Current role: {profile.role}</p>
          <p className="text-sm text-muted-foreground mb-6">
            If you are a venue owner, use the{' '}
            <a
              href={import.meta.env.VITE_BUSINESS_PORTAL_URL || 'https://business.gidiconnect.com'}
              className="text-primary hover:underline"
            >
              Business Portal
            </a>{' '}
            instead.
          </p>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
          >
            Sign out &amp; use a different account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ap-shell">
      <AdminSidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="md:pl-64 flex flex-col flex-1">
        <AdminHeader onOpenMenu={() => setMobileNavOpen(true)} />
        <main className="flex-1 ap-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
