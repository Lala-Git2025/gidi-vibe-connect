// TopBar — universal search, "what's new" pill, notifications, user chip.

function BPTopBar({ user = { name: 'Tunde A.', venue: 'Cocoon Lounge', avatar: null } }) {
  return (
    <header className="bp2-topbar">
      <div className="bp2-search">
        <Icon name="search" size={16} color="#6B7280" />
        <input placeholder="Search venues, events, analytics…" />
        <span className="kbd">⌘K</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Live ping for breaking-news pulse */}
        <button className="bp2-btn bp2-btn-secondary" style={{ position: 'relative' }}>
          <Icon name="sparkles" size={14} color="#EAB308" />
          What's new
          <span style={{
            position: 'absolute', top: -2, right: -2,
            width: 8, height: 8, borderRadius: '50%',
            background: '#EAB308',
            boxShadow: '0 0 6px rgba(234,179,8,0.8)',
            animation: 'bp2Pulse 1.6s infinite',
          }}></span>
        </button>

        <button className="bp2-btn bp2-btn-primary">
          <Icon name="plus" size={14} color="#18181B" />
          Add venue
        </button>

        <div style={{ width: 1, height: 28, background: '#E5E7EB', margin: '0 6px' }}></div>

        <button className="bp2-btn-ghost bp2-btn bp2-btn-icon" style={{ position: 'relative' }}>
          <Icon name="bell" size={18} />
          <span style={{
            position: 'absolute', top: 8, right: 9,
            width: 8, height: 8, borderRadius: '50%',
            background: '#EF4444', border: '2px solid #F7F6F2',
          }}></span>
        </button>

        <button style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '4px 10px 4px 4px',
          background: '#fff', border: '1px solid #E5E7EB',
          borderRadius: 999, cursor: 'pointer',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg,#EAB308,#F97316)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#18181B', fontWeight: 800, fontSize: 12,
          }}>{user.name.split(' ').map(w => w[0]).join('')}</div>
          <div style={{ lineHeight: 1.15, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>{user.venue}</div>
          </div>
          <Icon name="chevron-down" size={14} color="#9CA3AF" />
        </button>
      </div>
    </header>
  );
}

window.BPTopBar = BPTopBar;
