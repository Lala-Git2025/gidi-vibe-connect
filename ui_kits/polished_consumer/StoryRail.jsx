// StoryRailV2 — bigger rings, animated rotating gradient on creator rings,
// glow under verified-creator badge.

const V2_STORIES = [
  { id: 's1', user: 'Zilla',     img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=200', kind: 'creator' },
  { id: 's2', user: 'LagosEats', img: 'https://images.unsplash.com/photo-1485230405346-71acb9518d9c?q=80&w=200', kind: 'creator' },
  { id: 's3', user: 'David',     img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200', kind: 'peer' },
  { id: 's4', user: 'Sarah',     img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200', kind: 'peer' },
  { id: 's5', user: 'Mike',      img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200', kind: 'peer' },
  { id: 's6', user: 'Linda',     img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200', kind: 'peer' },
  { id: 's7', user: 'Bisi',      img: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=200', kind: 'peer' },
];

function StoryRingV2({ kind, children }) {
  // Each ring is a 72px disc with a conic-gradient that rotates.
  // creator = gold spectrum, peer = purple→pink, add = dashed
  const ringStyle = {
    width: 72, height: 72, borderRadius: '50%',
    position: 'relative', padding: 0,
    background: kind === 'creator'
      ? 'conic-gradient(from 0deg, #FDE047, #EAB308, #F97316, #DB2777, #EAB308, #FDE047)'
      : kind === 'peer'
        ? 'conic-gradient(from 0deg, #A855F7, #DB2777, #F97316, #A855F7)'
        : 'transparent',
    border: kind === 'add' ? '2px dashed #3F3F46' : 0,
    boxSizing: 'border-box',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: kind !== 'add' ? 'gc2RingRotate 6s linear infinite' : 'none',
  };
  return <div style={ringStyle}>{children}</div>;
}

function StoryRailV2({ onAdd, onOpen }) {
  return (
    <div style={{ padding: '12px 0 18px' }}>
      <div className="gc2-rail" style={{ display: 'flex', gap: 14, padding: '0 18px' }}>
        {/* Add my vibe */}
        <button onClick={onAdd} className="gc2-tap" style={{
          background: 'transparent', border: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 72,
        }}>
          <StoryRingV2 kind="add">
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: '#18181B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FACC15',
            }}>
              <Icon name="plus" size={26} />
            </div>
          </StoryRingV2>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>My Vibe</span>
        </button>

        {V2_STORIES.map((s) => (
          <button key={s.id} onClick={() => onOpen?.(s)} className="gc2-tap" style={{
            background: 'transparent', border: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 72,
          }}>
            <StoryRingV2 kind={s.kind}>
              {/* counter-rotate the avatar so the photo isn't spinning */}
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                border: '3px solid #000', overflow: 'hidden',
                animation: 'gc2RingRotate 6s linear infinite reverse',
              }}>
                <img src={s.img} alt={s.user} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              {s.kind === 'creator' && (
                <div style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#FDE047,#EAB308)',
                  border: '3px solid #000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(234,179,8,0.8)',
                  fontSize: 10,
                }}>⭐</div>
              )}
            </StoryRingV2>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.user}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

window.StoryRailV2 = StoryRailV2;
