import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../config/supabase';
import { useTheme, polished } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface Venue {
  id: string;
  name: string;
  location: string;
  rating: number;
  live_rating?: number;
  professional_media_urls?: string[];
  is_promoted?: boolean;
  promotion_label?: string;
  checkins_24h?: number;
}

interface TrendingVenuesProps {
  refreshTrigger?: number;
}

const getVibeStatus = (rating: number) => {
  if (rating >= 4.5) return 'Electric';
  if (rating >= 4.0) return 'Buzzing';
  if (rating >= 3.5) return 'Vibing';
  return 'Chill';
};

// Pair the vibe label with its signature emoji — same set the polished kit uses.
const getVibeWithEmoji = (rating: number) => {
  if (rating >= 4.5) return 'Electric ⚡️';
  if (rating >= 4.0) return 'Buzzing 🔥';
  if (rating >= 3.5) return 'Vibing ✨';
  return 'Chill 🎵';
};

const isActivePromotion = (venue: Venue) => !!venue.is_promoted;

const dedupeVenues = (list: Venue[]): Venue[] => {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  return list.filter(v => {
    if (seenIds.has(v.id)) return false;
    const nameKey = v.name.trim().toLowerCase();
    if (seenNames.has(nameKey)) return false;
    seenIds.add(v.id);
    seenNames.add(nameKey);
    return true;
  });
};

// NOTE: hardcoded fallback venues were removed on 2026-05-11.
// They used synthetic IDs ('1'..'6') that didn't exist in the DB, so
// tapping a fallback card tried to open a venue modal with no matching
// row and silently failed. We now render the empty state instead — see
// the empty-container branch below.

export const TrendingVenues = ({ refreshTrigger }: TrendingVenuesProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const styles = getStyles(colors);

  useEffect(() => {
    fetchTrendingVenues();
  }, [refreshTrigger]);

  const fetchTrendingVenues = async () => {
    try {
      // Primary: admin-promoted venues, ranked by trending_score.
      const { data: promoted, error: promotedErr } = await supabase
        .from('trending_venues')
        .select('id, name, location, rating, live_rating, professional_media_urls, is_promoted, promotion_label, checkins_24h')
        .eq('is_promoted', true)
        .order('trending_score', { ascending: false })
        .limit(10);

      if (promotedErr) throw promotedErr;

      const promotedUnique = promoted ? dedupeVenues(promoted as Venue[]).slice(0, 6) : [];
      if (promotedUnique.length > 0) {
        setVenues(promotedUnique);
        return;
      }

      // Backstop: when nothing is promoted yet, surface the top-rated *real*
      // venues so the home page isn't empty. Still real DB rows — tapping
      // a card opens the venue's detail modal as expected.
      const { data: topRated } = await supabase
        .from('venues')
        .select('id, name, location, rating, professional_media_urls')
        .order('rating', { ascending: false })
        .limit(6);

      setVenues(topRated ? dedupeVenues(topRated as Venue[]) : []);
    } catch (err) {
      console.log('TrendingVenues fetch error:', err);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (venues.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No trending venues at the moment</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
    >
      {venues.map((venue, idx) => {
        const rank = idx + 1;
        const here = venue.checkins_24h ?? 0;
        const promoted = isActivePromotion(venue);
        const vibeLabel = getVibeWithEmoji(venue.live_rating ?? venue.rating);
        return (
          <TouchableOpacity
            key={venue.id}
            style={styles.venueCard}
            onPress={() => (navigation as any).navigate('Explore', { venueId: venue.id })}
            activeOpacity={0.85}
          >
            {/* Background image */}
            <Image
              source={{ uri: venue.professional_media_urls?.[0] || 'https://images.unsplash.com/photo-1576442655380-1e828d09852f?q=80&w=1000' }}
              style={styles.venueImage}
              resizeMode="cover"
            />
            {/* Polished gradient overlay — transparent at top, near-black at bottom */}
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.92)']}
              locations={[0, 0.35, 0.65, 1]}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Gold inner rim */}
            <View style={styles.goldRim} pointerEvents="none" />

            <View style={styles.content}>
              {/* Top row — #N Tonight + glass vibe pill (or Sponsored) on the left, bookmark on the right */}
              <View style={styles.topRow}>
                <View style={styles.topLeft}>
                  <Text style={styles.rankLabel}>
                    {promoted ? (venue.promotion_label || 'Sponsored') : `#${rank} Tonight`}
                  </Text>
                  <View style={styles.vibePill}>
                    <Text style={styles.vibePillText}>{vibeLabel}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.bookmarkBtn} onPress={(e) => e.stopPropagation()}>
                  <Ionicons name="bookmark-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Bottom content — name + location + glass info bar */}
              <View style={styles.bottomContent}>
                <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={13} color="#E4E4E7" />
                  <Text style={styles.locationText} numberOfLines={1}>{venue.location}</Text>
                </View>

                {/* Glass info bar — avatar stack + here-now + rating */}
                <View style={styles.infoBar}>
                  <View style={styles.infoLeft}>
                    <View style={styles.avatarStack}>
                      {['#F97316', '#3B82F6', '#10B981'].map((c, i) => (
                        <View key={i} style={[styles.avatar, { backgroundColor: c, marginLeft: i === 0 ? 0 : -8 }]} />
                      ))}
                    </View>
                    <Text style={styles.infoText}>
                      {here > 0 ? (
                        <><Text style={styles.infoNum}>{here}</Text> here now</>
                      ) : (
                        'Be the first!'
                      )}
                    </Text>
                  </View>
                  <Text style={styles.infoRating}>
                    <Ionicons name="star" size={11} color={polished.goldMid} /> {venue.rating.toFixed(1)}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  scrollView: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  scrollContent: {
    gap: 14,
    paddingRight: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  // Polished photo card — rim-lit gold, heavy shadow, 320×268.
  venueCard: {
    width: 268,
    height: 320,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  venueImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  // Inset gold rim drawn on top of the image — borderColor + huge inner radius
  goldRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.55)',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topLeft: {
    gap: 8,
  },
  rankLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: polished.goldMid,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Glass pill — used everywhere we put a label on imagery
  vibePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  vibePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  bookmarkBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomContent: {
    gap: 6,
  },
  venueName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#E4E4E7',
    flex: 1,
  },
  // Glass info bar — replaces the bare visitor row from the old design
  infoBar: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#000',
  },
  infoText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  infoNum: {
    color: polished.goldMid,
  },
  infoRating: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
});
