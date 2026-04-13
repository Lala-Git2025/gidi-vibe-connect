import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Animated, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface AreaVibe {
  name: string;
  venueCount: number;
  vibe: string;
  vibeType: 'Electric' | 'Buzzing' | 'Vibing' | 'Chill';
  color: string;
}

// Actual Lagos neighborhoods
const LAGOS_AREAS = [
  { name: 'Victoria Island', aliases: ['Victoria Island', 'VI', 'V/I'] },
  { name: 'Lekki', aliases: ['Lekki', 'Lekki Phase 1', 'Lekki Phase 2'] },
  { name: 'Ikeja', aliases: ['Ikeja', 'Ikeja GRA'] },
  { name: 'Ikoyi', aliases: ['Ikoyi'] },
  { name: 'Surulere', aliases: ['Surulere'] },
  { name: 'Yaba', aliases: ['Yaba'] },
  { name: 'Ajah', aliases: ['Ajah'] },
  { name: 'Festac', aliases: ['Festac', 'Festac Town'] },
  { name: 'Lagos Island', aliases: ['Lagos Island', 'Island'] },
  { name: 'Maryland', aliases: ['Maryland'] },
];

type VibeFilter = 'All' | 'Electric' | 'Buzzing' | 'Vibing' | 'Chill';

const getVibeFilters = (colors: any): { label: string; value: VibeFilter; icon: keyof typeof Ionicons.glyphMap; color: string }[] => [
  { label: 'All', value: 'All', icon: 'globe-outline', color: colors.textSecondary },
  { label: 'Electric', value: 'Electric', icon: 'flash', color: colors.primary },
  { label: 'Buzzing', value: 'Buzzing', icon: 'flame', color: colors.warning },
  { label: 'Vibing', value: 'Vibing', icon: 'sparkles', color: colors.error },
  { label: 'Chill', value: 'Chill', icon: 'musical-notes', color: colors.info },
];

const getVibeStatus = (count: number, colors: any) => {
  if (count >= 15) return { status: 'Electric', vibeType: 'Electric' as const, color: colors.primary };
  if (count >= 8) return { status: 'Buzzing', vibeType: 'Buzzing' as const, color: colors.warning };
  if (count >= 3) return { status: 'Vibing', vibeType: 'Vibing' as const, color: colors.error };
  return { status: 'Chill', vibeType: 'Chill' as const, color: colors.info };
};

interface AreaVenueItem {
  id: string;
  name: string;
  rating: number;
  category: string;
}

const VIBE_DESCRIPTIONS = [
  { level: 'Electric', icon: 'flash' as const, color: '#EAB308', threshold: '15+ venues', description: 'The hottest area in Lagos right now! Packed with action and buzzing energy everywhere.' },
  { level: 'Buzzing', icon: 'flame' as const, color: '#F59E0B', threshold: '8–14 venues', description: 'Lots of activity and great energy. A solid choice for a night out.' },
  { level: 'Vibing', icon: 'sparkles' as const, color: '#EF4444', threshold: '3–7 venues', description: 'A nice, steady vibe with a good selection of spots to check out.' },
  { level: 'Chill', icon: 'musical-notes' as const, color: '#06B6D4', threshold: '0–2 venues', description: 'Quiet and laid-back. Perfect for a relaxed, low-key evening.' },
];

export const VibeCheck = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [areaVibes, setAreaVibes] = useState<AreaVibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVibe, setSelectedVibe] = useState<VibeFilter>('All');
  const [displayOffset, setDisplayOffset] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);
  const [areaVenues, setAreaVenues] = useState<AreaVenueItem[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [pulseAnims] = useState([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]);
  const styles = getStyles(colors);

  useEffect(() => {
    fetchAreaVibes();

    // Start pulsing animations for each area slot
    pulseAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1.3,
            duration: 1500 + (index * 200), // Stagger the animations
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1500 + (index * 200),
            useNativeDriver: false,
          }),
        ])
      ).start();
    });
  }, []);

  // Auto-rotate through areas every 5 seconds
  useEffect(() => {
    const filtered = selectedVibe === 'All'
      ? areaVibes
      : areaVibes.filter(a => a.vibeType === selectedVibe);
    if (filtered.length <= 4) return;

    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setDisplayOffset((prev) => {
          const maxOffset = filtered.length - 4;
          return prev >= maxOffset ? 0 : prev + 1;
        });
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [areaVibes, selectedVibe]);

  const fetchAreaVibes = async () => {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('location, rating')
        .order('rating', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Count venues per area
      const areaCounts: Record<string, number> = {};

      (data || []).forEach(venue => {
        const venueLoc = venue.location.toLowerCase();

        LAGOS_AREAS.forEach(area => {
          const matchesArea = area.aliases.some(alias =>
            venueLoc.includes(alias.toLowerCase())
          );

          if (matchesArea) {
            areaCounts[area.name] = (areaCounts[area.name] || 0) + 1;
          }
        });
      });

      // Build area vibes with actual counts — include all 10 areas, even with 0 venues
      const vibes: AreaVibe[] = LAGOS_AREAS.map(area => {
        const count = areaCounts[area.name] || 0;
        const { status, vibeType, color } = getVibeStatus(count, colors);

        return {
          name: area.name,
          venueCount: count,
          vibe: status,
          vibeType,
          color,
        };
      }).sort((a, b) => b.venueCount - a.venueCount); // Sort by activity

      setAreaVibes(vibes);
    } catch (error) {
      console.error('Error fetching area vibes:', error);
      // Fallback data — all 10 areas with realistic Lagos venue counts
      const fallback: AreaVibe[] = [
        { name: 'Victoria Island', venueCount: 24, vibe: 'Electric', vibeType: 'Electric', color: colors.primary },
        { name: 'Lekki',           venueCount: 18, vibe: 'Buzzing',  vibeType: 'Buzzing',  color: colors.warning },
        { name: 'Ikeja',           venueCount: 12, vibe: 'Buzzing',  vibeType: 'Buzzing',  color: colors.warning },
        { name: 'Ikoyi',           venueCount: 9,  vibe: 'Vibing',   vibeType: 'Vibing',   color: colors.error },
        { name: 'Surulere',        venueCount: 7,  vibe: 'Vibing',   vibeType: 'Vibing',   color: colors.error },
        { name: 'Ajah',            venueCount: 5,  vibe: 'Vibing',   vibeType: 'Vibing',   color: colors.error },
        { name: 'Lagos Island',    venueCount: 4,  vibe: 'Vibing',   vibeType: 'Vibing',   color: colors.error },
        { name: 'Yaba',            venueCount: 3,  vibe: 'Vibing',   vibeType: 'Vibing',   color: colors.error },
        { name: 'Maryland',        venueCount: 2,  vibe: 'Chill',    vibeType: 'Chill',    color: colors.info },
        { name: 'Festac',          venueCount: 1,  vibe: 'Chill',    vibeType: 'Chill',    color: colors.info },
      ];
      setAreaVibes(fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleAreaTap = async (area: AreaVibe) => {
    if (expandedArea === area.name) {
      setExpandedArea(null);
      setAreaVenues([]);
      return;
    }
    setExpandedArea(area.name);
    setLoadingVenues(true);
    try {
      const areaConfig = LAGOS_AREAS.find(a => a.name === area.name);
      const aliases = areaConfig?.aliases || [area.name];
      // Build an OR filter for all aliases
      const filters = aliases.map(a => `location.ilike.%${a}%`).join(',');
      const { data } = await supabase
        .from('venues')
        .select('id, name, rating, category')
        .or(filters)
        .order('rating', { ascending: false })
        .limit(10);
      setAreaVenues((data as AreaVenueItem[]) || []);
    } catch {
      setAreaVenues([]);
    } finally {
      setLoadingVenues(false);
    }
  };

  const handleVenueTap = (venueId: string) => {
    setExpandedArea(null);
    setAreaVenues([]);
    (navigation as any).navigate('Explore', { venueId });
  };

  const filteredAreas = selectedVibe === 'All'
    ? areaVibes
    : areaVibes.filter(area => area.vibeType === selectedVibe);

  const getDisplayedAreas = () => {
    if (filteredAreas.length <= 4) return filteredAreas;
    const displayed = [];
    for (let i = 0; i < 4; i++) {
      const index = (displayOffset + i) % filteredAreas.length;
      displayed.push(filteredAreas[index]);
    }
    return displayed;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Lagos Vibe Check...</Text>
        </View>
      </View>
    );
  }

  const displayedAreas = getDisplayedAreas();
  const filteredCount = filteredAreas.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Lagos Vibe Check</Text>
            <TouchableOpacity onPress={() => setShowInfoModal(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            {filteredCount} area{filteredCount !== 1 ? 's' : ''} • Tap an area to see venues
          </Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Vibe Filters */}
      <View style={styles.filtersContainer}>
        {getVibeFilters(colors).map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterChip,
              selectedVibe === filter.value && styles.filterChipActive,
              selectedVibe === filter.value && { borderColor: filter.color },
            ]}
            onPress={() => {
              setSelectedVibe(filter.value);
              setDisplayOffset(0); // Reset offset when changing filter
            }}
          >
            <Ionicons name={filter.icon} size={14} color={selectedVibe === filter.value ? filter.color : colors.textSecondary} />
            <Text
              style={[
                styles.filterText,
                selectedVibe === filter.value && { color: filter.color },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Areas List */}
      {displayedAreas.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
          <Text style={styles.emptyText}>
            No areas match this vibe right now
          </Text>
        </View>
      ) : (
        <Animated.View style={[styles.areasList, { opacity: fadeAnim }]}>
          {displayedAreas.map((area, index) => {
            const pulseAnim = pulseAnims[index];
            const glowOpacity = pulseAnim.interpolate({
              inputRange: [1, 1.3],
              outputRange: [0.6, 1],
            });

            const isExpanded = expandedArea === area.name;

            return (
              <View key={`${area.name}-${index}`} style={styles.areaItemContainer}>
                {/* Outer Glow Container */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleAreaTap(area)}
                >
                  <Animated.View
                    style={[
                      styles.outerGlow,
                      {
                        opacity: glowOpacity,
                        borderColor: area.color,
                        borderWidth: pulseAnim.interpolate({
                          inputRange: [1, 1.3],
                          outputRange: [3, 5],
                        }),
                      },
                    ]}
                  >
                    {/* Inner Glow */}
                    <Animated.View
                      style={[
                        styles.innerGlow,
                        {
                          backgroundColor: area.color,
                          opacity: pulseAnim.interpolate({
                            inputRange: [1, 1.3],
                            outputRange: [0.2, 0.4],
                          }),
                        },
                      ]}
                    />

                    {/* Area Card */}
                    <View style={styles.areaItem}>
                      <View style={styles.areaLeft}>
                        <Animated.View
                          style={[
                            styles.areaIndicator,
                            {
                              backgroundColor: area.color,
                              opacity: pulseAnim.interpolate({
                                inputRange: [1, 1.3],
                                outputRange: [0.8, 1],
                              }),
                              transform: [{
                                scale: pulseAnim.interpolate({
                                  inputRange: [1, 1.3],
                                  outputRange: [1, 1.05],
                                }),
                              }],
                            },
                          ]}
                        />
                        <View style={styles.areaInfo}>
                          <Text style={styles.areaName}>{area.name}</Text>
                          <Text style={styles.areaVenue}>{area.venueCount} venues active</Text>
                        </View>
                      </View>
                      <View style={styles.areaRight}>
                        <Animated.Text
                          style={[
                            styles.areaVibe,
                            {
                              color: area.color,
                              opacity: pulseAnim.interpolate({
                                inputRange: [1, 1.3],
                                outputRange: [0.7, 1],
                              }),
                            },
                          ]}
                        >
                          {area.vibe}
                        </Animated.Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={colors.textSecondary}
                          style={{ marginTop: 2 }}
                        />
                      </View>
                    </View>
                  </Animated.View>
                </TouchableOpacity>

                {/* Expanded Venue List */}
                {isExpanded && (
                  <View style={styles.venueList}>
                    {loadingVenues ? (
                      <ActivityIndicator size="small" color={area.color} style={{ paddingVertical: 12 }} />
                    ) : areaVenues.length === 0 ? (
                      <Text style={styles.noVenuesText}>No venues found in {area.name}</Text>
                    ) : (
                      areaVenues.map((venue) => {
                        const venueVibe = getVibeStatus(
                          Math.round(venue.rating * 3),
                          colors
                        );
                        return (
                          <TouchableOpacity
                            key={venue.id}
                            style={styles.venueRow}
                            activeOpacity={0.7}
                            onPress={() => handleVenueTap(venue.id)}
                          >
                            <View style={[styles.venueVibeIndicator, { backgroundColor: venueVibe.color }]} />
                            <View style={styles.venueInfo}>
                              <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
                              <Text style={styles.venueCategory}>{venue.category}</Text>
                            </View>
                            <View style={styles.venueRightCol}>
                              <Text style={[styles.venueVibeLabel, { color: venueVibe.color }]}>{venueVibe.status}</Text>
                              <Text style={styles.venueRating}>
                                <Ionicons name="star" size={11} color={colors.primary} /> {venue.rating.toFixed(1)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </Animated.View>
      )}

      {/* Rotation Indicator */}
      {filteredCount > 4 && (
        <View style={styles.rotationIndicator}>
          <Text style={styles.rotationText}>
            Showing {displayedAreas.length} of {filteredCount} • Auto-rotating
          </Text>
          <View style={styles.dotsContainer}>
            {Array.from({ length: Math.min(Math.ceil(filteredCount / 4), 5) }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  (displayOffset === i || (filteredCount > 20 && i === 4)) && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Vibe Info Modal */}
      <Modal
        visible={showInfoModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowInfoModal(false)}
      >
        <TouchableOpacity
          style={styles.infoModalBackdrop}
          activeOpacity={1}
          onPress={() => setShowInfoModal(false)}
        >
          <View style={styles.infoModalContent}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>Vibe Levels</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoModalSubtitle}>
              Areas are ranked by the number of active venues
            </Text>
            {VIBE_DESCRIPTIONS.map((vibe) => (
              <View key={vibe.level} style={styles.infoRow}>
                <View style={[styles.infoIconCircle, { backgroundColor: vibe.color + '22' }]}>
                  <Ionicons name={vibe.icon} size={18} color={vibe.color} />
                </View>
                <View style={styles.infoTextCol}>
                  <View style={styles.infoLabelRow}>
                    <Text style={[styles.infoLevel, { color: vibe.color }]}>{vibe.level}</Text>
                    <Text style={styles.infoThreshold}>{vibe.threshold}</Text>
                  </View>
                  <Text style={styles.infoDescription}>{vibe.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  loadingCard: {
    height: 250,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },

  // Filters
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 2,
  },
  filterIcon: {
    fontSize: 14,
    fontFamily: '',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Areas List
  areasList: {
    backgroundColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  areaItemContainer: {
    marginBottom: 4,
  },
  outerGlow: {
    borderRadius: 14,
    padding: 2,
    position: 'relative',
  },
  innerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
  },
  areaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
  },
  areaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  areaIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  areaInfo: {
    flex: 1,
  },
  areaName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  areaVenue: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  areaRight: {
    alignItems: 'flex-end',
  },
  areaVibe: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.5,
    marginBottom: 12,
    fontFamily: '',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Rotation Indicator
  rotationIndicator: {
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  rotationText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },

  // Expanded venue list
  venueList: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  venueVibeIndicator: {
    width: 3,
    height: 28,
    borderRadius: 2,
    marginRight: 10,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  venueCategory: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  venueRightCol: {
    alignItems: 'flex-end',
  },
  venueVibeLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  venueRating: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  noVenuesText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    paddingVertical: 16,
  },

  // Info modal
  infoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  infoModalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  infoModalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  infoLevel: {
    fontSize: 15,
    fontWeight: '700',
  },
  infoThreshold: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
