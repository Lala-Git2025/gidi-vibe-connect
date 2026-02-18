import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Dimensions, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

interface Venue {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  professional_media_urls?: string[];
}

export default function ExploreScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load Orbitron font
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Orbitron_900Black,
  });

  const styles = getStyles(colors);

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      console.log('🔄 Fetching venues from database...');
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, category, location, rating, professional_media_urls')
        .order('rating', { ascending: false });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} venues from database`);

      if (data && data.length > 0) {
        setVenues(data as Venue[]);
      } else {
        console.log('⚠️  No venues in database, using fallback');
        // Fallback venues
        setVenues([
          { id: '1', name: "Quilox", category: "Club", location: "Victoria Island", rating: 4.8, professional_media_urls: ['https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=80'] },
          { id: '2', name: "NOK by Alara", category: "Restaurant", location: "Victoria Island", rating: 4.6, professional_media_urls: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80'] },
          { id: '3', name: "The Shank", category: "Lounge", location: "Lekki", rating: 4.7, professional_media_urls: ['https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&q=80'] },
          { id: '4', name: "Brass & Copper", category: "Bar", location: "Ikoyi", rating: 4.5, professional_media_urls: ['https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80'] },
          { id: '5', name: "Terra Kulture", category: "Restaurant", location: "Victoria Island", rating: 4.4, professional_media_urls: ['https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80'] },
          { id: '6', name: "Hard Rock Cafe", category: "Restaurant", location: "Oniru", rating: 4.6, professional_media_urls: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80'] },
        ]);
      }
    } catch (error) {
      console.error('❌ Error fetching venues:', error);
      // Fallback on error
      setVenues([
        { id: '1', name: "Quilox", category: "Club", location: "Victoria Island", rating: 4.8, professional_media_urls: ['https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=80'] },
        { id: '2', name: "NOK by Alara", category: "Restaurant", location: "Victoria Island", rating: 4.6, professional_media_urls: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80'] },
        { id: '3', name: "The Shank", category: "Lounge", location: "Lekki", rating: 4.7, professional_media_urls: ['https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&q=80'] },
        { id: '4', name: "Brass & Copper", category: "Bar", location: "Ikoyi", rating: 4.5, professional_media_urls: ['https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80'] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVenues();
    setRefreshing(false);
  };

  const categories = ["All", "Club", "Restaurant", "Lounge", "Bar"];

  const filteredVenues = venues.filter(venue => {
    const categoryMatch = activeCategory === "All" || venue.category === activeCategory;
    const searchMatch = searchQuery === "" ||
      venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.location.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  if (!fontsLoaded) {
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading venues...</Text>
        </View>
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            style={styles.backButtonContainer}
          >
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.appName}>EXPLORE</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Page Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Explore Lagos</Text>
          <Text style={styles.subtitle}>Discover the best venues in the city</Text>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search venues or locations..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
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
                  {category}s
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Venues */}
        <View style={styles.venuesSection}>
          <View style={styles.venuesHeader}>
            <Text style={styles.sectionTitle}>
              {activeCategory === 'All' ? 'Featured Venues' : `${activeCategory}s`}
            </Text>
            <Text style={styles.venuesCount}>{filteredVenues.length} venues</Text>
          </View>

          <View style={styles.venuesGrid}>
            {filteredVenues.map((venue) => (
              <TouchableOpacity
                key={venue.id}
                style={styles.venueCard}
                onPress={() => alert(`${venue.name}\n${venue.location}\n\nRating: ${venue.rating}⭐\nCategory: ${venue.category}\n\nFull venue details coming soon!`)}
              >
                {venue.professional_media_urls?.[0] ? (
                  <View style={styles.venueImageContainer}>
                    <Image
                      source={{ uri: venue.professional_media_urls[0] }}
                      style={styles.venueImage}
                      resizeMode="cover"
                    />
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{venue.category}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.venueImagePlaceholder}>
                    <Text style={styles.venueIcon}>🏢</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{venue.category}</Text>
                    </View>
                  </View>
                )}
                <View style={styles.venueDetails}>
                  <Text style={styles.venueName}>{venue.name}</Text>
                  <View style={styles.venueLocation}>
                    <Text style={styles.locationIcon}>📍</Text>
                    <Text style={styles.locationText}>{venue.location}</Text>
                  </View>
                  <View style={styles.venueRating}>
                    <Text style={styles.starIcon}>⭐</Text>
                    <Text style={styles.ratingText}>{venue.rating}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
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
  backButtonContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '600',
  },
  appName: {
    fontSize: 20,
    fontFamily: 'Orbitron_900Black',
    color: colors.primary,
    letterSpacing: 2,
  },
  // Title
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
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
  // Search
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: colors.text,
    fontSize: 14,
  },
  // Categories
  categoriesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: 16,
    marginBottom: 12,
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
  // Venues
  venuesSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  venuesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  venuesCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  venuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  venueCard: {
    width: cardWidth,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  venueImageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  venueImage: {
    width: '100%',
    height: '100%',
  },
  venueImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  venueIcon: {
    fontSize: 32,
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.background,
  },
  venueDetails: {
    padding: 12,
  },
  venueName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  venueLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  venueRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
});
