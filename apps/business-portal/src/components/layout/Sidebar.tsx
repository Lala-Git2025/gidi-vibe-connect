import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Calendar,
  Tag,
  Settings,
  CreditCard,
  Menu
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useBusinessAuth } from '../../contexts/BusinessAuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  premium?: boolean;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Venues', href: '/venues', icon: Building2 },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, premium: true },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Offers', href: '/offers', icon: Tag, premium: true },
  { name: 'Subscription', href: '/subscription', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { subscription } = useBusinessAuth();

  const canAccess = (item: NavItem) => {
    if (!item.premium) return true;
    return subscription?.can_view_analytics || subscription?.can_create_offers;
  };

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-card border-r">
        {/* Logo */}
        <div className="flex items-center h-16 flex-shrink-0 px-4 border-b">
          <Menu className="h-6 w-6 text-primary mr-2" />
          <span className="text-xl font-bold">Gidi Business</span>
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col overflow-y-auto py-4">
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              const hasAccess = canAccess(item);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    !hasAccess && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={(e) => {
                    if (!hasAccess) e.preventDefault();
                  }}
                >
                  <Icon className={cn('mr-3 h-5 w-5 flex-shrink-0')} aria-hidden="true" />
                  {item.name}
                  {item.premium && !hasAccess && (
                    <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Premium
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Subscription Badge */}
        <div className="flex-shrink-0 p-4 border-t">
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground">Subscription</p>
              <p className="text-sm font-semibold">{subscription?.tier || 'Free'}</p>
            </div>
            {subscription?.tier === 'Free' && (
              <Link
                to="/subscription"
                className="text-xs text-primary hover:underline font-medium"
              >
                Upgrade
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
