import { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Linking, Image, RefreshControl, Alert, ActivityIndicator, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme, polished } from '../contexts/ThemeContext';
import { supabase } from '../config/supabase';
import { TrafficAlert } from '../components/TrafficAlert';
import { VibeCheck } from '../components/VibeCheck';
import { TrendingVenues } from '../components/TrendingVenues';
import { StorySection } from '../components/StorySection';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

/**
 * Route news images through images.weserv.nl — a free image proxy.
 * Two problems it solves:
 *   1. Hotlink protection on CDNs (e.g. lindaikejisblog) that 403 direct requests.
 *   2. Unencoded special chars in upstream URLs (e.g. `?operations=autocrop(1200:630)`
 *      on pulse.ng's CDN — parens trip some HTTP clients).
 * weserv re-encodes the URL, strips referer, and re-emits a clean image stream.
 */
function proxyImage(url?: string | null): string | undefined {
  if (!url) return undefined;
  const stripped = url.replace(/^https?:\/\//, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}&w=520&output=webp`;
}

/**
 * Deduplicate news articles based on title similarity
 */
function deduplicateNews(articles: any[]): any[] {
  const uniqueArticles: any[] = [];
  const seenTitles = new Set<string>();

  for (const article of articles) {
    const normalizedTitle = normalizeTitle(article.title);

    // Check if we've seen a similar title
    let isDuplicate = false;
    for (const seenTitle of seenTitles) {
      if (areTitlesSimilar(normalizedTitle, seenTitle)) {
        isDuplicate = true;

        // If this article has an image and the existing one doesn't, replace it
        const existingIndex = uniqueArticles.findIndex(
          a => normalizeTitle(a.title) === seenTitle
        );

        if (existingIndex !== -1) {
          const existing = uniqueArticles[existingIndex];
          if (article.featured_image_url && !existing.featured_image_url) {
            // Replace with article that has image
            uniqueArticles[existingIndex] = article;
            seenTitles.delete(seenTitle);
            seenTitles.add(normalizedTitle);
          }
        }
        break;
      }
    }

    if (!isDuplicate) {
      uniqueArticles.push(article);
      seenTitles.add(normalizedTitle);
    }
  }

  return uniqueArticles;
}

/**
 * Normalize title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ')      // Normalize spaces
    .trim();
}

/**
 * Check if two titles are similar (70% word overlap)
 */
function areTitlesSimilar(title1: string, title2: string): boolean {
  const words1 = new Set(title1.split(' ').filter(w => w.length > 3));
  const words2 = new Set(title2.split(' ').filter(w => w.length > 3));

  if (words1.size === 0 || words2.size === 0) return false;

  // Count common words
  let commonWords = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      commonWords++;
    }
  }

  // Calculate similarity
  const similarity = commonWords / Math.min(words1.size, words2.size);

  // Consider titles similar if they share 70% or more words
  return similarity >= 0.7;
}

/**
 * Categorize a news article based on its title + summary content.
 */
function categorizeArticle(title: string, summary: string = ''): string {
  const text = `${title} ${summary}`.toLowerCase();

  if (/\b(politic|govt|government|governor|senator|president|minister|election|campaign|vote|tribunal|inec|apc\b|pdp\b|lp\b|adc\b|senate|lawmaker|legislation|impeach|democracy|diplomacy|tariff|trump|biden|tinubu|obi\b|atiku|shettima|wike|sanwo[\s-]?olu|buhari|national\s?assembly|supreme\s?court|judiciary|aso\s?rock|presidency|opposition|political\s?party|geopolitic|ecowas|african\s?union)\b/.test(text)) return 'politics';
  if (/\b(killed|murder|robbery|kidnap|arrest|police|shoot|gun|attack|bomb|terror|bandits?|ritual|fraud|scam|efcc|ndlea|prison|jail|suspect|crime|criminal|armed|theft|assault|victim|cult|gang|trafficking)\b/.test(text)) return 'crime';
  if (/\b(economy|inflation|naira|dollar|exchange\s?rate|stock|market|invest|revenue|budget|tax|cbn\b|bank\b|oil\s?price|crude|opec|business|startup|funding|profit|debt|fintech|crypto|trade\s?war)\b/.test(text)) return 'business';
  if (/\b(clubs?|nightclubs?|nightlife|night\s?life|lounges?|dj\s?set|rave|after[\s-]?party|bottle\s?service|night\s?out)\b/.test(text)) return 'nightlife';
  if (/\b(concert|festival|exhibition|premiere|ceremony|gala|carnival|conference|summit|award\s?show|red\s?carpet|lineup|headlin|fashion\s?week)\b/.test(text)) return 'events';
  if (/\b(football|soccer|nba|basketball|athlete|stadium|premier\s?league|champions\s?league|afcon|super\s?eagles|coach|goalkeeper|striker|fixture|olympic|wrestling|boxing|marathon|world\s?cup|fifa)\b/.test(text)) return 'sports';
  if (/\b(restaurant|food|chef|dining|recipe|cuisine|cook|kitchen|menu|suya|jollof|amala|pepper\s?soup|eatery|bakery|cafe|brunch)\b/.test(text)) return 'food';
  if (/\b(traffic|road\s?clos|gridlock|accident|highway|expressway|brt\b|danfo|commut|transport|third\s?mainland|congestion)\b/.test(text)) return 'traffic';
  if (/\b(fashion|wedding|beauty|makeup|wellness|fitness|museum|gallery|theatre|design|real\s?estate|luxury|relationship|dating)\b/.test(text)) return 'lifestyle';
  if (/\b(nollywood|movie|film|actor|actress|music|album|song|rapper|singer|wizkid|davido|burna\s?boy|asake|rema\b|tems\b|bbnaija|big\s?brother|reality\s?tv|netflix|grammy|headies|afrobeat|amapiano|comedy|comedian|viral|influencer|gossip|scandal|celebrity|celeb)\b/.test(text)) return 'entertainment';
  if (/\b(tech|ai\b|artificial\s?intelligence|software|gadget|phone|iphone|google|apple|microsoft|spacex|elon\s?musk|robot|drone|cyber|hack|blockchain)\b/.test(text)) return 'technology';
  if (/\b(health|hospital|doctor|disease|virus|vaccine|medicine|surgery|who\b|ncdc|medical|mental\s?health|epidemic|pandemic)\b/.test(text)) return 'health';
  if (/\b(university|school|student|education|asuu|exam|waec|jamb|neco|scholarship|academic|admission)\b/.test(text)) return 'education';

  return 'general';
}

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
  { icon: 'newspaper',      label: 'News',        sub: 'Latest',      screen: 'News',     c1: '#0891B2', c2: '#0E7490' },
  { icon: 'apps',           label: 'See More',    sub: 'Explore all', screen: 'Discover', c1: '#DC2626', c2: '#7F1D1D' },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const [liveNews, setLiveNews] = useState<Array<{
    title: string;
    summary: string;
    time: string;
    category: string;
    featured_image_url?: string;
    external_url?: string;
  }>>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [venueRefreshTrigger, setVenueRefreshTrigger] = useState(0);
  // News image URLs that 404'd / failed hotlink checks — show placeholder instead.
  const [brokenNewsImages, setBrokenNewsImages] = useState<Set<string>>(new Set());

  // Load Orbitron font
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Orbitron_900Black,
  });

  const styles = getStyles(colors);

  const fetchLatestNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('title, summary, category, publish_date, featured_image_url, external_url')
        .not('external_url', 'is', null)  // Only fetch articles with URLs
        .order('publish_date', { ascending: false })
        .limit(60);  // wider window so we can pick a diverse cross-section

      if (error) {
        console.error('Error fetching news:', error);
        setLiveNews([]);
        return;
      }

      if (data && data.length > 0) {
        // Filter out articles with fake/placeholder URLs
        const validNews = data.filter(item => {
          if (!item.external_url) return false;
          const urlLower = item.external_url.toLowerCase();
          // Exclude fake URLs
          if (urlLower.includes('example.com') ||
              urlLower.includes('localhost') ||
              urlLower.includes('test.com') ||
              urlLower.includes('placeholder')) {
            return false;
          }
          return item.external_url.startsWith('http');
        });

        // Remove duplicates based on title similarity
        const deduplicatedNews = deduplicateNews(validNews);

        // Re-categorize using the regex bank (DB categories are noisy).
        const recategorized = deduplicatedNews.map(item => ({
          ...item,
          _cat: categorizeArticle(item.title, item.summary),
        }));

        // Pick the freshest article from each distinct category until we
        // have N cards. Falls back to ordinary recency once we run out of
        // unique categories.
        const HOME_CARDS = 5;
        const seenCats = new Set<string>();
        const diverse: typeof recategorized = [];
        for (const item of recategorized) {
          if (diverse.length >= HOME_CARDS) break;
          if (seenCats.has(item._cat)) continue;
          seenCats.add(item._cat);
          diverse.push(item);
        }
        for (const item of recategorized) {
          if (diverse.length >= HOME_CARDS) break;
          if (diverse.includes(item)) continue;
          diverse.push(item);
        }

        const formattedNews = diverse.map(item => ({
          title: item.title,
          summary: item.summary,
          time: formatTimeAgo(item.publish_date),
          category: item._cat.charAt(0).toUpperCase() + item._cat.slice(1),
          featured_image_url: proxyImage(item.featured_image_url),
          external_url: item.external_url,
        }));
        setLiveNews(formattedNews);
      } else {
        setLiveNews([]);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      setLiveNews([]);  // Clear news on error
    }
  };

  // Fetch latest news on every focus so the Home feed stays current after
  // the user navigates away and comes back.
  useFocusEffect(
    useCallback(() => {
      fetchLatestNews();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLatestNews();
    // Trigger venues refresh by incrementing the counter
    setVenueRefreshTrigger(prev => prev + 1);
    setRefreshing(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const publishDate = new Date(dateString);
    const diffInMs = now.getTime() - publishDate.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 60) {
      return `${diffInMins}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
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

  const openNews = () => {
    navigation.navigate('News' as never);
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
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => Alert.alert('Coming Soon', 'Notifications are on the way!')}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              <View style={styles.notifPip} />
            </TouchableOpacity>
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

        {/* Live News Section — hidden when no articles loaded yet */}
        {liveNews.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>LIVE - GIDI News</Text>
            <TouchableOpacity onPress={openNews}>
              <Text style={styles.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.newsScroll}>
            {liveNews.map((news, index) => (
              <TouchableOpacity
                key={index}
                style={styles.newsCard}
                onPress={() => {
                  if (news.external_url) {
                    Linking.openURL(news.external_url).catch(() => {
                      Alert.alert('Error', 'Could not open article');
                    });
                  }
                }}
              >
                {news.featured_image_url && !brokenNewsImages.has(news.featured_image_url) ? (
                  <View style={styles.newsImageContainer}>
                    <Image
                      source={{ uri: news.featured_image_url }}
                      style={styles.newsImage}
                      resizeMode="cover"
                      onError={() => {
                        const url = news.featured_image_url!;
                        setBrokenNewsImages(prev => {
                          if (prev.has(url)) return prev;
                          const next = new Set(prev);
                          next.add(url);
                          return next;
                        });
                      }}
                    />
                    <View style={styles.newsCategoryBadge}>
                      <Text style={styles.newsCategoryText}>{news.category}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.newsImagePlaceholder}>
                    <Ionicons name="newspaper" size={40} color={colors.textSecondary} />
                    <View style={styles.newsCategoryBadge}>
                      <Text style={styles.newsCategoryText}>{news.category}</Text>
                    </View>
                  </View>
                )}
                <View style={styles.newsContent}>
                  <View style={styles.newsHeader}>
                    <Text style={styles.newsTime}>{news.time}</Text>
                  </View>
                  <Text style={styles.newsTitle}>{news.title}</Text>
                  <Text style={styles.newsDescription}>{news.summary}</Text>
                  <Text style={styles.newsLink}>Read More →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        )}

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
  // News
  newsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  newsCard: {
    width: 260,
    marginRight: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  newsImagePlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  newsImageContainer: {
    width: '100%',
    height: 100,
    position: 'relative',
  },
  newsImage: {
    width: '100%',
    height: '100%',
  },
  newsIcon: {
    fontSize: 40,
  },
  newsCategoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  newsCategoryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.background,
  },
  newsContent: {
    padding: 10,
  },
  newsHeader: {
    marginBottom: 8,
  },
  newsTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 18,
  },
  newsDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 16,
  },
  newsLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
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
