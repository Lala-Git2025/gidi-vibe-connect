import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useState, useEffect } from "react";
import { Camera, MapPin, MoreHorizontal, MessageCircle, Heart, Share2, Bookmark, BadgeCheck } from "lucide-react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";

// The generated Supabase types lag behind the runtime schema for
// `communities` / `community_members` / `social_posts`. Cast to a loose
// client here so the typed client stays strict everywhere else.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = supabaseTyped;
import { useToast } from "@/hooks/use-toast";

interface Community {
  id: string;
  name: string;
  description: string;
  icon: string;
  member_count: number;
  is_joined?: boolean;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  community_id: string;
  likes_count: number;
  comments_count: number;
  profiles?: { full_name: string };
  communities?: { name: string };
}

const COMMUNITY_TINT: Record<string, string> = {
  '🌙': '#7C3AED',
  '🍕': '#EA580C',
  '🏝️': '#0891B2',
  '🎨': '#DB2777',
  '🏙️': '#10B981',
  '🎵': '#4338CA',
  '🍔': '#EA580C',
};

const tintFor = (icon: string) => COMMUNITY_TINT[icon] || '#7C3AED';

const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const postDate = new Date(dateString);
  const diffInMins = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60));
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return `${diffInDays}d ago`;
};

const SocialTabs = ({ tab, onChange }: { tab: 'feed' | 'communities' | 'people'; onChange: (t: 'feed' | 'communities' | 'people') => void }) => {
  const tabs: Array<{ id: 'feed' | 'communities' | 'people'; label: string }> = [
    { id: 'feed', label: 'Feed' },
    { id: 'communities', label: 'Communities' },
    { id: 'people', label: 'People' },
  ];
  return (
    <div style={{ padding: '14px 18px 8px' }}>
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: '#0F0F12',
          border: '1px solid #27272A',
          borderRadius: 14,
          padding: 5,
        }}
      >
        {tabs.map((t) => {
          const a = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className="gc2-tap"
              style={{
                flex: 1,
                border: 0,
                padding: '9px 0',
                borderRadius: 10,
                background: a ? 'linear-gradient(180deg, #FDE047, #EAB308)' : 'transparent',
                color: a ? '#18181B' : '#9CA3AF',
                fontWeight: a ? 800 : 600,
                fontSize: 13,
                boxShadow: a ? '0 0 16px rgba(234,179,8,0.4)' : 'none',
                letterSpacing: '0.02em',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ComposerCard = () => (
  <div style={{ padding: '4px 18px 8px' }}>
    <div
      className="gc2-card"
      style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background:
            'conic-gradient(from 0deg, #FDE047, #EAB308, #F97316, #DB2777, #EAB308)',
          padding: 2,
          animation: 'gc2RingRotate 10s linear infinite',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: '#000',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FACC15',
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          You
        </div>
      </div>
      <button
        className="gc2-tap"
        style={{
          flex: 1,
          height: 44,
          borderRadius: 12,
          border: '1px solid #27272A',
          background: '#0F0F12',
          color: '#6B7280',
          textAlign: 'left',
          padding: '0 14px',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Share a vibe with Lagos…
      </button>
      <button
        className="gc2-tap"
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          border: 0,
          background: 'linear-gradient(180deg, #FDE047, #EAB308)',
          color: '#18181B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 14px rgba(234,179,8,0.5)',
          cursor: 'pointer',
        }}
        aria-label="Add photo"
      >
        <Camera className="w-5 h-5" />
      </button>
    </div>
  </div>
);

const PostCard = ({ post }: { post: Post }) => {
  const fullName = post.profiles?.full_name || 'Anonymous User';
  return (
    <div
      className="gc2-card"
      style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}
    >
      <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            padding: 2,
            background: 'conic-gradient(from 0deg, #FDE047, #EAB308, #F97316, #EAB308)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '2px solid #000',
              overflow: 'hidden',
              background: '#27272A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FACC15',
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {fullName
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{fullName}</span>
            <BadgeCheck className="w-3.5 h-3.5" color="#FACC15" />
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#9CA3AF',
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <MapPin className="w-3 h-3" />
            <span>{post.communities?.name || 'General'}</span>
            <span>·</span>
            <span>{formatTimeAgo(post.created_at)}</span>
          </div>
        </div>
        <button
          className="gc2-tap"
          style={{ background: 'transparent', border: 0, color: '#9CA3AF', cursor: 'pointer' }}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div
        style={{
          padding: '0 14px 12px',
          fontSize: 14,
          color: '#E4E4E7',
          lineHeight: 1.5,
        }}
      >
        {post.content}
      </div>

      <div
        style={{
          padding: '10px 14px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div style={{ display: 'flex', gap: 18 }}>
          <button
            className="gc2-tap"
            style={{
              background: 'transparent',
              border: 0,
              color: '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Heart className="w-4 h-4" />
            <span style={{ color: '#fff' }}>{post.likes_count || 0}</span>
          </button>
          <button
            className="gc2-tap"
            style={{
              background: 'transparent',
              border: 0,
              color: '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <MessageCircle className="w-4 h-4" />
            <span style={{ color: '#fff' }}>{post.comments_count || 0}</span>
          </button>
          <button
            className="gc2-tap"
            style={{
              background: 'transparent',
              border: 0,
              color: '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        <button
          className="gc2-tap"
          style={{ background: 'transparent', border: 0, color: '#9CA3AF', cursor: 'pointer' }}
        >
          <Bookmark className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const Social = () => {
  const [activeTab, setActiveTab] = useState<'feed' | 'communities' | 'people'>('feed');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCommunities();
    fetchFeedPosts();
  }, []);

  const fetchCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('is_active', true)
        .order('member_count', { ascending: false });

      if (error) throw error;

      if (data) {
        setCommunities(data.map((c) => ({ ...c, is_joined: false })));
      }
    } catch (error) {
      console.error('Error fetching communities:', error);
      toast({
        title: "Error",
        description: "Failed to load communities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_posts')
        .select(`
          *,
          profiles!social_posts_user_id_fkey(full_name),
          communities(name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (data) setFeedPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to join communities",
          variant: "destructive",
        });
        return;
      }

      const community = communities.find((c) => c.id === communityId);
      const isJoined = community?.is_joined;

      if (isJoined) {
        const { error } = await supabase
          .from('community_members')
          .delete()
          .eq('user_id', user.id)
          .eq('community_id', communityId);
        if (error) throw error;
        toast({ title: "Left Community", description: `You've left ${community?.name}` });
      } else {
        const { error } = await supabase
          .from('community_members')
          .insert({ user_id: user.id, community_id: communityId, role: 'member' });
        if (error) throw error;
        toast({ title: "Joined Community", description: `Welcome to ${community?.name}!` });
      }

      setCommunities(
        communities.map((c) => (c.id === communityId ? { ...c, is_joined: !isJoined } : c)),
      );
      fetchCommunities();
    } catch (error) {
      console.error('Error joining/leaving community:', error);
      toast({
        title: "Error",
        description: "Failed to update community membership",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="gc2-screen dark" style={{ paddingBottom: '88px' }}>
      <Header />
      <main className="pt-16">
        <SocialTabs tab={activeTab} onChange={setActiveTab} />

        {activeTab === 'feed' && (
          <>
            <ComposerCard />
            <div style={{ padding: '4px 18px 18px' }}>
              {feedPosts.length === 0 ? (
                <div
                  className="gc2-card"
                  style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}
                >
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: '#fff',
                      marginBottom: 6,
                    }}
                  >
                    No Posts Yet
                  </h3>
                  <p style={{ fontSize: 12 }}>Be the first to share something with the community!</p>
                </div>
              ) : (
                feedPosts.map((p) => <PostCard key={p.id} post={p} />)
              )}
            </div>
          </>
        )}

        {activeTab === 'communities' && (
          <div
            style={{
              padding: '4px 18px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {loading ? (
              <div className="gc2-card" style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>
                Loading communities…
              </div>
            ) : communities.length === 0 ? (
              <div className="gc2-card" style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>
                No communities yet
              </div>
            ) : (
              communities.map((c) => {
                const tint = tintFor(c.icon);
                return (
                  <div
                    key={c.id}
                    className="gc2-card"
                    style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: `linear-gradient(135deg, ${tint}, ${tint}88)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 26,
                        boxShadow: `0 6px 18px ${tint}33`,
                      }}
                    >
                      {c.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                        <span style={{ color: '#FACC15', fontWeight: 700 }}>
                          {c.member_count.toLocaleString()}
                        </span>{' '}
                        members
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinCommunity(c.id)}
                      className="gc2-tap"
                      style={{
                        padding: '8px 16px',
                        borderRadius: 999,
                        border: c.is_joined ? '1.5px solid #27272A' : 0,
                        background: c.is_joined
                          ? 'transparent'
                          : 'linear-gradient(180deg, #FDE047, #EAB308)',
                        color: c.is_joined ? '#9CA3AF' : '#18181B',
                        fontWeight: 800,
                        fontSize: 12,
                        boxShadow: c.is_joined ? 'none' : '0 0 14px rgba(234,179,8,0.4)',
                        cursor: 'pointer',
                      }}
                    >
                      {c.is_joined ? 'Joined' : 'Join'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'people' && (
          <div
            style={{
              padding: '4px 18px 18px',
              textAlign: 'center',
            }}
          >
            <div
              className="gc2-card"
              style={{ padding: 48, color: '#9CA3AF' }}
            >
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#fff',
                  marginBottom: 6,
                }}
              >
                Find People
              </h3>
              <p style={{ fontSize: 12 }}>
                Discover and connect with other members of the GIDI community
              </p>
            </div>
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Social;
