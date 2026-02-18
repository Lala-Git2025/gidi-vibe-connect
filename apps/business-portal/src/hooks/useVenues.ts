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
  const { user } = useBusinessAuth();

  return useQuery({
    queryKey: ['venue', venueId],
    queryFn: async () => {
      if (!venueId) throw new Error('Venue ID is required');

      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', venueId)
        .eq('owner_id', user?.id)
        .single();

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
  const { user, subscription } = useBusinessAuth();

  return useMutation({
    mutationFn: async (venueData: CreateVenueData) => {
      if (!user) throw new Error('User not authenticated');

      // Check if user can create more venues
      const { data: canCreate, error: limitError } = await supabase
        .rpc('check_venue_creation_limit', { p_user_id: user.id });

      if (limitError) throw limitError;
      if (!canCreate) {
        throw new Error(
          `Venue limit reached. You can create up to ${subscription?.max_venues || 1} venue(s) on your ${subscription?.tier || 'Free'} plan. Upgrade to add more venues.`
        );
      }

      // Create the venue
      const { data, error } = await supabase
        .from('venues')
        .insert({
          ...venueData,
          owner_id: user.id,
          is_verified: true, // Auto-verify for business owners
        })
        .select()
        .single();

      if (error) throw error;
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
        (url) => url !== photoUrl
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
          supabase
            .from('venues')
            .select('id')
            .eq('owner_id', user.id)
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
