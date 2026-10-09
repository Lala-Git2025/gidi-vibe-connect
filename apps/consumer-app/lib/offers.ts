import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';

/**
 * Venue offers — the consumer half of the business portal's Offers page.
 *
 * The portal has been able to describe deals for a while; nothing in the app
 * displayed them, so `venue_analytics.offer_views` and `offer_clicks` sat at
 * zero because nothing could ever increment them.
 *
 * Expiry is enforced in RLS (migration 20261007000000): the public SELECT
 * policy already requires `is_active` and a current date window, so an expired
 * or switched-off offer is not merely hidden here, it is unreadable. The
 * client-side window check below is belt and braces for a device whose clock
 * has drifted past midnight mid-session, not the boundary.
 */

export type DiscountType = 'percentage' | 'fixed' | 'free_item' | 'other';

export interface VenueOffer {
  id: string;
  venue_id: string;
  title: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: string | null;
  valid_from: string;
  valid_until: string | null;
}

/**
 * The badge on the offer card.
 *
 * `discount_value` is free text typed by a venue owner, so it may already
 * contain its own symbol ("20%", "₦2,000", "2-for-1"). Appending blindly
 * produced "20%%" in testing, hence the guards.
 */
export const discountBadge = (offer: VenueOffer): string | null => {
  const raw = (offer.discount_value ?? '').trim();
  switch (offer.discount_type) {
    case 'percentage':
      if (!raw) return null;
      return raw.includes('%') ? raw : `${raw}% off`;
    case 'fixed':
      if (!raw) return null;
      return /[₦$€£]/.test(raw) ? `${raw} off` : `₦${raw} off`;
    case 'free_item':
      return raw || 'Free item';
    default:
      return raw || null;
  }
};

/** "Ends 12 Oct" / "Ends today" / null when open-ended. */
export const expiryLabel = (offer: VenueOffer): string | null => {
  if (!offer.valid_until) return null;
  const end = new Date(`${offer.valid_until}T23:59:59`);
  const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return 'Ends today';
  if (days === 1) return 'Ends tomorrow';
  if (days <= 7) return `Ends in ${days} days`;
  return `Ends ${end.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`;
};

const isLive = (o: VenueOffer, now = new Date()): boolean => {
  const today = now.toISOString().slice(0, 10);
  return o.valid_from <= today && (o.valid_until === null || o.valid_until >= today);
};

export const useVenueOffers = (venueId: string | null | undefined) => {
  const [offers, setOffers] = useState<VenueOffer[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!venueId) { setOffers([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('venue_offers')
        .select('id, venue_id, title, description, discount_type, discount_value, valid_from, valid_until')
        .eq('venue_id', venueId)
        .order('valid_until', { ascending: true, nullsFirst: false })
        .limit(10);

      // A missing table or a blocked read must not take the venue sheet down
      // with it — offers are an addition to that screen, not its subject.
      if (error) { setOffers([]); return; }
      setOffers(((data ?? []) as VenueOffer[]).filter(o => isLive(o)));
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => { load(); }, [load]);

  return { offers, loading, reload: load };
};
