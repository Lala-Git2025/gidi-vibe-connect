import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../config/supabase';

interface FriendActivity {
  id: string;
  friend_name: string;
  venue_name: string;
  activity_type: 'check-in' | 'review' | 'post';
  time_ago: string;
}

const VENUE_CATEGORIES = [
  { emoji: '🍽️', label: 'Restaurants', category: 'Restaurant' },
  { emoji: '🍸', label: 'Bars', category: 'Bar' },
  { emoji: '🎵', label: 'Clubs', category: 'Club' },
  { emoji: '🛋️', label: 'Lounges', category: 'Lounge' },
  { emoji: '🏖️', label: 'Beach Clubs', category: 'Beach Club' },
  { emoji: '🏙️', label: 'Rooftops', category: 'Rooftop' },
  { emoji: '🎉', label: 'Event Centers', category: 'Event Center' },
  { emoji: '🏨', label: 'Hotels', category: 'Hotel' },
  { emoji: '☕', label: 'Cafes', category: 'Cafe' },
];

const EXPERIENCE_TYPES = [
  { emoji: '🥞', label: 'Brunch Spots', filter: 'brunch' },
  { emoji: '💑', label: 'Date Night', filter: 'romantic' },
  { emoji: '👨‍👩‍👧‍👦', label: 'Family-Friendly', filter: 'family' },
  { emoji: '🌙', label: 'Late Night', filter: 'late_night' },
  { emoji: '🎸', label: 'Live Music', filter: 'live_music' },
  { emoji: '🍻', label: 'Happy Hour', filter: 'happy_hour' },
];

const CURATED_COLLECTIONS = [
  { emoji: '💕', label: 'Best for First Dates', collection: 'first_dates' },
  { emoji: '📸', label: 'Instagram-Worthy', collection: 'instagram' },
  { emoji: '💰', label: 'Budget-Friendly', collection: 'budget' },
  { emoji: '👔', label: 'VIP Experience', collection: 'vip' },
  { emoji: '🎂', label: 'Birthday Spots', collection: 'birthday' },
  { emoji: '🌅', label: 'Sunset Views', collection: 'sunset' },
];

const NEIGHBORHOOD_GUIDES = [
  { emoji: '🏝️', label: 'Victoria Island', area: 'Victoria Island' },
  { emoji: '🌊', label: 'Lekki', area: 'Lekki' },
  { emoji: '🏢', label: 'Ikoyi', area: 'Ikoyi' },
  { emoji: '✈️', label: 'Ikeja', area: 'Ikeja' },
  { emoji: '🎭', label: 'Lagos Island', area: 'Lagos Island' },
  { emoji: '🏘️', label: 'Surulere', area: 'Surulere' },
];

export default function DiscoverScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const [friendsActivity, setFriendsActivity] = useState<FriendActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const styles = getStyles(colors);

  useEffect(() => {
    fetchFriendsActivity();
  }, []);

  const fetchFriendsActivity = async () => {
    try {
      // For now, using mock data. Replace with actual friends activity query
      const mockActivity: FriendActivity[] = [
        {
          id: '1',
          friend_name: 'Chioma N.',
          venue_name: 'RSVP Lagos',
          activity_type: 'check-in',
          time_ago: '2h ago',
        },
        {
          id: '2',
          friend_name: 'Tunde B.',
          venue_name: 'Quilox',
          activity_type: 'review',
          time_ago: '5h ago',
        },
        {
          id: '3',
          friend_name: 'Aisha M.',
          venue_name: 'The Place',
          activity_type: 'post',
          time_ago: '1d ago',
        },
      ];

      setFriendsActivity(mockActivity);
    } catch (error) {
      console.error('Error fetching friends activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'check-in': return '📍';
      case 'review': return '⭐';
      case 'post': return '📸';
      default: return '💬';
    }
  };

  const getActivityText = (type: string) => {
    switch (type) {
      case 'check-in': return 'checked in at';
      case 'review': return 'reviewed';
      case 'post': return 'posted about';
      default: return 'visited';
    }
  };

  const handleCategoryPress = (category: string) => {
    // Navigate to Explore screen with category filter
    navigation.navigate('Explore' as never, { category } as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Discover</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Friends Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Friends Activity</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : friendsActivity.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No recent activity from friends</Text>
            </View>
          ) : (
            <View style={styles.activityList}>
              {friendsActivity.map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <Text style={styles.activityIcon}>{getActivityIcon(activity.activity_type)}</Text>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>
                      <Text style={styles.friendName}>{activity.friend_name}</Text>
                      {' '}{getActivityText(activity.activity_type)}{' '}
                      <Text style={styles.venueName}>{activity.venue_name}</Text>
                    </Text>
                    <Text style={styles.activityTime}>{activity.time_ago}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Venue Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏢 Venue Categories</Text>
          <View style={styles.grid}>
            {VENUE_CATEGORIES.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.gridItem}
                onPress={() => handleCategoryPress(item.category)}
              >
                <Text style={styles.gridEmoji}>{item.emoji}</Text>
                <Text style={styles.gridLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Experience Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Experience Types</Text>
          <View style={styles.grid}>
            {EXPERIENCE_TYPES.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.gridItem}
                onPress={() => handleCategoryPress(item.filter)}
              >
                <Text style={styles.gridEmoji}>{item.emoji}</Text>
                <Text style={styles.gridLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Curated Collections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💎 Curated Collections</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {CURATED_COLLECTIONS.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.collectionCard}
                  onPress={() => handleCategoryPress(item.collection)}
                >
                  <Text style={styles.collectionEmoji}>{item.emoji}</Text>
                  <Text style={styles.collectionLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Neighborhood Guides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Neighborhood Guides</Text>
          <View style={styles.grid}>
            {NEIGHBORHOOD_GUIDES.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.gridItem}
                onPress={() => navigation.navigate('ExploreArea' as never, { area: item.area } as never)}
              >
                <Text style={styles.gridEmoji}>{item.emoji}</Text>
                <Text style={styles.gridLabel}>{item.label}</Text>
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
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },

  // Friends Activity
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  activityList: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  activityIcon: {
    fontSize: 24,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  friendName: {
    fontWeight: '600',
    color: colors.text,
  },
  venueName: {
    fontWeight: '600',
    color: colors.primary,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Grid Items
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
  },
  gridEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },

  // Collection Cards
  horizontalList: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 8,
  },
  collectionCard: {
    width: 140,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  collectionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  collectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
