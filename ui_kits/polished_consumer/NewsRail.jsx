// NewsRailV2 — bolder magazine-style cards, dramatic top-down gradient,
// big category badge, breaking dot for items < 30m old.

const V2_NEWS = [
  { id: 'n1', cat: 'Entertainment',  time: '2h ago',  title: 'Wizkid drops surprise track at Eko Hotel', summary: "A surprise appearance turned into chaos as thousands rushed the gates.", img: '../../assets/lagos-culture.jpg', breaking: false },
  { id: 'n2', cat: 'Politics',       time: '12m ago', title: 'Sanwo-Olu signs new transport bill at Alausa', summary: "Bill targets BRT corridor expansion across the Lagos Mainland.", img: null, gradient: 'linear-gradient(135deg,#0891B2,#3B82F6)', breaking: true },
  { id: 'n3', cat: 'Food',           time: '3d ago',  title: '10 jollof spots worth the Lagos traffic right now', summary: "From a Surulere hidden gem to a VI rooftop, here's where the smoky-rice crowd is heading.", img: '../../assets/lagos-food.jpg', breaking: false },
  { id: 'n4', cat: 'Traffic',        time: '8m ago',  title: 'Third Mainland Bridge partial closure', summary: "Maintenance crews on the Lagos-bound section through Sunday night.", img: null, gradient: 'linear-gradient(135deg,#EA580C,#EAB308)', breaking: true },
];

function NewsCardV2({ n, onOpen }) {
  return (
    <button onClick={() => onOpen?.(n)} className="gc2-tap" style={{
      flex: '0 0 auto', width: 260,
      background: 'linear-gradient(180deg, #18181B 0%, #0F0F12 100%)',
      border: '1px solid #27272A',
      borderRadius: 14, overflow: 'hidden',
      padding: 0, textAlign: 'left',
      boxShadow: '0 10px 22px rgba(0,0,0,0.5)',
    }}>
      <div style={{ position: 'relative', height: 128, background: n.gradient || '#18181B' }}>
        {n.img && <img src={n.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.2)' }} />}
        {/* dark vignette on bottom of image for category badge legibility */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7) 100%)',
        }}></div>
        <span style={{
          position: 'absolute', top: 10, left: 10,
          background: 'linear-gradient(180deg, #FDE047, #EAB308)',
          color: '#18181B',
          padding: '4px 9px', borderRadius: 5,
          fontSize: 10, fontWeight: 900,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          boxShadow: '0 2px 8px rgba(234,179,8,0.45)',
        }}>{n.cat}</span>
        {n.breaking && (
          <span style={{
            position: 'absolute', top: 10, right: 10,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(239,68,68,0.95)',
            color: '#fff',
            padding: '4px 8px', borderRadius: 5,
            fontSize: 9, fontWeight: 900,
            letterSpacing: '0.10em', textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'gc2Blink 1.2s infinite' }}></span>
            Breaking
          </span>
        )}
        <span style={{
          position: 'absolute', bottom: 10, left: 10,
          fontSize: 10, fontWeight: 700, color: '#fff',
          textShadow: '0 1px 2px rgba(0,0,0,0.7)',
          letterSpacing: '0.04em',
        }}>{n.time}</span>
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.32, marginBottom: 6, letterSpacing: '-0.005em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.title}</div>
        <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.summary}</div>
      </div>
    </button>
  );
}

function NewsRailV2({ onOpen, onSeeAll }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 className="gc2-section-h" style={{ marginBottom: 14 }}>
        <span>Latest <span className="accent">Lagos</span> News 📰</span>
        <button className="seeall" onClick={onSeeAll}>See All</button>
      </h2>
      <div className="gc2-rail" style={{ display: 'flex', gap: 12, padding: '4px 18px 8px' }}>
        {V2_NEWS.map((n) => <NewsCardV2 key={n.id} n={n} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

window.NewsRailV2 = NewsRailV2;
