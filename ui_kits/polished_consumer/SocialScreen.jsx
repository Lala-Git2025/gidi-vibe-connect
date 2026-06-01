// SocialScreenV2 — feed-first social view with segmented tabs at the top
// (Feed / Communities / People), composer card, polished post cards with
// engagement metrics that pulse.

function SocialTabs({ tab, onChange }) {
  const tabs = [
    { id: 'feed',        label: 'Feed' },
    { id: 'communities', label: 'Communities' },
    { id: 'people',      label: 'People' },
  ];
  return (
    <div style={{ padding: '14px 18px 8px' }}>
      <div style={{
        display: 'flex', gap: 6,
        background: '#0F0F12', border: '1px solid #27272A',
        borderRadius: 14, padding: 5,
      }}>
        {tabs.map((t) => {
          const a = t.id === tab;
          return (
            <button key={t.id} onClick={() => onChange(t.id)} className="gc2-tap" style={{
              flex: 1, border: 0,
              padding: '9px 0', borderRadius: 10,
              background: a ? 'linear-gradient(180deg, #FDE047, #EAB308)' : 'transparent',
              color: a ? '#18181B' : '#9CA3AF',
              fontWeight: a ? 800 : 600, fontSize: 13,
              boxShadow: a ? '0 0 16px rgba(234,179,8,0.4)' : 'none',
              letterSpacing: '0.02em',
            }}>{t.label}</button>
          );
        })}
      </div>
    </div>
  );
}

function ComposerCard({ onPost }) {
  return (
    <div style={{ padding: '4px 18px 8px' }}>
      <div className="gc2-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, #FDE047, #EAB308, #F97316, #DB2777, #EAB308)',
          padding: 2,
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: '#000', overflow: 'hidden',
          }}>
            <img src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=200" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          </div>
        </div>
        <button onClick={onPost} className="gc2-tap" style={{
          flex: 1, height: 44, borderRadius: 12,
          border: '1px solid #27272A', background: '#0F0F12',
          color: '#6B7280', textAlign: 'left', padding: '0 14px',
          fontSize: 13, fontWeight: 500,
        }}>Share a vibe with Lagos…</button>
        <button className="gc2-tap" style={{
          width: 44, height: 44, borderRadius: 12, border: 0,
          background: 'linear-gradient(180deg, #FDE047, #EAB308)',
          color: '#18181B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 14px rgba(234,179,8,0.5)',
        }}>
          <Icon name="camera" size={20} />
        </button>
      </div>
    </div>
  );
}

const V2_POSTS = [
  {
    id: 'p1',
    user: { name: 'Zilla', handle: 'zilla.ng', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=200', verified: true },
    time: '4m ago', loc: 'Sip & Smoke · Victoria Island',
    body: "Tonight's vibe is unreal. DJ MoreMuzik on the decks, full house, suya stand pulling crazy queues. Get here before midnight 🔥",
    image: '../../assets/lagos-club.jpg',
    vibe: 'Electric ⚡️',
    likes: 248, comments: 32, shares: 14,
  },
  {
    id: 'p2',
    user: { name: 'LagosEats', handle: 'lagoseats', avatar: 'https://images.unsplash.com/photo-1485230405346-71acb9518d9c?q=80&w=200', verified: true },
    time: '38m ago', loc: 'Tarragon · Lekki Phase 1',
    body: "The new tasting menu drops Friday. We snuck a preview. The smoked plantain alone is worth the trip across the bridge.",
    image: '../../assets/lagos-food.jpg',
    vibe: 'Vibing ✨',
    likes: 1240, comments: 87, shares: 64,
  },
  {
    id: 'p3',
    user: { name: 'David O.', handle: 'davidng', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200', verified: false },
    time: '2h ago', loc: 'Lekki Conservation Centre',
    body: "Photo walk Sunday — 8am start, coffee at the bird hide, canopy at 10. Drop a 🌿 if you're in.",
    image: null,
    vibe: null,
    likes: 64, comments: 28, shares: 4,
  },
];

function PostCardV2({ p, onOpen }) {
  return (
    <div className="gc2-card" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
      {/* author header */}
      <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          padding: p.user.verified ? 2 : 0,
          background: p.user.verified
            ? 'conic-gradient(from 0deg, #FDE047, #EAB308, #F97316, #EAB308)'
            : 'transparent',
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            border: p.user.verified ? '2px solid #000' : '2px solid #27272A',
            overflow: 'hidden', background: '#27272A',
          }}>
            <img src={p.user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{p.user.name}</span>
            {p.user.verified && (
              <span style={{ color: '#FACC15', display: 'inline-flex' }}>
                <Icon name="badge-check" size={14} />
              </span>
            )}
            <span style={{ fontSize: 12, color: '#6B7280' }}>· @{p.user.handle}</span>
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="map-pin" size={11} />
            <span>{p.loc}</span>
            <span>·</span>
            <span>{p.time}</span>
          </div>
        </div>
        <button className="gc2-tap" style={{ background: 'transparent', border: 0, color: '#9CA3AF' }}>
          <Icon name="more-horizontal" size={18} />
        </button>
      </div>

      {/* body */}
      <div style={{ padding: '0 14px 12px', fontSize: 14, color: '#E4E4E7', lineHeight: 1.5 }}>{p.body}</div>

      {/* image w/ optional vibe pill overlay */}
      {p.image && (
        <div style={{ position: 'relative', margin: '0 14px 12px', borderRadius: 14, overflow: 'hidden' }}>
          <img src={p.image} alt="" style={{ display: 'block', width: '100%', height: 220, objectFit: 'cover' }}/>
          {p.vibe && (
            <div style={{ position: 'absolute', top: 12, left: 12 }}>
              <span className="gc2-glass-pill">{p.vibe}</span>
            </div>
          )}
        </div>
      )}

      {/* engagement */}
      <div style={{
        padding: '10px 14px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ display: 'flex', gap: 18 }}>
          <button className="gc2-tap" style={{
            background: 'transparent', border: 0, color: '#9CA3AF',
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
          }}>
            <Icon name="heart" size={17} />
            <span style={{ color: '#fff' }}>{p.likes}</span>
          </button>
          <button className="gc2-tap" style={{
            background: 'transparent', border: 0, color: '#9CA3AF',
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
          }}>
            <Icon name="message-circle" size={17} />
            <span style={{ color: '#fff' }}>{p.comments}</span>
          </button>
          <button className="gc2-tap" style={{
            background: 'transparent', border: 0, color: '#9CA3AF',
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
          }}>
            <Icon name="share-2" size={17} />
            <span style={{ color: '#fff' }}>{p.shares}</span>
          </button>
        </div>
        <button className="gc2-tap" style={{
          background: 'transparent', border: 0, color: '#9CA3AF',
        }}>
          <Icon name="bookmark" size={18} />
        </button>
      </div>
    </div>
  );
}

// Communities subview
const V2_COMMUNITIES = [
  { id: 'c1', name: 'Nightlife Lagos',    members: 4820, emoji: '🌙', color: '#7C3AED', joined: true },
  { id: 'c2', name: 'Foodies United',     members: 3140, emoji: '🍕', color: '#EA580C', joined: true },
  { id: 'c3', name: 'Island Vibes',       members: 2680, emoji: '🏝️', color: '#0891B2', joined: false },
  { id: 'c4', name: 'Culture & Arts',     members: 1240, emoji: '🎨', color: '#DB2777', joined: false },
  { id: 'c5', name: 'Mainland Connect',   members: 980,  emoji: '🏙️', color: '#10B981', joined: false },
  { id: 'c6', name: 'Events & Concerts',  members: 5210, emoji: '🎵', color: '#4338CA', joined: true },
];

function CommunitiesList() {
  return (
    <div style={{ padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {V2_COMMUNITIES.map((c) => (
        <div key={c.id} className="gc2-card" style={{
          padding: 14, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: `linear-gradient(135deg, ${c.color}, ${c.color}88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
            boxShadow: `0 6px 18px ${c.color}33`,
          }}>{c.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{c.name}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
              <span style={{ color: '#FACC15', fontWeight: 700 }}>{c.members.toLocaleString()}</span> members
            </div>
          </div>
          <button className="gc2-tap" style={{
            padding: '8px 16px', borderRadius: 999,
            border: c.joined ? '1.5px solid #27272A' : 0,
            background: c.joined ? 'transparent' : 'linear-gradient(180deg, #FDE047, #EAB308)',
            color: c.joined ? '#9CA3AF' : '#18181B',
            fontWeight: 800, fontSize: 12,
            boxShadow: c.joined ? 'none' : '0 0 14px rgba(234,179,8,0.4)',
          }}>{c.joined ? 'Joined' : 'Join'}</button>
        </div>
      ))}
    </div>
  );
}

// People subview
const V2_PEOPLE = [
  { id: 'u1', name: 'Adaeze O.',  bio: 'Foodie · Lagos Mainland', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200', followers: 1240, follows: false, hot: true },
  { id: 'u2', name: 'Tunde M.',   bio: 'Promoter at Quilox',      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200', followers: 5840, follows: true,  hot: false },
  { id: 'u3', name: 'Bisi K.',    bio: 'Photographer · VI',       avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=200', followers: 820,  follows: false, hot: false },
  { id: 'u4', name: 'Femi A.',    bio: 'Detty December planner',  avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200', followers: 18300, follows: false, hot: true },
];

function PeopleList() {
  return (
    <div style={{ padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {V2_PEOPLE.map((u) => (
        <div key={u.id} className="gc2-card" style={{
          padding: 14, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              overflow: 'hidden', border: '2px solid #27272A',
            }}>
              <img src={u.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            </div>
            {u.hot && (
              <span style={{
                position: 'absolute', bottom: -3, right: -3,
                background: 'linear-gradient(135deg, #FDE047, #EAB308)',
                color: '#18181B', fontSize: 9, fontWeight: 900,
                padding: '2px 6px', borderRadius: 5,
                letterSpacing: '0.05em',
                boxShadow: '0 0 10px rgba(234,179,8,0.6)',
              }}>HOT</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{u.name}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{u.bio}</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>
              <span style={{ color: '#FACC15', fontWeight: 700 }}>{u.followers.toLocaleString()}</span> followers
            </div>
          </div>
          <button className="gc2-tap" style={{
            padding: '8px 14px', borderRadius: 999,
            border: u.follows ? '1.5px solid #27272A' : 0,
            background: u.follows ? 'transparent' : 'linear-gradient(180deg, #FDE047, #EAB308)',
            color: u.follows ? '#9CA3AF' : '#18181B',
            fontWeight: 800, fontSize: 12,
          }}>{u.follows ? 'Following' : 'Follow'}</button>
        </div>
      ))}
    </div>
  );
}

function SocialScreenV2() {
  const [tab, setTab] = React.useState('feed');
  return (
    <div className="gc2-screen">
      <AppHeaderV2 title="Social" />
      <SocialTabs tab={tab} onChange={setTab} />
      {tab === 'feed' && (
        <>
          <ComposerCard />
          <div style={{ padding: '4px 18px 18px' }}>
            {V2_POSTS.map((p) => <PostCardV2 key={p.id} p={p} />)}
          </div>
        </>
      )}
      {tab === 'communities' && <CommunitiesList />}
      {tab === 'people'      && <PeopleList />}
    </div>
  );
}

window.SocialScreenV2 = SocialScreenV2;
