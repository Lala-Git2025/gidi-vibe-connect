import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Calendar,
  Tag,
  Settings,
  CreditCard,
  Users,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useBusinessAuth } from '../../contexts/BusinessAuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  premium?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    group: 'Workspace',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Venues',    href: '/venues',    icon: Building2 },
      { name: 'Events',    href: '/events',    icon: Calendar },
    ],
  },
  {
    group: 'Growth',
    items: [
      { name: 'Analytics', href: '/analytics', icon: BarChart3, premium: true },
      { name: 'Offers',    href: '/offers',    icon: Tag,       premium: true },
      { name: 'Audience',  href: '/audience',  icon: Users },
    ],
  },
  {
    group: 'Account',
    items: [
      { name: 'Verification', href: '/verification', icon: ShieldCheck },
      { name: 'Subscription', href: '/subscription', icon: CreditCard },
      { name: 'Settings',     href: '/settings',     icon: Settings },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const location = useLocation();
  const { subscription } = useBusinessAuth();

  const tier = subscription?.tier || 'Free';
  const isPremium = tier === 'Premium' || tier === 'Enterprise';

  const canAccess = (item: NavItem) => {
    if (!item.premium) return true;
    return subscription?.can_view_analytics || subscription?.can_create_offers;
  };

  // Close drawer on route change (mobile)
  useEffect(() => {
    if (mobileOpen && onClose) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <>
      {mobileOpen && (
        <div
          className="bp2-mobile-backdrop md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={`bp2-sidebar bp2-sidebar-mobile ${mobileOpen ? 'open' : ''} md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:translate-x-0`}
      >
        {/* Brand */}
        <div className="brand-row">
          <div className="brand-logo">G</div>
          <div className="brand-text">
            <div className="brand-name">Gidi Business</div>
            <div className="brand-sub">Venue console</div>
          </div>
          <button
            className="bp2-sidebar-close md:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {navigation.map((group) => (
          <div key={group.group}>
            <div className="bp2-nav-group-label">{group.group}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              const hasAccess = canAccess(item);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`bp2-nav-item ${isActive ? 'active' : ''}`}
                  style={{ opacity: hasAccess ? 1 : 0.7 }}
                  onClick={(e) => {
                    if (!hasAccess) e.preventDefault();
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  {item.premium && !isPremium && <span className="pro-badge">Pro</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Tier card */}
      <div className="bp2-tier-card">
        <div className="label">Current plan</div>
        <div className="tier">{tier}</div>
        <div className="meta">
          {isPremium ? 'All features unlocked' : 'Upgrade to unlock analytics + offers'}
        </div>
        {!isPremium && (
          <Link to="/subscription">
            <button className="upgrade-btn">Upgrade to Premium</button>
          </Link>
        )}
      </div>
      </div>
    </>
  );
}
