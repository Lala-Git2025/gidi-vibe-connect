import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';

export interface Venue {
  id: string;
  name: string;
  description: string;
  location: string;
  category: string;
  contact_phone?: string;
  contact_email?: string;
  website_url?: string;
  instagram_handle?: string;
  opening_hours?: any;
  price_range?: string;
  tags?: string[];
  amenities?: string[];
  professional_media_urls?: string[];
  owner_id: string;
  is_verified: boolean;
  is_promoted: boolean;
  promoted_until?: string | null;
  promotion_label?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVenueData {
  name: string;
  description: string;
  location: string;
  category: string;
  contact_phone?: string;
  contact_email?: string;
  website_url?: string;
  instagram_handle?: string;
  opening_hours?: any;
  price_range?: string;
  tags?: string[];
  amenities?: string[];
}

export interface UpdateVenueData extends Partial<CreateVenueData> {
  id: string;
}

/**
 * Hook to fetch all venues owned by the current user
 */
export function useVenues() {
  const { user } = useBusinessAuth();

  return useQuery({
    queryKey: ['venues', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Venue[];
    },
    enabled: !!user,
  });
}

/**
 * Hook to fetch a single venue by ID
 */
export function useVenue(venueId: string | undefined) {
  const { user, profile } = useBusinessAuth();
  const isAdmin = profile?.role === 'Admin' || profile?.role === 'Super Admin';

  return useQuery({
    queryKey: ['venue', venueId],
    queryFn: async () => {
      if (!venueId) throw new Error('Venue ID is required');

      let query = supabase
        .from('venues')
        .select('*')
        .eq('id', venueId);

      // Non-admins are scoped to their own venues; admins can view any venue
      if (!isAdmin) {
        query = query.eq('owner_id', user?.id);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data as Venue;
    },
    enabled: !!venueId && !!user,
  });
}

/**
 * Hook to create a new venue
 */
export function useCreateVenue() {
  const queryClient = useQueryClient();
  const { user } = useBusinessAuth();

  return useMutation({
    mutationFn: async (venueData: CreateVenueData) => {
      if (!user) throw new Error('User not authenticated');

      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error('No active session — please sign in again');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-venue`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(venueData),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(err.error || `Failed to create venue (${response.status})`);
      }

      const data = await response.json();
      return data as Venue;
    },
    onSuccess: () => {
      // Invalidate and refetch venues list
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
  });
}

/**
 * Hook to update an existing venue
 */
export function useUpdateVenue() {
  const queryClient = useQueryClient();
  const { user } = useBusinessAuth();

  return useMutation({
    mutationFn: async ({ id, ...venueData }: UpdateVenueData) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('venues')
        .update({
          ...venueData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('owner_id', user.id) // Ensure user owns this venue
        .select()
        .single();

      if (error) throw error;
      return data as Venue;
    },
    onSuccess: (data) => {
      // Invalidate both the list and individual venue queries
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['venue', data.id] });
    },
  });
}

/**
 * Hook to delete a venue
 */
export function useDeleteVenue() {
  const queryClient = useQueryClient();
  const { user } = useBusinessAuth();

  return useMutation({
    mutationFn: async (venueId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId)
        .eq('owner_id', user.id); // Ensure user owns this venue

      if (error) throw error;
      return venueId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
  });
}

/**
 * Hook to upload venue photos
 */
export function useUploadVenuePhoto() {
  const queryClient = useQueryClient();
  const { user, subscription } = useBusinessAuth();

  return useMutation({
    mutationFn: async ({
      venueId,
      file,
    }: {
      venueId: string;
      file: File;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Get current venue to check photo count
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select('professional_media_urls')
        .eq('id', venueId)
        .eq('owner_id', user.id)
        .single();

      if (venueError) throw venueError;

      const currentPhotoCount = venue.professional_media_urls?.length || 0;
      const maxPhotos = subscription?.max_photos_per_venue || 10;

      if (currentPhotoCount >= maxPhotos) {
        throw new Error(
          `Photo limit reached. You can upload up to ${maxPhotos} photo(s) per venue on your ${subscription?.tier || 'Free'} plan. Upgrade to add more photos.`
        );
      }

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${venueId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('venue-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('venue-photos').getPublicUrl(fileName);

      // Update venue's professional_media_urls array
      const updatedUrls = [...(venue.professional_media_urls || []), publicUrl];

      const { data, error: updateError } = await supabase
        .from('venues')
        .update({
          professional_media_urls: updatedUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', venueId)
        .eq('owner_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data as Venue;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['venue', data.id] });
    },
  });
}

/**
 * Hook to delete a venue photo
 */
export function useDeleteVenuePhoto() {
  const queryClient = useQueryClient();
  const { user } = useBusinessAuth();

  return useMutation({
    mutationFn: async ({
      venueId,
      photoUrl,
    }: {
      venueId: string;
      photoUrl: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Get current venue
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select('professional_media_urls')
        .eq('id', venueId)
        .eq('owner_id', user.id)
        .single();

      if (venueError) throw venueError;

      // Remove the photo URL from the array
      const updatedUrls = (venue.professional_media_urls || []).filter(
        (url: string) => url !== photoUrl
      );

      // Extract file path from URL for storage deletion
      const urlParts = photoUrl.split('/venue-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('venue-photos').remove([filePath]);
      }

      // Update venue
      const { data, error: updateError } = await supabase
        .from('venues')
        .update({
          professional_media_urls: updatedUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', venueId)
        .eq('owner_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data as Venue;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['venue', data.id] });
    },
  });
}

/**
 * Hook to get venue statistics for dashboard
 */
export function useVenueStats() {
  const { user } = useBusinessAuth();

  return useQuery({
    queryKey: ['venue-stats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Get total venues count
      const { count: totalVenues, error: countError } = await supabase
        .from('venues')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      if (countError) throw countError;

      // Get total profile views (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: analyticsData, error: analyticsError } = await supabase
        .from('venue_analytics')
        .select('profile_views, venue_id')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .in(
          'venue_id',
          (await supabase.from('venues').select('id').eq('owner_id', user.id)).data?.map((v: { id: string }) => v.id) ?? []
        );

      if (analyticsError) throw analyticsError;

      const totalViews = analyticsData?.reduce(
        (sum, record) => sum + (record.profile_views || 0),
        0
      ) || 0;

      return {
        totalVenues: totalVenues || 0,
        totalViews,
      };
    },
    enabled: !!user,
  });
}

/**
 * 7-day daily view series for the dashboard chart, plus the preceding 7 days
 * for the "last week" comparison line. Returns zero-filled arrays so the
 * chart always renders a full week even on sparse days.
 */
export function useWeeklyViews() {
  const { user } = useBusinessAuth();

  return useQuery({
    queryKey: ['weekly-views', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data: venues } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_id', user.id);

      const venueIds = (venues ?? []).map((v: { id: string }) => v.id);
      const empty = { current: Array(7).fill(0), previous: Array(7).fill(0), total: 0 };
      if (venueIds.length === 0) return empty;

      // 14 days back, so we get this week and the comparison week in one query.
      const start = new Date();
      start.setDate(start.getDate() - 13);
      const startKey = start.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('venue_analytics')
        .select('date, profile_views')
        .in('venue_id', venueIds)
        .gte('date', startKey);

      if (error) throw error;

      // Bucket by day offset from `start` (0..13).
      const buckets = Array(14).fill(0);
      for (const row of data ?? []) {
        const offset = Math.floor(
          (new Date((row as any).date).getTime() - start.getTime()) / 86_400_000,
        );
        if (offset >= 0 && offset < 14) buckets[offset] += (row as any).profile_views || 0;
      }

      const previous = buckets.slice(0, 7);
      const current = buckets.slice(7);
      return { current, previous, total: current.reduce((a, b) => a + b, 0) };
    },
    enabled: !!user,
  });
}

/**
 * Real activity across the owner's venues — check-ins, reviews, and RSVPs to
 * their events — merged into one recency-sorted feed.
 */
export function useVenueActivity(limit = 5) {
  const { user } = useBusinessAuth();

  return useQuery({
    queryKey: ['venue-activity', user?.id, limit],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const [{ data: venues }, { data: events }] = await Promise.all([
        supabase.from('venues').select('id, name').eq('owner_id', user.id),
        supabase.from('events').select('id, title').eq('organizer_id', user.id),
      ]);

      const venueIds = (venues ?? []).map((v: any) => v.id);
      const eventIds = (events ?? []).map((e: any) => e.id);
      if (venueIds.length === 0 && eventIds.length === 0) return [];

      const venueName = new Map((venues ?? []).map((v: any) => [v.id, v.name]));
      const eventName = new Map((events ?? []).map((e: any) => [e.id, e.title]));

      const [checkIns, reviews, rsvps] = await Promise.all([
        venueIds.length
          ? supabase
              .from('venue_check_ins')
              .select('user_id, venue_id, checked_in_at')
              .in('venue_id', venueIds)
              .order('checked_in_at', { ascending: false })
              .limit(limit)
          : Promise.resolve({ data: [] as any[] }),
        venueIds.length
          ? supabase
              .from('venue_reviews')
              .select('user_id, venue_id, rating, created_at')
              .in('venue_id', venueIds)
              .order('created_at', { ascending: false })
              .limit(limit)
          : Promise.resolve({ data: [] as any[] }),
        eventIds.length
          ? supabase
              .from('event_rsvps')
              .select('user_id, event_id, created_at')
              .in('event_id', eventIds)
              .order('created_at', { ascending: false })
              .limit(limit)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const rows = [
        ...(checkIns.data ?? []).map((r: any) => ({
          user_id: r.user_id,
          verb: 'checked in at',
          what: venueName.get(r.venue_id) ?? 'your venue',
          at: r.checked_in_at,
          color: '#22C55E',
        })),
        ...(reviews.data ?? []).map((r: any) => ({
          user_id: r.user_id,
          verb: `left a ${r.rating}★ review for`,
          what: venueName.get(r.venue_id) ?? 'your venue',
          at: r.created_at,
          color: '#EAB308',
        })),
        ...(rsvps.data ?? []).map((r: any) => ({
          user_id: r.user_id,
          verb: "RSVP'd to",
          what: eventName.get(r.event_id) ?? 'your event',
          at: r.created_at,
          color: '#3B82F6',
        })),
      ]
        .filter(r => r.at)
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, limit);

      if (rows.length === 0) return [];

      // Resolve display names in one round-trip.
      const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));

      return rows.map(r => ({ ...r, who: nameMap.get(r.user_id) || 'Someone' }));
    },
    enabled: !!user,
  });
}
