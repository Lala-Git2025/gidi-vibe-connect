// TrafficAlertV2 — live traffic strip. More iconography, pulsing dots,
// trend mini-stats per route.

const V2_ALERTS = [
  { id: 't1', sev: 'heavy', name: 'Third Mainland Bridge', dir: 'Outbound · Oworonshoki', delay: '+42 min' },
  { id: 't2', sev: 'slow',  name: 'Ozumba Mbadiwe',        dir: 'Lekki bound · Falomo',   delay: '+18 min' },
  { id: 't3', sev: 'free',  name: 'Lekki–Epe Expressway',  dir: 'Both directions · clear',delay: 'on time' },
];

const V2_SEV = {
  heavy: { icon: 'alert-triangle', tint: 'rgba(239,68,68,0.18)', color: '#FCA5A5', dot: '#EF4444', label: 'Heavy' },
  slow:  { icon: 'construction',   tint: 'rgba(249,115,22,0.18)', color: '#FB923C', dot: '#F97316', label: 'Slow' },
  free:  { icon: 'check-circle-2', tint: 'rgba(16,185,129,0.18)', color: '#34D399', dot: '#10B981', label: 'Free' },
};

function TrafficAlertV2({ onOpen }) {
  return (
    <div style={{ padding: '4px 18px 24px' }}>
      <h2 className="gc2-section-h" style={{ padding: 0, marginBottom: 14 }}>
        <span>Lagos <span className="accent">Traffic</span> Now</span>
        <button className="seeall">See All</button>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {V2_ALERTS.map((a) => {
          const s = V2_SEV[a.sev];
          return (
            <button key={a.id} onClick={() => onOpen?.(a)} className="gc2-card gc2-tap" style={{
              padding: 14, borderRadius: 14, color: '#fff',
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: s.tint, color: s.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, position: 'relative',
              }}>
                <Icon name={s.icon} size={22} />
                <span style={{
                  position: 'absolute', top: -3, right: -3,
                  width: 10, height: 10, borderRadius: '50%',
                  background: s.dot,
                  boxShadow: `0 0 8px ${s.dot}`,
                  animation: 'gc2Blink 1.4s infinite',
                }}></span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{a.name}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>{a.dir}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 10, fontWeight: 900,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: s.color,
                }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3, fontWeight: 600 }}>{a.delay}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

window.TrafficAlertV2 = TrafficAlertV2;
