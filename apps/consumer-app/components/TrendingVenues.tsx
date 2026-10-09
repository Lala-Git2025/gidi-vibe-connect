import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, polished } from '../contexts/ThemeContext';
import { tile, type as T, space as S, radius as R, elevation as E, gutter } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { hasRating, type TrendingVenue } from '../lib/trending';

/**
 * The promoted-venue rail.
 *
 * Every card here is a paid placement — see lib/trending.ts. There is no
 * ranking and so no rank number: these venues hold their slots because they
 * were bought, and a "#1" would claim a position none of them earned.
 *
 * Presentational by design. HomeScreen owns the fetch because it also owns the
 * section header, and it needs the total to decide whether "See all" leads
 * anywhere this rail is not already showing.
 */
interface TrendingVenuesProps {
  venues: TrendingVenue[];
  loading: boolean;
}

// NOTE: hardcoded fallback venues were removed on 2026-05-11.
// They used synthetic IDs ('1'..'6') that didn't exist in the DB, so
// tapping a fallback card tried to open a venue modal with no matching
// row and silently failed. We now render the empty state instead — see
// the empty-container branch below.

export const TrendingVenues = ({ venues, loading }: TrendingVenuesProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const styles = getStyles(colors);

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
        <Text style={styles.emptyText}>Nothing is featured right now</Text>
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
      {venues.map(venue => {
        return (
          <TouchableOpacity
            key={venue.id}
            style={styles.venueCard}
            onPress={() => (navigation as any).navigate('Explore', { venueId: venue.id })}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={[venue.name, venue.location].filter(Boolean).join(', ')}
          >
            <Image
              source={{ uri: venue.professional_media_urls?.[0] || 'https://images.unsplash.com/photo-1576442655380-1e828d09852f?q=80&w=1000' }}
              style={styles.venueImage}
              resizeMode="cover"
            />
            {/* Scrim — weighted to the bottom so the name always stays legible
                whatever the photograph is doing behind it. */}
            <LinearGradient
              colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.88)']}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.content}>
              <View style={styles.topRow}>
                <Text style={styles.rankLabel} numberOfLines={1}>
                  {venue.promotion_label || 'Sponsored'}
                </Text>
                {/* No chip rather than "0.0": `rating` is 0 on a venue nobody
                    has rated, and a star beside a zero reads as a bad score
                    rather than an absent one. */}
                {hasRating(venue) && (
                  <View style={styles.ratingChip}>
                    <Ionicons name="star" size={9} color={polished.goldMid} />
                    <Text style={styles.ratingText}>{venue.rating!.toFixed(1)}</Text>
                  </View>
                )}
              </View>

              <View>
                <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
                <Text style={styles.locationText} numberOfLines={1}>{venue.location}</Text>
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
    marginHorizontal: -gutter,
  },
  scrollContent: {
    gap: S.md,
    paddingHorizontal: gutter,
  },
  loadingContainer: {
    paddingVertical: S.huge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: S.huge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: T.sm,
  },
  // Same geometry as the Home category tiles — both read from theme/tokens so
  // the two rows are one module, one filled with colour, one with a photograph.
  venueCard: {
    width: tile.widthFor(Dimensions.get('window').width),
    height: tile.height,
    borderRadius: R.lg,
    overflow: 'hidden',
    ...E.low,
  },
  venueImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    padding: S.md,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: S.sm,
  },
  rankLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: '900',
    color: polished.goldMid,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: R.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  venueName: {
    fontSize: T.md,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  locationText: {
    fontSize: T.xs,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 1,
  },
});
