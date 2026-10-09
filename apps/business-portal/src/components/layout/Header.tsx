import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Search, Sparkles, Plus, ChevronDown, LogOut, Menu,
  Building2, Calendar, Star, MapPin, ShieldCheck, Check,
} from 'lucide-react';
import { useBusinessAuth } from '../../contexts/BusinessAuthContext';
import { useBusinessSearch } from '../../hooks/useBusinessSearch';
import {
  useNotifications, useMarkNotificationsRead, notificationHref,
  type BusinessNotification,
} from '../../hooks/useNotifications';
import { CHANGELOG, hasUnseenChangelog, markChangelogSeen } from '../../lib/changelog';

interface HeaderProps {
  onOpenMenu?: () => void;
}

const NOTIF_ICON = {
  review: Star,
  rsvp: Calendar,
  check_in: MapPin,
  verification_approved: ShieldCheck,
  verification_rejected: ShieldCheck,
} as const;

const timeAgo = (iso: string): string => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

/** One dropdown open at a time; Escape and outside-clicks close it. */
type Panel = 'search' | 'notifications' | 'whatsnew' | null;

export function Header({ onOpenMenu }: HeaderProps) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useBusinessAuth();

  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState('');
  const [seenChangelog, setSeenChangelog] = useState(() => !hasUnseenChangelog());

  const searchInput = useRef<HTMLInputElement>(null);
  const shell = useRef<HTMLDivElement>(null);

  const { data: hits = [], isFetching } = useBusinessSearch(query);
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const unread = notifications.filter(n => !n.is_read).length;

  const fullName = profile?.full_name || 'Business Owner';
  const initials = fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // ⌘K / Ctrl-K focuses search — the keycap in the input has advertised this
  // since the header was written and nothing listened for it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPanel('search');
        searchInput.current?.focus();
      }
      if (e.key === 'Escape') setPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (shell.current && !shell.current.contains(e.target as Node)) setPanel(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const go = (href: string) => {
    setPanel(null);
    setQuery('');
    navigate(href);
  };

  const openNotifications = () => {
    const next = panel === 'notifications' ? null : 'notifications';
    setPanel(next);
    // Opening the panel is the act of reading it.
    if (next && unread > 0) markRead.mutate(undefined);
  };

  const openWhatsNew = () => {
    const next = panel === 'whatsnew' ? null : 'whatsnew';
    setPanel(next);
    if (next) { markChangelogSeen(); setSeenChangelog(true); }
  };

  const openNotification = (n: BusinessNotification) => go(notificationHref(n));

  return (
    <header className="bp2-topbar" ref={shell}>
      <div className="bp2-topbar-left">
        <button className="bp2-menu-toggle md:hidden" onClick={onOpenMenu} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="bp2-search" style={{ position: 'relative' }}>
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={searchInput}
            value={query}
            placeholder="Search your venues and events…"
            onChange={e => { setQuery(e.target.value); setPanel('search'); }}
            onFocus={() => setPanel('search')}
            onKeyDown={e => {
              if (e.key === 'Enter' && hits[0]) go(hits[0].href);
            }}
            aria-label="Search your venues and events"
          />
          <span className="kbd">⌘K</span>

          {panel === 'search' && query.trim().length >= 2 && (
            <div className="bp2-popover" role="listbox">
              {isFetching && hits.length === 0 && (
                <div className="bp2-popover-empty">Searching…</div>
              )}
              {!isFetching && hits.length === 0 && (
                <div className="bp2-popover-empty">
                  Nothing of yours matches “{query.trim()}”.
                </div>
              )}
              {hits.map(hit => {
                const Icon = hit.kind === 'venue' ? Building2 : Calendar;
                return (
                  <button key={`${hit.kind}-${hit.id}`} className="bp2-popover-row" onClick={() => go(hit.href)}>
                    <Icon className="h-4 w-4" color="#EAB308" />
                    <span className="bp2-popover-text">
                      <span className="bp2-popover-title">{hit.title}</span>
                      <span className="bp2-popover-sub">{hit.subtitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bp2-topbar-right">
        {/* What's new */}
        <div style={{ position: 'relative' }} className="hidden lg:block">
          <button
            className="bp2-btn bp2-btn-secondary"
            style={{ position: 'relative' }}
            onClick={openWhatsNew}
            aria-expanded={panel === 'whatsnew'}
          >
            <Sparkles className="h-3.5 w-3.5" color="#EAB308" />
            What's new
            {/* Lit only when the newest entry has not been opened in this
                browser. It used to pulse permanently over a dead button. */}
            {!seenChangelog && (
              <span
                style={{
                  position: 'absolute', top: -2, right: -2, width: 8, height: 8,
                  borderRadius: '50%', background: '#EAB308',
                  boxShadow: '0 0 6px rgba(234,179,8,0.8)',
                }}
              />
            )}
          </button>

          {panel === 'whatsnew' && (
            <div className="bp2-popover bp2-popover-right" style={{ width: 340 }}>
              <div className="bp2-popover-head">What's new</div>
              {CHANGELOG.map(entry => (
                <div key={entry.id} className="bp2-popover-note">
                  <div className="bp2-popover-title">{entry.title}</div>
                  <div className="bp2-popover-sub" style={{ whiteSpace: 'normal' }}>{entry.body}</div>
                  <div className="bp2-popover-meta">
                    {new Date(entry.date).toLocaleDateString('en-NG', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="bp2-btn bp2-btn-primary" onClick={() => navigate('/venues/new')}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add venue</span>
        </button>

        <div className="bp2-topbar-divider hidden md:block" />

        {/* Notifications */}
        <div style={{ position: 'relative' }} className="hidden sm:block">
          <button
            className="bp2-btn bp2-btn-ghost bp2-btn-icon"
            style={{ position: 'relative' }}
            onClick={openNotifications}
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            aria-expanded={panel === 'notifications'}
          >
            <Bell className="h-4 w-4" />
            {/* Lit only when something is genuinely unread. */}
            {unread > 0 && (
              <span
                style={{
                  position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16,
                  padding: '0 4px', borderRadius: 999, background: '#EF4444',
                  border: '2px solid #F7F6F2', color: '#fff', fontSize: 9,
                  fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {panel === 'notifications' && (
            <div className="bp2-popover bp2-popover-right" style={{ width: 340 }}>
              <div className="bp2-popover-head">Notifications</div>
              {notifications.length === 0 ? (
                <div className="bp2-popover-empty">
                  Nothing yet. Reviews, RSVPs and check-ins on your venues land here.
                </div>
              ) : (
                notifications.map(n => {
                  const Icon = NOTIF_ICON[n.type] ?? Bell;
                  return (
                    <button key={n.id} className="bp2-popover-row" onClick={() => openNotification(n)}>
                      <Icon className="h-4 w-4" color={n.is_read ? '#9CA3AF' : '#EAB308'} />
                      <span className="bp2-popover-text">
                        <span className="bp2-popover-title">{n.title}</span>
                        {n.body && <span className="bp2-popover-sub">{n.body}</span>}
                        <span className="bp2-popover-meta">{timeAgo(n.created_at)}</span>
                      </span>
                      {n.is_read && <Check className="h-3 w-3" color="#9CA3AF" />}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <button onClick={handleSignOut} className="bp2-user-chip" title="Sign out">
          <div
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg,#EAB308,#F97316)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#18181B', fontWeight: 800, fontSize: 12, flexShrink: 0,
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
