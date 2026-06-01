// TopBar — admin top bar with universal search + env pill + global alerts.

function APTopBar() {
  return (
    <header className="ap-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="ap-search">
          <Icon name="search" size={16} color="#6B7280" />
          <input placeholder="Search users, venues, events, audit log…" />
          <span className="kbd">⌘K</span>
        </div>
        <span className="ap-env-pill">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626', boxShadow: '0 0 6px #DC2626', animation: 'apPulse 1.6s infinite' }}></span>
          Production
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="ap-btn ap-btn-secondary">
          <Icon name="bell" size={14} />
          3 reports
          <span style={{
            background: '#EF4444', color: '#fff',
            padding: '0 5px', borderRadius: 4,
            fontSize: 10, fontWeight: 800,
          }}>NEW</span>
        </button>
        <button className="ap-btn ap-btn-primary">
          <Icon name="rocket" size={14} />
          Promote venue
        </button>

        <div style={{ width: 1, height: 28, background: '#E4E4E7', margin: '0 4px' }}></div>

        <button className="ap-btn-ghost ap-btn ap-btn-icon"><Icon name="zap" size={18} /></button>
        <button className="ap-btn-ghost ap-btn ap-btn-icon"><Icon name="help-circle" size={18} /></button>
      </div>
    </header>
  );
}

window.APTopBar = APTopBar;
