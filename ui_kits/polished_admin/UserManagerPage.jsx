// UserManagerPage — admin user manager. Role filters, ban/promote actions.

const UM_USERS = [
  { id: 'u1', name: 'Eze Okafor',     handle: '@ezeokafor',     role: 'Super Admin', joined: 'Jan 2025', signins: '4h ago',  status: 'active' },
  { id: 'u2', name: 'Sade Bello',     handle: '@sadebello',     role: 'Admin',       joined: 'Feb 2025', signins: '8h ago',  status: 'active' },
  { id: 'u3', name: 'Tunde Adigun',   handle: '@tundengz',      role: 'Business',    joined: 'Mar 2025', signins: '12m ago', status: 'active', venue: 'Cocoon Lounge' },
  { id: 'u4', name: 'Adaeze Okeke',   handle: '@adaeze.ng',     role: 'User',        joined: 'Apr 2025', signins: 'just now', status: 'active' },
  { id: 'u5', name: 'Femi Adesanya',  handle: '@femiaa',        role: 'User',        joined: 'May 2025', signins: '2d ago',  status: 'active' },
  { id: 'u6', name: 'Zilla',          handle: '@zilla.ng',      role: 'Creator',     joined: 'Jun 2025', signins: '4m ago',  status: 'active', verified: true },
  { id: 'u7', name: 'spammer07',      handle: '@spammer_07',    role: 'User',        joined: 'Nov 2025', signins: '1h ago',  status: 'flagged' },
];

const ROLE_PILL = {
  'Super Admin': 'ap-pill-super',
  'Admin':       'ap-pill-admin',
  'Business':    'ap-pill-promo',
  'Creator':     'ap-pill-info',
  'User':        'ap-pill-live',
};

function UserManagerPage() {
  const [filter, setFilter] = React.useState('All');
  const filters = [
    { label: 'All',         count: 12400 },
    { label: 'User',        count: 12100 },
    { label: 'Creator',     count: 240   },
    { label: 'Business',    count: 48    },
    { label: 'Admin',       count: 12    },
    { label: 'Super Admin', count: 4     },
    { label: 'Flagged',     count: 3, alert: true },
  ];
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div className="ap-page-eyebrow">User manager · 12,400 total · 8,240 MAU</div>
          <h1 className="ap-page-title">Users</h1>
          <p className="ap-page-sub">Search, filter by role, inline-edit role + status. Use the role filter to narrow down — server-side pagination, 25 per page.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ap-btn ap-btn-secondary"><Icon name="download" size={14} />Export</button>
          <button className="ap-btn ap-btn-primary"><Icon name="user-plus" size={14} />Invite admin</button>
        </div>
      </div>

      {/* Role filter chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {filters.map((f) => {
          const a = f.label === filter;
          return (
            <button key={f.label} onClick={() => setFilter(f.label)}
              className={'ap-btn ' + (a ? 'ap-btn-primary' : 'ap-btn-secondary')}
              style={{ height: 30, padding: '0 12px', fontSize: 11, gap: 8 }}>
              {f.label}
              <span style={{
                fontSize: 10, padding: '1px 6px',
                background: a ? 'rgba(255,255,255,0.2)' : (f.alert ? 'rgba(239,68,68,0.18)' : '#F3F4F6'),
                color: a ? '#fff' : (f.alert ? '#DC2626' : '#52525B'),
                borderRadius: 4, fontWeight: 700,
              }}>{f.count.toLocaleString()}</span>
            </button>
          );
        })}
        <div style={{ flex: 1 }}></div>
        <div className="ap-search" style={{ width: 280 }}>
          <Icon name="search" size={14} color="#6B7280" />
          <input placeholder="Search users by name or handle…" />
        </div>
      </div>

      {/* Table */}
      <div className="ap-card" style={{ overflow: 'hidden' }}>
        <table className="ap-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Owned venue</th>
              <th>Joined</th>
              <th>Last sign-in</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {UM_USERS.map((u) => {
              const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: u.status === 'flagged'
                          ? 'linear-gradient(135deg,#DC2626,#7C2D12)'
                          : 'linear-gradient(135deg,#FB923C,#EAB308)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 800, fontSize: 12,
                      }}>{initials}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#18181B', display: 'flex', alignItems: 'center', gap: 5 }}>
                          {u.name}
                          {u.verified && <span style={{ color: '#FACC15' }}><Icon name="badge-check" size={12} /></span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{u.handle}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={'ap-pill ' + ROLE_PILL[u.role]}>{u.role}</span></td>
                  <td style={{ color: '#52525B' }}>{u.venue || <span style={{ color: '#D4D4D8' }}>—</span>}</td>
                  <td style={{ color: '#52525B', fontSize: 12 }}>{u.joined}</td>
                  <td style={{ color: '#52525B', fontSize: 12 }}>{u.signins}</td>
                  <td>
                    {u.status === 'active'
                      ? <span className="ap-pill ap-pill-live">Active</span>
                      : <span className="ap-pill ap-pill-danger">
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#DC2626', animation: 'apPulse 1.6s infinite' }}></span>
                          Flagged
                        </span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="ap-btn ap-btn-ghost ap-btn-icon"><Icon name="more-horizontal" size={15} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <div style={{ fontSize: 12, color: '#6B7280' }}>Showing 7 of 12,400 users · page 1 / 496</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="ap-btn ap-btn-secondary ap-btn-icon" disabled><Icon name="chevron-left" size={14} /></button>
          <button className="ap-btn ap-btn-primary" style={{ height: 30, padding: '0 11px', fontSize: 11 }}>1</button>
          <button className="ap-btn ap-btn-secondary" style={{ height: 30, padding: '0 11px', fontSize: 11 }}>2</button>
          <button className="ap-btn ap-btn-secondary" style={{ height: 30, padding: '0 11px', fontSize: 11 }}>3</button>
          <button className="ap-btn ap-btn-secondary ap-btn-icon"><Icon name="chevron-right" size={14} /></button>
        </div>
      </div>
    </div>
  );
}

window.UserManagerPage = UserManagerPage;
