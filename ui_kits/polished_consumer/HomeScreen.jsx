// HomeScreenV2 — the polished home view.

function GreetingV2() {
  const [parts, setParts] = React.useState(['SATURDAY', 'NIGHT']);
  React.useEffect(() => {
    const h = new Date().getHours();
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const part = h < 12 ? 'MORNING' : h < 17 ? 'AFTERNOON' : h < 21 ? 'EVENING' : 'NIGHT';
    setParts([day, part]);
  }, []);

  return (
    <div style={{ padding: '12px 18px 4px' }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.24em',
        color: '#9CA3AF', textTransform: 'uppercase',
      }}>
        <span>{parts[0]} </span>
        <span style={{ color: '#FACC15' }}>{parts[1]}</span>
      </div>
      <div style={{
        marginTop: 6,
        fontSize: 22, fontWeight: 900, letterSpacing: '-0.015em',
        color: '#fff', lineHeight: 1.1,
      }}>
        What's the <span style={{
          background: 'linear-gradient(180deg, #FDE047, #EAB308)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>vibe</span> tonight?
      </div>
    </div>
  );
}

function HomeScreenV2({ onPickCategory }) {
  return (
    <div className="gc2-screen">
      <AppHeaderV2 />
      <GreetingV2 />
      <StoryRailV2 />
      <CategoryGridV2 onPick={onPickCategory} />
      <VibeCheckV2 />
      <div style={{ height: 20 }}></div>
      <TrendingVenuesV2 />
      <NewsRailV2 />
      <TrafficAlertV2 />
      <div style={{ height: 16 }}></div>
    </div>
  );
}

window.HomeScreenV2 = HomeScreenV2;
