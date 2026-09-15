import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { type as T, space as S, radius as R, tracking } from '../theme/tokens';
import { SEVERITY, reportedAt, timeAgo, type TrafficReport } from '../lib/traffic';

/**
 * One route, one row.
 *
 * Severity is stated twice and no more: the coloured rail down the left edge
 * and the word at the top right. The previous card stated it four ways — a
 * tinted icon box, an icon, a pulsing corner dot and a pill — and the pulse ran
 * at the same rate on "Moving" as on "Gridlock", so it carried no information
 * while diluting the red that did.
 */
export const TrafficRow = ({ report }: { report: TrafficReport }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const severity = SEVERITY[report.severity];
  const tone = colors[severity.tone];

  const openSource = () => {
    if (report.source_url) Linking.openURL(report.source_url).catch(() => {});
  };

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={openSource}
      activeOpacity={report.source_url ? 0.75 : 1}
      disabled={!report.source_url}
      accessibilityRole={report.source_url ? 'link' : 'text'}
      accessibilityLabel={`${report.route_label}, ${severity.label}, ${timeAgo(reportedAt(report))}`}
    >
      <View style={[styles.rail, { backgroundColor: tone }]} />
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={styles.route} numberOfLines={1}>{report.route_label}</Text>
          <Text style={[styles.severity, { color: tone }]}>{severity.label}</Text>
        </View>
        <Text style={styles.summary} numberOfLines={2}>{report.summary}</Text>
        <View style={styles.metaLine}>
          <Text style={styles.meta} numberOfLines={1}>
            {report.area ? `${report.area} · ` : ''}{timeAgo(reportedAt(report))}
          </Text>
          {!!report.source_url && (
            <Ionicons name="open-outline" size={13} color={colors.textFaint} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  rail: { width: 4 },
  body: { flex: 1, padding: S.md },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S.sm,
  },
  route: { flex: 1, fontSize: T.base, fontWeight: '700', color: colors.text },
  severity: {
    fontSize: T.xs,
    fontWeight: '800',
    letterSpacing: tracking.label,
    textTransform: 'uppercase',
  },
  summary: {
    fontSize: T.sm,
    color: colors.textMuted,
    marginTop: S.xs,
    lineHeight: T.sm * 1.4,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: S.sm,
    gap: S.sm,
  },
  meta: { flex: 1, fontSize: T.xs, color: colors.textFaint, fontWeight: '600' },
});
