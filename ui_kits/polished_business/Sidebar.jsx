// Sidebar — charcoal sidebar w/ gold accent bar on the active item,
// premium pro badges, and a glowing "tier" card at the bottom.

const BP2_NAV = [
  { group: 'Workspace', items: [
    { id: 'dashboard',    label: 'Dashboard',    icon: 'layout-dashboard' },
    { id: 'venues',       label: 'Venues',       icon: 'building-2' },
    { id: 'events',       label: 'Events',       icon: 'calendar' },
  ]},
  { group: 'Growth', items: [
    { id: 'analytics',    label: 'Analytics',    icon: 'bar-chart-3', premium: true },
    { id: 'offers',       label: 'Offers',       icon: 'tag',         premium: true },
    { id: 'audience',     label: 'Audience',     icon: 'users' },
  ]},
  { group: 'Account', items: [
    { id: 'subscription', label: 'Subscription', icon: 'credit-card' },
    { id: 'settings',     label: 'Settings',     icon: 'settings' },
  ]},
];

function BPSidebar({ active, onChange, tier = 'Premium' }) {
  return (
    <aside className="bp2-sidebar">
      <div className="brand-row">
        <div className="brand-logo">G</div>
        <div className="brand-text">
          <div className="brand-name">Gidi Business</div>
          <div className="brand-sub">Venue console</div>
        </div>
      </div>

      <nav className="bp2-nav">
        {BP2_NAV.map((g) => (
          <React.Fragment key={g.group}>
            <div className="bp2-nav-group-label">{g.group}</div>
            {g.items.map((item) => {
              const a = item.id === active;
              return (
                <button key={item.id}
                  className={'bp2-nav-item' + (a ? ' active' : '')}
                  onClick={() => onChange?.(item.id)}>
                  <Icon name={item.icon} size={17} color={a ? '#FACC15' : '#A1A1AA'} />
                  <span>{item.label}</span>
                  {item.premium && tier !== 'Premium' && <span className="pro-badge">Pro</span>}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      <div className="bp2-tier-card">
        <div className="label">Current plan</div>
        <div className="tier">{tier}</div>
        <div className="meta">{tier === 'Premium' ? 'All features unlocked · renews Mar 18' : 'Upgrade to unlock analytics + offers'}</div>
        {tier !== 'Premium' && <button className="upgrade-btn">Upgrade to Premium</button>}
      </div>
    </aside>
  );
}

window.BPSidebar = BPSidebar;
