import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type UserRole = 'Consumer' | 'Business Owner' | 'Content Creator' | 'Admin' | 'Super Admin';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  username: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminAuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** True when we have a session but the profile row could not be loaded. */
  profileError: boolean;
  /** True while a profile fetch is in flight — render a spinner, not an error. */
  profileFetching: boolean;
  /** Re-attempt the profile fetch — lets the UI offer a retry instead of hanging. */
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  // Distinguishes "fetch in flight" from "fetch failed" so the UI shows a
  // spinner during the former instead of an error state.
  const [profileFetching, setProfileFetching] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // Try refresh first, fall back to existing session
        const { data: { session } } = await supabase.auth.refreshSession();
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          const { data: { session: existing } } = await supabase.auth.getSession();
          if (!mounted) return;
          setUser(existing?.user ?? null);
          if (existing?.user) {
            await fetchProfile(existing.user.id);
          } else {
            setLoading(false);
          }
        }
      } catch {
        // Session expired or network error — just show login
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    }

    init();

    // Safety timeout — never stay loading forever. Uses the functional form
    // because the `loading` captured here would be stale from first render.
    const timeout = setTimeout(() => {
      if (mounted) {
        setLoading(prev => (prev ? false : prev));
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // maybeSingle() rather than single(): a missing row is a state we render,
  // not an exception. One retry covers a cold start or a dropped connection.
  const fetchProfile = async (userId: string, attempt = 0): Promise<void> => {
    setProfileFetching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data as Profile);
        setProfileError(false);
      } else {
        // Authenticated but no profile row — the role gate can't be evaluated.
        setProfileError(true);
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      if (attempt < 1) {
        await new Promise(r => setTimeout(r, 800));
        return fetchProfile(userId, attempt + 1);
      }
      setProfileError(true);
    } finally {
      setProfileFetching(false);
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    setProfileError(false);
    setLoading(true);
    await fetchProfile(user.id);
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileError,
        profileFetching,
        refreshProfile,
        signIn,
        signOut,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
