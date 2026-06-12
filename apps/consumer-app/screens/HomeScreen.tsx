import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Linking, RefreshControl, ActivityIndicator, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme, polished } from '../contexts/ThemeContext';
import { TrafficAlert } from '../components/TrafficAlert';
import { NotificationsBell } from '../components/NotificationsBell';
import { VibeCheck } from '../components/VibeCheck';
import { TrendingVenues } from '../components/TrendingVenues';
import { StorySection } from '../components/StorySection';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

interface Category {
  icon: string;
  label: string;
  sub: string;
  screen: string;
  c1: string;
  c2: string;
}

const categories: Category[] = [
  { icon: 'wine',           label: 'Bars',        sub: 'Lounges',     screen: 'Explore',  c1: '#7C3AED', c2: '#4338CA' },
  { icon: 'restaurant',     label: 'Restaurants', sub: 'Eateries',    screen: 'Explore',  c1: '#EA580C', c2: '#7C2D12' },
  { icon: 'musical-notes',  label: 'Nightlife',   sub: 'Clubs',       screen: 'Explore',  c1: '#DB2777', c2: '#831843' },
  { icon: 'sunny',          label: 'DayLife',     sub: 'Outdoor',     screen: 'Events',   c1: '#F59E0B', c2: '#92400E' },
  { icon: 'calendar',       label: 'Events',      sub: 'This week',   screen: 'Events',   c1: '#4338CA', c2: '#1E1B4B' },
  { icon: 'chatbubbles',    label: 'Social',      sub: 'Communities', screen: 'Social',   c1: '#10B981', c2: '#064E3B' },
  { icon: 'newspaper',      label: 'Gidi News',   sub: 'Latest',      screen: 'News',     c1: '#0891B2', c2: '#0E7490' },
  { icon: 'apps',           label: 'See More',    sub: 'Explore all', screen: 'Discover', c1: '#DC2626', c2: '#7F1D1D' },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [venueRefreshTrigger, setVenueRefreshTrigger] = useState(0);

  // Load Orbitron font
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Orbitron_900Black,
  });

  const styles = getStyles(colors);

  const onRefresh = async () => {
    setRefreshing(true);
    // Trigger venues refresh by incrementing the counter
    setVenueRefreshTrigger(prev => prev + 1);
    setRefreshing(false);
  };

  const getCurrentTimeGreeting = () => {
    const hour = new Date().getHours();
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const part =
      hour < 12 ? 'MORNING' :
      hour < 17 ? 'AFTERNOON' :
      hour < 21 ? 'EVENING' : 'NIGHT';
    return { day, part };
  };

  // Pulsing green "live" dot driven by Animated; no extra deps.
  const livePulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, {
          toValue: 0.4, duration: 800,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(livePulse, {
          toValue: 1, duration: 800,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [livePulse]);

  const handleCategoryPress = (category: any) => {
    if (category.url) {
      Linking.openURL(category.url);
    } else if (category.screen) {
      navigation.navigate(category.screen as never);
    } else if (category.alert) {
      alert(category.alert);
    }
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 14 }}>Loading Gidi Connect...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header — polished: gold-gradient wordmark + breathing live dot + bell with notification pip */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* expo-linear-gradient can't fill text, so we use a gold-toned color
                with text-shadow approximation. */}
            <Text style={styles.appName}>GIDI CONNECT</Text>
            <Animated.View style={[styles.liveDot, { opacity: livePulse }]} />
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconBtn}>
              <Ionicons name="search" size={20} color={colors.text} />
            </TouchableOpacity>
            <NotificationsBell />
          </View>
        </View>

        {/* Time-based Greeting — daypart in gold */}
        <View style={styles.greetingSection}>
          {(() => {
            const { day, part } = getCurrentTimeGreeting();
            return (
              <Text style={styles.greetingTime}>
                {day} <Text style={styles.greetingPart}>{part}</Text>
              </Text>
            );
          })()}
        </View>

        {/* My Vibe — promoted up here from below the menu cards */}
        <StorySection />

        {/* Search Section */}
        <TouchableOpacity
          style={styles.searchSection}
          onPress={() => navigation.navigate('Explore' as never)}
        >
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 12 }} />
            <Text style={styles.searchPlaceholder}>Search your destination here...</Text>
          </View>
        </TouchableOpacity>

        {/* Explore the Area - Featured Card */}
        <TouchableOpacity
          style={styles.exploreAreaCard}
          onPress={() => navigation.navigate('ExploreArea' as never)}
        >
          <View style={styles.exploreAreaContent}>
            <Ionicons name="map" size={32} color={colors.primary} />
            <View style={styles.exploreAreaText}>
              <Text style={styles.exploreAreaTitle}>Explore the Area</Text>
              <Text style={styles.exploreAreaSubtitle}>Discover venues by neighborhood</Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Categories Grid — jewel-tone gradient tiles with corner shine */}
        <View style={styles.categoriesSection}>
          <View style={styles.categoriesGrid}>
            {categories.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[category.c1, category.c2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.categoryGradient}
                >
                  {/* Corner shine highlight */}
                  <View style={styles.categoryShine} />
                  <Ionicons
                    name={category.icon as any}
                    size={22}
                    color="#fff"
                    style={styles.categoryIcon}
                  />
                  <View style={styles.categoryTextWrap}>
                    <Text style={styles.categoryLabel}>{category.label}</Text>
                    <Text style={styles.categorySub}>{category.sub}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Traffic Update - Dynamic (header is inside TrafficAlert component) */}
        <TrafficAlert />

        {/* Vibe Check Section - Dynamic (title is inside VibeCheck component) */}
        <VibeCheck />

        {/* Trending Venues - Dynamic */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Venues</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Explore' as never)}>
              <Text style={styles.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TrendingVenues refreshTrigger={venueRefreshTrigger} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  // Header — polished
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(234,179,8,0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  appName: {
    fontSize: 15,
    fontFamily: 'Orbitron_900Black',
    color: polished.goldMid,
    letterSpacing: 2,
    textShadowColor: 'rgba(234,179,8,0.55)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifPip: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: colors.background,
    shadowColor: '#EF4444',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  // Greeting — polished
  greetingSection: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 4,
  },
  greetingTime: {
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 3,
    fontWeight: '600',
  },
  greetingPart: {
    color: polished.goldMid,
  },
  // Search
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
    fontFamily: '',
  },
  searchPlaceholder: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // Explore Area Card
  exploreAreaCard: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  exploreAreaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exploreAreaEmoji: {
    fontSize: 32,
    fontFamily: '',
  },
  exploreAreaText: {
    flex: 1,
  },
  exploreAreaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  exploreAreaSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  exploreAreaArrow: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: 'bold',
    fontFamily: '',
  },
  // Categories — polished gradient tiles
  categoriesSection: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: cardWidth,
    height: 96,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryGradient: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
  },
  categoryShine: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.22)',
    opacity: 0.5,
  },
  categoryIcon: {
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  categoryTextWrap: {
    alignItems: 'flex-start',
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.1,
  },
  categorySub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
    fontWeight: '600',
  },
  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  // Traffic
  trafficCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  trafficAlert: {
    flexDirection: 'row',
    gap: 12,
  },
  trafficEmoji: {
    fontSize: 24,
  },
  trafficContent: {
    flex: 1,
  },
  trafficTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  trafficLocation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  trafficTime: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  // Vibe Check
  vibeCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  vibeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  vibeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  vibeStat: {
    alignItems: 'center',
  },
  vibeStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  vibeStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Venues
  venuesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  venueCard: {
    width: 150,
    marginRight: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  venueImagePlaceholder: {
    width: '100%',
    height: 80,
    backgroundColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  venueIcon: {
    fontSize: 32,
  },
  venueName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  venueLocation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  venueRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starIcon: {
    fontSize: 12,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
});
