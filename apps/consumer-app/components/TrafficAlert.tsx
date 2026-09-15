import { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { type as T, space as S, gutter, tracking } from '../theme/tokens';
import { TrafficRow } from './TrafficRow';
import { useTrafficReports, verdict, timeAgo, isFreshAt, type TrafficReport } from '../lib/traffic';

const REFRESH_INTERVAL = 5 * 60 * 1000;
const PREVIEW_COUNT = 3;

/**
 * Home's traffic band: a verdict, the three routes that matter most, and a way
 * through to the rest. Was a horizontal rail of ten equal-weight cards ordered
 * newest-first, which meant scanning sideways through clear roads to find the
 * blocked one.
 */
export const TrafficAlert = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const styles = getStyles(colors);
  const { fresh, earlier, all, newestAt, loading, load } = useTrafficReports();

  useEffect(() => {
    const interval = setInterval(load, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  // Refetch on focus — otherwise reports written between mount and the next
  // interval tick stay invisible until then.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Checking the roads…</Text>
      </View>
    );
  }

  if (all.length === 0) return null;

  // Prefer current reports. Only fall back to older ones when there is nothing
  // current, and say so when that happens rather than passing them off as now.
  const showingFresh = fresh.length > 0;
  const group: TrafficReport[] = showingFresh ? fresh : earlier;
  const preview = group.slice(0, PREVIEW_COUNT);
  const currentlyFresh = newestAt !== null && isFreshAt(newestAt);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            Lagos <Text style={styles.titleAccent}>Traffic</Text>
          </Text>
          <Text style={styles.verdict}>{verdict(group)}</Text>
        </View>
        <View style={styles.freshness}>
          {currentlyFresh && <View style={styles.liveDot} />}
          {/* The age of the newest report, never the time of the last fetch.
              Staleness is carried by the absent dot and the note below, so the
              age itself reads the same either way. */}
          <Text style={styles.freshnessText}>
            {newestAt === null ? '' : timeAgo(newestAt)}
          </Text>
        </View>
      </View>

      {!showingFresh && (
        <Text style={styles.staleNote}>
          Nothing reported in the last few hours. Showing earlier reports.
        </Text>
      )}

      <View style={styles.rows}>
        {preview.map(report => <TrafficRow key={report.id} report={report} />)}
      </View>

      <TouchableOpacity
        style={styles.allRoutes}
        onPress={() => (navigation as any).navigate('Traffic')}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`See all ${all.length} routes`}
      >
        <Text style={styles.allRoutesText}>
          All {all.length} route{all.length !== 1 ? 's' : ''}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: { marginBottom: S.xxl },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    paddingHorizontal: gutter,
    marginBottom: S.xxl,
  },
  loadingText: { fontSize: T.sm, color: colors.textMuted },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: S.md,
    paddingHorizontal: gutter,
    marginBottom: S.md,
  },
  headerText: { flex: 1 },
  title: {
    fontSize: T.lg,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: tracking.tight,
  },
  titleAccent: { color: colors.primary },
  verdict: { fontSize: T.sm, color: colors.textMuted, marginTop: S.xxs },

  freshness: { flexDirection: 'row', alignItems: 'center', gap: S.xs, paddingTop: S.xxs },
  // The one pulse-free live indicator on the screen: it is either lit, meaning
  // a report landed within the freshness window, or it is absent.
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live },
  freshnessText: { fontSize: T.xs, fontWeight: '700', color: colors.textMuted },

  staleNote: {
    fontSize: T.xs,
    color: colors.textFaint,
    paddingHorizontal: gutter,
    marginBottom: S.md,
    lineHeight: T.xs * 1.4,
  },

  rows: { paddingHorizontal: gutter, gap: S.sm },

  allRoutes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: gutter,
    paddingTop: S.md,
  },
  allRoutesText: { fontSize: T.sm, fontWeight: '700', color: colors.primary },
});
