import { Bell, HelpCircle, Search, Rocket, Zap } from 'lucide-react';

export function AdminHeader() {
  return (
    <header className="ap-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="ap-search">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input placeholder="Search users, venues, events, audit log…" />
          <span className="kbd">⌘K</span>
        </div>
        <span className="ap-env-pill">
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#DC2626',
              boxShadow: '0 0 6px #DC2626',
              animation: 'apPulse 1.6s infinite',
            }}
          />
          Production
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="ap-btn ap-btn-secondary">
          <Bell className="h-3.5 w-3.5" />
          3 reports
          <span
            style={{
              background: '#EF4444',
              color: '#fff',
              padding: '0 5px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            NEW
          </span>
        </button>
        <button className="ap-btn ap-btn-primary">
          <Rocket className="h-3.5 w-3.5" />
          Promote venue
        </button>

        <div style={{ width: 1, height: 28, background: '#E4E4E7', margin: '0 4px' }} />

        <button className="ap-btn-ghost ap-btn ap-btn-icon" aria-label="Shortcuts">
          <Zap className="h-4 w-4" />
        </button>
        <button className="ap-btn-ghost ap-btn ap-btn-icon" aria-label="Help">
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
