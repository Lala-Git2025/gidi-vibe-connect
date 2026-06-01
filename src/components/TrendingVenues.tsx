import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Bookmark } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  location: string;
  rating: number;
  professional_media_urls?: string[];
}

const getVibe = (rating: number) => {
  if (rating >= 4.5) return 'Electric ⚡️';
  if (rating >= 4.0) return 'Buzzing 🔥';
  if (rating >= 3.5) return 'Vibing ✨';
  return 'Chill 🎵';
};

const getHereCount = (rating: number) => Math.floor(rating * 100 + Math.random() * 200) + 60;

const getTrend = (rank: number) => {
  if (rank === 0) return '↑ 41%';
  if (rank === 1) return '↑ 23%';
  if (rank === 2) return '↑ 14%';
  if (rank === 3) return '↑ 8%';
  return '— flat';
};

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1576442655380-1e828d09852f?q=80&w=1000';

export const TrendingVenues = () => {
  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['trending-venues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, location, rating, professional_media_urls')
        .order('rating', { ascending: false })
        .limit(6);

      if (error) throw error;
      return (data as Venue[]) || [];
    },
  });

  if (isLoading) {
    return (
      <section style={{ marginBottom: 24 }}>
        <h2 className="gc2-section-h" style={{ marginBottom: 14 }}>
          <span>
            Trending <span className="accent">Tonight</span> 🚀
          </span>
        </h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginBottom: 24 }}>
      <h2 className="gc2-section-h" style={{ marginBottom: 14 }}>
        <span>
          Trending <span className="accent">Tonight</span> 🚀
        </span>
        <button className="seeall">See All</button>
      </h2>

      <div
        className="gc2-rail"
        style={{ display: 'flex', gap: 14, padding: '4px 18px 8px' }}
      >
        {venues.map((venue, idx) => {
          const rank = idx + 1;
          const here = getHereCount(venue.rating);
          const trend = getTrend(idx);
          const isUp = trend.startsWith('↑');
          return (
            <div
              key={venue.id}
              className="gc2-tap"
              role="button"
              tabIndex={0}
              style={{
                flex: '0 0 auto',
                width: 268,
                height: 320,
                borderRadius: 22,
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                boxShadow: '0 20px 36px rgba(0,0,0,0.55)',
              }}
            >
              <img
                src={venue.professional_media_urls?.[0] || FALLBACK_IMG}
                alt={venue.name}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'saturate(1.2) contrast(1.05)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.1) 70%, transparent 100%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 22,
                  boxShadow:
                    'inset 0 1px 0 rgba(234,179,8,0.5), inset 0 0 0 1px rgba(234,179,8,0.15)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span
                      style={{
                        fontFamily: "'Orbitron', system-ui, sans-serif",
                        fontWeight: 900,
                        fontSize: 11,
                        color: '#FACC15',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                      }}
                    >
                      #{rank} Tonight
                    </span>
                    <div className="gc2-glass-pill">{getVibe(venue.rating)}</div>
                  </div>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="gc2-tap"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.16)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    aria-label="Bookmark"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      letterSpacing: '-0.01em',
                      color: '#fff',
                      lineHeight: 1.1,
                      textShadow: '0 2px 6px rgba(0,0,0,0.8)',
                    }}
                  >
                    {venue.name}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      marginTop: 5,
                      fontSize: 13,
                      color: '#E4E4E7',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    }}
                  >
                    <MapPin className="w-3 h-3" />
                    <span>{venue.location}</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 12,
                      padding: '8px 12px',
                      background: 'rgba(0,0,0,0.55)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex' }}>
                        {['#F97316', '#3B82F6', '#10B981'].map((c, i) => (
                          <div
                            key={i}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              border: '2px solid #000',
                              background: c,
                              marginLeft: i === 0 ? 0 : -8,
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>
                        <span style={{ color: '#FACC15' }}>{here}</span> here now
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: isUp ? '#34D399' : '#9CA3AF',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {trend}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
