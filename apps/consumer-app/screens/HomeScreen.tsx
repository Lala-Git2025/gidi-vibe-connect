import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Linking, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../config/supabase';
import { TrafficAlert } from '../components/TrafficAlert';
import { VibeCheck } from '../components/VibeCheck';
import { TrendingVenues } from '../components/TrendingVenues';
import { StorySection } from '../components/StorySection';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

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

const categories = [
  { emoji: '🍸', label: "Bars & Lounges", screen: "Explore" },
  { emoji: '🍽️', label: "Restaurants", screen: "Explore" },
  { emoji: '📰', label: "GIDI News", screen: "News" },
  { emoji: '🎵', label: "Nightlife", screen: "Explore" },
  { emoji: '☀️', label: "DayLife", screen: "Events" },
  { emoji: '📅', label: "Events", screen: "Events" },
  { emoji: '💬', label: "Social", screen: "Social" },
  { emoji: '➕', label: "See More", screen: "Discover" },
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
        .limit(10);  // Fetch more to account for filtering

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

        const formattedNews = deduplicatedNews.slice(0, 3).map(item => ({
          title: item.title,
          summary: item.summary,
          time: formatTimeAgo(item.publish_date),
          category: item.category.charAt(0).toUpperCase() + item.category.slice(1),
          featured_image_url: item.featured_image_url,
          external_url: item.external_url
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

  // Fetch latest news from Supabase
  useEffect(() => {
    fetchLatestNews();
  }, []);

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

    if (hour < 12) return `${day} MORNING`;
    if (hour < 17) return `${day} AFTERNOON`;
    if (hour < 21) return `${day} EVENING`;
    return `${day} NIGHT`;
  };

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
    return null;
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.appName}>GIDI CONNECT</Text>
            <View style={styles.liveDot} />
          </View>
          <TouchableOpacity onPress={() => alert('Notifications coming soon!')}>
            <Text style={styles.headerIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Time-based Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTime}>{getCurrentTimeGreeting()}</Text>
        </View>

        {/* Search Section */}
        <TouchableOpacity
          style={styles.searchSection}
          onPress={() => navigation.navigate('Explore' as never)}
        >
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchPlaceholder}>Search your destination here...</Text>
          </View>
        </TouchableOpacity>

        {/* Explore the Area - Featured Card */}
        <TouchableOpacity
          style={styles.exploreAreaCard}
          onPress={() => navigation.navigate('ExploreArea' as never)}
        >
          <View style={styles.exploreAreaContent}>
            <Text style={styles.exploreAreaEmoji}>🗺️</Text>
            <View style={styles.exploreAreaText}>
              <Text style={styles.exploreAreaTitle}>Explore the Area</Text>
              <Text style={styles.exploreAreaSubtitle}>Discover venues by neighborhood</Text>
            </View>
            <Text style={styles.exploreAreaArrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Categories Grid */}
        <View style={styles.categoriesSection}>
          <View style={styles.categoriesGrid}>
            {categories.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category)}
              >
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                <Text style={styles.categoryLabel}>{category.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stories Section */}
        <StorySection />

        {/* Live News Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔴 LIVE - GIDI News</Text>
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
                    Linking.openURL(news.external_url).catch(err => {
                      console.error('Failed to open URL:', err);
                      alert('Could not open article');
                    });
                  }
                }}
              >
                {news.featured_image_url ? (
                  <View style={styles.newsImageContainer}>
                    <Image
                      source={{ uri: news.featured_image_url }}
                      style={styles.newsImage}
                      resizeMode="cover"
                    />
                    <View style={styles.newsCategoryBadge}>
                      <Text style={styles.newsCategoryText}>{news.category}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.newsImagePlaceholder}>
                    <Text style={styles.newsIcon}>📰</Text>
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

        {/* Traffic Update - Dynamic (header is inside TrafficAlert component) */}
        <TrafficAlert />

        {/* Vibe Check Section - Dynamic */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Vibe Check</Text>
        </View>
        <VibeCheck />

        {/* Trending Venues - Dynamic */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Trending Venues</Text>
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
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    fontSize: 20,
    fontFamily: 'Orbitron_900Black',
    color: colors.primary,
    letterSpacing: 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  headerIcon: {
    fontSize: 20,
  },
  // Greeting
  greetingSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  greetingTime: {
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 1,
    fontWeight: '500',
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
  },
  // Categories
  categoriesSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: cardWidth,
    height: 96,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  categoryEmoji: {
    fontSize: 32,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
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
