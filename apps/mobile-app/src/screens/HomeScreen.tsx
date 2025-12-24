import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { BottomTabParamList } from '../navigation/types';

const { width } = Dimensions.get('window');

interface Venue {
  id: string;
  name: string;
  description: string;
  location: string;
  category: string;
  rating: number;
  price_range: string;
  professional_media_urls?: string[];
}

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  featured_image_url?: string;
  category?: string;
  publish_date: string;
  external_url?: string;
  source?: string;
}

interface Story {
  id: string;
  user: string;
  image: string;
  isCreator: boolean;
}

interface TrafficData {
  id: string;
  location: string;
  severity: 'light' | 'moderate' | 'heavy' | 'critical';
  description: string;
}

const categories = [
  { icon: '🍸', label: 'Bars & Lounges', color: '#10b981' },
  { icon: '🍽️', label: 'Restaurants', color: '#fb923c' },
  { icon: '📰', label: 'GIDI News', color: '#3b82f6' },
  { icon: '🎵', label: 'Nightlife', color: '#a855f7' },
  { icon: '☀️', label: 'DayLife', color: '#facc15' },
  { icon: '📅', label: 'Events', color: '#ec4899' },
  { icon: '🏢', label: 'Social', color: '#06b6d4' },
  { icon: '➕', label: 'See More', color: '#9ca3af' },
];

const STORIES: Story[] = [
  { id: 's1', user: 'Zilla', image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=200', isCreator: true },
  { id: 's2', user: 'LagosEats', image: 'https://images.unsplash.com/photo-1485230405346-71acb9518d9c?q=80&w=200', isCreator: true },
  { id: 's3', user: 'David', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200', isCreator: false },
  { id: 's4', user: 'Sarah', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200', isCreator: false },
  { id: 's5', user: 'Mike', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200', isCreator: false },
  { id: 's6', user: 'Linda', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200', isCreator: false },
];

const LAGOS_HOTSPOTS = [
  { location: 'Third Mainland Bridge', direction: 'Inward Island' },
  { location: 'Eko Bridge', direction: 'Both Directions' },
  { location: 'Carter Bridge', direction: 'Outward Mainland' },
  { location: 'Ikorodu Road', direction: 'Ketu to Ojota' },
  { location: 'Lekki-Epe Expressway', direction: 'Lekki to Ajah' },
];

export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<BottomTabParamList>>();
  const [currentDay, setCurrentDay] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [vibeArea, setVibeArea] = useState({ area: 'Victoria Island', count: 24, status: 'Electric ⚡️' });

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const hours = now.getHours();

      setCurrentDay(days[now.getDay()]);

      if (hours >= 5 && hours < 12) {
        setTimeOfDay('MORNING');
      } else if (hours >= 12 && hours < 17) {
        setTimeOfDay('AFTERNOON');
      } else if (hours >= 17 && hours < 21) {
        setTimeOfDay('EVENING');
      } else {
        setTimeOfDay('NIGHT');
      }
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Generate traffic alert
    const generateTrafficAlert = (): TrafficData => {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();

      let severity: 'light' | 'moderate' | 'heavy' | 'critical' = 'light';
      let hotspotIndex = 0;

      if (day >= 1 && day <= 5) {
        if ((hour >= 6 && hour <= 10) || (hour >= 16 && hour <= 20)) {
          severity = Math.random() > 0.5 ? 'heavy' : 'critical';
          hotspotIndex = Math.floor(Math.random() * 3);
        } else if (hour >= 11 && hour <= 15) {
          severity = Math.random() > 0.5 ? 'moderate' : 'heavy';
          hotspotIndex = Math.floor(Math.random() * LAGOS_HOTSPOTS.length);
        } else {
          severity = Math.random() > 0.7 ? 'moderate' : 'light';
          hotspotIndex = Math.floor(Math.random() * LAGOS_HOTSPOTS.length);
        }
      } else {
        if (hour >= 14 && hour <= 20) {
          severity = Math.random() > 0.6 ? 'moderate' : 'light';
        } else {
          severity = 'light';
        }
        hotspotIndex = Math.floor(Math.random() * LAGOS_HOTSPOTS.length);
      }

      const hotspot = LAGOS_HOTSPOTS[hotspotIndex];
      const severityTexts = {
        light: 'Light traffic flow',
        moderate: 'Moderate traffic buildup',
        heavy: 'Heavy gridlock',
        critical: 'Critical congestion'
      };

      return {
        id: `traffic-${Date.now()}`,
        location: hotspot.location,
        severity,
        description: `${severityTexts[severity]} on ${hotspot.location} (${hotspot.direction})`
      };
    };

    setTraffic(generateTrafficAlert());

    // Update traffic every 5 minutes
    const interval = setInterval(() => {
      setTraffic(generateTrafficAlert());
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const { data: venues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('rating', { ascending: false })
        .limit(6);

      if (error) throw error;

      // Update vibe check based on venue locations
      if (data && data.length > 0) {
        const areaCounts: Record<string, number> = {};
        data.forEach(venue => {
          const area = venue.location.split(',')[0].trim();
          areaCounts[area] = (areaCounts[area] || 0) + 1;
        });

        let maxArea = 'Victoria Island';
        let maxCount = 0;
        Object.entries(areaCounts).forEach(([area, count]) => {
          if (count > maxCount) {
            maxCount = count;
            maxArea = area;
          }
        });

        const status = maxCount >= 20 ? 'Electric ⚡️' : maxCount >= 10 ? 'Buzzing 🔥' : maxCount >= 5 ? 'Vibing ✨' : 'Chill 🎵';
        setVibeArea({ area: maxArea, count: maxCount, status });
      }

      return data as Venue[];
    },
  });

  const { data: news = [], isLoading: newsLoading, refetch: refetchNews } = useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('is_active', true)
        .order('publish_date', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as NewsArticle[];
    },
    refetchInterval: 3 * 60 * 60 * 1000, // Auto-refresh every 3 hours
    refetchIntervalInBackground: true, // Continue refreshing even when app is in background
  });

  const getVibeStatus = (rating: number) => {
    if (rating >= 4.5) return 'Electric ⚡️';
    if (rating >= 4.0) return 'Buzzing 🔥';
    if (rating >= 3.5) return 'Vibing ✨';
    return 'Chill 🎵';
  };

  const getVisitorCount = () => {
    return Math.floor(Math.random() * 1000) + 100;
  };

  const openNewsLink = (url: string | undefined) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'heavy': return '#ef4444';
      case 'moderate': return '#eab308';
      case 'light': return '#10b981';
      default: return '#eab308';
    }
  };

  const getTimeAgo = (dateString: string) => {
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

  const handleCategoryPress = (label: string) => {
    switch (label) {
      case 'Bars & Lounges':
      case 'Restaurants':
      case 'Nightlife':
      case 'DayLife':
        navigation.navigate('Explore');
        break;
      case 'GIDI News':
        navigation.navigate('News');
        break;
      case 'Events':
        navigation.navigate('Events');
        break;
      case 'Social':
        navigation.navigate('Social');
        break;
      case 'See More':
        navigation.navigate('Explore');
        break;
      default:
        break;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>
            {currentDay} {timeOfDay}
          </Text>
          <Text style={styles.headerTitle}>
            Gidi Connect <Text style={styles.dot}>.</Text>
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.icon}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <View style={styles.notificationDot} />
            <Text style={styles.icon}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search your destination here..."
            placeholderTextColor="#9ca3af"
            editable={false}
          />
        </View>
      </View>

      {/* Stories Section */}
      <View style={styles.storiesSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesContainer}>
          {/* Add Your Story */}
          <View style={styles.storyItem}>
            <View style={[styles.storyCircle, styles.addStoryCircle]}>
              <Text style={styles.addStoryIcon}>➕</Text>
            </View>
            <Text style={styles.storyLabel}>My Vibe</Text>
          </View>

          {/* Stories */}
          {STORIES.map((story) => (
            <View key={story.id} style={styles.storyItem}>
              <View style={[styles.storyCircle, story.isCreator && styles.creatorStory]}>
                <View style={styles.storyInnerCircle}>
                  <Image source={{ uri: story.image }} style={styles.storyImage} />
                </View>
                {story.isCreator && (
                  <View style={styles.creatorBadge}>
                    <Text style={styles.creatorStar}>⭐</Text>
                  </View>
                )}
              </View>
              <Text style={styles.storyLabel} numberOfLines={1}>{story.user}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Category Grid */}
      <View style={styles.categorySection}>
        <View style={styles.categoryGrid}>
          {categories.map((category, index) => (
            <TouchableOpacity
              key={index}
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(category.label)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={styles.categoryLabel}>{category.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Latest News */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest GIDI News 📰</Text>
          <TouchableOpacity onPress={() => navigation.navigate('News')}>
            <Text style={styles.seeMore}>See All →</Text>
          </TouchableOpacity>
        </View>

        {newsLoading ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newsScrollContainer}
          >
            {[...Array(3)].map((_, i) => (
              <View key={i} style={styles.newsCardSkeleton} />
            ))}
          </ScrollView>
        ) : news.length === 0 ? (
          <View style={styles.newsEmptyState}>
            <Text style={styles.newsEmptyIcon}>📰</Text>
            <Text style={styles.newsEmptyText}>No news articles found</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newsScrollContainer}
          >
            {news.slice(0, 6).map((article) => (
              <TouchableOpacity
                key={article.id}
                style={styles.newsCard}
                onPress={() => openNewsLink(article.external_url)}
                activeOpacity={0.9}
              >
                <View style={styles.newsImageWrapper}>
                  <Image
                    source={{
                      uri: article.featured_image_url || 'https://images.unsplash.com/photo-1568822617270-2e2b9c7c7a1e?w=800&q=80'
                    }}
                    style={styles.newsImage}
                    resizeMode="cover"
                  />
                  <View style={styles.newsImageGradient} />
                </View>

                <View style={styles.newsContent}>
                  <View style={styles.newsMetaRow}>
                    <Text style={styles.newsTime}>
                      {getTimeAgo(article.publish_date)}
                    </Text>
                    {article.external_url && (
                      <View style={styles.externalLinkBadge}>
                        <Text style={styles.externalLinkIcon}>↗</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.newsTitle} numberOfLines={2}>
                    {article.title}
                  </Text>

                  {article.summary && (
                    <Text style={styles.newsSummary} numberOfLines={2}>
                      {article.summary}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Traffic Alert */}
      {traffic && (
        <View style={styles.alertSection}>
          <TouchableOpacity style={styles.alertCard}>
            <View style={[styles.alertIcon, { backgroundColor: getSeverityColor(traffic.severity) }]}>
              <Text style={styles.alertIconText}>⚠️</Text>
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertText}>
                <Text style={[styles.alertLabel, { color: getSeverityColor(traffic.severity) }]}>
                  TRAFFIC ALERT:{' '}
                </Text>
                {traffic.description}
              </Text>
            </View>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Vibe Check Map */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>The Vibe Check</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Explore')}>
            <Text style={styles.seeMore}>See Venues</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.vibeCheckCard}
          onPress={() => navigation.navigate('Explore')}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1568822617270-2e2b9c7c7a1e?w=1000&q=80' }}
            style={styles.vibeCheckImage}
            resizeMode="cover"
          />
          <View style={styles.vibeCheckGradient} />

          {/* Pulsing dots */}
          <View style={[styles.pulseDot, styles.pulseDot1]} />
          <View style={[styles.pulseDot, styles.pulseDot2]} />
          <View style={[styles.pulseDot, styles.pulseDot3]} />

          <View style={styles.vibeCheckContent}>
            <View style={styles.liveVibeBadge}>
              <View style={styles.liveVibeDot} />
              <Text style={styles.liveVibeText}>LIVE VIBE CHECK</Text>
            </View>
            <Text style={styles.vibeCheckTitle}>
              {vibeArea.area} is{' '}
              <Text style={styles.vibeCheckStatus}>{vibeArea.status}</Text>
            </Text>
            <Text style={styles.vibeCheckSubtitle}>
              {vibeArea.count} Venues active right now
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Trending Venues */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Tonight 🚀</Text>
        </View>

        {venuesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#EAB308" />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.venuesScrollContainer}
          >
            {venues.map((venue) => (
              <View key={venue.id} style={styles.venueCard}>
                <Image
                  source={{
                    uri: venue.professional_media_urls?.[0] ||
                    'https://images.unsplash.com/photo-1576442655380-1e828d09852f?q=80&w=1000',
                  }}
                  style={styles.venueImage}
                  resizeMode="cover"
                />
                <View style={styles.venueGradient} />
                <View style={styles.venueContent}>
                  <View style={styles.venueTopRow}>
                    <View style={styles.vibeStatusBadge}>
                      <Text style={styles.vibeStatusText}>{getVibeStatus(venue.rating)}</Text>
                    </View>
                    <TouchableOpacity style={styles.bookmarkButton}>
                      <Text style={styles.bookmarkIcon}>🔖</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.venueBottomContent}>
                    <Text style={styles.venueName} numberOfLines={1}>
                      {venue.name}
                    </Text>
                    <View style={styles.venueLocationRow}>
                      <Text style={styles.locationIcon}>📍</Text>
                      <Text style={styles.venueLocation} numberOfLines={1}>
                        {venue.location}
                      </Text>
                    </View>
                    <View style={styles.venueVisitors}>
                      <View style={styles.avatarGroup}>
                        {[1, 2, 3].map((i) => (
                          <View key={i} style={styles.avatar} />
                        ))}
                      </View>
                      <Text style={styles.visitorCount}>{getVisitorCount()} here</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#000',
  },
  headerSubtitle: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800' as const,
  },
  dot: {
    color: '#EAB308',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    position: 'relative' as const,
  },
  icon: {
    fontSize: 24,
  },
  notificationDot: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchIcon: {
    marginRight: 12,
    fontSize: 20,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  storiesSection: {
    paddingVertical: 16,
  },
  storiesContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  storyItem: {
    alignItems: 'center',
    width: 70,
  },
  storyCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    marginBottom: 6,
  },
  addStoryCircle: {
    borderWidth: 2,
    borderStyle: 'dashed' as const,
    borderColor: '#6b7280',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addStoryIcon: {
    fontSize: 24,
    color: '#fff',
  },
  creatorStory: {
    borderWidth: 2,
    borderColor: '#EAB308',
  },
  storyInnerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1f2937',
    overflow: 'hidden',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  creatorBadge: {
    position: 'absolute' as const,
    bottom: -2,
    right: -2,
    backgroundColor: '#EAB308',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorStar: {
    fontSize: 8,
  },
  storyLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  categorySection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryLabel: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 14,
    textAlign: 'center' as const,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700' as const,
  },
  aiPoweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  aiIcon: { fontSize: 10 },
  aiText: { color: '#EAB308', fontSize: 9, fontWeight: '700' as const, letterSpacing: 0.5 },
  seeMore: {
    color: '#EAB308',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center' as const,
    paddingVertical: 40,
  },
  // News Section Styles
  newsLoadingContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  featuredNewsCardSkeleton: {
    height: 280,
    backgroundColor: '#1f2937',
    borderRadius: 16,
  },
  newsCardsSkeletonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  newsCardSkeleton: {
    width: 240,
    height: 200,
    backgroundColor: '#1f2937',
    borderRadius: 12,
  },
  newsEmptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  newsEmptyIcon: {
    fontSize: 64,
    marginBottom: 12,
    opacity: 0.5,
  },
  newsEmptyText: {
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center' as const,
  },
  newsContainer: {
    gap: 16,
  },
  // Featured News Card
  featuredNewsCard: {
    marginHorizontal: 20,
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  featuredNewsImage: {
    width: '100%',
    height: '100%',
    position: 'absolute' as const,
  },
  featuredNewsGradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  featuredCategoryBadge: {
    position: 'absolute' as const,
    top: 16,
    left: 16,
    backgroundColor: '#EAB308',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  featuredCategoryText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  featuredNewsContent: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  featuredNewsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  trendingIcon: {
    fontSize: 12,
  },
  trendingText: {
    color: '#EAB308',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  featuredNewsTime: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  featuredNewsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800' as const,
    marginBottom: 8,
    lineHeight: 26,
  },
  featuredNewsSummary: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  featuredNewsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newsSource: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  newsSourceIcon: {
    fontSize: 14,
  },
  newsSourceText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  readNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAB308',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  readNowText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  readNowIcon: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  // Horizontal News Cards
  newsScrollContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  newsCard: {
    width: 240,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    overflow: 'hidden',
  },
  newsImageWrapper: {
    height: 140,
    position: 'relative' as const,
  },
  newsImage: {
    width: '100%',
    height: '100%',
  },
  newsImageGradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  newsCategoryBadge: {
    position: 'absolute' as const,
    top: 8,
    left: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  newsCategoryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
  },
  newsContent: {
    padding: 12,
  },
  newsMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  newsTime: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '500' as const,
  },
  externalLinkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  externalLinkIcon: {
    color: '#EAB308',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  newsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 6,
    lineHeight: 18,
  },
  newsSummary: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 16,
  },
  alertSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 12,
  },
  alertIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertIconText: {
    fontSize: 14,
  },
  alertContent: {
    flex: 1,
  },
  alertText: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
  },
  alertLabel: {
    fontWeight: '700' as const,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveText: {
    color: '#6b7280',
    fontSize: 10,
  },
  vibeCheckCard: {
    marginHorizontal: 20,
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  vibeCheckImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  vibeCheckGradient: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  pulseDot: {
    position: 'absolute' as const,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAB308',
    opacity: 0.4,
  },
  pulseDot1: {
    top: '30%',
    left: '40%',
  },
  pulseDot2: {
    top: '50%',
    left: '60%',
  },
  pulseDot3: {
    top: '60%',
    left: '20%',
    backgroundColor: '#10b981',
  },
  vibeCheckContent: {
    position: 'absolute' as const,
    bottom: 16,
    left: 16,
    right: 16,
  },
  liveVibeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  liveVibeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EAB308',
  },
  liveVibeText: {
    color: '#EAB308',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  vibeCheckTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  vibeCheckStatus: {
    color: '#EAB308',
  },
  vibeCheckSubtitle: {
    color: '#d1d5db',
    fontSize: 14,
  },
  venuesScrollContainer: {
    paddingHorizontal: 20,
    gap: 20,
  },
  venueCard: {
    width: width * 0.75,
    maxWidth: 400,
    height: 320,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  venueImage: {
    width: '100%',
    height: '100%',
  },
  venueGradient: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  venueContent: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    justifyContent: 'space-between',
  },
  venueTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vibeStatusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  vibeStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  bookmarkButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkIcon: {
    fontSize: 20,
  },
  venueBottomContent: {
    marginBottom: 8,
  },
  venueName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  venueLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationIcon: {
    fontSize: 14,
  },
  venueLocation: {
    color: '#e5e7eb',
    fontSize: 14,
    flex: 1,
  },
  venueVisitors: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarGroup: {
    flexDirection: 'row',
    marginLeft: -8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6b7280',
    borderWidth: 2,
    borderColor: '#000',
    marginLeft: -8,
  },
  visitorCount: {
    color: '#EAB308',
    fontSize: 12,
    fontWeight: '600' as const,
  },
});
