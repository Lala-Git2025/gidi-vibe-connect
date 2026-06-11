import { supabase } from '../config/supabase';

export type VenueEventType =
  | 'profile_views'
  | 'phone_clicks'
  | 'website_clicks'
  | 'direction_clicks'
  | 'offer_views'
  | 'offer_clicks'
  | 'event_views';

// Fire-and-forget. We never await this from the UI — analytics failures
// must not block a user opening a venue or tapping a phone number.
export function trackVenueEvent(venueId: string, eventType: VenueEventType): void {
  if (!venueId) return;
  supabase
    .rpc('track_venue_event', { p_venue_id: venueId, p_event_type: eventType })
    .then(({ error }) => {
      if (error) console.log('[analytics] track failed:', eventType, error.message);
    });
}
