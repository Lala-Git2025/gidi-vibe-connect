import { useNavigate } from 'react-router-dom';
import { Bell, Search, Sparkles, Plus, ChevronDown, LogOut, Menu } from 'lucide-react';
import { useBusinessAuth } from '../../contexts/BusinessAuthContext';

interface HeaderProps {
  onOpenMenu?: () => void;
}

export function Header({ onOpenMenu }: HeaderProps) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useBusinessAuth();

  const fullName = profile?.full_name || 'Business Owner';
  const initials = fullName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bp2-topbar">
      <div className="bp2-topbar-left">
        <button
          className="bp2-menu-toggle md:hidden"
          onClick={onOpenMenu}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {/* Search */}
        <div className="bp2-search">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input placeholder="Search venues, events…" />
          <span className="kbd">⌘K</span>
        </div>
      </div>

      <div className="bp2-topbar-right">
        <button className="bp2-btn bp2-btn-secondary hidden lg:inline-flex" style={{ position: 'relative' }}>
          <Sparkles className="h-3.5 w-3.5" color="#EAB308" />
          What's new
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#EAB308',
              boxShadow: '0 0 6px rgba(234,179,8,0.8)',
              animation: 'bp2Pulse 1.6s infinite',
            }}
          />
        </button>

        <button className="bp2-btn bp2-btn-primary" onClick={() => navigate('/venues/new')}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add venue</span>
        </button>

        <div className="bp2-topbar-divider hidden md:block" />

        <button className="bp2-btn bp2-btn-ghost bp2-btn-icon hidden sm:inline-flex" style={{ position: 'relative' }} aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 9,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#EF4444',
              border: '2px solid #F7F6F2',
            }}
          />
        </button>

        <button
          onClick={handleSignOut}
          className="bp2-user-chip"
          title="Sign out"
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#EAB308,#F97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#18181B',
              fontWeight: 800,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div className="bp2-user-meta">
            <div style={{ fontSize: 13, fontWeight: 700 }}>{fullName}</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>{user?.email}</div>
          </div>
          <LogOut className="h-4 w-4 text-muted-foreground bp2-user-icon" />
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground bp2-user-icon" />
        </button>
      </div>
    </header>
  );
}
