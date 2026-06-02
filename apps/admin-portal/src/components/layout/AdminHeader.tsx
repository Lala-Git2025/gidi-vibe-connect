import { Bell, HelpCircle, Search, Rocket, Zap, Menu } from 'lucide-react';

interface AdminHeaderProps {
  onOpenMenu?: () => void;
}

export function AdminHeader({ onOpenMenu }: AdminHeaderProps) {
  return (
    <header className="ap-topbar">
      <div className="ap-topbar-left">
        <button
          className="ap-menu-toggle md:hidden"
          onClick={onOpenMenu}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="ap-search">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input placeholder="Search users, venues, events…" />
          <span className="kbd">⌘K</span>
        </div>
        <span className="ap-env-pill hidden lg:inline-flex">
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

      <div className="ap-topbar-right">
        <button className="ap-btn ap-btn-secondary hidden sm:inline-flex">
          <Bell className="h-3.5 w-3.5" />
          <span className="hidden md:inline">3 reports</span>
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
          <span className="hidden sm:inline">Promote venue</span>
        </button>

        <div className="ap-topbar-divider hidden md:block" />

        <button className="ap-btn-ghost ap-btn ap-btn-icon hidden md:inline-flex" aria-label="Shortcuts">
          <Zap className="h-4 w-4" />
        </button>
        <button className="ap-btn-ghost ap-btn ap-btn-icon hidden md:inline-flex" aria-label="Help">
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
