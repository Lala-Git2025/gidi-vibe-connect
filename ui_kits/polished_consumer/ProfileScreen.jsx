// ProfileScreenV2 — hero photo banner + rotating gold ring avatar +
// vibe-themed stats + tab switcher for Posts / Stats / Badges.

function ProfileTabs({ tab, onChange }) {
  const tabs = [
    { id: 'posts',  icon: 'grid-3x3' },
    { id: 'stats',  icon: 'bar-chart-3' },
    { id: 'badges', icon: 'award' },
  ];
  return (
    <div style={{
      margin: '4px 18px 16px',
      background: '#0F0F12', border: '1px solid #27272A',
      borderRadius: 14, padding: 4,
      display: 'flex',
    }}>
      {tabs.map((t) => {
        const a = t.id === tab;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} className="gc2-tap" style={{
            flex: 1, border: 0,
            padding: '10px 0', borderRadius: 10,
            background: a ? 'linear-gradient(180deg, #FDE047, #EAB308)' : 'transparent',
            color: a ? '#18181B' : '#9CA3AF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: a ? '0 0 16px rgba(234,179,8,0.4)' : 'none',
          }}>
            <Icon name={t.icon} size={18} />
          </button>
        );
      })}
    </div>
  );
}

function StatBlock({ num, label, accent }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div className="gc2-stat-num" style={{
        background: accent ? 'linear-gradient(180deg, #FDE047, #EAB308)' : 'linear-gradient(180deg,#fff,#A1A1AA)',
        WebkitBackgroundClip: 'text', backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>{num}</div>
      <div style={{
        fontSize: 10, fontWeight: 600, marginTop: 4,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: '#9CA3AF',
      }}>{label}</div>
    </div>
  );
}

function VibeMetric({ icon, num, max, label, color }) {
  const pct = Math.min(100, (num / max) * 100);
  return (
    <div className="gc2-card" style={{ padding: 14, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: color + '22', color: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={icon} size={16} />
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>this wk</span>
      </div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>{num}</span>
        <span style={{ fontSize: 12, color: '#6B7280' }}>/ {max}</span>
      </div>
      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 10, height: 5, background: '#27272A', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, boxShadow: `0 0 6px ${color}` }}></div>
      </div>
    </div>
  );
}

// 9 post-grid tiles
const V2_GRID = [
  { img: '../../assets/lagos-club.jpg',      vibe: 'Electric ⚡️',  likes: 248 },
  { img: '../../assets/lagos-food.jpg',      vibe: 'Vibing ✨',    likes: 1240 },
  { img: '../../assets/lagos-party.jpg',     vibe: 'Buzzing 🔥',   likes: 412 },
  { img: '../../assets/lagos-beach.jpg',     vibe: 'Chill 🎵',     likes: 84 },
  { img: '../../assets/lagos-culture.jpg',   vibe: 'Vibing ✨',    likes: 218 },
  { img: '../../assets/lagos-nightlife-hero.jpg', vibe: 'Electric ⚡️', likes: 642 },
  { img: '../../assets/lagos-hero.jpg',      vibe: 'Buzzing 🔥',   likes: 318 },
  { img: '../../assets/lagos-food.jpg',      vibe: 'Vibing ✨',    likes: 128 },
  { img: '../../assets/lagos-beach.jpg',     vibe: 'Chill 🎵',     likes: 76 },
];

function PostsGrid() {
  return (
    <div style={{ padding: '0 18px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
      {V2_GRID.map((p, i) => (
        <div key={i} className="gc2-tap" style={{
          position: 'relative', aspectRatio: '1/1', overflow: 'hidden',
          borderRadius: 8,
        }}>
          <img src={p.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent 50%)',
          }}></div>
          <div style={{
            position: 'absolute', top: 6, left: 6,
            fontSize: 9, fontWeight: 700, color: '#fff',
            background: 'rgba(0,0,0,0.55)', padding: '2px 6px',
            borderRadius: 4, backdropFilter: 'blur(4px)',
          }}>{p.vibe}</div>
          <div style={{
            position: 'absolute', bottom: 6, right: 6,
            fontSize: 10, fontWeight: 800, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 3,
            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
          }}>
            <Icon name="heart" size={11} />
            <span>{p.likes}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsView() {
  return (
    <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <VibeMetric icon="zap"           num={18} max={25} label="Vibes posted"   color="#FACC15" />
        <VibeMetric icon="map-pin"       num={12} max={20} label="Check-ins"      color="#34D399" />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <VibeMetric icon="calendar-plus" num={3}  max={10} label="Events RSVP'd"  color="#60A5FA" />
        <VibeMetric icon="users"         num={47} max={100} label="New followers" color="#F472B6" />
      </div>
      <div className="gc2-card-elev" style={{ padding: 16, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#9CA3AF', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Level 7</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 4, letterSpacing: '-0.01em' }}>Lagos Veteran</div>
          </div>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'conic-gradient(from 0deg, #FDE047, #EAB308, #F97316, #EAB308, #FDE047)',
            padding: 2,
            animation: 'gc2RingRotate 10s linear infinite',
          }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: '#0F0F12',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--gc-font-display)', fontWeight: 900,
              fontSize: 20,
              background: '#0F0F12',
              color: '#FACC15',
              animation: 'gc2RingRotate 10s linear infinite reverse',
            }}>7</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span>1,240 XP</span>
          <span><span style={{ color: '#FACC15', fontWeight: 700 }}>360 XP</span> to Level 8</span>
        </div>
        <div style={{ height: 8, background: '#27272A', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: '77%', height: '100%',
            background: 'linear-gradient(90deg, #FDE047, #EAB308)',
            boxShadow: '0 0 12px rgba(234,179,8,0.6)',
          }}></div>
        </div>
      </div>
    </div>
  );
}

const V2_BADGES = [
  { name: 'Early Bird',     emoji: '🌅', desc: 'First 100 users',      have: true },
  { name: 'Vibe Master',    emoji: '⚡️', desc: '50 Electric check-ins', have: true },
  { name: 'Trendsetter',    emoji: '🔥', desc: '10 trending venues',     have: true },
  { name: 'Lagos Native',   emoji: '🏝️', desc: 'Visit all 6 areas',     have: true },
  { name: 'Detty Veteran',  emoji: '🎉', desc: 'Detty December events', have: false },
  { name: 'Foodie Royalty', emoji: '🍕', desc: '25 restaurant reviews', have: false },
];

function BadgesView() {
  return (
    <div style={{ padding: '0 18px 18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {V2_BADGES.map((b) => (
          <div key={b.name} className="gc2-card" style={{
            padding: 14, display: 'flex', alignItems: 'center', gap: 12,
            opacity: b.have ? 1 : 0.42,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: b.have ? 'linear-gradient(135deg, #FDE047, #EAB308)' : '#27272A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
              boxShadow: b.have ? '0 0 14px rgba(234,179,8,0.4)' : 'none',
            }}>{b.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{b.name}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileScreenV2() {
  const [tab, setTab] = React.useState('posts');
  return (
    <div className="gc2-screen">
      {/* Hero banner */}
      <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
        <img src="../../assets/lagos-rooftop-hero.png" alt="" style={{
          width: '100%', height: '100%', objectFit: 'cover',
          filter: 'saturate(1.3) brightness(0.7)',
        }}/>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, #000 100%)',
        }}></div>

        {/* in-banner header chrome */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '14px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button className="gc2-tap" style={{
            width: 36, height: 36, borderRadius: 10, border: 0,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="arrow-left" size={18} />
          </button>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="gc2-tap" style={{
              width: 36, height: 36, borderRadius: 10, border: 0,
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="share-2" size={17} />
            </button>
            <button className="gc2-tap" style={{
              width: 36, height: 36, borderRadius: 10, border: 0,
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="settings" size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* Profile core — avatar overlapping banner */}
      <div style={{ marginTop: -52, padding: '0 18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 104, height: 104, borderRadius: '50%',
          padding: 3,
          background: 'conic-gradient(from 0deg, #FDE047, #EAB308, #F97316, #DB2777, #EAB308, #FDE047)',
          animation: 'gc2RingRotate 8s linear infinite',
          boxShadow: '0 0 32px rgba(234,179,8,0.45)',
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            border: '3px solid #000', overflow: 'hidden',
            animation: 'gc2RingRotate 8s linear infinite reverse',
            background: '#000',
          }}>
            <img src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=400" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.01em' }}>Zilla</span>
          <span style={{ color: '#FACC15', display: 'inline-flex' }}>
            <Icon name="badge-check" size={18} />
          </span>
        </div>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 3 }}>@zilla.ng · Lagos Mainland</div>
        <div style={{
          fontSize: 13, color: '#E4E4E7', textAlign: 'center',
          marginTop: 12, lineHeight: 1.5, maxWidth: 280,
        }}>
          Nightlife critic by accident, foodie by choice. <br/>
          DM for collabs · No PR.
        </div>

        {/* stat row */}
        <div style={{
          marginTop: 18,
          width: '100%',
          background: 'linear-gradient(180deg, rgba(234,179,8,0.06), transparent)',
          border: '1px solid rgba(234,179,8,0.18)',
          borderRadius: 16, padding: '14px 0',
          display: 'flex', alignItems: 'center',
        }}>
          <StatBlock num={247}  label="Vibes" accent />
          <div style={{ width: 1, alignSelf: 'stretch', background: '#27272A' }}></div>
          <StatBlock num="1.2k" label="Followers" />
          <div style={{ width: 1, alignSelf: 'stretch', background: '#27272A' }}></div>
          <StatBlock num={318}  label="Following" />
        </div>

        {/* action row */}
        <div style={{ width: '100%', marginTop: 14, display: 'flex', gap: 8 }}>
          <button className="gc2-tap" style={{
            flex: 1, height: 44, borderRadius: 12, border: 0,
            background: 'linear-gradient(180deg, #FDE047, #EAB308)',
            color: '#18181B', fontWeight: 800, fontSize: 14,
            boxShadow: '0 6px 18px rgba(234,179,8,0.4)',
          }}>Edit Profile</button>
          <button className="gc2-tap" style={{
            flex: 1, height: 44, borderRadius: 12,
            border: '1px solid #27272A', background: '#0F0F12',
            color: '#fff', fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icon name="camera" size={16} />
            New Vibe
          </button>
        </div>
      </div>

      <div style={{ height: 22 }}></div>
      <ProfileTabs tab={tab} onChange={setTab} />
      {tab === 'posts'  && <PostsGrid />}
      {tab === 'stats'  && <StatsView />}
      {tab === 'badges' && <BadgesView />}
      <div style={{ height: 12 }}></div>
    </div>
  );
}

window.ProfileScreenV2 = ProfileScreenV2;
