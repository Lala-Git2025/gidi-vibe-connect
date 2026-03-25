import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  Users,
  Shield,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navigation: NavItem[] = [
  { name: 'Overview',           href: '/',           icon: LayoutDashboard },
  { name: 'Venue Manager',      href: '/venues',     icon: Building2 },
  { name: 'Promotions Manager', href: '/promotions', icon: TrendingUp },
  { name: 'User Manager',       href: '/users',      icon: Users },
];

export function AdminSidebar() {
  const location = useLocation();
  const { profile } = useAdminAuth();

  const isSuperAdmin = profile?.role === 'Super Admin';

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-card border-r">
        {/* Logo */}
        <div className="flex items-center h-16 flex-shrink-0 px-4 border-b">
          <Shield className="h-6 w-6 text-primary mr-2" />
          <span className="text-xl font-bold">Gidi Admin</span>
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col overflow-y-auto py-4">
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Role Badge */}
        <div className="flex-shrink-0 p-4 border-t">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
            <Shield className={cn('h-5 w-5 flex-shrink-0', isSuperAdmin ? 'text-red-500' : 'text-amber-500')} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground truncate">
                {profile?.full_name || 'Administrator'}
              </p>
              <p className={cn('text-sm font-semibold', isSuperAdmin ? 'text-red-600' : 'text-amber-600')}>
                {profile?.role || 'Admin'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
