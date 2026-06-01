import { useState, useEffect } from 'react';
import { AlertTriangle, Construction, CheckCircle2 } from 'lucide-react';

type Severity = 'heavy' | 'slow' | 'free';

interface TrafficData {
  id: string;
  severity: Severity;
  name: string;
  direction: string;
  delay: string;
}

const LAGOS_HOTSPOTS: Array<{ name: string; direction: string }> = [
  { name: 'Third Mainland Bridge', direction: 'Outbound · Oworonshoki' },
  { name: 'Ozumba Mbadiwe',        direction: 'Lekki bound · Falomo' },
  { name: 'Lekki–Epe Expressway',  direction: 'Both directions · clear' },
  { name: 'Eko Bridge',            direction: 'Island bound' },
  { name: 'Carter Bridge',         direction: 'Mainland bound' },
  { name: 'Ikorodu Road',          direction: 'Ketu to Ojota' },
  { name: 'Apapa-Oshodi Expwy',    direction: 'Both directions' },
  { name: 'Falomo Bridge',         direction: 'Ikoyi to VI' },
];

const generateAlerts = (): TrafficData[] => {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  const pickSeverity = (): Severity => {
    if (day >= 1 && day <= 5) {
      if ((hour >= 6 && hour <= 10) || (hour >= 16 && hour <= 20)) {
        return Math.random() > 0.5 ? 'heavy' : 'slow';
      }
      if (hour >= 11 && hour <= 15) {
        return Math.random() > 0.5 ? 'slow' : 'heavy';
      }
      return Math.random() > 0.7 ? 'slow' : 'free';
    }
    if (hour >= 14 && hour <= 20) {
      return Math.random() > 0.6 ? 'slow' : 'free';
    }
    return 'free';
  };

  const minutesFor = (sev: Severity) => {
    if (sev === 'heavy') return `+${30 + Math.floor(Math.random() * 30)} min`;
    if (sev === 'slow')  return `+${10 + Math.floor(Math.random() * 18)} min`;
    return 'on time';
  };

  const shuffled = [...LAGOS_HOTSPOTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((h, i) => {
    const sev = pickSeverity();
    return {
      id: `traffic-${Date.now()}-${i}`,
      severity: sev,
      name: h.name,
      direction: h.direction,
      delay: minutesFor(sev),
    };
  });
};

const SEV_CONFIG = {
  heavy: { Icon: AlertTriangle,  tint: 'rgba(239,68,68,0.18)',  color: '#FCA5A5', dot: '#EF4444', label: 'Heavy' },
  slow:  { Icon: Construction,   tint: 'rgba(249,115,22,0.18)', color: '#FB923C', dot: '#F97316', label: 'Slow'  },
  free:  { Icon: CheckCircle2,   tint: 'rgba(16,185,129,0.18)', color: '#34D399', dot: '#10B981', label: 'Free'  },
} as const;

export const TrafficAlert = () => {
  const [alerts, setAlerts] = useState<TrafficData[]>([]);

  useEffect(() => {
    setAlerts(generateAlerts());
    const interval = setInterval(() => setAlerts(generateAlerts()), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div style={{ padding: '4px 18px 24px' }}>
      <h2 className="gc2-section-h" style={{ padding: 0, marginBottom: 14 }}>
        <span>
          Lagos <span className="accent">Traffic</span> Now
        </span>
        <button className="seeall">See All</button>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.map((a) => {
          const s = SEV_CONFIG[a.severity];
          const IconComponent = s.Icon;
          return (
            <button
              key={a.id}
              className="gc2-card gc2-tap"
              style={{
                padding: 14,
                borderRadius: 14,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: s.tint,
                  color: s.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                <IconComponent className="w-5 h-5" />
                <span
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: s.dot,
                    boxShadow: `0 0 8px ${s.dot}`,
                    animation: 'gc2Blink 1.4s infinite',
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{a.name}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>{a.direction}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: s.color,
                  }}
                >
                  {s.label}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3, fontWeight: 600 }}>
                  {a.delay}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
