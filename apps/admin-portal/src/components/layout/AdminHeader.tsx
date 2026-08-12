import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Rocket, Menu } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdminHeaderProps {
  onOpenMenu?: () => void;
}

export function AdminHeader({ onOpenMenu }: AdminHeaderProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [pendingReports, setPendingReports] = useState(0);

  // Live count of moderation reports awaiting review.
  useEffect(() => {
    let mounted = true;
    async function loadCount() {
      try {
        const { count } = await supabase
          .from('post_reports')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (mounted) setPendingReports(count ?? 0);
      } catch {
        // A failed badge count must never break the header.
      }
    }
    loadCount();
    return () => { mounted = false; };
  }, []);

  // Route the query to whichever manager is most likely to answer it.
  const runSearch = () => {
    const q = search.trim();
    if (!q) return;
    navigate(`/users?q=${encodeURIComponent(q)}`);
  };

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
          <input
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
          />
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
        <button
          className="ap-btn ap-btn-secondary hidden sm:inline-flex"
          onClick={() => navigate('/')}
          aria-label="Pending reports"
        >
          <Bell className="h-3.5 w-3.5" />
          <span className="hidden md:inline">
            {pendingReports} report{pendingReports === 1 ? '' : 's'}
          </span>
          {pendingReports > 0 && (
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
          )}
        </button>
        <button className="ap-btn ap-btn-primary" onClick={() => navigate('/venues')}>
          <Rocket className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Promote venue</span>
        </button>
      </div>
    </header>
  );
}
