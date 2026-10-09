import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';

export interface Event {
  id: string;
  title: string;
  description: string;
  venue_name: string;
  location: string;
  start_date: string;
  end_date: string;
  category: string;
  price_info?: string;
  registration_url?: string;
  contact_email?: string;
  contact_phone?: string;
  featured_image_url?: string;
  tags?: string[];
  is_published: boolean;
  /** Stated capacity. Null when the organiser has not set one. */
  tickets_available?: number | null;
  is_featured?: boolean;
  organizer_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEventData {
  title: string;
  description: string;
  venue_name: string;
  location: string;
  start_date: string;
  end_date: string;
  category: string;
  price_info?: string;
  registration_url?: string;
  contact_email?: string;
  contact_phone?: string;
  tags?: string[];
  is_published: boolean;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string;
}

/**
 * Hook to fetch all events created by the current user
 */
export function useEvents(filter?: 'all' | 'upcoming' | 'past') {
  const { user } = useBusinessAuth();

  return useQuery({
    queryKey: ['events', user?.id, filter],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id)
        .order('start_date', { ascending: false });

      // Apply filters
      if (filter === 'upcoming') {
        const now = new Date().toISOString();
        query = query.gte('start_date', now);
      } else if (filter === 'past') {
        const now = new Date().toISOString();
        query = query.lt('end_date', now);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Event[];
    },
    enabled: !!user,
  });
}

/**
 * Hook to fetch a single event by ID
 */
export function useEvent(eventId: string | undefined) {
  const { user } = useBusinessAuth();

  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID is required');

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('organizer_id', user?.id)
        .single();

      if (error) throw error;
      return data as Event;
    },
    enabled: !!eventId && !!user,
  });
}

/**
 * Hook to create a new event
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { user, subscription } = useBusinessAuth();

  return useMutation({
    mutationFn: async (eventData: CreateEventData) => {
      if (!user) throw new Error('User not authenticated');

      // Check event limit directly (avoids RPC which can hang on free-tier projects)
      const maxEvents = subscription?.max_events_per_month ?? 5;
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { count: eventsThisMonth, error: countError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', user.id)
        .gte('created_at', monthStart.toISOString());

      if (!countError && eventsThisMonth !== null && eventsThisMonth >= maxEvents) {
        throw new Error(
          `Monthly event limit reached. You can create up to ${maxEvents} event(s) per month on your ${subscription?.tier || 'Free'} plan. Upgrade to add more events.`
        );
      }

      // Create the event
      const { data, error } = await supabase
        .from('events')
        .insert({
          ...eventData,
          organizer_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event-stats'] });
    },
  });
}

/**
 * Hook to update an existing event
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const { user } = useBusinessAuth();

  return useMutation({
    mutationFn: async ({ id, ...eventData }: UpdateEventData) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('events')
        .update({
          ...eventData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organizer_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', data.id] });
    },
  });
}

/**
 * Hook to delete an event
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  const { user } = useBusinessAuth();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error('User not authenticated');

      // Delete event image from storage if it exists
      const { data: event } = await supabase
        .from('events')
        .select('featured_image_url')
        .eq('id', eventId)
        .eq('organizer_id', user.id)
        .single();

      if (event?.featured_image_url) {
        const urlParts = event.featured_image_url.split('/event-images/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('event-images').remove([filePath]);
        }
      }

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('organizer_id', user.id);

      if (error) throw error;
      return eventId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event-stats'] });
    },
  });
}

/**
 * Hook to upload event image
 */
export function useUploadEventImage() {
  const queryClient = useQueryClient();
  const { user } = useBusinessAuth();

  return useMutation({
    mutationFn: async ({ eventId, file }: { eventId: string; file: File }) => {
      if (!user) throw new Error('User not authenticated');

      // Get current event to check ownership
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, featured_image_url')
        .eq('id', eventId)
        .eq('organizer_id', user.id)
        .single();

      if (eventError) throw eventError;

      // Delete old image if exists
      if (event.featured_image_url) {
        const urlParts = event.featured_image_url.split('/event-images/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('event-images').remove([filePath]);
        }
      }

      // Upload new file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('event-images').getPublicUrl(fileName);

      // Update event with new image URL
      const { data, error: updateError } = await supabase
        .from('events')
        .update({
          featured_image_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)
        .eq('organizer_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data as Event;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', data.id] });
    },
  });
}

/**
 * Hook to get event statistics
 */
export function useEventStats() {
  const { user } = useBusinessAuth();

  return useQuery({
    queryKey: ['event-stats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const now = new Date().toISOString();

      // Get total events count
      const { count: totalEvents, error: totalError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', user.id);

      if (totalError) throw totalError;

      // Get upcoming events count
      const { count: upcomingEvents, error: upcomingError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', user.id)
        .gte('start_date', now);

      if (upcomingError) throw upcomingError;

      // Get events created this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: eventsThisMonth, error: monthError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      if (monthError) throw monthError;

      return {
        totalEvents: totalEvents || 0,
        upcomingEvents: upcomingEvents || 0,
        eventsThisMonth: eventsThisMonth || 0,
      };
    },
    enabled: !!user,
  });
}

/**
 * Confirmed RSVP counts, keyed by event id, for every event this owner runs.
 *
 * The Events list drew its capacity bar from `const rsvps = 0` and a
 * `cap = 250` that existed nowhere in the schema, so every card reported an
 * empty 250-seat room. One grouped read is enough for the whole page.
 */
export function useEventRsvpCounts() {
  const { user } = useBusinessAuth();

  return useQuery({
    queryKey: ['event-rsvp-counts', user?.id],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!user) return {};

      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('organizer_id', user.id);

      const ids = (events ?? []).map((e: { id: string }) => e.id);
      if (ids.length === 0) return {};

      const { data, error } = await supabase
        .from('event_rsvps')
        .select('event_id, status')
        .in('event_id', ids);
      if (error) return {};

      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as any[]) {
        // Only a confirmed yes counts toward a capacity bar; 'interested' is
        // not a seat taken.
        if (row.status && !['going', 'attending'].includes(row.status)) continue;
        counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
      }
      return counts;
    },
    enabled: !!user,
  });
}
