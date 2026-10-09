import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';

/**
 * Business-owner notifications, backed by `business_notifications`.
 *
 * The header bell used to be a `<button>` with no handler under a red dot that
 * was always lit — it announced unread items that did not exist and did
 * nothing when pressed. Rows here are written only by SECURITY DEFINER
 * triggers (new review, first check-in of the day, RSVP, verification
 * decision); see migration 20261007000000.
 */

export type BusinessNotificationType =
  | 'review'
  | 'rsvp'
  | 'check_in'
  | 'verification_approved'
  | 'verification_rejected';

export interface BusinessNotification {
  id: string;
  type: BusinessNotificationType;
  title: string;
  body: string | null;
  venue_id: string | null;
  event_id: string | null;
  is_read: boolean;
  created_at: string;
}

/** Where the bell sends you when a notification is tapped. */
export const notificationHref = (n: BusinessNotification): string => {
  if (n.venue_id) return `/venues/${n.venue_id}`;
  if (n.event_id) return `/events/${n.event_id}`;
  if (n.type.startsWith('verification')) return '/verification';
  return '/dashboard';
};

const PAGE = 20;

export function useNotifications() {
  const { user } = useBusinessAuth();

  return useQuery({
    queryKey: ['business-notifications', user?.id],
    queryFn: async (): Promise<BusinessNotification[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('business_notifications')
        .select('id, type, title, body, venue_id, event_id, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(PAGE);
      // The table may not exist yet on an environment where the migration has
      // not run. A dead bell is better than a crashed header.
      if (error) return [];
      return (data ?? []) as BusinessNotification[];
    },
    enabled: !!user,
    // The bell is glanceable, not live. A minute is often enough to feel
    // current without putting a query behind every page transition.
    staleTime: 60_000,
  });
}

export function useUnreadCount() {
  const { data } = useNotifications();
  return (data ?? []).filter(n => !n.is_read).length;
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useBusinessAuth();

  return useMutation({
    mutationFn: async (ids?: string[]) => {
      if (!user) return;
      let query = supabase
        .from('business_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (ids?.length) query = query.in('id', ids);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['business-notifications'] }),
  });
}
