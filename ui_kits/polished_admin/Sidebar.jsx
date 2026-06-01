// Sidebar — admin command center nav. Grouped, with counts on hot routes.

const AP_NAV = [
  { group: 'Platform', items: [
    { id: 'overview',   label: 'Overview',    icon: 'layout-dashboard' },
    { id: 'analytics',  label: 'Analytics',   icon: 'bar-chart-3' },
  ]},
  { group: 'Curation', items: [
    { id: 'venues',     label: 'Venues',      icon: 'building-2', count: '142' },
    { id: 'promotions', label: 'Promotions',  icon: 'rocket',     count: '8' },
    { id: 'events',     label: 'Events',      icon: 'calendar',   count: '38' },
    { id: 'news',       label: 'News feed',   icon: 'newspaper',  count: '24' },
  ]},
  { group: 'Community', items: [
    { id: 'users',         label: 'Users',         icon: 'users',           count: '12.4k' },
    { id: 'reports',       label: 'Reports',       icon: 'flag',            count: '3', alert: true },
    { id: 'communities',   label: 'Communities',   icon: 'messages-square', count: '24' },
  ]},
  { group: 'System', items: [
    { id: 'health',     label: 'Health',      icon: 'activity' },
    { id: 'audit',      label: 'Audit log',   icon: 'shield' },
    { id: 'settings',   label: 'Settings',    icon: 'settings' },
  ]},
];

function APSidebar({ active, onChange }) {
  return (
    <aside className="ap-sidebar">
      <div className="brand-row">
        <div className="brand-logo">G</div>
        <div className="brand-text">
          <div className="brand-name">Gidi Admin</div>
          <div className="brand-sub">Command center</div>
        </div>
      </div>

      <nav className="ap-nav">
        {AP_NAV.map((g) => (
          <React.Fragment key={g.group}>
            <div className="ap-nav-group-label">{g.group}</div>
            {g.items.map((item) => {
              const a = item.id === active;
              return (
                <button key={item.id}
                  className={'ap-nav-item' + (a ? ' active' : '')}
                  onClick={() => onChange?.(item.id)}>
                  <Icon name={item.icon} size={16} color={a ? '#FB923C' : '#A1A1AA'} />
                  <span>{item.label}</span>
                  {item.count && (
                    <span className="count" style={item.alert ? { background: 'rgba(239,68,68,0.18)', color: '#FCA5A5' } : {}}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      <div className="ap-role-card">
        <div className="av">EO</div>
        <div className="meta">
          <div className="who">Eze Okafor</div>
          <div className="role">Super Admin</div>
        </div>
        <button style={{ background: 'transparent', border: 0, color: '#71717A', cursor: 'pointer' }}>
          <Icon name="log-out" size={14} />
        </button>
      </div>
    </aside>
  );
}

window.APSidebar = APSidebar;
