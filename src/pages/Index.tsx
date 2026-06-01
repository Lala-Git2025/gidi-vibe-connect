import { Header } from "@/components/Header";
import { StorySection } from "@/components/StorySection";
import { CategoryGrid } from "@/components/CategoryGrid";
import { LiveNewsSection } from "@/components/LiveNewsSection";
import { TrafficAlert } from "@/components/TrafficAlert";
import { VibeCheck } from "@/components/VibeCheck";
import { TrendingVenues } from "@/components/TrendingVenues";
import { BottomNavigation } from "@/components/BottomNavigation";

const PolishedGreeting = () => {
  const hour = new Date().getHours();
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const part =
    hour < 12 ? 'MORNING' :
    hour < 17 ? 'AFTERNOON' :
    hour < 21 ? 'EVENING' : 'NIGHT';

  return (
    <div style={{ padding: '12px 18px 4px' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.24em',
          color: '#9CA3AF',
          textTransform: 'uppercase',
        }}
      >
        <span>{day} </span>
        <span style={{ color: '#FACC15' }}>{part}</span>
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: '-0.015em',
          color: '#fff',
          lineHeight: 1.1,
        }}
      >
        What's the{' '}
        <span
          style={{
            background: 'linear-gradient(180deg, #FDE047, #EAB308)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          vibe
        </span>{' '}
        tonight?
      </div>
    </div>
  );
};

const Index = () => {
  return (
    <div className="gc2-screen dark" style={{ paddingBottom: '88px' }}>
      <Header />

      <main className="pt-16">
        <PolishedGreeting />
        <StorySection />
        <CategoryGrid />
        <VibeCheck />
        <div style={{ height: 20 }} />
        <TrendingVenues />
        <LiveNewsSection />
        <TrafficAlert />
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Index;
