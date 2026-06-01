// VenuesPage — list of venues w/ filters, status pills, inline actions.

const VENUE_ROWS = [
  { id: 'r1', name: 'Cocoon Lounge',   area: 'Ikoyi',           cat: 'Bars & Lounges', status: 'Live',   views: 8420, checkins: 612, rsvps: 42, promoted: true,  vibe: 'Buzzing 🔥' },
  { id: 'r2', name: 'Sip & Smoke',     area: 'Victoria Island', cat: 'Hookah Bar',     status: 'Live',   views: 12310, checkins: 412, rsvps: 88, promoted: true,  vibe: 'Electric ⚡️' },
  { id: 'r3', name: 'Tarragon',        area: 'Lekki Phase 1',   cat: 'Restaurant',     status: 'Live',   views: 3140, checkins: 64,  rsvps: 12, promoted: false, vibe: 'Chill 🎵' },
  { id: 'r4', name: 'The Library Bar', area: 'Lekki Phase 1',   cat: 'Bar',            status: 'Draft',  views: 0,    checkins: 0,   rsvps: 0,  promoted: false, vibe: '—' },
  { id: 'r5', name: 'Bottega Rooftop', area: 'Ikoyi',           cat: 'Restaurant',     status: 'Review', views: 18,   checkins: 0,   rsvps: 0,  promoted: false, vibe: '—' },
];

function VenuesPage() {
  const [area, setArea] = React.useState('All Lagos');
  const areas = ['All Lagos', 'Victoria Island', 'Lekki Phase 1', 'Ikoyi', 'Ikeja', 'Surulere'];

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="bp2-page-eyebrow">5 venues · 2 promoted</div>
          <h1 className="bp2-page-title">Your venues</h1>
          <p className="bp2-page-sub">Manage every venue you own across Lagos. Live-edit photos, hours, amenities, and tags. Promoted venues appear in the consumer app's Trending Tonight feed.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bp2-btn bp2-btn-secondary">
            <Icon name="download" size={14} />
            Export
          </button>
          <button className="bp2-btn bp2-btn-primary">
            <Icon name="plus" size={14} />
            New venue
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div className="bp2-search" style={{ width: 320 }}>
          <Icon name="search" size={16} color="#6B7280" />
          <input placeholder="Search by name or category…" />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {areas.map((a) => (
            <button key={a} onClick={() => setArea(a)} className={'bp2-btn ' + (a === area ? 'bp2-btn-primary' : 'bp2-btn-secondary')}
              style={{ height: 34, padding: '0 14px', fontSize: 12 }}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bp2-card" style={{ overflow: 'hidden', padding: 0 }}>
        <table className="bp2-table">
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Venue</th>
              <th>Area</th>
              <th>Category</th>
              <th>Status</th>
              <th>Vibe</th>
              <th style={{ textAlign: 'right' }}>Views · 30d</th>
              <th style={{ textAlign: 'right' }}>Check-ins</th>
              <th style={{ textAlign: 'right' }}>RSVPs</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {VENUE_ROWS.map((v) => {
              const pill =
                v.status === 'Live'   ? 'bp2-pill-live' :
                v.status === 'Draft'  ? 'bp2-pill-draft' :
                                        'bp2-pill-review';
              return (
                <tr key={v.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 9,
                        background: 'linear-gradient(135deg,#EAB308,#F97316)',
                        boxShadow: '0 0 8px rgba(234,179,8,0.3)',
                      }}></div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#18181B', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {v.name}
                          {v.promoted && <span className="bp2-pill bp2-pill-gold" style={{ fontSize: 9, padding: '2px 6px' }}>Promoted</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Updated 2h ago</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: '#52525B' }}>{v.area}</td>
                  <td style={{ color: '#52525B' }}>{v.cat}</td>
                  <td><span className={'bp2-pill ' + pill}>{v.status}</span></td>
                  <td style={{ color: '#52525B' }}>{v.vibe}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{v.views.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{v.checkins}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{v.rsvps}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="bp2-btn bp2-btn-ghost bp2-btn-icon"><Icon name="more-horizontal" size={16} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <div style={{ fontSize: 12, color: '#6B7280' }}>Showing 5 of 5 venues</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="bp2-btn bp2-btn-secondary bp2-btn-icon" disabled><Icon name="chevron-left" size={14} /></button>
          <button className="bp2-btn bp2-btn-secondary bp2-btn-icon" disabled><Icon name="chevron-right" size={14} /></button>
        </div>
      </div>
    </div>
  );
}

window.VenuesPage = VenuesPage;
