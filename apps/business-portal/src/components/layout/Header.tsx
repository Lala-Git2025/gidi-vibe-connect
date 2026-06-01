import { useNavigate } from 'react-router-dom';
import { Bell, Search, Sparkles, Plus, ChevronDown, LogOut } from 'lucide-react';
import { useBusinessAuth } from '../../contexts/BusinessAuthContext';

export function Header() {
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
      {/* Search */}
      <div className="bp2-search">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input placeholder="Search venues, events, analytics…" />
        <span className="kbd">⌘K</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="bp2-btn bp2-btn-secondary" style={{ position: 'relative' }}>
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
          Add venue
        </button>

        <div style={{ width: 1, height: 28, background: '#E5E7EB', margin: '0 6px' }} />

        <button className="bp2-btn bp2-btn-ghost bp2-btn-icon" style={{ position: 'relative' }} aria-label="Notifications">
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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '4px 10px 4px 4px',
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 999,
            cursor: 'pointer',
          }}
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
            }}
          >
            {initials}
          </div>
          <div style={{ lineHeight: 1.15, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{fullName}</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>{user?.email}</div>
          </div>
          <LogOut className="h-4 w-4 text-muted-foreground" />
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
