// EventsPage — calendar view + upcoming events list.

const EVENT_ROWS = [
  { id: 'e1', date: 'Sat, 17 Nov', time: '9:00 PM', title: 'Afronation Lagos: Day 1',           venue: 'Cocoon Lounge',     status: 'On sale',  rsvps: 1240, cap: 1500, img: '../../assets/lagos-party.jpg', featured: true },
  { id: 'e2', date: 'Thu, 22 Nov', time: '6:00 PM', title: 'Suya Sundowner: Rooftop Edition',   venue: 'Sip & Smoke',       status: 'On sale',  rsvps: 184,  cap: 250,  img: '../../assets/lagos-food.jpg' },
  { id: 'e3', date: 'Fri, 23 Nov', time: '10:00 PM', title: 'Detty December Warm-up',           venue: 'Cocoon Lounge',     status: 'Sold out', rsvps: 612,  cap: 612,  img: '../../assets/lagos-nightlife-hero.jpg' },
  { id: 'e4', date: 'Sun, 25 Nov', time: '8:00 AM', title: 'Lagos Photo Walk: Lekki',           venue: 'Tarragon',          status: 'Draft',    rsvps: 0,    cap: 80,   img: '../../assets/lagos-culture.jpg' },
];

function EventCard({ e }) {
  const fillPct = Math.min(100, (e.rsvps / e.cap) * 100);
  const pill =
    e.status === 'On sale'  ? 'bp2-pill-live' :
    e.status === 'Sold out' ? 'bp2-pill-warn' :
                              'bp2-pill-draft';
  return (
    <div className="bp2-card" style={{ overflow: 'hidden', display: 'flex' }}>
      <div style={{ position: 'relative', width: 200, flexShrink: 0 }}>
        <img src={e.img} alt={e.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
        {e.featured && (
          <span className="bp2-pill bp2-pill-gold" style={{ position: 'absolute', top: 12, left: 12 }}>
            <Icon name="star" size={11} />
            Featured
          </span>
        )}
      </div>
      <div style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A16207' }}>{e.date} · {e.time}</span>
            <span className={'bp2-pill ' + pill}>{e.status}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#18181B', letterSpacing: '-0.005em' }}>{e.title}</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="map-pin" size={12} color="#6B7280" />
            {e.venue}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: '#3F3F46', fontWeight: 600 }}>
              <span style={{ color: '#A16207', fontWeight: 800 }}>{e.rsvps}</span> / {e.cap} RSVPs
            </span>
            <span style={{ color: '#6B7280' }}>{Math.round(fillPct)}% full</span>
          </div>
          <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: fillPct + '%', height: '100%',
              background: fillPct >= 100
                ? 'linear-gradient(90deg, #F97316, #EA580C)'
                : 'linear-gradient(90deg, #FDE047, #EAB308)',
              boxShadow: fillPct >= 90 ? '0 0 8px rgba(234,179,8,0.5)' : 'none',
            }}></div>
          </div>
        </div>
      </div>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8, alignItems: 'flex-end', borderLeft: '1px solid #F3F4F6' }}>
        <button className="bp2-btn bp2-btn-ghost bp2-btn-icon"><Icon name="more-horizontal" size={16} /></button>
        <button className="bp2-btn bp2-btn-secondary" style={{ height: 32, padding: '0 12px', fontSize: 12 }}>Manage</button>
      </div>
    </div>
  );
}

function EventsPage() {
  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="bp2-page-eyebrow">4 upcoming · 1 sold out</div>
          <h1 className="bp2-page-title">Events</h1>
          <p className="bp2-page-sub">Create, publish, and track RSVPs for events at your venues. Featured events get promoted slots in the consumer app's Events tab.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bp2-btn bp2-btn-secondary">
            <Icon name="calendar" size={14} />
            Calendar view
          </button>
          <button className="bp2-btn bp2-btn-primary">
            <Icon name="plus" size={14} />
            New event
          </button>
        </div>
      </div>

      {/* KPI mini-row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="bp2-card" style={{ padding: 18 }}>
          <div className="bp2-eyebrow">RSVPs this week</div>
          <div className="bp2-stat-num gold" style={{ marginTop: 6, fontSize: 28 }}>2,036</div>
          <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 700, marginTop: 4 }}>↑ 28% vs last week</div>
        </div>
        <div className="bp2-card" style={{ padding: 18 }}>
          <div className="bp2-eyebrow">Sold out events</div>
          <div className="bp2-stat-num" style={{ marginTop: 6, fontSize: 28 }}>1</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Detty December Warm-up</div>
        </div>
        <div className="bp2-card" style={{ padding: 18 }}>
          <div className="bp2-eyebrow">Avg fill rate</div>
          <div className="bp2-stat-num" style={{ marginTop: 6, fontSize: 28 }}>68%</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Per event</div>
        </div>
        <div className="bp2-card" style={{ padding: 18 }}>
          <div className="bp2-eyebrow">Featured slots used</div>
          <div className="bp2-stat-num" style={{ marginTop: 6, fontSize: 28 }}>1 <span style={{ fontSize: 16, color: '#6B7280' }}>/ 3</span></div>
          <div style={{ fontSize: 12, color: '#A16207', fontWeight: 700, marginTop: 4 }}>Premium tier</div>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {['All', 'Upcoming', 'Live', 'Past', 'Drafts'].map((c, i) => (
          <button key={c} className={'bp2-btn ' + (i === 1 ? 'bp2-btn-primary' : 'bp2-btn-secondary')}
            style={{ height: 32, padding: '0 14px', fontSize: 12 }}>
            {c}
          </button>
        ))}
        <div style={{ flex: 1 }}></div>
        <div className="bp2-search" style={{ width: 280 }}>
          <Icon name="search" size={14} color="#6B7280" />
          <input placeholder="Search events…" />
        </div>
      </div>

      {/* Event cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {EVENT_ROWS.map((e) => <EventCard key={e.id} e={e} />)}
      </div>
    </div>
  );
}

window.EventsPage = EventsPage;
