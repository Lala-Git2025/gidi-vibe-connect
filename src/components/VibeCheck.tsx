import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VibeData {
  area: string;
  count: number;
  vibe: string;
  emoji: string;
}

const PINGS = [
  { x: '54%', y: '46%', color: '#FACC15', label: 'VI',       big: true },
  { x: '74%', y: '54%', color: '#FACC15', label: 'Lekki',    big: false },
  { x: '20%', y: '28%', color: '#34D399', label: 'Ikeja',    big: false },
  { x: '44%', y: '50%', color: '#60A5FA', label: 'Ikoyi',    big: false },
  { x: '38%', y: '20%', color: '#C084FC', label: 'Surulere', big: false },
];

const VibePing = ({ x, y, color, label, big }: { x: string; y: string; color: string; label: string; big: boolean }) => {
  const size = big ? 44 : 32;
  return (
    <div style={{ position: 'absolute', top: y, left: x }}>
      <div
        style={{
          position: 'absolute',
          width: size + 14,
          height: size + 14,
          borderRadius: '50%',
          background: color,
          opacity: 0.25,
          filter: 'blur(2px)',
          animation: 'gc2Ping 2.4s ease-out infinite',
          left: -7,
          top: -7,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
          width: size - 8,
          height: size - 8,
          borderRadius: '50%',
          background: color,
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          width: size - 16,
          height: size - 16,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 10px ${color}`,
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: size + 4,
          left: -10,
          fontSize: 9,
          fontWeight: 800,
          color: '#fff',
          background: 'rgba(0,0,0,0.7)',
          padding: '2px 7px',
          borderRadius: 5,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const VibeCheck = () => {
  const [vibeData, setVibeData] = useState<VibeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVibeData();
  }, []);

  const fetchVibeData = async () => {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('location, rating')
        .order('rating', { ascending: false })
        .limit(50);

      if (error) throw error;

      const areaCounts: Record<string, number> = {};
      (data || []).forEach((venue: { location: string }) => {
        const area = venue.location.split(',')[0].trim();
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      });

      let maxArea = 'Victoria Island';
      let maxCount = 0;
      Object.entries(areaCounts).forEach(([area, count]) => {
        if (count > maxCount) {
          maxCount = count;
          maxArea = area;
        }
      });

      const { vibe, emoji } =
        maxCount >= 20 ? { vibe: 'Electric', emoji: '⚡️' } :
        maxCount >= 10 ? { vibe: 'Buzzing',  emoji: '🔥' } :
        maxCount >= 5  ? { vibe: 'Vibing',   emoji: '✨' } :
                         { vibe: 'Chill',    emoji: '🎵' };

      setVibeData({ area: maxArea, count: maxCount, vibe, emoji });
    } catch (error) {
      console.error('Error fetching vibe data:', error);
      setVibeData({ area: 'Victoria Island', count: 24, vibe: 'Electric', emoji: '⚡️' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4px 18px 6px' }}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
        </div>
      </div>
    );
  }

  const area = vibeData?.area || 'Victoria Island';
  const count = vibeData?.count || 24;
  const vibe = vibeData?.vibe || 'Electric';
  const emoji = vibeData?.emoji || '⚡️';

  return (
    <div style={{ padding: '4px 18px 6px' }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 28,
          padding: 3,
          background: 'conic-gradient(from 0deg, #FDE047, #EAB308, #F97316, #EAB308, #FDE047)',
          animation: 'gc2BorderBreathe 3.2s ease-in-out infinite',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: 218,
            borderRadius: 25,
            overflow: 'hidden',
            background: '#000',
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1578041237426-2a5c5f90c31e?w=1200&q=80"
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.55,
              filter: 'saturate(1.3) contrast(1.1)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.7) 100%)',
            }}
          />

          {/* faint gold grid */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {[25, 50, 75].map((v) => (
              <div
                key={'h' + v}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: v + '%',
                  height: 1,
                  background:
                    'linear-gradient(90deg, transparent, rgba(250,204,21,0.18), transparent)',
                }}
              />
            ))}
            {[25, 50, 75].map((v) => (
              <div
                key={'v' + v}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: v + '%',
                  width: 1,
                  background:
                    'linear-gradient(180deg, transparent, rgba(250,204,21,0.18), transparent)',
                }}
              />
            ))}
          </div>

          {PINGS.map((p) => (
            <VibePing key={p.label} {...p} />
          ))}

          <div style={{ position: 'absolute', left: 16, right: 16, top: 14 }}>
            <span className="gc2-eyebrow">
              <span className="live-pip" />
              Live · Vibe Check
            </span>
          </div>

          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
            <div
              style={{
                fontFamily: "'Orbitron', system-ui, sans-serif",
                fontWeight: 900,
                fontSize: 26,
                lineHeight: 1.05,
                color: '#fff',
                textShadow: '0 2px 8px rgba(0,0,0,0.85)',
                letterSpacing: '-0.01em',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#fff',
                  opacity: 0.85,
                  marginBottom: 2,
                }}
              >
                {area} is
              </span>
              <span
                style={{
                  background: 'linear-gradient(180deg, #FDE047, #FACC15, #EAB308)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 16px rgba(234,179,8,0.6))',
                  animation: 'gc2Breathe 3s ease-in-out infinite',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  fontSize: 30,
                }}
              >
                {vibe} {emoji}
              </span>
            </div>
            <div
              style={{
                marginTop: 7,
                fontSize: 12,
                fontWeight: 700,
                color: '#FBBF24',
                letterSpacing: '0.04em',
                textShadow: '0 1px 3px rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Zap className="w-3 h-3" />
              {count} venues active right now
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
