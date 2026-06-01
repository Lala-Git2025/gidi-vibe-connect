import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BadgeCheck, ArrowLeft, Share2, Settings as SettingsIcon, Camera, Grid3X3, BarChart3, Award, MapPin, Zap, CalendarPlus, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Tab = 'posts' | 'stats' | 'badges';

const HERO_BANNER =
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1600&auto=format&fit=crop';

const StatBlock = ({ num, label, accent }: { num: string | number; label: string; accent?: boolean }) => (
  <div style={{ textAlign: 'center', flex: 1 }}>
    <div
      style={{
        fontFamily: "'Orbitron', system-ui, sans-serif",
        fontWeight: 900,
        fontSize: 28,
        lineHeight: 1,
        background: accent
          ? 'linear-gradient(180deg, #FDE047, #EAB308)'
          : 'linear-gradient(180deg,#fff,#A1A1AA)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      {num}
    </div>
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        marginTop: 4,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: '#9CA3AF',
      }}
    >
      {label}
    </div>
  </div>
);

const VibeMetric = ({
  Icon,
  num,
  max,
  label,
  color,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  num: number;
  max: number;
  label: string;
  color: string;
}) => {
  const pct = Math.min(100, (num / max) * 100);
  return (
    <div className="gc2-card" style={{ padding: 14, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: `${color}22`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <span
          style={{
            fontSize: 10,
            color: '#6B7280',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          this wk
        </span>
      </div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {num}
        </span>
        <span style={{ fontSize: 12, color: '#6B7280' }}>/ {max}</span>
      </div>
      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: 600 }}>{label}</div>
      <div
        style={{
          marginTop: 10,
          height: 5,
          background: '#27272A',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </div>
    </div>
  );
};

const TabSwitcher = ({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) => {
  const tabs: Array<{ id: Tab; Icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'posts', Icon: Grid3X3 },
    { id: 'stats', Icon: BarChart3 },
    { id: 'badges', Icon: Award },
  ];
  return (
    <div
      style={{
        margin: '4px 18px 16px',
        background: '#0F0F12',
        border: '1px solid #27272A',
        borderRadius: 14,
        padding: 4,
        display: 'flex',
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
              padding: '10px 0',
              borderRadius: 10,
              background: a ? 'linear-gradient(180deg, #FDE047, #EAB308)' : 'transparent',
              color: a ? '#18181B' : '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: a ? '0 0 16px rgba(234,179,8,0.4)' : 'none',
              cursor: 'pointer',
            }}
          >
            <t.Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
};

const Badges = ({ isGuest }: { isGuest: boolean }) => {
  const items = [
    { name: 'Early Bird',     emoji: '🌅', desc: 'First 100 users',         have: !isGuest },
    { name: 'Vibe Master',    emoji: '⚡️', desc: '50 Electric check-ins',  have: false },
    { name: 'Trendsetter',    emoji: '🔥', desc: '10 trending venues',     have: false },
    { name: 'Lagos Native',   emoji: '🏝️', desc: 'Visit all 6 areas',     have: false },
    { name: 'Detty Veteran',  emoji: '🎉', desc: 'Detty December events', have: false },
    { name: 'Foodie Royalty', emoji: '🍕', desc: '25 restaurant reviews', have: false },
  ];
  return (
    <div style={{ padding: '0 18px 18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {items.map((b) => (
          <div
            key={b.name}
            className="gc2-card"
            style={{
              padding: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity: b.have ? 1 : 0.42,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: b.have ? 'linear-gradient(135deg, #FDE047, #EAB308)' : '#27272A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                boxShadow: b.have ? '0 0 14px rgba(234,179,8,0.4)' : 'none',
                flexShrink: 0,
              }}
            >
              {b.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{b.name}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Stats = ({ isGuest }: { isGuest: boolean }) => (
  <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ display: 'flex', gap: 10 }}>
      <VibeMetric Icon={Zap}          num={isGuest ? 0 : 18} max={25}  label="Vibes posted"  color="#FACC15" />
      <VibeMetric Icon={MapPin}       num={isGuest ? 0 : 12} max={20}  label="Check-ins"     color="#34D399" />
    </div>
    <div style={{ display: 'flex', gap: 10 }}>
      <VibeMetric Icon={CalendarPlus} num={isGuest ? 0 : 3}  max={10}  label="Events RSVP'd" color="#60A5FA" />
      <VibeMetric Icon={Users}        num={isGuest ? 0 : 47} max={100} label="New followers" color="#F472B6" />
    </div>
    <div className="gc2-card-elev" style={{ padding: 16, marginTop: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div
            style={{
              fontSize: 11,
              color: '#9CA3AF',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Level {isGuest ? 1 : 7}
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 4, letterSpacing: '-0.01em' }}>
            {isGuest ? 'New Explorer' : 'Lagos Veteran'}
          </div>
        </div>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'conic-gradient(from 0deg, #FDE047, #EAB308, #F97316, #EAB308, #FDE047)',
            padding: 2,
            animation: 'gc2RingRotate 10s linear infinite',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: '#0F0F12',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Orbitron', system-ui, sans-serif",
              fontWeight: 900,
              fontSize: 20,
              color: '#FACC15',
              animation: 'gc2RingRotate 10s linear infinite reverse',
            }}
          >
            {isGuest ? 1 : 7}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span>{isGuest ? '0 XP' : '1,240 XP'}</span>
        <span>
          <span style={{ color: '#FACC15', fontWeight: 700 }}>{isGuest ? '100 XP' : '360 XP'}</span>{' '}
          to Level {isGuest ? 2 : 8}
        </span>
      </div>
      <div style={{ height: 8, background: '#27272A', borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            width: isGuest ? '0%' : '77%',
            height: '100%',
            background: 'linear-gradient(90deg, #FDE047, #EAB308)',
            boxShadow: '0 0 12px rgba(234,179,8,0.6)',
          }}
        />
      </div>
    </div>
  </div>
);

const EmptyPosts = ({ isGuest }: { isGuest: boolean }) => (
  <div style={{ padding: '0 18px 18px' }}>
    <div className="gc2-card" style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>
      <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
        No posts yet
      </h3>
      <p style={{ fontSize: 12, maxWidth: 280, margin: '0 auto' }}>
        {isGuest
          ? 'Sign in to start sharing vibes with Lagos.'
          : 'Your posts and check-ins will appear here as a grid.'}
      </p>
    </div>
  </div>
);

const Profile = () => {
  const [isGuest, setIsGuest] = useState(true);
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string } } | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('posts');
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsGuest(!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setIsGuest(!user);
  };

  const userName = isGuest ? 'Guest User' : (user?.user_metadata?.full_name || user?.email || 'User');
  const userHandle = isGuest ? '@guest' : `@${(user?.email || '').split('@')[0]}`;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: 'Welcome back!', description: "You've successfully signed in." });
      setAuthDialogOpen(false);
      setEmail('');
      setPassword('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid email or password';
      toast({ title: 'Sign In Failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      toast({ title: 'Account Created!', description: 'Please check your email to verify your account.' });
      setAuthDialogOpen(false);
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create account';
      toast({ title: 'Sign Up Failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({ title: 'Signed Out', description: "You've been successfully signed out." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to sign out';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <div className="gc2-screen" style={{ paddingBottom: '88px' }}>
      <main>
        {/* Hero banner */}
        <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
          <img
            src={HERO_BANNER}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'saturate(1.3) brightness(0.7)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, #000 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => window.history.back()}
              className="gc2-tap"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: 0,
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(6px)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="gc2-tap"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: 0,
                  background: 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(6px)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                className="gc2-tap"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: 0,
                  background: 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(6px)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Avatar overlapping banner */}
        <div
          style={{
            marginTop: -52,
            padding: '0 18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: '50%',
              padding: 3,
              background:
                'conic-gradient(from 0deg, #FDE047, #EAB308, #F97316, #DB2777, #EAB308, #FDE047)',
              animation: 'gc2RingRotate 8s linear infinite',
              boxShadow: '0 0 32px rgba(234,179,8,0.45)',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '3px solid #000',
                overflow: 'hidden',
                background: '#18181B',
                animation: 'gc2RingRotate 8s linear infinite reverse',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FACC15',
                fontWeight: 900,
                fontSize: 32,
              }}
            >
              {userName
                .split(' ')
                .map((w) => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.01em', color: '#fff' }}>
              {userName}
            </span>
            {!isGuest && <BadgeCheck className="w-4.5 h-4.5" color="#FACC15" />}
          </div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 3 }}>
            {userHandle} · Lagos, Nigeria
          </div>
          <div
            style={{
              fontSize: 13,
              color: '#E4E4E7',
              textAlign: 'center',
              marginTop: 12,
              lineHeight: 1.5,
              maxWidth: 280,
            }}
          >
            {isGuest
              ? 'Sign in to start exploring Lagos and earning your stripes.'
              : 'Lagos local. Always chasing the next vibe.'}
          </div>

          {/* stat row */}
          <div
            style={{
              marginTop: 18,
              width: '100%',
              maxWidth: 420,
              background: 'linear-gradient(180deg, rgba(234,179,8,0.06), transparent)',
              border: '1px solid rgba(234,179,8,0.18)',
              borderRadius: 16,
              padding: '14px 0',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <StatBlock num={isGuest ? 0 : 247}  label="Vibes" accent />
            <div style={{ width: 1, alignSelf: 'stretch', background: '#27272A' }} />
            <StatBlock num={isGuest ? 0 : '1.2k'} label="Followers" />
            <div style={{ width: 1, alignSelf: 'stretch', background: '#27272A' }} />
            <StatBlock num={isGuest ? 0 : 318}  label="Following" />
          </div>

          {/* action row */}
          <div style={{ width: '100%', maxWidth: 420, marginTop: 14, display: 'flex', gap: 8 }}>
            {isGuest ? (
              <>
                <button
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthDialogOpen(true);
                  }}
                  className="gc2-tap"
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 12,
                    border: 0,
                    background: 'linear-gradient(180deg, #FDE047, #EAB308)',
                    color: '#18181B',
                    fontWeight: 800,
                    fontSize: 14,
                    boxShadow: '0 6px 18px rgba(234,179,8,0.4)',
                    cursor: 'pointer',
                  }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthDialogOpen(true);
                  }}
                  className="gc2-tap"
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid #27272A',
                    background: '#0F0F12',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                <button
                  className="gc2-tap"
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 12,
                    border: 0,
                    background: 'linear-gradient(180deg, #FDE047, #EAB308)',
                    color: '#18181B',
                    fontWeight: 800,
                    fontSize: 14,
                    boxShadow: '0 6px 18px rgba(234,179,8,0.4)',
                    cursor: 'pointer',
                  }}
                >
                  Edit Profile
                </button>
                <button
                  className="gc2-tap"
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid #27272A',
                    background: '#0F0F12',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                >
                  <Camera className="w-4 h-4" />
                  New Vibe
                </button>
              </>
            )}
          </div>

          {!isGuest && (
            <button
              onClick={handleSignOut}
              style={{
                marginTop: 12,
                fontSize: 12,
                color: '#9CA3AF',
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          )}
        </div>

        <div style={{ height: 22 }} />
        <TabSwitcher tab={tab} onChange={setTab} />
        {tab === 'posts'  && <EmptyPosts isGuest={isGuest} />}
        {tab === 'stats'  && <Stats isGuest={isGuest} />}
        {tab === 'badges' && <Badges isGuest={isGuest} />}
        <div style={{ height: 12 }} />
      </main>

      {/* Auth Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">
              {authMode === 'signin' ? 'Welcome Back!' : 'Create Account'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {authMode === 'signin'
                ? 'Sign in to your account to continue'
                : 'Join Gidi Vibe Connect and start exploring Lagos'}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp}
            className="space-y-4 mt-4"
          >
            {authMode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-white">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-black font-semibold"
            >
              {loading
                ? 'Processing...'
                : authMode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
            </Button>

            <div className="text-center text-sm text-gray-400">
              {authMode === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className="text-primary hover:underline font-semibold"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className="text-primary hover:underline font-semibold"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};

export default Profile;
