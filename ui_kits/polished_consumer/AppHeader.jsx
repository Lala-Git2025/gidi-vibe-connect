// AppHeader V2 — sticky top header. Bigger wordmark with gradient text
// + breathing glow + a vivid "online" pip. Optional back button.

function AppHeaderV2({ onBack, title, action }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(14px) saturate(140%)',
      WebkitBackdropFilter: 'blur(14px) saturate(140%)',
      borderBottom: '1px solid rgba(234,179,8,0.08)',
      padding: '14px 18px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onBack && (
          <button onClick={onBack} className="gc2-tap" style={{
            width: 36, height: 36, borderRadius: 10, border: 0,
            background: 'rgba(255,255,255,0.06)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="arrow-left" size={18} />
          </button>
        )}
        {title ? (
          <span style={{
            fontFamily: 'var(--gc-font-display)',
            fontWeight: 800, fontSize: 14,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: '#FACC15',
          }}>{title}</span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            <span className="gc2-wordmark">GIDI CONNECT</span>
            <span style={{
              width: 9, height: 9, borderRadius: '50%',
              background: '#22C55E',
              boxShadow: '0 0 0 0 rgba(34,197,94,0.7), 0 0 10px rgba(34,197,94,0.9)',
              animation: 'gc2Pulse 1.6s cubic-bezier(0.4,0,0.2,1) infinite',
            }}></span>
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {action}
        <button className="gc2-tap" style={{
          width: 40, height: 40, borderRadius: 10, border: 0,
          background: 'transparent', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="search" size={22} />
        </button>
        <button className="gc2-tap" style={{
          width: 40, height: 40, borderRadius: 10, border: 0,
          background: 'transparent', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <Icon name="bell" size={22} />
          <span style={{
            position: 'absolute', top: 9, right: 10,
            width: 9, height: 9, borderRadius: '50%',
            background: '#EF4444', border: '2px solid #000',
            boxShadow: '0 0 6px rgba(239,68,68,0.8)',
          }}></span>
        </button>
      </div>
    </div>
  );
}

window.AppHeaderV2 = AppHeaderV2;
