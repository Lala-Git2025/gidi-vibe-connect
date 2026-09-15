import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Animated, Easing, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { categoryAccent, tile, type as T, space as S, radius as R, elevation as E, gutter, tracking } from '../theme/tokens';
import { TrafficAlert } from '../components/TrafficAlert';
import { NotificationsBell } from '../components/NotificationsBell';
import { VibeCheck } from '../components/VibeCheck';
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

const categories: Category[] = [
  { icon: 'wine',          label: 'Bars',        sub: 'Lounges',     screen: 'Explore', params: { category: 'Bar' },         accent: 'bars' },
  { icon: 'restaurant',    label: 'Restaurants', sub: 'Eateries',    screen: 'Explore', params: { category: 'Restaurant' },  accent: 'restaurants' },
  { icon: 'musical-notes', label: 'Nightlife',   sub: 'Clubs',       screen: 'Explore', params: { category: 'Club' },        accent: 'nightlife' },
  { icon: 'sunny',         label: 'DayLife',     sub: 'Beach clubs', screen: 'Explore', params: { category: 'Beach Club' },  accent: 'daylife' },
  { icon: 'calendar',      label: 'Events',      sub: 'This week',   screen: 'Events',                                       accent: 'events' },
  { icon: 'chatbubbles',   label: 'Social',      sub: 'Communities', screen: 'Social',                                       accent: 'social' },
  { icon: 'newspaper',     label: 'Gidi News',   sub: 'Latest',      screen: 'News',                                         accent: 'news' },
  { icon: 'apps',          label: 'See More',    sub: 'Explore all', screen: 'Discover',                                     accent: 'more' },
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

  const getCurrentTimeGreeting = () => {
    const hour = new Date().getHours();
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const part =
      hour < 12 ? 'Morning' :
      hour < 17 ? 'Afternoon' :
      hour < 21 ? 'Evening' : 'Night';
    return { day, part };
  };

  const livePulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 0.35, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [livePulse]);

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

  const { day, part } = getCurrentTimeGreeting();

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
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.appName}>GIDI CONNECT</Text>
            <Animated.View style={[styles.liveDot, { opacity: livePulse }]} />
          </View>
          <View style={styles.headerRight}>
            {/* Was a dead control with no handler at all. */}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => (navigation as any).navigate('Explore')}
              accessibilityRole="button"
              accessibilityLabel="Search venues"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="search" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <NotificationsBell />
          </View>
        </View>

        {/* ── Daypart ────────────────────────────────────────────────────── */}
        <View style={styles.greeting}>
          <Text style={styles.greetingEyebrow}>Tonight in Lagos</Text>
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
        <VibeCheck />

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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  appName: {
    fontSize: T.sm,
    fontFamily: 'Orbitron_900Black',
    color: colors.primary,
    letterSpacing: 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.live,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
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
