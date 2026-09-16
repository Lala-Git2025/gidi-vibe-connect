import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../config/supabase';
import { Ionicons } from '@expo/vector-icons';

interface FriendActivity {
  id: string;
  friend_name: string;
  venue_name: string;
  activity_type: 'check-in' | 'review' | 'post';
  time_ago: string;
}

/** Icon per category; the tiles rendered come from the database. */
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Restaurant: 'restaurant-outline',
  Bar: 'beer-outline',
  Club: 'musical-note-outline',
  Lounge: 'wine-outline',
  'Beach Club': 'umbrella-outline',
  Rooftop: 'sunny-outline',
  'Event Center': 'business-outline',
  Hotel: 'bed-outline',
  Cafe: 'cafe-outline',
};




const NEIGHBORHOOD_GUIDES = [
  { emoji: '🏝️', label: 'Victoria Island', area: 'Victoria Island' },
  { emoji: '🌊', label: 'Lekki', area: 'Lekki' },
  { emoji: '🏢', label: 'Ikoyi', area: 'Ikoyi' },
  { emoji: '✈️', label: 'Ikeja', area: 'Ikeja' },
  { emoji: '🎭', label: 'Lagos Island', area: 'Lagos Island' },
  { emoji: '🏘️', label: 'Surulere', area: 'Surulere' },
];

const formatTimeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
};

export default function DiscoverScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const [friendsActivity, setFriendsActivity] = useState<FriendActivity[]>([]);
  const [venueCategories, setVenueCategories] = useState<{ category: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const styles = getStyles(colors);

  useEffect(() => {
    fetchFriendsActivity();
    fetchVenueCategories();
  }, []);

  /** Only the categories that actually have venues, busiest first. */
  const fetchVenueCategories = async () => {
    try {
      const { data } = await supabase.from('venues').select('category');
      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        if (!row.category) continue;
        counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
      }
      setVenueCategories(
        [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([category, count]) => ({ category, count })),
      );
    } catch (error) {
      console.log('Error fetching venue categories:', error);
      setVenueCategories([]);
    }
  };

  /**
   * Real activity from people the signed-in user follows. This previously
   * returned three hard-coded fictional people ("Chioma N.", "Tunde B.",
   * "Aisha M.") with invented check-ins at real venues, shown to every user
   * including those following nobody.
   *
   * Done as separate queries rather than an embedded join: venue_check_ins
   * references auth.users, not profiles, so the display name can't be reached
   * through a nested select.
   */
  const fetchFriendsActivity = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setFriendsActivity([]);
        return;
      }

      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', session.user.id);

      const followedIds = (following ?? []).map(f => f.following_id);
      if (followedIds.length === 0) {
        setFriendsActivity([]);
        return;
      }

      const { data: checkIns } = await supabase
        .from('venue_check_ins')
        .select('id, user_id, venue_id, checked_in_at')
        .in('user_id', followedIds)
        .order('checked_in_at', { ascending: false })
        .limit(10);

      if (!checkIns?.length) {
        setFriendsActivity([]);
        return;
      }

      const [{ data: people }, { data: venues }] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, username')
          .in('user_id', [...new Set(checkIns.map(c => c.user_id))]),
        supabase
          .from('venues')
          .select('id, name')
          .in('id', [...new Set(checkIns.map(c => c.venue_id))]),
      ]);

      const nameFor = new Map((people ?? []).map(p => [p.user_id, p.full_name || p.username || 'Someone']));
      const venueFor = new Map((venues ?? []).map(v => [v.id, v.name]));

      setFriendsActivity(
        checkIns
          // Drop anything whose venue has since been removed rather than
          // rendering a check-in at a blank place.
          .filter(c => venueFor.has(c.venue_id))
          .map(c => ({
            id: c.id,
            friend_name: nameFor.get(c.user_id) ?? 'Someone',
            venue_name: venueFor.get(c.venue_id) as string,
            activity_type: 'check-in' as const,
            time_ago: formatTimeAgo(c.checked_in_at),
          })),
      );
    } catch (error) {
      console.log('Error fetching friends activity:', error);
      setFriendsActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'check-in': return 'location';
      case 'review': return 'star';
      case 'post': return 'camera';
      default: return 'chatbubble';
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
    (navigation as any).navigate('Explore', { category });
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
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Discover</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Friends Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friends Activity</Text>
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
                  <Ionicons name={getActivityIcon(activity.activity_type)} size={24} color={colors.primary} />
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
          <Text style={styles.sectionTitle}>Venue Categories</Text>
          <View style={styles.grid}>
            {venueCategories.map(({ category, count }) => (
              <TouchableOpacity
                key={category}
                style={styles.gridItem}
                onPress={() => handleCategoryPress(category)}
                accessibilityRole="button"
                accessibilityLabel={`${category}, ${count} venues`}
              >
                <Ionicons
                  name={CATEGORY_ICONS[category] ?? 'pricetag-outline'}
                  size={22}
                  color={colors.primary}
                  style={styles.gridIcon}
                />
                <Text style={styles.gridLabel}>{category}</Text>
                <Text style={styles.gridCount}>{count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Experience Types and Curated Collections used to sit here: twelve
            tiles passing pseudo-categories ('brunch', 'first_dates', 'vip') to
            Explore, which has no such categories and falls back to a free-text
            search over name, location and description. No venue is named
            "first dates", so all twelve dead-ended on an empty list. They can
            come back when venues carry the tags to support them — one of 33
            currently does. */}

        {/* Neighborhood Guides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Neighborhood Guides</Text>
          <View style={styles.grid}>
            {NEIGHBORHOOD_GUIDES.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.gridItem}
                onPress={() => (navigation as any).navigate('ExploreArea', { area: item.area })}
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
    fontFamily: '',
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
    fontFamily: '',
  },
  // Ionicons, per the project convention that UI icons are never bare emoji.
  gridIcon: {
    marginBottom: 8,
  },
  gridCount: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
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
    fontFamily: '',
  },
});
