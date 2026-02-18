import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { useTheme } from '../contexts/ThemeContext';

interface Event {
  id: string;
  title: string;
  start_date: string;
  venue_name: string;
  category: string;
  is_free: boolean;
  ticket_price_min: number | null;
  ticket_price_max: number | null;
  ticket_url: string | null;
  image_url: string | null;
  short_description: string | null;
}

export default function EventsScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const [activeFilter, setActiveFilter] = useState("All Events");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load Orbitron font
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Orbitron_900Black,
  });

  const styles = getStyles(colors);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_date, venue_name, category, is_free, ticket_price_min, ticket_price_max, ticket_url, image_url, short_description')
        .eq('is_active', true)
        .eq('status', 'upcoming')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(50);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const filters = ["All Events", "Nightlife", "Food & Dining", "Technology", "Arts & Culture", "Entertainment"];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatPrice = (event: Event) => {
    if (event.is_free) return 'Free';
    if (event.ticket_price_min && event.ticket_price_max) {
      if (event.ticket_price_min === event.ticket_price_max) {
        return `₦${event.ticket_price_min.toLocaleString()}`;
      }
      return `₦${event.ticket_price_min.toLocaleString()} - ₦${event.ticket_price_max.toLocaleString()}`;
    }
    if (event.ticket_price_min) {
      return `From ₦${event.ticket_price_min.toLocaleString()}`;
    }
    return 'Check ticket URL';
  };

  const handleGetTickets = (event: Event) => {
    if (event.ticket_url) {
      Linking.openURL(event.ticket_url);
    } else {
      alert(`${event.title}\n\n📅 ${formatDate(event.start_date)}\n🕐 ${formatTime(event.start_date)}\n📍 ${event.venue_name}\n💰 ${formatPrice(event)}\n\nNo ticket URL available for this event.`);
    }
  };

  const filteredEvents = events.filter(event => {
    if (activeFilter === "All Events") return true;
    return event.category === activeFilter;
  });

  if (!fontsLoaded) {
    return null;
  }

  if (loading && events.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
        <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>Loading events...</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
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
          <Text style={styles.appName}>EVENTS</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Page Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Events in Lagos</Text>
          <Text style={styles.subtitle}>Discover upcoming experiences</Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  activeFilter === filter && styles.filterButtonActive
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[
                  styles.filterButtonText,
                  activeFilter === filter && styles.filterButtonTextActive
                ]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Events */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>
            {filteredEvents.length} events found
          </Text>

          {filteredEvents.map((event) => (
            <TouchableOpacity key={event.id} style={styles.eventCard}>
              <View style={styles.eventImagePlaceholder}>
                <Text style={styles.eventIcon}>📅</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{event.category}</Text>
                </View>
              </View>

              <View style={styles.eventContent}>
                <Text style={styles.eventTitle}>{event.title}</Text>

                {event.short_description && (
                  <Text style={styles.eventDescription} numberOfLines={2}>
                    {event.short_description}
                  </Text>
                )}

                <View style={styles.eventDetails}>
                  <View style={styles.eventDetail}>
                    <Text style={styles.detailIcon}>📅</Text>
                    <Text style={styles.detailText}>{formatDate(event.start_date)}</Text>
                  </View>

                  <View style={styles.eventDetail}>
                    <Text style={styles.detailIcon}>🕐</Text>
                    <Text style={styles.detailText}>{formatTime(event.start_date)}</Text>
                  </View>

                  <View style={styles.eventDetail}>
                    <Text style={styles.detailIcon}>📍</Text>
                    <Text style={styles.detailText}>{event.venue_name}</Text>
                  </View>

                  <View style={styles.eventDetail}>
                    <Text style={styles.detailIcon}>💰</Text>
                    <Text style={styles.detailText}>{formatPrice(event)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.ticketButton}
                  onPress={() => handleGetTickets(event)}
                >
                  <Text style={styles.ticketButtonText}>Get Tickets</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
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
  // Filters
  filtersSection: {
    marginBottom: 24,
  },
  filtersScroll: {
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.background,
  },
  // Events
  eventsSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  eventCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  eventImagePlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  eventIcon: {
    fontSize: 48,
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.background,
  },
  eventContent: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  eventDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  eventDetails: {
    gap: 12,
    marginBottom: 16,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  ticketButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  ticketButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.background,
  },
});
