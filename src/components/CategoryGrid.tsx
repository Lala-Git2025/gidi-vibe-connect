import { Wine, Utensils, Music, Sun, Calendar, MessagesSquare } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { icon: Wine,            label: 'Bars',         sub: '142 spots',   c1: '#7C3AED', c2: '#4338CA', path: '/explore' },
  { icon: Utensils,        label: 'Restaurants',  sub: '210 spots',   c1: '#EA580C', c2: '#7C2D12', path: '/explore' },
  { icon: Music,           label: 'Nightlife',    sub: '88 spots',    c1: '#DB2777', c2: '#831843', path: '/explore' },
  { icon: Sun,             label: 'DayLife',      sub: '64 spots',    c1: '#F59E0B', c2: '#92400E', path: '/events' },
  { icon: Calendar,        label: 'Events',       sub: '38 this wk',  c1: '#4338CA', c2: '#1E1B4B', path: '/events' },
  { icon: MessagesSquare,  label: 'Social',       sub: 'Communities', c1: '#10B981', c2: '#064E3B', path: '/social' },
];

export const CategoryGrid = () => {
  return (
    <section style={{ padding: '14px 18px 6px' }}>
      <div className="container mx-auto max-w-4xl">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {categories.map((c) => {
            const IconComponent = c.icon;
            return (
              <Link key={c.label} to={c.path}>
                <button
                  className="gc2-tap"
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    height: 96,
                    width: '100%',
                    padding: '12px 14px',
                    background: `linear-gradient(135deg, ${c.c1}, ${c.c2})`,
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    color: '#fff',
                    textAlign: 'left',
                    boxShadow: `0 8px 24px ${c.c1}22, inset 0 1px 0 rgba(255,255,255,0.12)`,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: -30,
                      right: -30,
                      width: 110,
                      height: 110,
                      borderRadius: '50%',
                      background:
                        'radial-gradient(circle, rgba(255,255,255,0.22), transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <IconComponent
                    className="w-6 h-6"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                  />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.005em' }}>
                      {c.label}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.78, marginTop: 2, fontWeight: 600 }}>
                      {c.sub}
                    </div>
                  </div>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
