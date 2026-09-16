import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { type as T, space as S, radius as R, tracking } from '../theme/tokens';
import { SEVERITY, delayMinutes, type LiveRoute } from '../lib/traffic';

/**
 * One corridor, one number. Numbers-forward where TrafficRow is
 * narrative-forward: the minutes right now are the headline, the delay against
 * a clear road is the subhead, and the severity word is the only other thing.
 * Same tone family as TrafficRow — a wash of the severity colour — so the two
 * kinds of row read as one feature rather than two bolted together.
 *
 * A route with no reading yet (the agent hasn't run, or that route failed to
 * resolve) shows a dash rather than a made-up zero.
 */
export const LiveRouteRow = ({ route, compact = false }: { route: LiveRoute; compact?: boolean }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const severity = route.severity ? SEVERITY[route.severity] : null;
  const tone: string = severity ? colors[severity.tone] : colors.textFaint;
  const now = route.duration_seconds != null ? Math.round(route.duration_seconds / 60) : null;
  const typical = route.typical_duration_seconds != null ? Math.round(route.typical_duration_seconds / 60) : null;
  const delay = delayMinutes(route);

  return (
    <View
      style={[styles.row, compact && styles.rowCompact, { backgroundColor: `${tone}12`, borderColor: `${tone}33` }]}
      accessibilityRole="text"
      accessibilityLabel={
        now != null
          ? `${route.route_label}, ${now} minutes, ${delay && delay > 0 ? `${delay} minutes slower than normal` : 'normal'}`
          : `${route.route_label}, no reading yet`
      }
    >
      <View style={[styles.rail, { backgroundColor: tone }]} />
      <View style={styles.body}>
        <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>{route.route_label}</Text>
        {now != null && typical != null ? (
          <Text style={styles.sub} numberOfLines={1}>
            normally {typical} min{delay != null && delay > 0 ? ` · +${delay}` : ''}
          </Text>
        ) : (
          <Text style={styles.sub}>no reading yet</Text>
        )}
      </View>
      <View style={styles.figure}>
        <Text style={[styles.minutes, compact && styles.minutesCompact, { color: now != null ? colors.text : colors.textFaint }]}>
          {now != null ? now : '—'}
          <Text style={styles.unit}>{now != null ? ' min' : ''}</Text>
        </Text>
        {severity && (
          <Text style={[styles.severity, { color: tone }]}>{severity.label}</Text>
        )}
      </View>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    paddingVertical: S.md,
    paddingRight: S.md,
    overflow: 'hidden',
  },
  rowCompact: { paddingVertical: S.sm },
  rail: { width: 4, alignSelf: 'stretch', borderRadius: R.full },

  body: { flex: 1 },
  label: { fontSize: T.base, fontWeight: '700', color: colors.text },
  labelCompact: { fontSize: T.sm },
  sub: { fontSize: T.xs, color: colors.textMuted, marginTop: S.xxs, fontWeight: '600' },

  figure: { alignItems: 'flex-end' },
  minutes: {
    fontSize: T.lg,
    fontWeight: '900',
    letterSpacing: tracking.tight,
    fontVariant: ['tabular-nums'],
  },
  minutesCompact: { fontSize: T.md },
  unit: { fontSize: T.xs, fontWeight: '700', color: colors.textMuted, letterSpacing: 0 },
  severity: {
    fontSize: T.xs,
    fontWeight: '800',
    letterSpacing: tracking.label,
    textTransform: 'uppercase',
    marginTop: S.xxs,
  },
});
