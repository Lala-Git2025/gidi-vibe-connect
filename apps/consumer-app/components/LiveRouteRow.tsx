import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { type as T, space as S, radius as R, tracking } from '../theme/tokens';
import { SEVERITY, VS_USUAL, extraMinutes, type LiveRoute } from '../lib/traffic';

/**
 * One corridor, told in words rather than arithmetic.
 *
 * This row used to lead with a big minute count — "99 min", with "normally 63 ·
 * +36" beneath it. Three things were wrong with that, and only one was wording:
 *
 * 1. The baseline was a road that does not exist. "normally 63" was Google's
 *    `staticDuration`, the drive with NO traffic. Apapa-Oshodi has never taken
 *    63 minutes. So "+36" was measured against a fiction, and every chronically
 *    busy corridor read HEAVY at every hour of every day — the badge stopped
 *    discriminating exactly where it was needed.
 *
 * 2. It answered a question nobody asked. 99 minutes is the END-TO-END drive
 *    for the whole corridor. Almost nobody drives Apapa to Oshodi in full;
 *    someone joining at Cele cannot use that number for anything.
 *
 * 3. It made the reader do the work: 99 against 63, compute 36, then decide
 *    whether 36 is a lot for this road. That interpretation is the app's job.
 *
 * So the row now states a verdict. Severity says how congested the road is;
 * "worse than usual" says whether that is remarkable, measured against what
 * this corridor actually does at this hour on this day of the week. The two
 * together are what decides anything: HEAVY and normal means it is bad and
 * waiting will not help. HEAVY and much worse means something has happened.
 *
 * Absolute journey time is deliberately gone. Anyone who wants their own
 * door-to-door figure has Maps or Waze, which do it better and for their actual
 * route; this view exists to say which roads are bad and whether that is news.
 */
export const LiveRouteRow = ({ route, compact = false }: { route: LiveRoute; compact?: boolean }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const severity = route.severity ? SEVERITY[route.severity] : null;
  const tone: string = severity ? colors[severity.tone] : colors.textFaint;

  const usual = route.vs_usual ? VS_USUAL[route.vs_usual] : null;
  const usualTone: string = usual ? (colors as any)[usual.tone] : colors.textMuted;
  const extra = extraMinutes(route);

  const hasReading = route.duration_seconds != null;

  // The subline is the comparison when there is a baseline, and an honest
  // absence when there is not. It never falls back to the free-flow delay,
  // which is the number that caused the problem in the first place.
  const subline = !hasReading
    ? 'No reading yet'
    : usual
      ? extra != null ? `${usual.label} · about ${extra} min extra` : usual.label
      : 'Measuring what this road usually does';

  return (
    <View
      style={[styles.row, compact && styles.rowCompact, { backgroundColor: `${tone}12`, borderColor: `${tone}33` }]}
      accessibilityRole="text"
      accessibilityLabel={`${route.route_label}. ${severity ? severity.label : 'No reading'}. ${subline}`}
    >
      <View style={[styles.rail, { backgroundColor: tone }]} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
            {route.route_label}
          </Text>
          {severity && (
            <Text style={[styles.severity, { color: tone }]}>{severity.label}</Text>
          )}
        </View>
        <Text
          style={[styles.sub, usual && { color: usualTone }]}
          numberOfLines={1}
        >
          {subline}
        </Text>
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

  body: { flex: 1, gap: S.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm },
  label: { flex: 1, fontSize: T.base, fontWeight: '700', color: colors.text },
  labelCompact: { fontSize: T.sm },

  severity: {
    fontSize: T.xs,
    fontWeight: '800',
    letterSpacing: tracking.label,
    textTransform: 'uppercase',
  },
  sub: { fontSize: T.xs, color: colors.textMuted, fontWeight: '600' },
});
