import { useCallback, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useFonts, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { type as T, space as S, radius as R, elevation as E, gutter, tracking } from '../theme/tokens';
import { useTrending, hasRating, type TrendingVenue } from '../lib/trending';

/**
 * The full promoted list — where Home's "See all" goes.
 *
 * It used to go to Explore with no params at all, which is an unfiltered
 * A-to-Z venue list: the same bug the Home search bar had before SearchScreen
 * existed. "See all" has to show more of the same list, not a different one
 * that happens to contain the same venues.
 *
 * Every venue here is a paid placement, so nothing carries a rank number —
 * these slots were bought, not earned, and the screen says so once at the top
 * rather than badging each row with a position none of them hold.
 */
const PLACEHOLDER = 'https://images.unsplash.com/photo-1576442655380-1e828d09852f?q=80&w=1000';

export default function TrendingScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const styles = getStyles(colors);
  const { venues, loading, load } = useTrending(30);
  const [refreshing, setRefreshing] = useState(false);
  const [fontsLoaded] = useFonts({ Orbitron_900Black });

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!fontsLoaded) return null;

  const openVenue = (id: string) =>
    (navigation as any).navigate('Explore', { venueId: id });

  const Row = ({ venue }: { venue: TrendingVenue }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => openVenue(venue.id)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={[venue.promotion_label || 'Sponsored', venue.name, venue.location]
        .filter(Boolean)
        .join(', ')}
    >
      <View style={styles.thumbWrap}>
        <Image
          source={{ uri: venue.professional_media_urls?.[0] || PLACEHOLDER }}
          style={styles.thumb}
          resizeMode="cover"
        />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>{venue.name}</Text>
          {hasRating(venue) && (
            <View style={styles.ratingChip}>
              <Ionicons name="star" size={10} color={colors.goldMid} />
              <Text style={styles.ratingText}>{venue.rating!.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {!!venue.location && (
          <Text style={styles.location} numberOfLines={1}>{venue.location}</Text>
        )}

        <View style={styles.metaRow}>
          {!!venue.category && <Text style={styles.metaChip}>{venue.category}</Text>}
          {/* Printed only when there is something to print. A permanent
              "0 here today" on every row is noise, not information. */}
          {!!venue.checkins_24h && (
            <Text style={styles.live}>
              {venue.checkins_24h} here today
            </Text>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.appName}>TRENDING</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: S.giant }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>Trending venues</Text>
          {!loading && venues.length > 0 && (
            <Text style={styles.basis}>
              {venues.length === 1 ? 'This venue is' : 'These venues are'} featured by Gidi
              Connect. {venues.length === 1 ? 'It is' : 'They are'} not ranked.
            </Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: S.huge }} />
        ) : venues.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="sparkles-outline" size={44} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>Nothing is featured right now</Text>
            {/* Honest about what this screen is and where to go instead,
                rather than asking for a gesture that cannot change it. */}
            <Text style={styles.emptyBody}>
              Featured venues are chosen by Gidi Connect and change regularly. In the meantime,
              Explore has every venue in Lagos.
            </Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => (navigation as any).navigate('Explore')}
              accessibilityRole="button"
              accessibilityLabel="Explore all venues"
            >
              <Text style={styles.emptyActionText}>Explore venues</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.onAccent} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.rows}>
              {venues.map(v => <Row key={v.id} venue={v} />)}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  appName: {
    fontSize: T.base,
    fontFamily: 'Orbitron_900Black',
    color: colors.primary,
    letterSpacing: 2,
  },

  titleSection: { paddingHorizontal: gutter, paddingTop: S.xxl, paddingBottom: S.xl },
  title: {
    fontSize: T.xl,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: tracking.tight,
  },
  basis: {
    fontSize: T.sm,
    color: colors.textMuted,
    marginTop: S.xs,
    lineHeight: T.sm * 1.45,
  },

  section: { marginBottom: S.xxxl },
  rows: { paddingHorizontal: gutter, gap: S.sm },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.sm,
    paddingRight: S.md,
    backgroundColor: colors.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: colors.line,
    ...E.none,
  },
  thumbWrap: {
    width: 60,
    height: 60,
    borderRadius: R.sm,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  thumb: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },

  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  name: { flex: 1, fontSize: T.base, fontWeight: '800', color: colors.text },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: T.xs, fontWeight: '800', color: colors.textMuted },
  location: { fontSize: T.sm, color: colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: 2 },
  metaChip: {
    fontSize: T.xs,
    fontWeight: '700',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: tracking.label,
  },
  live: { fontSize: T.xs, fontWeight: '700', color: colors.live },

  empty: { alignItems: 'center', paddingHorizontal: S.xxxl, paddingTop: S.huge, gap: S.md },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: colors.text },
  emptyBody: {
    fontSize: T.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: T.sm * 1.45,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    marginTop: S.sm,
    paddingHorizontal: S.xl,
    paddingVertical: S.md,
    borderRadius: R.full,
    backgroundColor: colors.primary,
  },
  emptyActionText: { fontSize: T.sm, fontWeight: '800', color: colors.onAccent },
});
