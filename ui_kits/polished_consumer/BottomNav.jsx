// BottomNavV2 — floating capsule tab bar. Active tab has gold-filled
// glow pill behind the icon; inactive tabs are minimal.

const V2_TABS = [
  { id: 'home',    label: 'Home',    icon: 'home' },
  { id: 'explore', label: 'Explore', icon: 'search' },
  { id: 'social',  label: 'Social',  icon: 'message-square' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];

function BottomNavV2({ active, onChange }) {
  return (
    <div style={{
      position: 'sticky', bottom: 0, zIndex: 30,
      padding: '8px 16px 18px',
      background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.95) 50%)',
    }}>
      <div style={{
        background: 'rgba(20,20,24,0.85)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        border: '1px solid rgba(234,179,8,0.12)',
        borderRadius: 22,
        padding: 6,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        boxShadow: '0 12px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        {V2_TABS.map((t) => {
          const a = t.id === active;
          return (
            <button key={t.id} onClick={() => onChange?.(t.id)} className="gc2-tap" style={{
              flex: 1, background: 'transparent', border: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, padding: '8px 4px', position: 'relative',
              color: a ? '#18181B' : '#9CA3AF',
            }}>
              {/* Active pill — always rendered, faded out when inactive */}
              <div style={{
                position: 'absolute', top: 4, bottom: 4, left: 14, right: 14,
                borderRadius: 16,
                background: 'linear-gradient(180deg, #FDE047, #EAB308)',
                boxShadow: '0 0 18px rgba(234,179,8,0.55)',
                opacity: a ? 1 : 0,
                transition: 'opacity 200ms cubic-bezier(0.4,0,0.2,1)',
                pointerEvents: 'none',
              }}></div>
              <Icon name={t.icon} size={22} style={{ position: 'relative', zIndex: 1 }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', position: 'relative', zIndex: 1 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

window.BottomNavV2 = BottomNavV2;
