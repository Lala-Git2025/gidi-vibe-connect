import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  BarChart3,
  Rocket,
  Calendar,
  Newspaper,
  Flag,
  MessagesSquare,
  Activity,
  Settings,
  LogOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  count?: string;
  alert?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    group: 'Platform',
    items: [
      { name: 'Overview',  href: '/',          icon: LayoutDashboard },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    group: 'Curation',
    items: [
      { name: 'Venues',     href: '/venues',     icon: Building2 },
      { name: 'Promotions', href: '/promotions', icon: Rocket },
      { name: 'Events',     href: '/events',     icon: Calendar },
      { name: 'News feed',  href: '/news',       icon: Newspaper },
    ],
  },
  {
    group: 'Community',
    items: [
      { name: 'Users',       href: '/users',       icon: Users },
      { name: 'Reports',     href: '/reports',     icon: Flag, alert: true },
      { name: 'Communities', href: '/communities', icon: MessagesSquare },
    ],
  },
  {
    group: 'System',
    items: [
      { name: 'Health',    href: '/health',   icon: Activity },
      { name: 'Audit log', href: '/audit',    icon: Shield },
      { name: 'Settings',  href: '/settings', icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAdminAuth();

  const isSuperAdmin = profile?.role === 'Super Admin';
  const fullName = profile?.full_name || 'Administrator';
  const initials = fullName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 ap-sidebar">
      <div className="brand-row">
        <div className="brand-logo">G</div>
        <div className="brand-text">
          <div className="brand-name">Gidi Admin</div>
          <div className="brand-sub">Command center</div>
        </div>
      </div>

      <nav
        style={{
          flex: 1,
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
        }}
      >
        {NAV.map((group) => (
          <div key={group.group}>
            <div className="ap-nav-group-label">{group.group}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`ap-nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  {item.count && (
                    <span className={`count${item.alert ? ' alert' : ''}`}>{item.count}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="ap-role-card">
        <div
          className="av"
          style={{
            background: isSuperAdmin
              ? 'linear-gradient(135deg, #A855F7, #7C3AED)'
              : 'linear-gradient(135deg, #FB923C, #EA580C)',
          }}
        >
          {initials}
        </div>
        <div className="meta">
          <div className="who">{fullName}</div>
          <div
            className="role"
            style={{ color: isSuperAdmin ? '#C084FC' : '#FB923C' }}
          >
            {profile?.role || 'Admin'}
          </div>
        </div>
        <button
          onClick={() => signOut()}
          style={{ background: 'transparent', border: 0, color: '#71717A', cursor: 'pointer' }}
          aria-label="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
