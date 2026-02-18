import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { supabase } from '../config/supabase';
import { useTheme } from '../contexts/ThemeContext';

interface Venue {
  id: string;
  name: string;
  location: string;
  rating: number;
  professional_media_urls?: string[];
}

interface TrendingVenuesProps {
  refreshTrigger?: number;
}

const getVibeStatus = (rating: number) => {
  if (rating >= 4.5) return 'Electric ⚡️';
  if (rating >= 4.0) return 'Buzzing 🔥';
  if (rating >= 3.5) return 'Vibing ✨';
  return 'Chill 🎵';
};

const getVisitorCount = () => {
  return Math.floor(Math.random() * 1000) + 100;
};

export const TrendingVenues = ({ refreshTrigger }: TrendingVenuesProps) => {
  const { colors } = useTheme();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const styles = getStyles(colors);

  useEffect(() => {
    fetchTrendingVenues();
  }, [refreshTrigger]);

  const fetchTrendingVenues = async () => {
    try {
      console.log('🔄 Fetching trending venues from database...');
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, location, rating, professional_media_urls')
        .order('rating', { ascending: false })
        .limit(6);

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} venues from database`);

      // If database has venues, use them; otherwise use fallback
      if (data && data.length > 0) {
        // Log first venue to verify image URLs
        console.log('📍 First venue:', data[0].name, 'Images:', data[0].professional_media_urls?.length);
        if (data[0].professional_media_urls?.[0]) {
          console.log('🖼️  First image URL:', data[0].professional_media_urls[0]);
        }
        setVenues(data as Venue[]);
      } else {
        console.log('⚠️  No venues in database, using fallback');
        // Fallback to sample venues with real Lagos images
        setVenues([
          {
            id: '1',
            name: 'Quilox',
            location: 'Victoria Island, Lagos',
            rating: 4.8,
            professional_media_urls: ['https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=80']
          },
          {
            id: '2',
            name: 'The Shank',
            location: 'Lekki Phase 1, Lagos',
            rating: 4.7,
            professional_media_urls: ['https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80']
          },
          {
            id: '3',
            name: 'Brass & Copper',
            location: 'Ikoyi, Lagos',
            rating: 4.6,
            professional_media_urls: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80']
          },
          {
            id: '4',
            name: 'Hard Rock Cafe',
            location: 'Oniru, Lagos',
            rating: 4.5,
            professional_media_urls: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80']
          },
          {
            id: '5',
            name: 'Nok by Alara',
            location: 'Victoria Island, Lagos',
            rating: 4.7,
            professional_media_urls: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80']
          },
          {
            id: '6',
            name: 'Terra Kulture',
            location: 'Tiamiyu Savage, Victoria Island',
            rating: 4.6,
            professional_media_urls: ['https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80']
          },
        ]);
      }
    } catch (error) {
      console.error('❌ Error fetching venues:', error);
      // Fallback to sample venues on error
      setVenues([
        {
          id: '1',
          name: 'Quilox',
          location: 'Victoria Island, Lagos',
          rating: 4.8,
          professional_media_urls: ['https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=80']
        },
        {
          id: '2',
          name: 'The Shank',
          location: 'Lekki Phase 1, Lagos',
          rating: 4.7,
          professional_media_urls: ['https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80']
        },
        {
          id: '3',
          name: 'Brass & Copper',
          location: 'Ikoyi, Lagos',
          rating: 4.6,
          professional_media_urls: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80']
        },
        {
          id: '4',
          name: 'Hard Rock Cafe',
          location: 'Oniru, Lagos',
          rating: 4.5,
          professional_media_urls: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80']
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (venues.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No trending venues at the moment</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
    >
      {venues.map((venue) => (
        <TouchableOpacity key={venue.id} style={styles.venueCard}>
          {/* Background Image */}
          <Image
            source={{
              uri: venue.professional_media_urls?.[0] || 'https://images.unsplash.com/photo-1576442655380-1e828d09852f?q=80&w=1000'
            }}
            style={styles.venueImage}
            resizeMode="cover"
            onLoadStart={() => console.log(`🔄 Loading image for ${venue.name}`)}
            onLoad={() => console.log(`✅ Loaded image for ${venue.name}`)}
            onError={(error) => console.error(`❌ Failed to load image for ${venue.name}:`, error.nativeEvent.error)}
          />

          {/* Gradient Overlay */}
          <View style={styles.gradient} />

          {/* Content */}
          <View style={styles.content}>
            {/* Top Row */}
            <View style={styles.topRow}>
              <View style={styles.vibeBadge}>
                <Text style={styles.vibeText}>{getVibeStatus(venue.rating)}</Text>
              </View>
              <TouchableOpacity style={styles.bookmarkButton}>
                <Text style={styles.bookmarkIcon}>🔖</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Content */}
            <View style={styles.bottomContent}>
              <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
              <View style={styles.locationRow}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationText} numberOfLines={1}>{venue.location}</Text>
              </View>
              <View style={styles.visitorsRow}>
                <View style={styles.avatarStack}>
                  {[1, 2, 3].map((i) => (
                    <View key={i} style={[styles.avatar, { marginLeft: i > 1 ? -8 : 0 }]} />
                  ))}
                </View>
                <Text style={styles.visitorsText}>{getVisitorCount()} here</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  scrollView: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  scrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  venueCard: {
    width: 280,
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  venueImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vibeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  vibeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  bookmarkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkIcon: {
    fontSize: 18,
  },
  bottomContent: {
    gap: 8,
  },
  venueName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationIcon: {
    fontSize: 14,
  },
  locationText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  visitorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.textSecondary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  visitorsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});
