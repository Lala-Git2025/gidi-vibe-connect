import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../config/supabase';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';

const { width } = Dimensions.get('window');
const areaCardWidth = (width - 48) / 2;

interface Venue {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  professional_media_urls?: string[];
  features?: string[];
}

// Lagos Areas/Neighborhoods
const LAGOS_AREAS = [
  {
    id: 'victoria-island',
    name: 'Victoria Island',
    shortName: 'VI',
    description: 'Upscale dining and nightlife hub',
    emoji: '🏙️',
    image: 'https://images.unsplash.com/photo-1568822617270-2e2b9c7c7a1e?w=800&q=85'
  },
  {
    id: 'lekki',
    name: 'Lekki',
    shortName: 'Lekki',
    description: 'Trendy bars and beach clubs',
    emoji: '🏖️',
    image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=85'
  },
  {
    id: 'ikoyi',
    name: 'Ikoyi',
    shortName: 'Ikoyi',
    description: 'Fine dining and luxury lounges',
    emoji: '🍷',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=85'
  },
  {
    id: 'ikeja',
    name: 'Ikeja',
    shortName: 'Ikeja',
    description: 'Diverse entertainment options',
    emoji: '🎭',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=85'
  },
  {
    id: 'yaba',
    name: 'Yaba',
    shortName: 'Yaba',
    description: 'Youth culture and nightlife',
    emoji: '🎵',
    image: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=85'
  },
  {
    id: 'surulere',
    name: 'Surulere',
    shortName: 'Surulere',
    description: 'Local spots and live music',
    emoji: '🎸',
    image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=85'
  },
];

export default function ExploreAreaScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingVenues, setTrendingVenues] = useState<Venue[]>([]);
  const [newVenues, setNewVenues] = useState<Venue[]>([]);

  // Load Orbitron font
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Orbitron_900Black,
  });

  const styles = getStyles(colors);

  useEffect(() => {
    fetchVenues();
    fetchCollections();
  }, [selectedArea]);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('venues')
        .select('id, name, category, location, rating, professional_media_urls, features')
        .order('rating', { ascending: false });

      // Filter by area if selected
      if (selectedArea) {
        const area = LAGOS_AREAS.find(a => a.id === selectedArea);
        if (area) {
          query = query.ilike('location', `%${area.name}%`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setVenues((data as Venue[]) || []);
    } catch (error) {
      console.error('Error fetching venues:', error);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      // Fetch trending venues (highest rated)
      const { data: trending } = await supabase
        .from('venues')
        .select('id, name, category, location, rating, professional_media_urls')
        .order('rating', { ascending: false })
        .limit(6);

      setTrendingVenues((trending as Venue[]) || []);

      // Simulate "new venues" by getting random selection
      const { data: newOnes } = await supabase
        .from('venues')
        .select('id, name, category, location, rating, professional_media_urls')
        .limit(6);

      setNewVenues((newOnes as Venue[]) || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const getVenueCount = (areaName: string) => {
    return venues.filter(v =>
      v.location.toLowerCase().includes(areaName.toLowerCase())
    ).length;
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.appName}>AREAS</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Explore Lagos</Text>
          <Text style={styles.subtitle}>Discover venues by neighborhood</Text>
        </View>

        {/* Areas Grid */}
        <View style={styles.areasSection}>
          <Text style={styles.sectionTitle}>📍 Areas & Neighborhoods</Text>
          <View style={styles.areasGrid}>
            {LAGOS_AREAS.map((area) => (
              <TouchableOpacity
                key={area.id}
                style={[
                  styles.areaCard,
                  selectedArea === area.id && styles.areaCardActive
                ]}
                onPress={() => setSelectedArea(selectedArea === area.id ? null : area.id)}
              >
                <Image
                  source={{ uri: area.image }}
                  style={styles.areaImage}
                  resizeMode="cover"
                />
                <View style={styles.areaOverlay} />
                <View style={styles.areaContent}>
                  <Text style={styles.areaEmoji}>{area.emoji}</Text>
                  <Text style={styles.areaName}>{area.shortName}</Text>
                  <Text style={styles.areaDescription}>{area.description}</Text>
                  <View style={styles.venueCountBadge}>
                    <Text style={styles.venueCountText}>
                      {venues.filter(v => v.location.includes(area.name)).length} venues
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Collections */}
        {!selectedArea && (
          <>
            {/* Trending Now */}
            <View style={styles.collectionSection}>
              <View style={styles.collectionHeader}>
                <Text style={styles.collectionTitle}>🔥 Trending Now</Text>
                <Text style={styles.collectionSubtitle}>Hottest spots in Lagos</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.collectionScroll}>
                {trendingVenues.map((venue) => (
                  <TouchableOpacity
                    key={venue.id}
                    style={styles.venueCard}
                    onPress={() => alert(`${venue.name}\n${venue.location}\n\nRating: ${venue.rating}⭐\n\nFull details coming soon!`)}
                  >
                    <Image
                      source={{ uri: venue.professional_media_urls?.[0] || 'https://images.unsplash.com/photo-1576442655380-1e828d09852f?w=800&q=85' }}
                      style={styles.venueCardImage}
                      resizeMode="cover"
                    />
                    <View style={styles.venueCardGradient} />
                    <View style={styles.venueCardContent}>
                      <View style={styles.venueCardBadge}>
                        <Text style={styles.venueCardBadgeText}>⭐ {venue.rating}</Text>
                      </View>
                      <Text style={styles.venueCardName}>{venue.name}</Text>
                      <Text style={styles.venueCardLocation}>📍 {venue.location}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* New & Hot */}
            <View style={styles.collectionSection}>
              <View style={styles.collectionHeader}>
                <Text style={styles.collectionTitle}>✨ New & Hot</Text>
                <Text style={styles.collectionSubtitle}>Latest additions to explore</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.collectionScroll}>
                {newVenues.map((venue) => (
                  <TouchableOpacity
                    key={venue.id}
                    style={styles.venueCard}
                    onPress={() => alert(`${venue.name}\n${venue.location}\n\nRating: ${venue.rating}⭐\n\nFull details coming soon!`)}
                  >
                    <Image
                      source={{ uri: venue.professional_media_urls?.[0] || 'https://images.unsplash.com/photo-1576442655380-1e828d09852f?w=800&q=85' }}
                      style={styles.venueCardImage}
                      resizeMode="cover"
                    />
                    <View style={styles.venueCardGradient} />
                    <View style={styles.venueCardContent}>
                      <View style={[styles.venueCardBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.venueCardBadgeText}>NEW</Text>
                      </View>
                      <Text style={styles.venueCardName}>{venue.name}</Text>
                      <Text style={styles.venueCardLocation}>📍 {venue.location}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        {/* Area Venues List */}
        {selectedArea && (
          <View style={styles.areaVenuesSection}>
            <Text style={styles.sectionTitle}>
              {LAGOS_AREAS.find(a => a.id === selectedArea)?.name} Venues
            </Text>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.venuesListGrid}>
                {venues.map((venue) => (
                  <TouchableOpacity
                    key={venue.id}
                    style={styles.venueListCard}
                    onPress={() => alert(`${venue.name}\n${venue.location}\n\nRating: ${venue.rating}⭐\nCategory: ${venue.category}\n\nFull details coming soon!`)}
                  >
                    <Image
                      source={{ uri: venue.professional_media_urls?.[0] || 'https://images.unsplash.com/photo-1576442655380-1e828d09852f?w=800&q=85' }}
                      style={styles.venueListImage}
                      resizeMode="cover"
                    />
                    <View style={styles.venueListContent}>
                      <Text style={styles.venueListName}>{venue.name}</Text>
                      <Text style={styles.venueListCategory}>{venue.category}</Text>
                      <View style={styles.venueListRating}>
                        <Text style={styles.venueListRatingText}>⭐ {venue.rating}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
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
    fontWeight: '600',
  },
  appName: {
    fontSize: 20,
    fontFamily: 'Orbitron_900Black',
    color: colors.primary,
    letterSpacing: 2,
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // Areas
  areasSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  areaCard: {
    width: areaCardWidth,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  areaCardActive: {
    borderColor: colors.primary,
  },
  areaImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  areaOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  areaContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'flex-end',
  },
  areaEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  areaName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  areaDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  venueCountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  venueCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.background,
  },
  // Collections
  collectionSection: {
    marginBottom: 32,
  },
  collectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  collectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  collectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  collectionScroll: {
    paddingHorizontal: 16,
  },
  venueCard: {
    width: 200,
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    position: 'relative',
  },
  venueCardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  venueCardGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  venueCardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'flex-end',
  },
  venueCardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  venueCardBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.background,
  },
  venueCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  venueCardLocation: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Area Venues List
  areaVenuesSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  venuesListGrid: {
    gap: 12,
  },
  venueListCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  venueListImage: {
    width: 100,
    height: 100,
  },
  venueListContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  venueListName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  venueListCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  venueListRating: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  venueListRatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
});
