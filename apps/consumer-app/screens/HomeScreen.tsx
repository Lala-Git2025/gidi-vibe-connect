import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { categoryAccent, tile, type as T, space as S, radius as R, elevation as E, gutter, tracking } from '../theme/tokens';
import { TrafficAlert } from '../components/TrafficAlert';
import { NotificationsBell } from '../components/NotificationsBell';
import { TrendingVenues } from '../components/TrendingVenues';
import { StorySection } from '../components/StorySection';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { Ionicons } from '@expo/vector-icons';

/**
 * Each tile now carries the params that actually filter the destination.
 * Previously Bars, Restaurants and Nightlife all navigated to Explore with no
 * category at all, so three differently-labelled tiles produced an identical
 * unfiltered list. `category` values match the real values in venues.category.
 */
interface Category {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  screen: string;
  params?: Record<string, string>;
  accent: keyof typeof categoryAccent;
}

/**
 * Six tiles, not eight. Events and Social were dropped: both are bottom tabs,
 * so the grid was duplicating the tab bar one tap away from it. The four venue
 * categories are the ones with nowhere else to go.
 */
const categories: Category[] = [
  { icon: 'wine',          label: 'Bars',        sub: 'Lounges',        screen: 'Explore',  params: { category: 'Bar' },        accent: 'bars' },
  { icon: 'restaurant',    label: 'Restaurants', sub: 'Eateries',       screen: 'Explore',  params: { category: 'Restaurant' }, accent: 'restaurants' },
  { icon: 'musical-notes', label: 'Nightlife',   sub: 'Clubs',          screen: 'Explore',  params: { category: 'Club' },       accent: 'nightlife' },
  { icon: 'sunny',         label: 'DayLife',     sub: 'Beach clubs',    screen: 'Explore',  params: { category: 'Beach Club' }, accent: 'daylife' },
  { icon: 'newspaper',     label: 'Gidi News',   sub: 'Latest',         screen: 'News',                                         accent: 'news' },
  { icon: 'people',        label: 'Discover',    sub: 'Friend activity', screen: 'Discover',                                    accent: 'more' },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [venueRefreshTrigger, setVenueRefreshTrigger] = useState(0);

  const [fontsLoaded] = useFonts({ Orbitron_700Bold, Orbitron_900Black });
  const styles = getStyles(colors);

  // Bumping the trigger remounts the data children so they refetch. Held open
  // briefly so the control doesn't snap shut before anything has arrived —
  // previously it cleared synchronously and the spinner just flashed.
  const onRefresh = async () => {
    setRefreshing(true);
    setVenueRefreshTrigger(prev => prev + 1);
    await new Promise(r => setTimeout(r, 600));
    setRefreshing(false);
  };

  // The eyebrow used to read "Tonight in Lagos" at every hour, including nine
  // in the morning with "Monday Morning" printed directly underneath it.
  const getCurrentTimeGreeting = () => {
    const hour = new Date().getHours();
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    if (hour < 12)  return { day, part: 'Morning',   eyebrow: 'This morning in Lagos' };
    if (hour < 17)  return { day, part: 'Afternoon', eyebrow: 'This afternoon in Lagos' };
    if (hour < 21)  return { day, part: 'Evening',   eyebrow: 'Tonight in Lagos' };
    return            { day, part: 'Night',     eyebrow: 'Tonight in Lagos' };
  };

  const handleCategoryPress = (category: Category) => {
    (navigation as any).navigate(category.screen, category.params);
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={[styles.container, styles.centred]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const { day, part, eyebrow } = getCurrentTimeGreeting();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: S.giant }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        {/* The header carried a search icon that navigated to Explore with no
            params — the same destination as the search bar forty pixels below
            it — and a gold dot that pulsed permanently without standing for
            anything. Both are gone. */}
        <View style={styles.header}>
          <Text style={styles.appName}>GIDI CONNECT</Text>
          <NotificationsBell />
        </View>

        {/* ── Daypart ────────────────────────────────────────────────────── */}
        <View style={styles.greeting}>
          <Text style={styles.greetingEyebrow}>{eyebrow}</Text>
          <Text style={styles.greetingDisplay}>
            {day} <Text style={styles.greetingAccent}>{part}</Text>
          </Text>
        </View>

        {/* ── Stories ────────────────────────────────────────────────────── */}
        <StorySection />

        {/* ── Search ─────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => (navigation as any).navigate('Explore')}
          activeOpacity={0.7}
          accessibilityRole="search"
        >
          <Ionicons name="search" size={17} color={colors.textFaint} />
          <Text style={styles.searchPlaceholder}>Search venues, areas…</Text>
        </TouchableOpacity>

        {/* ── Explore the area ───────────────────────────────────────────── */}
        {/* Was a gold-bordered, gold-glowing box competing with every other
            gold element on the page. Now a quiet row; the gold is the arrow. */}
        <TouchableOpacity
          style={styles.areaRow}
          onPress={() => (navigation as any).navigate('ExploreArea')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Explore the area, venues by neighbourhood"
        >
          <View style={styles.areaIcon}>
            <Ionicons name="map-outline" size={19} color={colors.primary} />
          </View>
          <View style={styles.areaText}>
            <Text style={styles.areaTitle}>Explore the area</Text>
            <Text style={styles.areaSub}>Venues by neighbourhood</Text>
          </View>
          <Ionicons name="arrow-forward" size={19} color={colors.primary} />
        </TouchableOpacity>

        {/* ── Categories ─────────────────────────────────────────────────── */}
        {/* Eight saturated unrelated hues became one warm family, each a dark
            surface with a gold icon. The tiles read as a set, and the gold
            stays meaningful because it isn't competing with seven other hues. */}
        <View style={styles.grid}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.label}
              style={styles.tile}
              onPress={() => handleCategoryPress(category)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${category.label}, ${category.sub}`}
            >
              <LinearGradient
                colors={categoryAccent[category.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tileFill}
              >
                <Ionicons name={category.icon} size={20} color={colors.goldHi} />
                <View>
                  <Text style={styles.tileLabel}>{category.label}</Text>
                  <Text style={styles.tileSub}>{category.sub}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <TrafficAlert />

        {/* ── Trending ───────────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending venues</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('Explore')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <TrendingVenues refreshTrigger={venueRefreshTrigger} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centred: { justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingVertical: S.md,
  },
  appName: {
    fontSize: T.sm,
    fontFamily: 'Orbitron_900Black',
    color: colors.primary,
    letterSpacing: 2,
  },

  // ── Daypart ──
  greeting: {
    paddingHorizontal: gutter,
    paddingTop: S.sm,
    paddingBottom: S.xl,
  },
  greetingEyebrow: {
    fontSize: T.xs,
    fontWeight: '700',
    color: colors.textFaint,
    letterSpacing: tracking.label,
    textTransform: 'uppercase',
    marginBottom: S.xs,
  },
  greetingDisplay: {
    fontSize: T.xxl,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: tracking.tight,
    lineHeight: T.xxl * 1.15,
  },
  greetingAccent: { color: colors.primary },

  // ── Search ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    marginHorizontal: gutter,
    marginBottom: S.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: R.md,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
  },
  searchPlaceholder: { fontSize: T.base, color: colors.textFaint },

  // ── Explore the area ──
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    marginHorizontal: gutter,
    marginBottom: S.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: R.lg,
    padding: S.lg,
  },
  areaIcon: {
    width: 38,
    height: 38,
    borderRadius: R.sm,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaText: { flex: 1 },
  areaTitle: { fontSize: T.md, fontWeight: '700', color: colors.text },
  areaSub: { fontSize: T.sm, color: colors.textMuted, marginTop: 1 },

  // ── Category grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S.md,
    paddingHorizontal: gutter,
    marginBottom: S.xxl,
  },
  tile: {
    // Geometry comes from theme/tokens so the trending venue rail can match it.
    width: tile.widthFor(Dimensions.get('window').width),
    height: tile.height,
    borderRadius: R.lg,
    overflow: 'hidden',
    ...E.low,
  },
  tileFill: {
    flex: 1,
    padding: S.md,
    justifyContent: 'space-between',
  },
  tileLabel: { fontSize: T.md, fontWeight: '700', color: '#F8F4EC' },
  tileSub: { fontSize: T.xs, color: 'rgba(248,244,236,0.62)', marginTop: 1 },

  // ── Section header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    marginBottom: S.lg,
  },
  sectionTitle: {
    fontSize: T.lg,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: tracking.tight,
  },
  seeAll: { fontSize: T.sm, fontWeight: '700', color: colors.primary },
});
