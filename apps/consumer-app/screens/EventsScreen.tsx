import { useState, useEffect, useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../config/supabase';
import { useTheme, polished } from '../contexts/ThemeContext';
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

// Themed Unsplash photos used as a last-resort image when DB rows have no
// `image_url`/`featured_image_url`. Keeps cards visually grounded so they
// don't all show the same calendar-icon placeholder.
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'Nightlife':       'https://images.unsplash.com/photo-1571266028243-d220c6a3a93f?q=80&w=1000',
  'Food & Dining':   'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1000',
  'Food & Drink':    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1000',
  'Technology':      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000',
  'Arts & Culture':  'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=1000',
  'Art & Culture':   'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=1000',
  'Entertainment':   'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1000',
  'Concert':         'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000',
  'Festival':        'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=1000',
  'Sports':          'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1000',
  'Networking':      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1000',
  'Workshop':        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1000',
  'Comedy':          'https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=1000',
};

const DEFAULT_EVENT_IMAGE =
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000';

const getCategoryFallbackImage = (category: string | null | undefined): string =>
  (category && CATEGORY_FALLBACK_IMAGES[category]) || DEFAULT_EVENT_IMAGE;

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

  // Auth + RSVP state only need to load once.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchUserRSVPs(session.user.id);
      }
    });
  }, []);

  // Refetch events on every focus so newly-created events appear after
  // navigating away and coming back.
  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, []),
  );

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

  // Load events:
  // - Skip the edge function for the initial render (it just re-queries the
  //   same DB table with a stricter `status='upcoming'` filter that excludes
  //   most rows, so it was returning empty/sparse results and short-circuiting
  //   the DB fallback).
  // - Pull a wider window (today onwards, limit 100) so users actually see
  //   the events that exist.
  // - On manual refresh we also hit the edge function in the background to
  //   trigger any server-side scraping, but render whatever the DB has now.
  const loadEvents = async (triggerSync = false) => {
    setLoading(true);
    await fetchEventsFromDB();

    if (triggerSync) {
      // Fire and forget — the edge function caches into events table.
      // We don't await it; the next pull-to-refresh will pick up new rows.
      setSyncing(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        const anonKey = (supabase as any).supabaseKey as string | undefined;
        await fetch(
          `${(supabase as any).supabaseUrl}/functions/v1/fetch-lagos-events`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': anonKey ?? '',
              'Authorization': `Bearer ${session?.session?.access_token ?? anonKey ?? ''}`,
            },
            body: JSON.stringify({ limit: 100 }),
          }
        );
        // Re-fetch in case sync inserted new rows
        await fetchEventsFromDB();
      } catch (e) {
        console.warn('[Events] sync fn unreachable, that\'s ok', e);
      } finally {
        setSyncing(false);
      }
    }
  };

  const fetchEventsFromDB = async () => {
    try {
      // Start the window 6h in the past so events that just started still
      // show up (someone scrolling the app at 9pm wants to see the 8pm one).
      const windowStart = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('events')
        .select(
          'id, title, start_date, end_date, venue_name, location, category, is_free, ' +
          'ticket_price_min, ticket_price_max, ticket_url, registration_url, ' +
          'image_url, featured_image_url, short_description, description, ' +
          'price_info, source, organizer_name, is_featured'
        )
        .eq('is_active', true)
        .gte('start_date', windowStart)
        .order('is_featured', { ascending: false })
        .order('start_date', { ascending: true })
        .limit(100);

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
    await loadEvents(true); // pull-to-refresh triggers the background sync
    setRefreshing(false);
  };

  const filters = [
    'All Events',
    'Nightlife',
    'Food & Dining',
    'Concert',
    'Entertainment',
    'Sports',
    'Comedy',
    'Arts & Culture',
    'Technology',
    'Networking',
    'Workshop',
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

  // Image resolution: prefer DB-provided URLs, then fall back to a
  // category-themed Unsplash photo so the card never looks broken/empty.
  // Picking by category keeps it visually relevant (food cards get food).
  const getEventImage = (event: Event): string => {
    const fromDb = event.featured_image_url || event.image_url;
    if (fromDb && fromDb.startsWith('http')) return fromDb;
    return getCategoryFallbackImage(event.category);
  };

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

        {/* Page Title — polished: gold accent on "Lagos" */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>
            Events in <Text style={styles.titleAccent}>Lagos</Text>
          </Text>
          <Text style={styles.subtitle}>
            {syncing ? 'Syncing live events…' : 'Discover upcoming experiences'}
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
                    <Image
                      source={{ uri: imgUri }}
                      style={styles.featuredImage}
                      resizeMode="cover"
                    />

                    {/* Polished gradient — transparent at top, near-black at bottom */}
                    <LinearGradient
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                      locations={[0, 0.4, 0.75, 1]}
                      style={StyleSheet.absoluteFillObject}
                    />
                    {/* Gold rim — signals "featured" status without burning the image */}
                    <View style={styles.featuredRim} pointerEvents="none" />

                    {/* Featured ribbon — top left */}
                    <View style={styles.featuredRibbon}>
                      <Ionicons name="star" size={11} color="#18181B" />
                      <Text style={styles.featuredRibbonText}>FEATURED</Text>
                    </View>
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
                  {/* Event image — always non-null via category fallback */}
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: imgUri }}
                      style={styles.eventImage}
                      resizeMode="cover"
                    />

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

    // ── Header — polished ──
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(234,179,8,0.08)',
    },
    backButtonContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.04)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    backButton: {
      fontSize: 24,
      color: polished.goldMid,
      fontWeight: '600',
    },
    appName: {
      fontSize: 15,
      fontFamily: 'Orbitron_900Black',
      color: polished.goldMid,
      letterSpacing: 2,
      textShadowColor: 'rgba(234,179,8,0.55)',
      textShadowRadius: 8,
      textShadowOffset: { width: 0, height: 0 },
    },

    // ── Title — polished ──
    titleSection: {
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 10,
    },
    title: {
      fontSize: 26,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    titleAccent: {
      color: polished.goldMid,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },

    // ── Filters — polished pill chips ──
    filtersSection: { marginBottom: 8 },
    filtersScroll: { paddingHorizontal: 18 },
    filterButton: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
      marginRight: 8,
    },
    filterButtonActive: {
      backgroundColor: polished.goldMid,
      borderColor: polished.goldMid,
      shadowColor: polished.goldDeep,
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 4,
    },
    filterButtonText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    filterButtonTextActive: {
      color: '#18181B',
      fontWeight: '800',
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

    // ── Featured Cards — polished hero (gold rim, ribbon, glass) ──
    featuredCard: {
      width: 280,
      height: 210,
      borderRadius: 18,
      overflow: 'hidden',
      marginRight: 12,
      position: 'relative',
      shadowColor: '#000',
      shadowOpacity: 0.5,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    featuredImage: {
      width: '100%',
      height: '100%',
    },
    featuredRim: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: 'rgba(234,179,8,0.55)',
    },
    featuredRibbon: {
      position: 'absolute',
      top: 12,
      left: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: polished.goldMid,
      borderWidth: 1.5,
      borderColor: '#FEF08A',
      shadowColor: polished.goldDeep,
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 4,
    },
    featuredRibbonText: {
      fontSize: 9,
      fontWeight: '900',
      color: '#18181B',
      letterSpacing: 1.2,
    },
    featuredSourceBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
    },
    featuredContent: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 14,
    },
    featuredTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: '#fff',
      letterSpacing: -0.2,
      marginBottom: 4,
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    featuredMeta: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.85)',
      marginBottom: 6,
      fontWeight: '500',
    },
    featuredPrice: {
      fontSize: 13,
      fontWeight: '800',
      color: polished.goldMid,
      letterSpacing: 0.2,
    },

    // ── Regular Event Cards — polished ──
    eventCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
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
    // Gold gradient category badge — replaces flat primary fill
    categoryBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
      backgroundColor: polished.goldMid,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#FEF08A',
      shadowColor: polished.goldDeep,
      shadowOpacity: 0.55,
      shadowRadius: 8,
      elevation: 3,
    },
    categoryBadgeText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#18181B',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    sourceBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
    },
    sourceBadgeText: {
      fontSize: 10,
      fontWeight: '700',
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
      fontWeight: '900',
      color: polished.goldMid,
      letterSpacing: -0.2,
    },
    rsvpButton: {
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: polished.goldDeep,
    },
    rsvpButtonActive: {
      backgroundColor: polished.goldMid,
      borderColor: polished.goldMid,
      shadowColor: polished.goldDeep,
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 4,
    },
    rsvpButtonText: {
      fontSize: 12,
      fontWeight: '800',
      color: polished.goldMid,
    },
    rsvpButtonTextActive: {
      color: '#18181B',
    },
    ticketButton: {
      backgroundColor: polished.goldMid,
      paddingVertical: 9,
      paddingHorizontal: 18,
      borderRadius: 999,
      shadowColor: polished.goldDeep,
      shadowOpacity: 0.45,
      shadowRadius: 10,
      elevation: 4,
    },
    ticketButtonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: polished.goldDeep,
      shadowOpacity: 0,
      elevation: 0,
    },
    ticketButtonText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#18181B',
      letterSpacing: 0.3,
    },
    ticketButtonTextSecondary: {
      color: polished.goldMid,
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
