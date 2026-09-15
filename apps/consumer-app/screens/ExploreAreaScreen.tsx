import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Image, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useFonts, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { LAGOS_AREAS, countByArea, vibeFor, VIBE_LADDER, type LagosArea } from '../lib/areas';
import { type as T, space as S, radius as R, elevation as E, gutter, tracking, tile } from '../theme/tokens';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1576442655380-1e828d09852f?w=800&q=85';

interface Venue {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  professional_media_urls?: string[];
}

export default function ExploreAreaScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, activeTheme } = useTheme();
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [allLocations, setAllLocations] = useState<string[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [topRated, setTopRated] = useState<Venue[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Venue[]>([]);
  const [showLadder, setShowLadder] = useState(false);

  const [fontsLoaded] = useFonts({ Orbitron_900Black });
  const styles = getStyles(colors);

  // If navigated from a Discover neighbourhood tile (or anywhere passing
  // `{ area: '<name>' }`), pre-select that area on mount.
  useEffect(() => {
    const params = route.params as { area?: string } | undefined;
    if (!params?.area) return;

    const target = params.area.toLowerCase();
    const match = LAGOS_AREAS.find(a => a.name.toLowerCase() === target || a.id === target);
    if (match) setSelectedArea(match.id);

    navigation.setParams({ area: undefined } as any);
  }, [route.params]);

  /**
   * Every venue location, used to rank the areas. Separate from the filtered
   * `venues` fetch below, which narrows to one area once one is selected —
   * counting from that would make every area but the selected one read zero.
   */
  const fetchAreaCounts = useCallback(async () => {
    const { data, error } = await supabase.from('venues').select('location');
    if (error || !data) return;
    setAllLocations(data.map((v: { location: string }) => v.location));
  }, []);

  const fetchVenues = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('venues')
        .select('id, name, category, location, rating, professional_media_urls')
        .order('rating', { ascending: false });

      if (selectedArea) {
        const area = LAGOS_AREAS.find(a => a.id === selectedArea);
        if (area) {
          // Match on any alias, not just the display name — otherwise a venue
          // filed under "Lekki Phase 1" is invisible when Lekki is selected.
          query = query.or(area.aliases.map(a => `location.ilike.%${a}%`).join(','));
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setVenues((data as Venue[]) || []);
    } catch (error) {
      console.log('Error fetching venues:', error);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, [selectedArea]);

  const fetchCollections = useCallback(async () => {
    try {
      const { data: rated } = await supabase
        .from('venues')
        .select('id, name, category, location, rating, professional_media_urls')
        .order('rating', { ascending: false })
        .limit(6);
      setTopRated((rated as Venue[]) || []);

      // Was an unordered `limit 6` labelled "Latest additions to explore",
      // which returned whatever the planner felt like and was never new.
      const { data: recent } = await supabase
        .from('venues')
        .select('id, name, category, location, rating, professional_media_urls')
        .order('created_at', { ascending: false })
        .limit(6);
      setRecentlyAdded((recent as Venue[]) || []);
    } catch (error) {
      console.log('Error fetching collections:', error);
    }
  }, []);

  useEffect(() => { fetchVenues(); }, [fetchVenues]);
  useFocusEffect(useCallback(() => {
    fetchAreaCounts();
    fetchCollections();
  }, [fetchAreaCounts, fetchCollections]));

  const counts = countByArea(allLocations);
  const populated = LAGOS_AREAS
    .filter(a => (counts[a.id] || 0) > 0)
    .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
  const empty = LAGOS_AREAS.filter(a => !(counts[a.id] || 0));
  const totalVenues = populated.reduce((sum, a) => sum + (counts[a.id] || 0), 0);

  // Open a venue's detail by hopping to the Explore tab and passing its id.
  const handleVenuePress = (venue: Venue) => {
    (navigation as any).navigate('Explore', { venueId: venue.id });
  };

  const renderAreaCard = (area: LagosArea) => {
    const count = counts[area.id] || 0;
    const vibe = vibeFor(count);
    const tone = colors[vibe.tone];
    const isSelected = selectedArea === area.id;

    return (
      <TouchableOpacity
        key={area.id}
        style={[styles.areaCard, isSelected && { borderColor: colors.primary }]}
        onPress={() => setSelectedArea(isSelected ? null : area.id)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${area.name}, ${count} venues, ${vibe.level}`}
      >
        <View style={styles.areaCardTop}>
          <View style={[styles.areaIconBox, { backgroundColor: `${tone}1F` }]}>
            <Ionicons name={area.icon} size={18} color={tone} />
          </View>
          {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
        </View>
        <Text style={styles.areaName} numberOfLines={1}>{area.shortName}</Text>
        <Text style={styles.areaBlurb} numberOfLines={2}>{area.blurb}</Text>
        <View style={styles.areaFooter}>
          <Text style={styles.areaCount}>{count} {count === 1 ? 'venue' : 'venues'}</Text>
          <Text style={[styles.areaVibe, { color: tone }]}>{vibe.level}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderVenueRail = (title: string, subtitle: string, items: Venue[], badge: (v: Venue) => string) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.railSection}>
        <View style={styles.railHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.railSubtitle}>{subtitle}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent}>
          {items.map(venue => (
            <TouchableOpacity
              key={venue.id}
              style={styles.venueCard}
              onPress={() => handleVenuePress(venue)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: venue.professional_media_urls?.[0] || PLACEHOLDER_IMAGE }}
                style={styles.venueCardImage}
                resizeMode="cover"
              />
              <View style={styles.venueCardScrim} />
              <View style={styles.venueCardContent}>
                <View style={styles.venueCardBadge}>
                  <Text style={styles.venueCardBadgeText}>{badge(venue)}</Text>
                </View>
                <Text style={styles.venueCardName} numberOfLines={1}>{venue.name}</Text>
                <Text style={styles.venueCardLocation} numberOfLines={1}>{venue.location}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (!fontsLoaded) return null;

  const selected = LAGOS_AREAS.find(a => a.id === selectedArea);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
      {/* ── Header ───────────────────────────────────────────────────────── */}
      {/* Outside the ScrollView: this screen runs long once an area is
          selected, and a back button that scrolls off the top strands anyone
          without a swipe gesture. */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.appName}>AREAS</Text>
        <TouchableOpacity
          onPress={() => setShowLadder(true)}
          accessibilityLabel="How areas are ranked"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="information-circle-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: S.giant }}>
        {/* ── Title ──────────────────────────────────────────────────────── */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Explore Lagos</Text>
          <Text style={styles.subtitle}>
            {totalVenues} venue{totalVenues !== 1 ? 's' : ''} across {populated.length} area{populated.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* ── Areas ──────────────────────────────────────────────────────── */}
        {/* The ranking that used to live on Home as "Lagos Vibe Check". It
            belongs here: this screen already was the Lagos area grid, it just
            had stock photography where the real counts should have been. */}
        <View style={styles.areasSection}>
          <View style={styles.areasGrid}>{populated.map(renderAreaCard)}</View>

          {empty.length > 0 && (
            <Text style={styles.emptyAreasNote}>
              No venues listed yet in {empty.map(a => a.name).join(', ')}.
            </Text>
          )}
        </View>

        {/* ── Selected area ──────────────────────────────────────────────── */}
        {selected ? (
          <View style={styles.areaVenuesSection}>
            <Text style={styles.sectionTitle}>{selected.name}</Text>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: S.xl }} />
            ) : venues.length === 0 ? (
              <Text style={styles.noVenues}>No venues listed in {selected.name} yet.</Text>
            ) : (
              <View style={styles.venuesList}>
                {venues.map(venue => (
                  <TouchableOpacity
                    key={venue.id}
                    style={styles.venueRow}
                    onPress={() => handleVenuePress(venue)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: venue.professional_media_urls?.[0] || PLACEHOLDER_IMAGE }}
                      style={styles.venueRowImage}
                      resizeMode="cover"
                    />
                    <View style={styles.venueRowContent}>
                      <Text style={styles.venueRowName} numberOfLines={1}>{venue.name}</Text>
                      <Text style={styles.venueRowCategory} numberOfLines={1}>{venue.category}</Text>
                      <View style={styles.venueRowRating}>
                        <Ionicons name="star" size={11} color={colors.primary} />
                        <Text style={styles.venueRowRatingText}>{Number(venue.rating).toFixed(1)}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <>
            {renderVenueRail('Top rated', 'Highest rated across Lagos', topRated, v => Number(v.rating).toFixed(1))}
            {renderVenueRail('Recently added', 'Newest venues on the app', recentlyAdded, () => 'NEW')}
          </>
        )}
      </ScrollView>

      {/* ── Vibe ladder explainer ────────────────────────────────────────── */}
      <Modal visible={showLadder} animationType="fade" transparent onRequestClose={() => setShowLadder(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowLadder(false)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How areas rank</Text>
              <TouchableOpacity onPress={() => setShowLadder(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Areas are ranked by how many venues are listed on the app — not by how busy they are tonight.
            </Text>
            {VIBE_LADDER.map(vibe => (
              <View key={vibe.level} style={styles.ladderRow}>
                <View style={[styles.ladderIcon, { backgroundColor: `${colors[vibe.tone]}1F` }]}>
                  <Ionicons name={vibe.icon} size={18} color={colors[vibe.tone]} />
                </View>
                <View style={styles.ladderText}>
                  <View style={styles.ladderLabelRow}>
                    <Text style={[styles.ladderLevel, { color: colors[vibe.tone] }]}>{vibe.level}</Text>
                    <Text style={styles.ladderThreshold}>{vibe.threshold}</Text>
                  </View>
                  <Text style={styles.ladderDescription}>{vibe.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  appName: {
    fontSize: T.base,
    fontFamily: 'Orbitron_900Black',
    color: colors.primary,
    letterSpacing: 2,
  },

  // ── Title ──
  titleSection: { paddingHorizontal: gutter, paddingTop: S.xxl, paddingBottom: S.xl },
  title: {
    fontSize: T.xl,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: tracking.tight,
  },
  subtitle: { fontSize: T.sm, color: colors.textMuted, marginTop: S.xs },

  // ── Areas ──
  areasSection: { paddingHorizontal: gutter, marginBottom: S.xxxl },
  areasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  areaCard: {
    width: tile.widthFor(Dimensions.get('window').width),
    backgroundColor: colors.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: S.md,
    ...E.low,
  },
  areaCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: S.md,
  },
  areaIconBox: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaName: { fontSize: T.md, fontWeight: '700', color: colors.text },
  areaBlurb: {
    fontSize: T.xs,
    color: colors.textMuted,
    marginTop: S.xxs,
    lineHeight: T.xs * 1.4,
    minHeight: T.xs * 2.8,
  },
  areaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: S.md,
    paddingTop: S.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  areaCount: { fontSize: T.xs, color: colors.textMuted, fontWeight: '600' },
  areaVibe: {
    fontSize: T.xs,
    fontWeight: '800',
    letterSpacing: tracking.label,
    textTransform: 'uppercase',
  },
  emptyAreasNote: {
    fontSize: T.xs,
    color: colors.textFaint,
    marginTop: S.lg,
    lineHeight: T.xs * 1.5,
  },

  // ── Section heading ──
  sectionTitle: {
    fontSize: T.lg,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: tracking.tight,
  },

  // ── Rails ──
  railSection: { marginBottom: S.xxxl },
  railHeader: { paddingHorizontal: gutter, marginBottom: S.md },
  railSubtitle: { fontSize: T.sm, color: colors.textMuted, marginTop: S.xxs },
  railContent: { paddingHorizontal: gutter, gap: S.md },
  venueCard: {
    width: 200,
    height: 240,
    borderRadius: R.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  venueCardImage: { width: '100%', height: '100%', position: 'absolute' },
  venueCardScrim: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  venueCardContent: { flex: 1, padding: S.md, justifyContent: 'flex-end' },
  venueCardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: S.sm,
    paddingVertical: S.xs,
    borderRadius: R.sm,
    marginBottom: S.sm,
  },
  venueCardBadgeText: {
    fontSize: T.xs,
    fontWeight: '800',
    color: colors.onAccent,
  },
  // These two sit on a dark photo scrim in both themes, so they take fixed
  // light values rather than theme text colours.
  venueCardName: { fontSize: T.md, fontWeight: '700', color: '#F8F4EC' },
  venueCardLocation: { fontSize: T.xs, color: 'rgba(248,244,236,0.72)', marginTop: S.xxs },

  // ── Selected area list ──
  areaVenuesSection: { paddingHorizontal: gutter, marginBottom: S.xxxl },
  venuesList: { gap: S.md, marginTop: S.lg },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    paddingRight: S.md,
  },
  venueRowImage: { width: 88, height: 88 },
  venueRowContent: { flex: 1, paddingHorizontal: S.md, paddingVertical: S.md },
  venueRowName: { fontSize: T.base, fontWeight: '700', color: colors.text },
  venueRowCategory: { fontSize: T.xs, color: colors.textMuted, marginTop: S.xxs },
  venueRowRating: { flexDirection: 'row', alignItems: 'center', gap: S.xs, marginTop: S.sm },
  venueRowRatingText: { fontSize: T.xs, fontWeight: '700', color: colors.primary },
  noVenues: { fontSize: T.sm, color: colors.textMuted, marginTop: S.lg },

  // ── Ladder modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: S.xxl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: S.xxl,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S.xs,
  },
  modalTitle: { fontSize: T.lg, fontWeight: '800', color: colors.text },
  modalSubtitle: {
    fontSize: T.sm,
    color: colors.textMuted,
    marginBottom: S.xl,
    lineHeight: T.sm * 1.45,
  },
  ladderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md, marginBottom: S.lg },
  ladderIcon: {
    width: 36,
    height: 36,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ladderText: { flex: 1 },
  ladderLabelRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.xxs },
  ladderLevel: { fontSize: T.base, fontWeight: '800' },
  ladderThreshold: { fontSize: T.xs, color: colors.textFaint, fontWeight: '600' },
  ladderDescription: { fontSize: T.sm, color: colors.textMuted, lineHeight: T.sm * 1.4 },
});
