import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { trackVenueEvent } from '../lib/analytics';
import { useVenueOffers, discountBadge, expiryLabel, type VenueOffer } from '../lib/offers';

/**
 * Live deals at a venue, shown inside the venue sheet.
 *
 * Renders nothing at all when a venue has no live offer. A "No offers right
 * now" block on every venue in Lagos would be a permanent empty state on a
 * screen that is otherwise full — the absence is the message.
 */
export const VenueOffers = ({
  venueId,
  venueName,
  phone,
}: {
  venueId: string;
  venueName: string;
  phone?: string | null;
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { offers } = useVenueOffers(venueId);

  // One offer_views per venue per sheet opening, not one per offer and not one
  // per re-render — otherwise the count measures React, not readers.
  const counted = useRef<string | null>(null);
  useEffect(() => {
    if (offers.length > 0 && counted.current !== venueId) {
      counted.current = venueId;
      trackVenueEvent(venueId, 'offer_views');
    }
  }, [offers.length, venueId]);

  if (offers.length === 0) return null;

  const handleClaim = (offer: VenueOffer) => {
    trackVenueEvent(venueId, 'offer_clicks');
    // The deal is redeemed at the venue, so the useful action is reaching it.
    if (phone) Linking.openURL(`tel:${phone}`);
    else {
      const query = encodeURIComponent(`${venueName}, Lagos`);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name="pricetag" size={16} color={colors.primary} />
        <Text style={styles.heading}>
          {offers.length === 1 ? 'Offer on now' : `${offers.length} offers on now`}
        </Text>
      </View>

      {offers.map(offer => {
        const badge = discountBadge(offer);
        const expiry = expiryLabel(offer);
        return (
          <View key={offer.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.title} numberOfLines={2}>{offer.title}</Text>
              {!!badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>{badge}</Text>
                </View>
              )}
            </View>

            {!!offer.description && (
              <Text style={styles.description} numberOfLines={3}>{offer.description}</Text>
            )}

            <View style={styles.cardFoot}>
              <Text style={styles.expiry}>{expiry ?? 'Ongoing'}</Text>
              <TouchableOpacity
                style={styles.claim}
                onPress={() => handleClaim(offer)}
                accessibilityRole="button"
                accessibilityLabel={`${offer.title} at ${venueName}. ${phone ? 'Call the venue' : 'Get directions'}`}
              >
                <Ionicons name={phone ? 'call' : 'navigate'} size={13} color={colors.background} />
                <Text style={styles.claimText}>{phone ? 'Call to claim' : 'Get directions'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const getStyles = (colors: any) =>
  StyleSheet.create({
    wrap: { marginTop: 22 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
    heading: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.text,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      backgroundColor: colors.cardBackground,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    badge: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 4,
      maxWidth: 130,
    },
    badgeText: { fontSize: 11, fontWeight: '800', color: colors.background },
    description: { fontSize: 13, color: colors.textSecondary, marginTop: 7, lineHeight: 18 },
    cardFoot: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      gap: 10,
    },
    expiry: { fontSize: 12, color: colors.textSecondary, flexShrink: 1 },
    claim: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    claimText: { fontSize: 12, fontWeight: '800', color: colors.background },
  });
