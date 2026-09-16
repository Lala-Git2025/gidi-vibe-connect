import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { type as T, space as S, radius as R, tracking } from '../theme/tokens';
import { SEVERITY, reportedAt, timeAgo, type Severity, type TrafficReport } from '../lib/traffic';

/**
 * One route, one row — now with something to look at.
 *
 * Severity is carried three ways, each adding something the others don't:
 *   - the icon says what KIND of problem (a closure is not congestion),
 *   - the meter says HOW MUCH (one segment moving, five closed),
 *   - the word is what a screen reader and a quick glance both land on.
 * The row's surface takes a faint wash of the same tone, so a stack of heavy
 * routes reads red before any of it is read.
 *
 * What it no longer does: open the source in a browser. The summaries are
 * already written for Gidi from the radio posts; attribution lives once, at
 * the foot of the list, and nobody leaves the app to read about a road.
 *
 * The entrance is a one-shot fade-and-rise, staggered by index. No loops.
 */

const ICON: Record<Severity, keyof typeof Ionicons.glyphMap> = {
  closed:   'ban',
  critical: 'alert-circle',
  heavy:    'warning',
  moderate: 'time',
  light:    'checkmark-circle',
};

const METER_SEGMENTS = 5;

interface Props {
  report: TrafficReport;
  /** Position in its list, for the staggered entrance. */
  index?: number;
  /** `hero` is the one route that matters most right now — larger, fuller. */
  variant?: 'row' | 'hero';
}

export const TrafficRow = ({ report, index = 0, variant = 'row' }: Props) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const severity = SEVERITY[report.severity];
  const tone: string = colors[severity.tone];
  const hero = variant === 'hero';
  const filled = severity.rank + 1;

  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 280,
      delay: Math.min(index, 6) * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  return (
    <Animated.View
      accessibilityRole="text"
      accessibilityLabel={`${report.route_label}, ${severity.label}, ${timeAgo(reportedAt(report))}`}
      style={[
        styles.row,
        hero && styles.hero,
        // Two-hex alpha suffix on the palette's six-digit hex: ~7% wash on a
        // row, ~12% on the hero, a 20% border so the tint has an edge.
        { backgroundColor: `${tone}${hero ? '1F' : '12'}`, borderColor: `${tone}33` },
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      <View style={[styles.badge, hero && styles.badgeHero, { backgroundColor: `${tone}26` }]}>
        <Ionicons name={ICON[report.severity]} size={hero ? 24 : 18} color={tone} />
      </View>

      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={[styles.route, hero && styles.routeHero]} numberOfLines={hero ? 2 : 1}>
            {report.route_label}
          </Text>
          <Text style={[styles.severity, { color: tone }]}>{severity.label}</Text>
        </View>

        <View style={styles.meter} accessible={false}>
          {Array.from({ length: METER_SEGMENTS }, (_, i) => (
            <View key={i} style={[styles.segment, { backgroundColor: i < filled ? tone : colors.line }]} />
          ))}
        </View>

        <Text style={[styles.summary, hero && styles.summaryHero]} numberOfLines={hero ? 4 : 2}>
          {report.summary}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {report.area ? `${report.area} · ` : ''}{timeAgo(reportedAt(report))}
        </Text>
      </View>
    </Animated.View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    padding: S.md,
  },
  hero: { borderRadius: R.lg, padding: S.lg },

  badge: {
    width: 36,
    height: 36,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: S.xxs,
  },
  badgeHero: { width: 48, height: 48, borderRadius: R.md, marginTop: 0 },

  body: { flex: 1 },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S.sm,
  },
  route: { flex: 1, fontSize: T.base, fontWeight: '700', color: colors.text },
  routeHero: { fontSize: T.md, fontWeight: '800', letterSpacing: tracking.tight },
  severity: {
    fontSize: T.xs,
    fontWeight: '800',
    letterSpacing: tracking.label,
    textTransform: 'uppercase',
  },

  meter: { flexDirection: 'row', gap: 3, marginTop: S.sm, width: 64 },
  segment: { flex: 1, height: 4, borderRadius: R.full },

  summary: {
    fontSize: T.sm,
    color: colors.textMuted,
    marginTop: S.sm,
    lineHeight: T.sm * 1.4,
  },
  summaryHero: { fontSize: T.base, color: colors.text, lineHeight: T.base * 1.45 },
  meta: { fontSize: T.xs, color: colors.textFaint, fontWeight: '600', marginTop: S.sm },
});
