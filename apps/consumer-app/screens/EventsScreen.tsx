import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  venue_name: string;
  location: string;
  category: string;
  is_free: boolean;
  ticket_price_min: number | null;
  ticket_price_max: number | null;
  ticket_url: string | null;
  registration_url: string | null;
  image_url: string | null;
  featured_image_url: string | null;
  short_description: string | null;
  description: string | null;
  price_info: string | null;
  source: string;
  organizer_name: string | null;
  is_featured: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  eventbrite: 'Eventbrite',
  nairabox: 'Nairabox',
  tix_africa: 'Tix Africa',
  manual: 'Gidi Vibe',
  scraped: 'Lagos Events',
};

const CATEGORY_ICONS: Record<string, string> = {
  'Nightlife': '🎉',
  'Food & Dining': '🍽️',
  'Food & Drink': '🍽️',
  'Technology': '💻',
  'Arts & Culture': '🎨',
  'Art & Culture': '🎨',
  'Entertainment': '🎭',
  'Concert': '🎵',
  'Festival': '🎪',
  'Sports': '⚽',
  'Networking': '🤝',
  'Workshop': '📚',
  'Comedy': '😂',
};

export default function EventsScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const [activeFilter, setActiveFilter] = useState('All Events');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [rsvpdEventIds, setRsvpdEventIds] = useState<Set<string>>(new Set());

  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Orbitron_900Black,
  });

  const styles = getStyles(colors);

  useEffect(() => {
    loadEvents();
    // getSession() reads from local storage — instant and reliable
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchUserRSVPs(session.user.id);
      }
    });
  }, []);

  const fetchUserRSVPs = async (uid: string) => {
    try {
      const { data } = await supabase
        .from('event_rsvps')
        .select('event_id')
        .eq('user_id', uid);
      if (data) {
        setRsvpdEventIds(new Set(data.map((r: any) => r.event_id)));
      }
    } catch (e) {
      console.log('RSVP fetch error:', e);
    }
  };

  const handleRSVP = async (eventId: string) => {
    // Resolve uid from state first; fall back to live session
    // in case the state update from mount hasn't landed yet.
    let uid = userId;
    if (!uid) {
      const { data: { session } } = await supabase.auth.getSession();
      uid = session?.user?.id ?? null;
      if (uid) setUserId(uid);
    }

    if (!uid) {
      Alert.alert('Sign In Required', 'Please sign in to RSVP to events.');
      return;
    }
    if (rsvpdEventIds.has(eventId)) return; // already RSVP'd
    try {
      const { error } = await supabase
        .from('event_rsvps')
        .insert({ user_id: uid, event_id: eventId });
      if (!error) {
        await supabase.rpc('increment_user_stat', {
          p_user_id: uid,
          p_stat_name: 'events_attended',
          p_xp_amount: 25,
        });
        setRsvpdEventIds((prev) => new Set([...prev, eventId]));
      }
    } catch (e) {
      console.log('RSVP error:', e);
    }
  };

  // Try to sync from the edge function (fetches from external platforms),
  // then fall back to direct DB query if it fails.
  const loadEvents = async () => {
    setLoading(true);
    try {
      setSyncing(true);
      const { data: session } = await supabase.auth.getSession();
      const anonKey = (supabase as any).supabaseKey as string | undefined;

      // Call the edge function to sync / get events
      const res = await fetch(
        `${(supabase as any).supabaseUrl}/functions/v1/fetch-lagos-events`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey ?? '',
            'Authorization': `Bearer ${session?.session?.access_token ?? anonKey ?? ''}`,
          },
          body: JSON.stringify({ limit: 50 }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setEvents(json.data as Event[]);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('[Events] edge function unavailable, falling back to DB', e);
    } finally {
      setSyncing(false);
    }

    // Fallback: direct DB query
    await fetchEventsFromDB();
  };

  const fetchEventsFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(
          'id, title, start_date, end_date, venue_name, location, category, is_free, ' +
          'ticket_price_min, ticket_price_max, ticket_url, registration_url, ' +
          'image_url, featured_image_url, short_description, description, ' +
          'price_info, source, organizer_name, is_featured'
        )
        .eq('is_active', true)
        .gte('start_date', new Date().toISOString())
        .order('is_featured', { ascending: false })
        .order('start_date', { ascending: true })
        .limit(50);

      if (error) throw error;
      setEvents((data as unknown as Event[]) || []);
    } catch (error) {
      console.error('[Events] fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const filters = [
    'All Events',
    'Nightlife',
    'Food & Dining',
    'Technology',
    'Arts & Culture',
    'Entertainment',
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatPrice = (event: Event): string => {
    if (event.price_info) return event.price_info;
    if (event.is_free) return 'Free';
    if (event.ticket_price_min != null && event.ticket_price_max != null) {
      if (event.ticket_price_min === event.ticket_price_max) {
        return `₦${event.ticket_price_min.toLocaleString()}`;
      }
      return `₦${event.ticket_price_min.toLocaleString()} – ₦${event.ticket_price_max.toLocaleString()}`;
    }
    if (event.ticket_price_min != null) {
      return `From ₦${event.ticket_price_min.toLocaleString()}`;
    }
    return 'See details';
  };

  const getTicketUrl = (event: Event): string | null =>
    event.registration_url || event.ticket_url || null;

  const handleGetTickets = (event: Event) => {
    const url = getTicketUrl(event);
    if (url) {
      Linking.openURL(url);
    } else {
      Alert.alert(
        event.title,
        `${formatDate(event.start_date)}\n` +
        `${formatTime(event.start_date)}\n` +
        `${event.venue_name}\n${formatPrice(event)}`
      );
    }
  };

  const getEventImage = (event: Event): string | null =>
    event.featured_image_url || event.image_url || null;

  const getCategoryIcon = (category: string): string =>
    CATEGORY_ICONS[category] ?? '📅';

  const getSourceLabel = (source: string): string =>
    SOURCE_LABELS[source] ?? 'Lagos Events';

  const filteredEvents = events.filter((event) => {
    if (activeFilter === 'All Events') return true;
    const cat = event.category?.toLowerCase() ?? '';
    return cat === activeFilter.toLowerCase() ||
      cat.includes(activeFilter.toLowerCase());
  });

  const featuredEvents = filteredEvents.filter((e) => e.is_featured);
  const regularEvents = filteredEvents.filter((e) => !e.is_featured);

  if (!fontsLoaded) return null;

  if (loading && events.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
        <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
            {syncing ? 'Syncing live events...' : 'Loading events...'}
          </Text>
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
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButtonContainer}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.appName}>EVENTS</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Page Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Events in Lagos</Text>
          <Text style={styles.subtitle}>
            {syncing ? 'Syncing live events...' : 'Discover upcoming experiences'}
          </Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  activeFilter === filter && styles.filterButtonActive,
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    activeFilter === filter && styles.filterButtonTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Featured Events ── */}
        {featuredEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {featuredEvents.map((event) => {
                const imgUri = getEventImage(event);
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.featuredCard}
                    onPress={() => handleGetTickets(event)}
                    activeOpacity={0.85}
                  >
                    {imgUri ? (
                      <Image
                        source={{ uri: imgUri }}
                        style={styles.featuredImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.featuredImage, styles.imageFallback]}>
                        <Ionicons name="calendar" size={52} color={colors.textSecondary} />
                      </View>
                    )}

                    {/* Gradient overlay */}
                    <View style={styles.featuredOverlay} />

                    <View style={styles.featuredSourceBadge}>
                      <Text style={styles.sourceBadgeText}>{getSourceLabel(event.source)}</Text>
                    </View>

                    <View style={styles.featuredContent}>
                      <Text style={styles.featuredTitle} numberOfLines={2}>{event.title}</Text>
                      <Text style={styles.featuredMeta}>
                        {formatDate(event.start_date)} · {event.venue_name}
                      </Text>
                      <Text style={styles.featuredPrice}>{formatPrice(event)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── All / Regular Events ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {filteredEvents.length === 0
              ? 'No events found'
              : `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''}`}
          </Text>

          {filteredEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="ticket-outline" size={52} color={colors.textSecondary} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptyText}>
                Pull down to refresh — events from Eventbrite and Lagos event
                platforms will appear here automatically.
              </Text>
            </View>
          ) : (
            regularEvents.map((event) => {
              const imgUri = getEventImage(event);
              const hasTickets = !!getTicketUrl(event);
              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => handleGetTickets(event)}
                  activeOpacity={0.85}
                >
                  {/* Event image / placeholder */}
                  <View style={styles.imageContainer}>
                    {imgUri ? (
                      <Image
                        source={{ uri: imgUri }}
                        style={styles.eventImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.eventImage, styles.imageFallback]}>
                        <Ionicons name="calendar" size={52} color={colors.textSecondary} />
                      </View>
                    )}

                    {/* Category badge */}
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{event.category}</Text>
                    </View>

                    {/* Source badge */}
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceBadgeText}>{getSourceLabel(event.source)}</Text>
                    </View>
                  </View>

                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>

                    {(event.short_description || event.description) && (
                      <Text style={styles.eventDescription} numberOfLines={2}>
                        {event.short_description || event.description}
                      </Text>
                    )}

                    <View style={styles.eventMeta}>
                      <View style={styles.metaRow}>
                        <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>{formatDate(event.start_date)}</Text>
                        <Text style={styles.metaDot}>·</Text>
                        <Ionicons name="time-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>{formatTime(event.start_date)}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {event.venue_name}{event.location ? `, ${event.location}` : ''}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardFooter}>
                      <Text style={styles.priceLabel}>{formatPrice(event)}</Text>
                      <View style={styles.cardFooterActions}>
                        <TouchableOpacity
                          style={[
                            styles.rsvpButton,
                            rsvpdEventIds.has(event.id) && styles.rsvpButtonActive,
                          ]}
                          onPress={() => handleRSVP(event.id)}
                        >
                          <Text style={[
                            styles.rsvpButtonText,
                            rsvpdEventIds.has(event.id) && styles.rsvpButtonTextActive,
                          ]}>
                            {rsvpdEventIds.has(event.id) ? 'Going' : 'RSVP'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.ticketButton, !hasTickets && styles.ticketButtonSecondary]}
                          onPress={() => handleGetTickets(event)}
                        >
                          <Text style={[styles.ticketButtonText, !hasTickets && styles.ticketButtonTextSecondary]}>
                            {hasTickets ? 'Get Tickets' : 'Details'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: { flex: 1 },

    // ── Header ──
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

    // ── Title ──
    titleSection: {
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 12,
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

    // ── Filters ──
    filtersSection: { marginBottom: 8 },
    filtersScroll: { paddingHorizontal: 16 },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
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

    // ── Sections ──
    section: {
      paddingHorizontal: 16,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 12,
      letterSpacing: 0.5,
    },

    // ── Featured Cards (horizontal scroll) ──
    featuredCard: {
      width: 280,
      height: 200,
      borderRadius: 16,
      overflow: 'hidden',
      marginRight: 12,
      position: 'relative',
    },
    featuredImage: {
      width: '100%',
      height: '100%',
    },
    featuredOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    featuredSourceBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    featuredContent: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 12,
    },
    featuredTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 4,
    },
    featuredMeta: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.8)',
      marginBottom: 4,
    },
    featuredPrice: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },

    // ── Regular Event Cards ──
    eventCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
      overflow: 'hidden',
    },
    imageContainer: {
      position: 'relative',
      width: '100%',
      height: 180,
    },
    eventImage: {
      width: '100%',
      height: '100%',
    },
    imageFallback: {
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackIcon: {
      fontSize: 52,
      fontFamily: '',
    },
    categoryBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    categoryBadgeText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: colors.background,
    },
    sourceBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    sourceBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#fff',
    },
    eventContent: { padding: 16 },
    eventTitle: {
      fontSize: 17,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 6,
    },
    eventDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 10,
    },

    // ── Meta rows ──
    eventMeta: { gap: 6, marginBottom: 14 },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metaIcon: { fontSize: 13, marginRight: 4, fontFamily: '' },
    metaText: { fontSize: 13, color: colors.textSecondary, flexShrink: 1 },
    metaDot: { fontSize: 13, color: colors.textSecondary, marginHorizontal: 6 },

    // ── Footer ──
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardFooterActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    priceLabel: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.primary,
    },
    rsvpButton: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    rsvpButtonActive: {
      backgroundColor: colors.primary,
    },
    rsvpButtonText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.primary,
    },
    rsvpButtonTextActive: {
      color: colors.background,
    },
    ticketButton: {
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 8,
    },
    ticketButtonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    ticketButtonText: {
      fontSize: 13,
      fontWeight: 'bold',
      color: colors.background,
    },
    ticketButtonTextSecondary: {
      color: colors.primary,
    },

    // ── Empty state ──
    emptyState: {
      alignItems: 'center',
      paddingVertical: 48,
      paddingHorizontal: 24,
    },
    emptyIcon: { fontSize: 52, marginBottom: 16, fontFamily: '' },
    emptyTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
