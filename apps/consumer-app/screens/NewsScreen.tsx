import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../config/supabase';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  external_url?: string;
  featured_image_url?: string;
  publish_date: string;
  source?: string;
}

// No fallback news - always use latest from Supabase

/**
 * Deduplicate news articles based on title similarity
 */
function deduplicateNews(articles: NewsItem[]): NewsItem[] {
  const uniqueArticles: NewsItem[] = [];
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

export default function NewsScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'traffic', 'events', 'nightlife', 'food', 'general'];
  const styles = getStyles(colors);

  // Fetch news from Supabase
  const fetchNews = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .not('external_url', 'is', null)  // Only fetch articles with URLs
        .order('publish_date', { ascending: false })
        .limit(30);  // Fetch 30 to account for filtering

      if (error) {
        console.error('Error fetching news:', error);
        setNews([]);  // Clear news on error
      } else if (data && data.length > 0) {
        // Filter out articles without valid URLs (safety check)
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

        setNews(deduplicatedNews.slice(0, 20));  // Take top 20 after deduplication
      } else {
        setNews([]);  // Clear news if no data
      }
    } catch (err) {
      console.error('Failed to fetch news:', err);
      setNews([]);  // Clear news on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch news on component mount
  useEffect(() => {
    fetchNews();
  }, []);


  const formatDate = (dateString: string) => {
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
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return publishDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const openNewsArticle = (url?: string) => {
    if (url) {
      Linking.openURL(url).catch(err => {
        console.error('Failed to open URL:', err);
        alert('Could not open article');
      });
    }
  };

  const filteredNews = news.filter(item => {
    if (activeCategory === 'All') return true;
    return item.category.toLowerCase() === activeCategory.toLowerCase();
  });

  const onRefresh = () => {
    fetchNews(true);
  };

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
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>GIDI NEWS</Text>
          <Text style={styles.headerIcon}>📰</Text>
        </View>

        {/* Page Title */}
        <View style={styles.titleSection}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.title}>Latest Lagos News</Text>
          <Text style={styles.subtitle}>Stay updated with what's happening in Lagos</Text>
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  activeCategory === category && styles.categoryButtonActive
                ]}
                onPress={() => setActiveCategory(category)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  activeCategory === category && styles.categoryButtonTextActive
                ]}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* News Feed */}
        <View style={styles.newsSection}>
          <Text style={styles.sectionTitle}>
            {filteredNews.length} articles found
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            filteredNews.map((article) => (
              <TouchableOpacity
                key={article.id}
                style={styles.newsCard}
                onPress={() => openNewsArticle(article.external_url)}
              >
                {article.featured_image_url && (
                  <Image
                    source={{ uri: article.featured_image_url }}
                    style={styles.newsImage}
                    resizeMode="cover"
                  />
                )}

                <View style={styles.newsContent}>
                  <View style={styles.newsHeader}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{article.category}</Text>
                    </View>
                    <Text style={styles.newsTime}>{formatDate(article.publish_date)}</Text>
                  </View>

                  <Text style={styles.newsTitle}>{article.title}</Text>
                  <Text style={styles.newsSummary}>{article.summary}</Text>

                  <View style={styles.newsFooter}>
                    {article.source && (
                      <Text style={styles.newsSource}>📰 {article.source}</Text>
                    )}
                    {article.external_url && (
                      <Text style={styles.readMore}>Read More →</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
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
  backButton: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1.5,
  },
  headerIcon: {
    fontSize: 20,
  },
  // Title
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.error,
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // Categories
  categoriesSection: {
    marginBottom: 24,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: colors.background,
  },
  // News Section
  newsSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  loader: {
    marginTop: 32,
  },
  // News Card
  newsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  newsImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.border,
  },
  newsContent: {
    padding: 16,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.background,
    textTransform: 'uppercase',
  },
  newsTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 24,
  },
  newsSummary: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsSource: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  readMore: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
