import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  Profile,
  BusinessSubscription,
  VerificationRequest,
  BusinessSignupData,
  BusinessAuthContextType,
} from '../types/business';

const BusinessAuthContext = createContext<BusinessAuthContextType | undefined>(undefined);

export function BusinessAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<BusinessSubscription | null>(null);
  const [verification, setVerification] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    // refreshSession() REJECTS when the stored refresh token is expired or has
    // already been rotated (e.g. two tabs, or a long-idle tab). Without a catch
    // the whole chain dies silently, setLoading(false) never runs, and the
    // layout spins forever — so every branch here is wrapped.
    async function init() {
      try {
        let session = null;
        try {
          const res = await supabase.auth.refreshSession();
          session = res.data?.session ?? null;
        } catch {
          session = null;
        }

        // Refresh failed or returned nothing — fall back to whatever is stored.
        if (!session) {
          try {
            const res = await supabase.auth.getSession();
            session = res.data?.session ?? null;
          } catch {
            session = null;
          }
        }

        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          await fetchUserData(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Business auth init failed:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    init();

    // Safety net — never leave the portal stuck on a spinner.
    const timeout = setTimeout(() => {
      if (mounted) setLoading(prev => (prev ? false : prev));
    }, 8000);

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setSubscription(null);
          setVerification(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      authSubscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile. maybeSingle() so a missing row is data, not an error;
      // one retry covers trigger latency right after signup.
      let { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileErr || !profileData) {
        await new Promise(r => setTimeout(r, 800));
        ({ data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle());
      }

      if (profileData) {
        setProfile(profileData);
        setProfileLoadFailed(false);
      } else {
        console.error('Error fetching profile:', profileErr);
        setProfileLoadFailed(true);
      }

      // Fetch subscription
      const { data: subscriptionData } = await supabase
        .from('business_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSubscription(subscriptionData ?? null);

      // Fetch verification
      const { data: verificationData } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setVerification(verificationData ?? null);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (data: BusinessSignupData) => {
    try {
      // 1. Create auth user with Business Owner role
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            role: 'Business Owner',
            business_name: data.businessName,
          },
        },
      });

      if (authError) return { error: authError };
      if (!authData.user) return { error: new Error('User creation failed') };

      // Set user immediately so navigation works before onAuthStateChange fires
      setUser(authData.user);
      setLoading(false);

      // 2. Create business subscription (Free tier)
      const { error: subscriptionError } = await supabase
        .from('business_subscriptions')
        .insert({
          user_id: authData.user.id,
          tier: 'Free',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          max_venues: 1,
          max_photos_per_venue: 10,
          max_events_per_month: 5,
          can_view_analytics: false,
          can_create_offers: false,
          can_manage_menu: false,
          priority_listing: false,
        });

      if (subscriptionError) {
        console.error('Failed to create subscription:', subscriptionError);
      }

      // No auto-approved verification request on signup. Owners now request
      // verification manually via /verification; an admin reviews and approves
      // it via the admin portal. is_verified stays FALSE until that approval.

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        setUser(data.user);
        setLoading(false);
      }

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshSubscription = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('business_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setSubscription(data ?? null);
  };

  const refreshProfile = async () => {
    if (!user) return;
    setProfileLoadFailed(false);
    setLoading(true);
    await fetchUserData(user.id);
  };

  const value = {
    user,
    profile,
    subscription,
    verification,
    loading,
    profileLoadFailed,
    refreshProfile,
    signUp,
    signIn,
    signOut,
    refreshSubscription,
  };

  return (
    <BusinessAuthContext.Provider value={value}>
      {children}
    </BusinessAuthContext.Provider>
  );
}

export function useBusinessAuth() {
  const context = useContext(BusinessAuthContext);
  if (context === undefined) {
    throw new Error('useBusinessAuth must be used within a BusinessAuthProvider');
  }
  return context;
}
