import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { supabase } from '../config/supabase';
import { useTheme } from '../contexts/ThemeContext';

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

const getVibeFilters = (colors: any): { label: string; value: VibeFilter; icon: string; color: string }[] => [
  { label: 'All', value: 'All', icon: '🌍', color: colors.textSecondary },
  { label: 'Electric', value: 'Electric', icon: '⚡️', color: colors.primary },
  { label: 'Buzzing', value: 'Buzzing', icon: '🔥', color: colors.warning },
  { label: 'Vibing', value: 'Vibing', icon: '✨', color: colors.error },
  { label: 'Chill', value: 'Chill', icon: '🎵', color: colors.info },
];

const getVibeStatus = (count: number, colors: any) => {
  if (count >= 15) return { status: 'Electric ⚡️', vibeType: 'Electric' as const, color: colors.primary };
  if (count >= 8) return { status: 'Buzzing 🔥', vibeType: 'Buzzing' as const, color: colors.warning };
  if (count >= 3) return { status: 'Vibing ✨', vibeType: 'Vibing' as const, color: colors.error };
  return { status: 'Chill 🎵', vibeType: 'Chill' as const, color: colors.info };
};

export const VibeCheck = () => {
  const { colors } = useTheme();
  const [areaVibes, setAreaVibes] = useState<AreaVibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVibe, setSelectedVibe] = useState<VibeFilter>('All');
  const [displayOffset, setDisplayOffset] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));
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
    const filteredAreas = getFilteredAreas();
    if (filteredAreas.length <= 4) return; // Don't rotate if 4 or fewer areas

    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Update offset
        setDisplayOffset((prev) => {
          const maxOffset = filteredAreas.length - 4;
          return prev >= maxOffset ? 0 : prev + 1;
        });

        // Fade in
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

      // Build area vibes with actual counts
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
      }).filter(area => area.venueCount > 0) // Only show areas with venues
        .sort((a, b) => b.venueCount - a.venueCount); // Sort by activity

      setAreaVibes(vibes);
    } catch (error) {
      console.error('Error fetching area vibes:', error);
      // Fallback data
      const fallback: AreaVibe[] = [
        { name: 'Victoria Island', venueCount: 24, vibe: 'Electric ⚡️', vibeType: 'Electric', color: colors.primary },
        { name: 'Lekki', venueCount: 18, vibe: 'Buzzing 🔥', vibeType: 'Buzzing', color: colors.warning },
        { name: 'Ikeja', venueCount: 12, vibe: 'Buzzing 🔥', vibeType: 'Buzzing', color: colors.warning },
        { name: 'Ikoyi', venueCount: 8, vibe: 'Vibing ✨', vibeType: 'Vibing', color: colors.error },
      ];
      setAreaVibes(fallback);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAreas = () => {
    if (selectedVibe === 'All') return areaVibes;
    return areaVibes.filter(area => area.vibeType === selectedVibe);
  };

  const getDisplayedAreas = () => {
    const filtered = getFilteredAreas();
    if (filtered.length <= 4) return filtered;

    const displayed = [];
    for (let i = 0; i < 4; i++) {
      const index = (displayOffset + i) % filtered.length;
      displayed.push(filtered[index]);
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
  const filteredCount = getFilteredAreas().length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Lagos Vibe Check</Text>
          <Text style={styles.subtitle}>
            {filteredCount} area{filteredCount !== 1 ? 's' : ''} • Live now
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
            <Text style={styles.filterIcon}>{filter.icon}</Text>
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
          <Text style={styles.emptyIcon}>🔍</Text>
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

            return (
              <View key={`${area.name}-${index}`} style={styles.areaItemContainer}>
                {/* Outer Glow Container */}
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
                    </View>
                  </View>
                </Animated.View>
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
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
    backgroundColor: '#3f3f46',
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
});
