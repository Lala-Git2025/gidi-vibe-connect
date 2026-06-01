// AnalyticsPage — overview KPIs, line chart, top areas, top venues, hours heatmap.

const TOP_AREAS = [
  { label: 'Victoria Island', value: 4820 },
  { label: 'Lekki Phase 1',   value: 3140 },
  { label: 'Ikoyi',           value: 2680 },
  { label: 'Ikeja',           value: 1240 },
  { label: 'Surulere',        value: 980 },
];

const TIER_BREAKDOWN = [
  { label: 'Free',       value: 12, color: '#9CA3AF' },
  { label: 'Premium',    value: 28, color: '#EAB308' },
  { label: 'Enterprise', value: 6,  color: '#7C3AED' },
];

const VIEWS_30D    = [180, 210, 260, 240, 300, 360, 420, 510, 580, 620, 720, 800, 760, 820, 880, 950, 1020, 990, 1100, 1180, 1240, 1320, 1380, 1280, 1440, 1520, 1620, 1700, 1840, 1980];

function HoursHeatmap() {
  // 7 days x 6 time buckets
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const buckets = ['6a','10a','2p','6p','10p','2a'];
  // synthetic values 0-1
  const heat = [
    [0.1,0.2,0.3,0.4,0.7,0.3],
    [0.1,0.2,0.3,0.5,0.7,0.4],
    [0.1,0.2,0.3,0.4,0.8,0.5],
    [0.1,0.3,0.4,0.6,0.9,0.7],
    [0.2,0.3,0.4,0.7,1.0,0.9],
    [0.3,0.4,0.5,0.8,1.0,1.0],
    [0.3,0.4,0.5,0.6,0.8,0.4],
  ];
  const cell = (v) => `rgba(234,179,8, ${0.08 + v * 0.85})`;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '36px repeat(6, 1fr)', gap: 4, fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>
        <div></div>
        {buckets.map((b) => <div key={b} style={{ textAlign: 'center' }}>{b}</div>)}
        {heat.map((row, ri) => (
          <React.Fragment key={ri}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, color: '#3F3F46', fontWeight: 700 }}>{days[ri]}</div>
            {row.map((v, ci) => (
              <div key={ci} style={{
                aspectRatio: '1.6/1',
                background: cell(v),
                borderRadius: 5,
                position: 'relative',
              }}>
                {v >= 0.95 && (
                  <span style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#18181B', fontWeight: 800,
                  }}>★</span>
                )}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 11, color: '#6B7280' }}>
        <span>Low</span>
        <div style={{ width: 100, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, rgba(234,179,8,0.08), rgba(234,179,8,0.95))' }}></div>
        <span>Peak</span>
      </div>
    </div>
  );
}

function AnalyticsPage() {
  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="bp2-page-eyebrow">Last 30 days · all venues</div>
          <h1 className="bp2-page-title">Analytics</h1>
          <p className="bp2-page-sub">How your venues are performing across Lagos. Drill into a specific venue from the dropdown, or export the raw data.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bp2-btn bp2-btn-secondary">
            <Icon name="calendar" size={14} />
            Last 30 days
          </button>
          <button className="bp2-btn bp2-btn-secondary">
            <Icon name="filter" size={14} />
            All venues
          </button>
          <button className="bp2-btn bp2-btn-primary">
            <Icon name="download" size={14} />
            Export
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard hero title="Total views" value="48.2k" delta="22%" deltaUp sub="vs prev. 30d" icon="eye"
          sparkline={VIEWS_30D.slice(-12)} />
        <StatCard title="Check-ins" value="2,140" delta="18%" deltaUp sub="vs prev. 30d" icon="map-pin"
          sparkline={[120,140,160,180,210,240,260,290,320,350,380,420]} />
        <StatCard title="Engagement rate" value="6.8%" delta="0.4%" deltaUp sub="industry avg 4.2%" icon="activity"
          sparkline={[4.2,4.6,5.0,5.4,5.8,6.0,6.2,6.4,6.5,6.6,6.7,6.8]} />
        <StatCard title="Returning visitors" value="38%" delta="2%" deltaUp={false} sub="vs prev. 30d" icon="repeat"
          sparkline={[42,41,40,39,38,38,39,39,38,38,38,38]} />
      </div>

      {/* Big chart */}
      <div className="bp2-card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div className="bp2-section-title">Views by day</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Live · updates every 10 minutes</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['7d', '30d', '90d', '12m'].map((r) => (
              <button key={r} className={'bp2-btn ' + (r === '30d' ? 'bp2-btn-primary' : 'bp2-btn-ghost')}
                style={{ height: 30, padding: '0 12px', fontSize: 12 }}>{r}</button>
            ))}
          </div>
        </div>
        <AreaChart data={VIEWS_30D} color="#EAB308" />
      </div>

      {/* Two col: top areas + tier donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="bp2-card" style={{ padding: 24 }}>
          <div className="bp2-section-title" style={{ marginBottom: 16 }}>Top areas · 30d</div>
          <BarChart data={TOP_AREAS} />
        </div>
        <div className="bp2-card" style={{ padding: 24 }}>
          <div className="bp2-section-title" style={{ marginBottom: 16 }}>Subscription tiers</div>
          <DonutChart data={TIER_BREAKDOWN} />
        </div>
      </div>

      {/* Heatmap */}
      <div className="bp2-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div className="bp2-section-title">Peak hours</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>When your venues are busiest · across all Lagos</div>
          </div>
          <span className="bp2-pill bp2-pill-info">
            <Icon name="info" size={11} />
            Friday 10pm is your peak — 32% of weekly check-ins
          </span>
        </div>
        <HoursHeatmap />
      </div>
    </div>
  );
}

window.AnalyticsPage = AnalyticsPage;
