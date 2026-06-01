// VibeCheckV2 — bigger, bolder, more pulses, breathing glow border,
// stylized "what's the vibe?" CTA hint.

const V2_PINGS = [
  { x: '54%', y: '46%', color: '#FACC15', label: 'VI',       big: true },
  { x: '74%', y: '54%', color: '#FACC15', label: 'Lekki' },
  { x: '20%', y: '28%', color: '#34D399', label: 'Ikeja' },
  { x: '44%', y: '50%', color: '#60A5FA', label: 'Ikoyi' },
  { x: '38%', y: '20%', color: '#C084FC', label: 'Surulere' },
];

function VibePingV2({ x, y, color, label, big }) {
  const size = big ? 44 : 32;
  return (
    <div style={{ position: 'absolute', top: y, left: x }}>
      <div style={{
        position: 'absolute', width: size + 14, height: size + 14, borderRadius: '50%',
        background: color, opacity: 0.25, filter: 'blur(2px)',
        animation: 'gc2Ping 2.4s ease-out infinite',
        left: -(7), top: -(7),
      }}></div>
      <div style={{
        position: 'absolute', top: 4, left: 4,
        width: size - 8, height: size - 8, borderRadius: '50%',
        background: color, opacity: 0.55,
      }}></div>
      <div style={{
        position: 'absolute', top: 8, left: 8,
        width: size - 16, height: size - 16, borderRadius: '50%',
        background: color, boxShadow: `0 0 10px ${color}`,
      }}></div>
      <span style={{
        position: 'absolute', top: size + 4, left: -10,
        fontSize: 9, fontWeight: 800, color: '#fff',
        background: 'rgba(0,0,0,0.7)',
        padding: '2px 7px', borderRadius: 5,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>{label}</span>
    </div>
  );
}

function VibeCheckV2({ area = 'Victoria Island', vibe = 'Electric', emoji = '⚡️', count = 24 }) {
  return (
    <div style={{ padding: '4px 18px 6px' }}>
      <style>{`
        @keyframes gc2Ping { 0%, 100% { opacity: .35; transform: scale(1); } 50% { opacity: 0; transform: scale(1.8); } }
        @keyframes gc2BorderBreathe {
          0%, 100% { box-shadow: 0 0 32px rgba(234,179,8, 0.45), inset 0 0 24px rgba(234,179,8, 0.18); }
          50%      { box-shadow: 0 0 56px rgba(234,179,8, 0.75), inset 0 0 32px rgba(234,179,8, 0.25); }
        }
      `}</style>

      <div style={{
        position: 'relative',
        borderRadius: 28, padding: 3,
        background: 'conic-gradient(from 0deg, #FDE047, #EAB308, #F97316, #EAB308, #FDE047)',
        animation: 'gc2BorderBreathe 3.2s ease-in-out infinite',
      }}>
        <div style={{
          position: 'relative', height: 218, borderRadius: 25, overflow: 'hidden',
          background: '#000',
        }}>
          <img src="../../assets/lagos-hero.jpg" alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55, filter: 'saturate(1.3) contrast(1.1)' }}/>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.7) 100%)',
          }}></div>

          {/* faint gold grid */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {[25, 50, 75].map((v) => (
              <div key={'h' + v} style={{
                position: 'absolute', left: 0, right: 0, top: v + '%', height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(250,204,21,0.18), transparent)',
              }}></div>
            ))}
            {[25, 50, 75].map((v) => (
              <div key={'v' + v} style={{
                position: 'absolute', top: 0, bottom: 0, left: v + '%', width: 1,
                background: 'linear-gradient(180deg, transparent, rgba(250,204,21,0.18), transparent)',
              }}></div>
            ))}
          </div>

          {V2_PINGS.map((p) => <VibePingV2 key={p.label} {...p} />)}

          <div style={{ position: 'absolute', left: 16, right: 16, top: 14 }}>
            <span className="gc2-eyebrow"><span className="live-pip"></span>Live · Vibe Check</span>
          </div>

          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
            <div style={{
              fontFamily: 'var(--gc-font-display)',
              fontWeight: 900, fontSize: 26, lineHeight: 1.05,
              color: '#fff',
              textShadow: '0 2px 8px rgba(0,0,0,0.85)',
              letterSpacing: '-0.01em',
            }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', color: '#fff', opacity: 0.85, marginBottom: 2 }}>
                {area} is
              </span>
              <span style={{
                background: 'linear-gradient(180deg, #FDE047, #FACC15, #EAB308)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 16px rgba(234,179,8,0.6))',
                animation: 'gc2Breathe 3s ease-in-out infinite',
                textTransform: 'uppercase', letterSpacing: '0.03em', fontSize: 30,
              }}>
                {vibe} {emoji}
              </span>
            </div>
            <div style={{
              marginTop: 7,
              fontSize: 12, fontWeight: 700, color: '#FBBF24',
              letterSpacing: '0.04em',
              textShadow: '0 1px 3px rgba(0,0,0,0.85)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Icon name="zap" size={12} />
              {count} venues active right now
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.VibeCheckV2 = VibeCheckV2;
