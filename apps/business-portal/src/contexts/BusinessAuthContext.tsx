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

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
      authSubscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('business_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!subscriptionError) {
        setSubscription(subscriptionData);
      }

      // Fetch verification
      const { data: verificationData, error: verificationError } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!verificationError) {
        setVerification(verificationData);
      }
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

      // 3. Create auto-approved verification request
      const { error: verificationError } = await supabase
        .from('verification_requests')
        .insert({
          user_id: authData.user.id,
          business_name: data.businessName,
          business_phone: data.phone || null,
          business_email: data.email,
          business_address: data.address || null,
          status: 'approved',
          reviewed_by: 'system',
          reviewed_at: new Date().toISOString(),
        });

      if (verificationError) {
        console.error('Failed to create verification:', verificationError);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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
      .single();

    if (data) {
      setSubscription(data);
    }
  };

  const value = {
    user,
    profile,
    subscription,
    verification,
    loading,
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
