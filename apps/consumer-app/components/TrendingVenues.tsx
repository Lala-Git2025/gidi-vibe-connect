import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface Venue {
  id: string;
  name: string;
  location: string;
  rating: number;
  live_rating?: number;
  professional_media_urls?: string[];
  is_promoted?: boolean;
  promotion_label?: string;
  checkins_24h?: number;
}

interface TrendingVenuesProps {
  refreshTrigger?: number;
}

const getVibeStatus = (rating: number) => {
  if (rating >= 4.5) return 'Electric';
  if (rating >= 4.0) return 'Buzzing';
  if (rating >= 3.5) return 'Vibing';
  return 'Chill';
};

const isActivePromotion = (venue: Venue) => !!venue.is_promoted;

const dedupeVenues = (list: Venue[]): Venue[] => {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  return list.filter(v => {
    if (seenIds.has(v.id)) return false;
    const nameKey = v.name.trim().toLowerCase();
    if (seenNames.has(nameKey)) return false;
    seenIds.add(v.id);
    seenNames.add(nameKey);
    return true;
  });
};

const FALLBACK_VENUES: Venue[] = [
  { id: '1', name: 'Quilox',                  location: 'Victoria Island, Lagos', rating: 4.8, professional_media_urls: ['https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=80'] },
  { id: '2', name: 'The Shank',               location: 'Lekki Phase 1, Lagos',   rating: 4.7, professional_media_urls: ['https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80'] },
  { id: '3', name: 'Brass & Copper',          location: 'Ikoyi, Lagos',           rating: 4.6, professional_media_urls: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80'] },
  { id: '4', name: 'Hard Rock Cafe',          location: 'Oniru, Lagos',           rating: 4.5, professional_media_urls: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80'] },
  { id: '5', name: 'Sky Restaurant & Lounge', location: 'Ikeja GRA, Lagos',       rating: 4.6, professional_media_urls: ['https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80'] },
  { id: '6', name: 'Bungalow Beach Bar',      location: 'Surulere, Lagos',        rating: 4.4, professional_media_urls: ['https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80'] },
];

export const TrendingVenues = ({ refreshTrigger }: TrendingVenuesProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const styles = getStyles(colors);

  useEffect(() => {
    fetchTrendingVenues();
  }, [refreshTrigger]);

  const fetchTrendingVenues = async () => {
    try {
      const { data, error } = await supabase
        .from('trending_venues')
        .select('id, name, location, rating, live_rating, professional_media_urls, is_promoted, promotion_label, checkins_24h')
        .eq('is_promoted', true)
        .order('trending_score', { ascending: false })
        .limit(10);

      if (error) throw error;

      const unique = data ? dedupeVenues(data as Venue[]).slice(0, 6) : [];
      setVenues(unique.length > 0 ? unique : FALLBACK_VENUES);
    } catch {
      setVenues(FALLBACK_VENUES);
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
        <TouchableOpacity
          key={venue.id}
          style={styles.venueCard}
          onPress={() => (navigation as any).navigate('Explore', { venueId: venue.id })}
          activeOpacity={0.85}
        >
          {/* Background Image */}
          <Image
            source={{ uri: venue.professional_media_urls?.[0] || 'https://images.unsplash.com/photo-1576442655380-1e828d09852f?q=80&w=1000' }}
            style={styles.venueImage}
            resizeMode="cover"
          />

          {/* Gradient Overlay */}
          <View style={styles.gradient} />

          {/* Content */}
          <View style={styles.content}>
            {/* Top Row */}
            <View style={styles.topRow}>
              <View style={[styles.vibeBadge, isActivePromotion(venue) && styles.sponsoredBadge]}>
                {isActivePromotion(venue) ? (
                  <Text style={styles.sponsoredText}>{venue.promotion_label || 'Sponsored'}</Text>
                ) : (
                  <Text style={styles.vibeText}>{getVibeStatus(venue.live_rating ?? venue.rating)}</Text>
                )}
              </View>
              <View style={styles.bookmarkButton}>
                <Ionicons name="bookmark-outline" size={18} color="#fff" />
              </View>
            </View>

            {/* Bottom Content */}
            <View style={styles.bottomContent}>
              <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.locationText} numberOfLines={1}>{venue.location}</Text>
              </View>
              <View style={styles.visitorsRow}>
                <View style={styles.avatarStack}>
                  {[1, 2, 3].map((i) => (
                    <View key={i} style={[styles.avatar, { marginLeft: i > 1 ? -8 : 0 }]} />
                  ))}
                </View>
                <Text style={styles.visitorsText}>
                  {(venue.checkins_24h ?? 0) > 0 ? `${venue.checkins_24h} here today` : 'Be the first!'}
                </Text>
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
  sponsoredBadge: {
    backgroundColor: colors.primary,
  },
  vibeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  sponsoredText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontFamily: '',
  },
  bottomContent: {
    gap: 8,
  },
  venueName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationIcon: {
    fontSize: 14,
    fontFamily: '',
  },
  locationText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  visitorsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
