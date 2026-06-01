// VenueManagerPage — admin venue curation. Promote / un-promote, set badge,
// set duration. Filter by Lagos area pills.

const VM_VENUES = [
  { id: 'v1', name: 'Quilox',                area: 'Victoria Island', cat: 'Nightclub',        score: 9999, rating: 4.9, checkins: 689, promoted: true,  badge: 'Featured · Trending Tonight', expires: 'in 4d' },
  { id: 'v2', name: 'Sip & Smoke Lounge',    area: 'Victoria Island', cat: 'Hookah Bar',       score: 8420, rating: 4.7, checkins: 412, promoted: true,  badge: 'Sponsored · Top of Explore',  expires: 'in 11d' },
  { id: 'v3', name: 'Hard Rock Lekki',       area: 'Lekki Phase 1',   cat: 'Restaurant / Bar', score: 6240, rating: 4.6, checkins: 238, promoted: false, badge: null, expires: null },
  { id: 'v4', name: 'Cocoon Lounge',         area: 'Ikoyi',           cat: 'Bars & Lounges',   score: 4120, rating: 4.5, checkins: 124, promoted: false, badge: null, expires: null },
  { id: 'v5', name: 'Tarragon',              area: 'Lekki Phase 1',   cat: 'Restaurant',       score: 2480, rating: 4.4, checkins: 64,  promoted: false, badge: null, expires: null },
  { id: 'v6', name: 'Bottega Rooftop',       area: 'Ikoyi',           cat: 'Restaurant',       score: 0,    rating: 0,   checkins: 0,   promoted: false, badge: null, expires: null, status: 'Review' },
];

function VenueManagerPage() {
  const [area, setArea] = React.useState('All Lagos');
  const areas = ['All Lagos', 'Victoria Island', 'Lekki Phase 1', 'Ikoyi', 'Ikeja', 'Surulere', 'Yaba'];
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div className="ap-page-eyebrow">Venue manager · 142 venues across Lagos</div>
          <h1 className="ap-page-title">Venue curation</h1>
          <p className="ap-page-sub">Promote any venue to the consumer app's Trending Tonight feed. Set the badge label, pick a duration, monitor live performance.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ap-btn ap-btn-secondary"><Icon name="download" size={14} />Export</button>
          <button className="ap-btn ap-btn-primary"><Icon name="rocket" size={14} />Bulk promote</button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
        <div className="ap-card-hot" style={{ padding: 16 }}>
          <div className="ap-eyebrow">Currently promoted</div>
          <div className="ap-stat-num orange" style={{ marginTop: 6, fontSize: 28 }}>8</div>
          <div style={{ fontSize: 11, color: '#A16207', fontWeight: 700, marginTop: 4 }}>2 expire this week</div>
        </div>
        <div className="ap-card" style={{ padding: 16 }}>
          <div className="ap-eyebrow">Avg hot score</div>
          <div className="ap-stat-num" style={{ marginTop: 6, fontSize: 28 }}>4,820</div>
          <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, marginTop: 4 }}>↑ 18% this week</div>
        </div>
        <div className="ap-card" style={{ padding: 16 }}>
          <div className="ap-eyebrow">New venues · 7d</div>
          <div className="ap-stat-num" style={{ marginTop: 6, fontSize: 28 }}>6</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>5 approved, 1 in review</div>
        </div>
        <div className="ap-card" style={{ padding: 16 }}>
          <div className="ap-eyebrow">Pending review</div>
          <div className="ap-stat-num" style={{ marginTop: 6, fontSize: 28 }}>1</div>
          <div style={{ fontSize: 11, color: '#92400E', fontWeight: 700, marginTop: 4 }}>Action needed</div>
        </div>
      </div>

      {/* Filter strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="ap-search" style={{ width: 300 }}>
          <Icon name="search" size={15} color="#6B7280" />
          <input placeholder="Search venues, owners, categories…" />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {areas.map((a) => {
            const active = a === area;
            return (
              <button key={a} onClick={() => setArea(a)} className={'ap-btn ' + (active ? 'ap-btn-primary' : 'ap-btn-secondary')}
                style={{ height: 30, padding: '0 12px', fontSize: 11 }}>
                {a}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="ap-card" style={{ overflow: 'hidden' }}>
        <table className="ap-table">
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Venue</th>
              <th>Area</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Score</th>
              <th style={{ textAlign: 'right' }}>Rating</th>
              <th style={{ textAlign: 'right' }}>Check-ins · 24h</th>
              <th>Promo badge</th>
              <th>Expires</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {VM_VENUES.map((v) => (
              <tr key={v.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'linear-gradient(135deg,#EAB308,#F97316)',
                    }}></div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#18181B', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {v.name}
                        {v.status === 'Review' && <span className="ap-pill ap-pill-warn" style={{ fontSize: 9 }}>Review</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>id: {v.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ color: '#52525B' }}>{v.area}</td>
                <td style={{ color: '#52525B' }}>{v.cat}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--gc-font-mono)', fontSize: 12 }}>
                  {v.score === 9999 ? <span style={{ color: '#FB923C', fontWeight: 800 }}>PINNED</span> : v.score.toLocaleString()}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                  {v.rating > 0 ? <>★ {v.rating}</> : <span style={{ color: '#D4D4D8' }}>—</span>}
                </td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{v.checkins}</td>
                <td>
                  {v.badge
                    ? <span className="ap-pill ap-pill-promo" style={{ fontSize: 10 }}>{v.badge}</span>
                    : <span style={{ color: '#9CA3AF', fontSize: 12 }}>—</span>}
                </td>
                <td style={{ color: v.expires ? '#A16207' : '#9CA3AF', fontSize: 12, fontWeight: v.expires ? 700 : 400 }}>
                  {v.expires || '—'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="ap-btn ap-btn-ghost ap-btn-icon"><Icon name="more-horizontal" size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <div style={{ fontSize: 12, color: '#6B7280' }}>Showing 6 of 142 venues · page 1 / 6</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="ap-btn ap-btn-secondary bp2-btn-icon ap-btn-icon" disabled><Icon name="chevron-left" size={14} /></button>
          <button className="ap-btn ap-btn-primary" style={{ height: 30, padding: '0 11px', fontSize: 11 }}>1</button>
          <button className="ap-btn ap-btn-secondary" style={{ height: 30, padding: '0 11px', fontSize: 11 }}>2</button>
          <button className="ap-btn ap-btn-secondary" style={{ height: 30, padding: '0 11px', fontSize: 11 }}>3</button>
          <button className="ap-btn ap-btn-secondary" style={{ height: 30, padding: '0 11px', fontSize: 11 }}>…</button>
          <button className="ap-btn ap-btn-secondary ap-btn-icon"><Icon name="chevron-right" size={14} /></button>
        </div>
      </div>
    </div>
  );
}

window.VenueManagerPage = VenueManagerPage;
