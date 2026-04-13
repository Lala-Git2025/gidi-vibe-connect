import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface Venue {
  id: string;
  name: string;
  description?: string | null;
  location: string;
  address?: string | null;
  category: string;
  professional_media_urls?: string[] | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  opening_hours?: Record<string, string> | null;
  price_range?: string | null;
  features?: string[] | null;
  is_verified: boolean;
  rating: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const NEIGHBOURHOODS = [
  { label: 'All Areas',       icon: 'map-outline', key: '' },
  { label: 'Victoria Island', icon: 'water-outline', key: 'Victoria Island' },
  { label: 'Lekki',          icon: 'umbrella-outline', key: 'Lekki' },
  { label: 'Ikoyi',          icon: 'home-outline', key: 'Ikoyi' },
  { label: 'Oniru',          icon: 'leaf-outline', key: 'Oniru' },
  { label: 'Ikeja',          icon: 'airplane-outline', key: 'Ikeja' },
  { label: 'Surulere',       icon: 'musical-notes-outline', key: 'Surulere' },
  { label: 'Yaba',           icon: 'laptop-outline', key: 'Yaba' },
  { label: 'Ajah',           icon: 'flower-outline', key: 'Ajah' },
];

const CATEGORIES = [
  { label: 'All',        icon: 'apps-outline' },
  { label: 'Club',       icon: 'musical-note-outline' },
  { label: 'Restaurant', icon: 'restaurant-outline' },
  { label: 'Lounge',     icon: 'wine-outline' },
  { label: 'Bar',        icon: 'beer-outline' },
  { label: 'Rooftop',    icon: 'sunny-outline' },
  { label: 'Beach Club', icon: 'umbrella-outline' },
  { label: 'Hotel',      icon: 'bed-outline' },
];

const PRICE_COLORS: Record<string, string> = {
  Budget: '#22c55e',
  Moderate: '#f59e0b',
  Premium: '#a855f7',
  'Ultra Premium': '#ef4444',
};

// ── Venue Detail Modal ───────────────────────────────────────────────────────

function VenueDetailModal({
  venue,
  onClose,
  colors,
  userId,
}: {
  venue: Venue | null;
  onClose: () => void;
  colors: any;
  userId: string | null;
}) {
  const insets = useSafeAreaInsets();

  // ── Check-in state ──────────────────────────────────────────────────────
  const [isCheckedIn, setIsCheckedIn]   = useState(false);
  const [checkingIn, setCheckingIn]     = useState(false);

  // ── Review state ────────────────────────────────────────────────────────
  const [hasReviewed, setHasReviewed]         = useState(false);
  const [showReviewForm, setShowReviewForm]   = useState(false);
  const [reviewRating, setReviewRating]       = useState(0);
  const [reviewComment, setReviewComment]     = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Reset + fetch status whenever the selected venue changes
  useEffect(() => {
    setIsCheckedIn(false);
    setHasReviewed(false);
    setShowReviewForm(false);
    setReviewRating(0);
    setReviewComment('');
    if (!userId || !venue) return;

    (async () => {
      const [{ data: ci }, { data: rv }] = await Promise.all([
        supabase
          .from('venue_check_ins')
          .select('id')
          .eq('user_id', userId)
          .eq('venue_id', venue.id)
          .maybeSingle(),
        supabase
          .from('venue_reviews')
          .select('rating, comment')
          .eq('user_id', userId)
          .eq('venue_id', venue.id)
          .maybeSingle(),
      ]);
      setIsCheckedIn(!!ci);
      if (rv) {
        setHasReviewed(true);
        setReviewRating((rv as any).rating ?? 0);
        setReviewComment((rv as any).comment ?? '');
      }
    })();
  }, [venue?.id, userId]);

  if (!venue) return null;

  const imgUri = venue.professional_media_urls?.[0] ?? null;

  const handleCall = () => {
    if (venue.contact_phone) Linking.openURL(`tel:${venue.contact_phone}`);
  };

  const handleDirections = () => {
    const query = encodeURIComponent(venue.address || `${venue.name}, ${venue.location}, Lagos`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const handleWebsite = () => {
    if (venue.website_url) Linking.openURL(venue.website_url);
  };

  const handleInstagram = () => {
    if (venue.instagram_url) Linking.openURL(venue.instagram_url);
  };

  const handleCheckIn = async () => {
    let uid = userId;
    if (!uid) {
      const { data: { session } } = await supabase.auth.getSession();
      uid = session?.user?.id ?? null;
    }
    if (!uid) {
      Alert.alert('Sign In Required', 'Please sign in to check in.');
      return;
    }
    if (isCheckedIn || checkingIn) return;
    setCheckingIn(true);
    try {
      const { error } = await supabase
        .from('venue_check_ins')
        .insert({ user_id: uid, venue_id: venue.id });
      if (!error) {
        await supabase.rpc('increment_user_stat', {
          p_user_id: uid,
          p_stat_name: 'venues_visited',
          p_xp_amount: 20,
        });
        setIsCheckedIn(true);
      }
    } catch (e) {
      console.log('Check-in error:', e);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleSubmitReview = async () => {
    let uid = userId;
    if (!uid) {
      const { data: { session } } = await supabase.auth.getSession();
      uid = session?.user?.id ?? null;
    }
    if (!uid) {
      Alert.alert('Sign In Required', 'Please sign in to write a review.');
      return;
    }
    if (reviewRating === 0) {
      Alert.alert('Rating Required', 'Tap a star to rate this venue.');
      return;
    }
    if (submittingReview) return;
    setSubmittingReview(true);
    try {
      const { error } = await supabase
        .from('venue_reviews')
        .insert({
          user_id: uid,
          venue_id: venue.id,
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        });
      if (!error) {
        await supabase.rpc('increment_user_stat', {
          p_user_id: uid,
          p_stat_name: 'reviews_written',
          p_xp_amount: 15,
        });
        setHasReviewed(true);
        setShowReviewForm(false);
      }
    } catch (e) {
      console.log('Review error:', e);
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < full; i++) stars += '★';
    if (half) stars += '½';
    return stars || '–';
  };

  const modalStyles = getModalStyles(colors);

  return (
    <Modal
      visible={!!venue}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={modalStyles.backdrop}>
        <TouchableOpacity style={modalStyles.backdropTap} onPress={onClose} activeOpacity={1} />
        <View style={[modalStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Image */}
          <View style={modalStyles.imageWrap}>
            {imgUri ? (
              <Image source={{ uri: imgUri }} style={modalStyles.image} resizeMode="cover" />
            ) : (
              <View style={[modalStyles.image, modalStyles.imageFallback]}>
                <Ionicons name="business-outline" size={56} color={colors.textSecondary} />
              </View>
            )}
            <View style={modalStyles.imageOverlay} />
            <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
            {venue.is_verified && (
              <View style={modalStyles.verifiedBadge}>
                <Text style={modalStyles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>

          <ScrollView
            style={modalStyles.body}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {/* Name row */}
            <View style={modalStyles.nameRow}>
              <Text style={modalStyles.venueName}>{venue.name}</Text>
              <View style={[modalStyles.categoryPill, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[modalStyles.categoryPillText, { color: colors.primary }]}>
                  {venue.category}
                </Text>
              </View>
            </View>

            {/* Rating + price */}
            <View style={modalStyles.metaRow}>
              <Text style={modalStyles.stars}>{renderStars(venue.rating)}</Text>
              <Text style={modalStyles.ratingNum}>{venue.rating.toFixed(1)}</Text>
              {venue.price_range && (
                <View style={[
                  modalStyles.pricePill,
                  { backgroundColor: (PRICE_COLORS[venue.price_range] ?? colors.primary) + '22' },
                ]}>
                  <Text style={[
                    modalStyles.priceText,
                    { color: PRICE_COLORS[venue.price_range] ?? colors.primary },
                  ]}>
                    {venue.price_range}
                  </Text>
                </View>
              )}
            </View>

            {/* Location */}
            <TouchableOpacity style={modalStyles.locationRow} onPress={handleDirections}>
              <Ionicons name="location-outline" size={16} color={colors.primary} />
              <Text style={[modalStyles.locationText, { color: colors.primary }]}>
                {venue.address || venue.location}
              </Text>
            </TouchableOpacity>

            {/* Description */}
            {venue.description ? (
              <Text style={modalStyles.description}>{venue.description}</Text>
            ) : null}

            {/* Features */}
            {venue.features && venue.features.length > 0 && (
              <View style={modalStyles.featuresSection}>
                <Text style={modalStyles.sectionLabel}>What's Here</Text>
                <View style={modalStyles.featureChips}>
                  {venue.features.map((f) => (
                    <View key={f} style={[modalStyles.featureChip, { borderColor: colors.border }]}>
                      <Text style={[modalStyles.featureChipText, { color: colors.text }]}>{f}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Opening hours */}
            {venue.opening_hours && Object.keys(venue.opening_hours).length > 0 && (
              <View style={modalStyles.hoursSection}>
                <Text style={modalStyles.sectionLabel}>Opening Hours</Text>
                {Object.entries(venue.opening_hours).map(([day, hours]) => (
                  <View key={day} style={modalStyles.hoursRow}>
                    <Text style={[modalStyles.hoursDay, { color: colors.textSecondary }]}>{day}</Text>
                    <Text style={[modalStyles.hoursTime, { color: colors.text }]}>{hours}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action buttons */}
            <View style={modalStyles.actions}>
              <TouchableOpacity
                style={[modalStyles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={handleDirections}
              >
                <Text style={[modalStyles.actionBtnText, { color: colors.background }]}>
                  Get Directions
                </Text>
              </TouchableOpacity>

              {venue.contact_phone && (
                <TouchableOpacity
                  style={[modalStyles.actionBtnOutline, { borderColor: colors.primary }]}
                  onPress={handleCall}
                >
                  <Text style={[modalStyles.actionBtnText, { color: colors.primary }]}>Call</Text>
                </TouchableOpacity>
              )}

              {venue.website_url && (
                <TouchableOpacity
                  style={[modalStyles.actionBtnOutline, { borderColor: colors.border }]}
                  onPress={handleWebsite}
                >
                  <Text style={[modalStyles.actionBtnText, { color: colors.text }]}>Website</Text>
                </TouchableOpacity>
              )}

              {venue.instagram_url && (
                <TouchableOpacity
                  style={[modalStyles.actionBtnOutline, { borderColor: colors.border }]}
                  onPress={handleInstagram}
                >
                  <Text style={[modalStyles.actionBtnText, { color: colors.text }]}>Instagram</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Check In + Review ── */}
            <View style={modalStyles.checkInRow}>
              {/* Check In button */}
              <TouchableOpacity
                style={[
                  modalStyles.checkInBtn,
                  isCheckedIn && { backgroundColor: colors.success + '20', borderColor: colors.success },
                ]}
                onPress={handleCheckIn}
                disabled={isCheckedIn || checkingIn}
              >
                {checkingIn ? (
                  <ActivityIndicator size="small" color={colors.success} />
                ) : (
                  <Text style={[modalStyles.checkInText, isCheckedIn && { color: colors.success }]}>
                    {isCheckedIn ? 'Checked In' : 'Check In'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Review button / confirmed state */}
              {hasReviewed ? (
                <View style={[
                  modalStyles.checkInBtn,
                  { borderColor: colors.primary + '60', backgroundColor: colors.primary + '10' },
                ]}>
                  <Text style={[modalStyles.checkInText, { color: colors.primary }]}>
                    Reviewed
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[modalStyles.checkInBtn, { borderColor: colors.border }]}
                  onPress={() => setShowReviewForm((v) => !v)}
                >
                  <Text style={[modalStyles.checkInText, { color: colors.text }]}>
                    Write Review
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Review Form (expanded inline) ── */}
            {showReviewForm && !hasReviewed && (
              <View style={[modalStyles.reviewForm, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                <Text style={[modalStyles.sectionLabel, { marginBottom: 10 }]}>Your Rating</Text>
                <View style={modalStyles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                      <Text style={[modalStyles.starBtn, { color: star <= reviewRating ? '#f59e0b' : colors.border }]}>
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[modalStyles.reviewInput, {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  }]}
                  placeholder="Share your experience (optional)..."
                  placeholderTextColor={colors.textSecondary}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity
                  style={[modalStyles.submitReviewBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSubmitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={[modalStyles.submitReviewText, { color: colors.background }]}>
                      Submit Review
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, activeTheme } = useTheme();
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeNeighbourhood, setActiveNeighbourhood] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({ Orbitron_700Bold, Orbitron_900Black });
  const styles = getStyles(colors);

  useEffect(() => {
    fetchVenues();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  // Auto-open venue detail modal when navigated with a venueId param
  useEffect(() => {
    const params = route.params as { venueId?: string } | undefined;
    if (params?.venueId && venues.length > 0) {
      const venue = venues.find(v => v.id === params.venueId);
      if (venue) {
        setSelectedVenue(venue);
      }
      // Clear the param so it doesn't re-trigger on re-render
      navigation.setParams({ venueId: undefined } as any);
    }
  }, [route.params, venues]);

  const fetchVenues = async () => {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select(
          'id, name, description, location, address, category, ' +
          'professional_media_urls, contact_phone, contact_email, ' +
          'website_url, instagram_url, opening_hours, price_range, ' +
          'features, is_verified, rating'
        )
        .order('rating', { ascending: false });

      if (error) throw error;
      setVenues((data as unknown as Venue[]) || []);
    } catch (err) {
      console.error('[Explore] fetch error:', err);
      // Fallback hardcoded venues if DB is empty
      setVenues(FALLBACK_VENUES);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVenues();
    setRefreshing(false);
  };

  // ── Filtering ──

  const filteredVenues = venues.filter((v) => {
    const catMatch =
      activeCategory === 'All' || v.category === activeCategory;
    const areaMatch =
      !activeNeighbourhood ||
      v.location.toLowerCase().includes(activeNeighbourhood.toLowerCase());
    const searchMatch =
      !searchQuery ||
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.description ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && areaMatch && searchMatch;
  });

  if (!fontsLoaded) return null;

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
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButtonContainer}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.appName}>EXPLORE</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Title ── */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Explore Lagos</Text>
          <Text style={styles.subtitle}>
            {venues.length} venues across the city
          </Text>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search venues, areas..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Neighbourhoods ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Neighbourhoods</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.hScroll}
            contentContainerStyle={styles.hScrollContent}
          >
            {NEIGHBOURHOODS.map((n) => {
              const active = activeNeighbourhood === n.key;
              return (
                <TouchableOpacity
                  key={n.key}
                  style={[
                    styles.neighbourhoodChip,
                    active && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setActiveNeighbourhood(n.key)}
                >
                  <Ionicons name={n.icon as any} size={15} color={active ? colors.primary : colors.textSecondary} />
                  <Text
                    style={[
                      styles.neighbourhoodLabel,
                      { color: active ? colors.background : colors.text },
                    ]}
                  >
                    {n.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Category Filter ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.hScroll}
            contentContainerStyle={styles.hScrollContent}
          >
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.label;
              return (
                <TouchableOpacity
                  key={cat.label}
                  style={[
                    styles.categoryChip,
                    active && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setActiveCategory(cat.label)}
                >
                  <Ionicons name={cat.icon as any} size={15} color={active ? colors.primary : colors.textSecondary} />
                  <Text
                    style={[
                      styles.categoryChipLabel,
                      { color: active ? colors.background : colors.textSecondary },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Venue Grid ── */}
        <View style={styles.section}>
          <View style={styles.venuesHeader}>
            <Text style={styles.sectionTitle}>
              {activeCategory === 'All' && !activeNeighbourhood
                ? 'All Venues'
                : activeCategory !== 'All'
                ? `${activeCategory}s`
                : NEIGHBOURHOODS.find((n) => n.key === activeNeighbourhood)?.label ?? 'Venues'}
            </Text>
            <Text style={styles.venuesCount}>{filteredVenues.length} found</Text>
          </View>

          {filteredVenues.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No venues found</Text>
              <Text style={styles.emptyText}>
                Try a different neighbourhood, category, or search term.
              </Text>
            </View>
          ) : (
            <View style={styles.venuesGrid}>
              {filteredVenues.map((venue) => {
                const imgUri = venue.professional_media_urls?.[0] ?? null;
                return (
                  <TouchableOpacity
                    key={venue.id}
                    style={styles.venueCard}
                    onPress={() => setSelectedVenue(venue)}
                    activeOpacity={0.85}
                  >
                    {imgUri ? (
                      <Image
                        source={{ uri: imgUri }}
                        style={styles.venueImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.venueImage, styles.imageFallback]}>
                        <Ionicons name="business-outline" size={36} color={colors.textSecondary} />
                      </View>
                    )}

                    {/* Category badge */}
                    <View style={[styles.categoryBadge, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.categoryBadgeText, { color: colors.background }]}>
                        {venue.category}
                      </Text>
                    </View>

                    {/* Verified tick */}
                    {venue.is_verified && (
                      <View style={styles.verifiedMark}>
                        <Text style={{ fontSize: 11, color: '#fff', fontFamily: '' }}>✓</Text>
                      </View>
                    )}

                    <View style={styles.venueDetails}>
                      <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
                      <View style={styles.venueMetaRow}>
                        <Ionicons name="location-outline" size={11} color={colors.textSecondary} style={{ marginRight: 3 }} />
                        <Text style={styles.locationText} numberOfLines={1}>{venue.location}</Text>
                      </View>
                      <View style={styles.venueMetaRow}>
                        <Ionicons name="star" size={11} color="#f59e0b" style={{ marginRight: 3 }} />
                        <Text style={styles.ratingText}>{venue.rating.toFixed(1)}</Text>
                        {venue.price_range && (
                          <Text style={[styles.priceRange, { color: colors.textSecondary }]}>
                            · {venue.price_range}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Venue Detail Modal ── */}
      <VenueDetailModal
        venue={selectedVenue}
        onClose={() => setSelectedVenue(null)}
        colors={colors}
        userId={userId}
      />
    </SafeAreaView>
  );
}

// ── Fallback venues (shown if DB is empty) ───────────────────────────────────

const FALLBACK_VENUES: Venue[] = [
  { id: '1', name: 'Quilox', category: 'Club', location: 'Victoria Island', rating: 4.8, is_verified: true, price_range: 'Premium', professional_media_urls: ['https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&q=80'], description: 'Lagos\' most iconic nightclub with world-class DJs and VIP tables.', features: ['Live DJ', 'VIP Tables', 'Valet Parking', 'Dress Code'] },
  { id: '2', name: 'NOK by Alara', category: 'Restaurant', location: 'Victoria Island', rating: 4.7, is_verified: true, price_range: 'Premium', professional_media_urls: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80'], description: 'Farm-to-table fine dining in the heart of VI.', features: ['Outdoor Seating', 'Reservations Required', 'Private Rooms'] },
  { id: '3', name: 'Brass & Copper', category: 'Bar', location: 'Ikoyi', rating: 4.7, is_verified: true, price_range: 'Premium', professional_media_urls: ['https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80'], description: 'Lagos\' finest craft cocktail bar.', features: ['Craft Cocktails', 'Happy Hour', 'Reservations'] },
  { id: '4', name: 'The Shank', category: 'Lounge', location: 'Lekki', rating: 4.7, is_verified: false, price_range: 'Moderate', professional_media_urls: ['https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&q=80'], description: 'Lekki\'s coolest hangout spot for good vibes and great food.', features: ['Live Music', 'Outdoor Seating', 'Hookah'] },
  { id: '5', name: 'Landmark Beach Club', category: 'Beach Club', location: 'Oniru', rating: 4.6, is_verified: true, price_range: 'Premium', professional_media_urls: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80'], description: 'Waterfront beach club with pool, cabanas, and stunning lagoon views.', features: ['Pool', 'Beach Access', 'DJ', 'Cabanas'] },
  { id: '6', name: 'Sky Restaurant & Lounge', category: 'Rooftop', location: 'Lekki', rating: 4.5, is_verified: true, price_range: 'Premium', professional_media_urls: ['https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80'], description: 'Stunning rooftop dining with panoramic Lagos views.', features: ['Rooftop', 'Outdoor Seating', 'Cocktail Bar'] },
];

// ── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollView: { flex: 1 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },

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
    backButtonContainer: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    backButton: { fontSize: 24, color: colors.primary, fontWeight: '600' },
    appName: {
      fontSize: 20,
      fontFamily: 'Orbitron_900Black',
      color: colors.primary,
      letterSpacing: 2,
    },

    // Title
    titleSection: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12 },
    title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    subtitle: { fontSize: 14, color: colors.textSecondary },

    // Search
    searchSection: { paddingHorizontal: 16, marginBottom: 8 },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      height: 46,
    },
    searchIcon: { fontSize: 18, marginRight: 8, fontFamily: '' },
    searchInput: { flex: 1, color: colors.text, fontSize: 14 },

    // Sections
    section: { marginBottom: 16 },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    hScroll: {},
    hScrollContent: { paddingHorizontal: 16, gap: 8 },

    // Neighbourhood chips
    neighbourhoodChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    neighbourhoodIcon: { fontSize: 15, fontFamily: '' },
    neighbourhoodLabel: { fontSize: 12, fontWeight: '600' },

    // Category chips
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    categoryChipIcon: { fontSize: 14, fontFamily: '' },
    categoryChipLabel: { fontSize: 12, fontWeight: '500' },

    // Venue grid
    venuesHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    venuesCount: { fontSize: 12, color: colors.textSecondary },
    venuesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingHorizontal: 16,
    },
    venueCard: {
      width: CARD_WIDTH,
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    venueImage: { width: '100%', height: 120 },
    imageFallback: {
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 5,
    },
    categoryBadgeText: { fontSize: 10, fontWeight: 'bold' },
    verifiedMark: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#22c55e',
      alignItems: 'center',
      justifyContent: 'center',
    },
    venueDetails: { padding: 10 },
    venueName: { fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
    venueMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    locationIcon: { fontSize: 11, marginRight: 3, fontFamily: '' },
    locationText: { fontSize: 11, color: colors.textSecondary, flex: 1 },
    starIcon: { fontSize: 11, marginRight: 3, fontFamily: '' },
    ratingText: { fontSize: 11, fontWeight: '700', color: colors.text },
    priceRange: { fontSize: 11, marginLeft: 2 },

    // Empty state
    emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
    emptyIcon: { fontSize: 48, marginBottom: 12, fontFamily: '' },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 6 },
    emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  });

const getModalStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    backdropTap: { flex: 1 },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: height * 0.88,
    },
    imageWrap: {
      height: 220,
      width: '100%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
      position: 'relative',
    },
    image: { width: '100%', height: '100%' },
    imageFallback: {
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 80,
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    closeBtn: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: { fontSize: 14, color: '#fff', fontWeight: 'bold', fontFamily: '' },
    verifiedBadge: {
      position: 'absolute',
      bottom: 12,
      left: 14,
      backgroundColor: '#22c55e',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    verifiedText: { fontSize: 11, color: '#fff', fontWeight: '700', fontFamily: '' },

    body: { paddingHorizontal: 20, paddingTop: 16 },

    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    venueName: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      flex: 1,
      marginRight: 10,
    },
    categoryPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    categoryPillText: { fontSize: 12, fontWeight: '700' },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    stars: { fontSize: 16, color: '#f59e0b', fontFamily: '' },
    ratingNum: { fontSize: 16, fontWeight: '700', color: colors.text },
    pricePill: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 8,
      marginLeft: 4,
    },
    priceText: { fontSize: 12, fontWeight: '700' },

    locationRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    locationIcon: { fontSize: 14, marginRight: 4, marginTop: 1, fontFamily: '' },
    locationText: { fontSize: 14, flex: 1, lineHeight: 20, textDecorationLine: 'underline' },

    description: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 21,
      marginBottom: 16,
    },

    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 8,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    featuresSection: { marginBottom: 16 },
    featureChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    featureChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      borderWidth: 1,
    },
    featureChipText: { fontSize: 12 },

    hoursSection: { marginBottom: 16 },
    hoursRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    hoursDay: { fontSize: 13, width: 110 },
    hoursTime: { fontSize: 13, fontWeight: '500' },

    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 8 },
    actionBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    actionBtnOutline: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
    },
    actionBtnText: { fontSize: 13, fontWeight: '700' },

    // Check-in + review
    checkInRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
      marginBottom: 4,
    },
    checkInBtn: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.success + '80',
      backgroundColor: colors.success + '12',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkInText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.success,
    },
    reviewForm: {
      marginTop: 8,
      marginBottom: 8,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    starsRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 12,
    },
    starBtn: {
      fontSize: 34,
      fontFamily: '',
    },
    reviewInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      fontSize: 13,
      minHeight: 76,
      textAlignVertical: 'top',
      marginBottom: 12,
    },
    submitReviewBtn: {
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    submitReviewText: {
      fontSize: 14,
      fontWeight: '700',
    },
  });
