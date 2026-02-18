import { User } from '@supabase/supabase-js';

export type UserRole = 'Consumer' | 'Business Owner' | 'Content Creator' | 'Admin' | 'Super Admin';

export type SubscriptionTier = 'Free' | 'Premium' | 'Enterprise';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  phone: string | null;
  location: string | null;
  username: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  max_venues: number;
  max_photos_per_venue: number;
  max_events_per_month: number;
  can_view_analytics: boolean;
  can_create_offers: boolean;
  can_manage_menu: boolean;
  priority_listing: boolean;
  created_at: string;
  updated_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  business_name: string;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  business_registration_number: string | null;
  business_document_url: string | null;
  identity_document_url: string | null;
  additional_info: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  location: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string;
  rating: number;
  price_range: string | null;
  is_verified: boolean;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
  instagram_url: string | null;
  professional_media_urls: string[];
  features: string[];
  opening_hours: Record<string, string> | null;
  event_schedules: any | null;
  created_at: string;
  updated_at: string;
}

export interface VenueAnalytics {
  id: string;
  venue_id: string;
  date: string;
  profile_views: number;
  phone_clicks: number;
  direction_clicks: number;
  website_clicks: number;
  offer_views: number;
  offer_clicks: number;
  event_views: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessSignupData {
  email: string;
  password: string;
  fullName: string;
  businessName: string;
  phone?: string;
  address?: string;
}

export interface BusinessAuthContextType {
  user: User | null;
  profile: Profile | null;
  subscription: BusinessSubscription | null;
  verification: VerificationRequest | null;
  loading: boolean;
  signUp: (data: BusinessSignupData) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}
