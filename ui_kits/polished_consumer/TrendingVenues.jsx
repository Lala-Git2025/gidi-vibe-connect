// TrendingVenuesV2 — full-bleed horizontal photo cards with a ranking
// number, glass vibe pill, live "X here now" counter and trend delta.

const V2_VENUES = [
  { id: 'v1', name: 'Sip & Smoke Lounge',  loc: 'Victoria Island', vibe: 'Electric ⚡️', here: 412, trend: '↑ 23%', img: '../../assets/lagos-club.jpg' },
  { id: 'v2', name: 'Hard Rock Lekki',     loc: 'Lekki Phase 1',   vibe: 'Buzzing 🔥',  here: 238, trend: '↑ 14%', img: '../../assets/lagos-party.jpg' },
  { id: 'v3', name: 'Quilox',              loc: 'Victoria Island', vibe: 'Electric ⚡️', here: 689, trend: '↑ 41%', img: '../../assets/lagos-nightlife-hero.jpg' },
  { id: 'v4', name: 'Cocoon Lounge',       loc: 'Ikoyi',           vibe: 'Vibing ✨',   here: 124, trend: '↑ 8%',  img: '../../assets/lagos-culture.jpg' },
  { id: 'v5', name: 'Tarragon',            loc: 'Lekki Phase 1',   vibe: 'Chill 🎵',    here: 64,  trend: '— flat', img: '../../assets/lagos-food.jpg' },
];

function VenueCardV2({ v, rank, onOpen }) {
  return (
    <div onClick={() => onOpen?.(v)} className="gc2-tap" role="button" tabIndex={0} style={{
      flex: '0 0 auto', width: 268, height: 320, borderRadius: 22,
      overflow: 'hidden', position: 'relative', cursor: 'pointer',
      boxShadow: '0 20px 36px rgba(0,0,0,0.55)',
    }}>
      <img src={v.img} alt={v.name} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', filter: 'saturate(1.2) contrast(1.05)',
      }}/>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.1) 70%, transparent 100%)',
      }}></div>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 22,
        boxShadow: 'inset 0 1px 0 rgba(234,179,8,0.5), inset 0 0 0 1px rgba(234,179,8,0.15)',
        pointerEvents: 'none',
      }}></div>

      <div style={{ position: 'absolute', inset: 0, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--gc-font-display)', fontWeight: 900,
              fontSize: 11, color: '#FACC15',
              letterSpacing: '0.18em', textTransform: 'uppercase',
              textShadow: '0 1px 3px rgba(0,0,0,0.6)',
            }}>#{rank} Tonight</span>
            <div className="gc2-glass-pill">{v.vibe}</div>
          </div>
          <div className="gc2-tap" role="button" tabIndex={0} onClick={(e) => e.stopPropagation()} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <Icon name="bookmark" size={16} />
          </div>
        </div>

        <div>
          <div style={{
            fontSize: 22, fontWeight: 900, letterSpacing: '-0.01em',
            color: '#fff', lineHeight: 1.1,
            textShadow: '0 2px 6px rgba(0,0,0,0.8)',
          }}>{v.name}</div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            marginTop: 5, fontSize: 13, color: '#E4E4E7',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}>
            <Icon name="map-pin" size={13} />
            <span>{v.loc}</span>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 12, padding: '8px 12px',
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
            borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex' }}>
                {['#F97316', '#3B82F6', '#10B981'].map((c, i) => (
                  <div key={i} style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: '2px solid #000', background: c,
                    marginLeft: i === 0 ? 0 : -8,
                  }}></div>
                ))}
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>
                <span style={{ color: '#FACC15' }}>{v.here}</span> here now
              </span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 800,
              color: v.trend.startsWith('↑') ? '#34D399' : '#9CA3AF',
              letterSpacing: '0.03em',
            }}>{v.trend}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendingVenuesV2({ onOpen }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 className="gc2-section-h" style={{ marginBottom: 14 }}>
        <span>Trending <span className="accent">Tonight</span> 🚀</span>
        <button className="seeall">See All</button>
      </h2>
      <div className="gc2-rail" style={{ display: 'flex', gap: 14, padding: '4px 18px 8px' }}>
        {V2_VENUES.map((v, i) => <VenueCardV2 key={v.id} v={v} rank={i + 1} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

window.TrendingVenuesV2 = TrendingVenuesV2;
window.V2_VENUES = V2_VENUES;
