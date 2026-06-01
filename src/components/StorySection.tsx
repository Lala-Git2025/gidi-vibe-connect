import { Plus } from "lucide-react";

interface Story {
  id: string;
  user: string;
  image: string;
  isCreator: boolean;
}

const STORIES: Story[] = [
  { id: 's1', user: 'Zilla', image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=200', isCreator: true },
  { id: 's2', user: 'LagosEats', image: 'https://images.unsplash.com/photo-1485230405346-71acb9518d9c?q=80&w=200', isCreator: true },
  { id: 's3', user: 'David', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200', isCreator: false },
  { id: 's4', user: 'Sarah', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200', isCreator: false },
  { id: 's5', user: 'Mike', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200', isCreator: false },
  { id: 's6', user: 'Linda', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200', isCreator: false },
];

const ringFor = (kind: 'creator' | 'peer') =>
  kind === 'creator'
    ? 'conic-gradient(from 0deg, #FDE047, #EAB308, #F97316, #DB2777, #EAB308, #FDE047)'
    : 'conic-gradient(from 0deg, #A855F7, #DB2777, #F97316, #A855F7)';

export const StorySection = () => {
  return (
    <div style={{ padding: '12px 0 18px' }}>
      <div className="gc2-rail" style={{ display: 'flex', gap: 14, padding: '0 18px' }}>
        {/* Add My Vibe */}
        <button
          className="gc2-tap"
          style={{
            background: 'transparent',
            border: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            minWidth: 72,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              border: '2px dashed #3F3F46',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: '#18181B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FACC15',
              }}
            >
              <Plus className="w-6 h-6" />
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              maxWidth: 72,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            My Vibe
          </span>
        </button>

        {STORIES.map((story) => {
          const kind: 'creator' | 'peer' = story.isCreator ? 'creator' : 'peer';
          return (
            <button
              key={story.id}
              className="gc2-tap"
              style={{
                background: 'transparent',
                border: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                minWidth: 72,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: ringFor(kind),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'gc2RingRotate 6s linear infinite',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    border: '3px solid #000',
                    overflow: 'hidden',
                    animation: 'gc2RingRotate 6s linear infinite reverse',
                  }}
                >
                  <img
                    src={story.image}
                    alt={story.user}
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                {story.isCreator && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #FDE047, #EAB308)',
                      border: '3px solid #000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 10px rgba(234,179,8,0.8)',
                      fontSize: 10,
                    }}
                  >
                    ⭐
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  maxWidth: 72,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {story.user}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
