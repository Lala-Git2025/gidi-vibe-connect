import { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { type as T, space as S, gutter, tracking } from '../theme/tokens';
import { TrafficRow } from './TrafficRow';
import { LiveRouteRow } from './LiveRouteRow';
import { LiveDot } from './LiveDot';
import {
  useTrafficReports, useLiveRoutes, verdict, timeAgo, isFreshAt,
  newestLiveAt, LIVE_STALE_MS, type TrafficReport, type Severity,
} from '../lib/traffic';

const REFRESH_INTERVAL = 5 * 60 * 1000;
const PREVIEW_COUNT = 3;

/**
 * Home's traffic band, now two signals in one place.
 *
 * "Right now" is the worst of the curated corridors by live Google travel
 * time — always fresh, never explains itself. Beneath it, the radio reports:
 * the route that matters most as a hero card, two more under it, and a way
 * through to the rest. Those explain WHY, but only when someone has posted.
 * Home shows one live row, not all eight, so the band stays the size it was
 * after the declutter.
 */
export const TrafficAlert = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const styles = getStyles(colors);
  const { fresh, earlier, all, newestAt, loading: reportsLoading, load: loadReports } = useTrafficReports();
  const { routes, loading: liveLoading, load: loadLive } = useLiveRoutes();

  const load = useCallback(() => { loadReports(); loadLive(); }, [loadReports, loadLive]);

  useEffect(() => {
    const interval = setInterval(load, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  // Refetch on focus — otherwise reports written between mount and the next
  // interval tick stay invisible until then.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (reportsLoading && liveLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Checking the roads…</Text>
      </View>
    );
  }

  if (all.length === 0 && routes.length === 0) return null;

  // Prefer current reports. Only fall back to older ones when there is nothing
  // current, and say so when that happens rather than passing them off as now.
  const showingFresh = fresh.length > 0;
  const group: TrafficReport[] = showingFresh ? fresh : earlier;
  const [lead, ...rest] = group.slice(0, PREVIEW_COUNT);

  const liveAt = newestLiveAt(routes);
  const liveFresh = liveAt !== null && Date.now() - liveAt <= LIVE_STALE_MS;
  const reportsFresh = newestAt !== null && isFreshAt(newestAt);
  // The header shows the age of whichever signal is newest; the dot means at
  // least one of them is current.
  const newest = Math.max(liveAt ?? 0, newestAt ?? 0) || null;
  const currentlyFresh = liveFresh || reportsFresh;

  // The verdict summarises the live corridors when there are any — they are
  // the complete, objective picture. Radio reports only cover what got posted.
  const liveForVerdict = routes.flatMap(r => (r.severity ? [{ severity: r.severity as Severity }] : []));
  const verdictLine = verdict(liveForVerdict.length ? liveForVerdict : group);

  const worstLive = routes[0]; // sorted worst-first by the hook
  const sources = [routes.length ? 'Google' : null, all[0]?.source_name ?? null].filter(Boolean).join(' · ');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            Lagos <Text style={styles.titleAccent}>Traffic</Text>
          </Text>
          {!!verdictLine && <Text style={styles.verdict}>{verdictLine}</Text>}
        </View>
        <View style={styles.freshness}>
          {currentlyFresh && <LiveDot color={colors.live} />}
          <Text style={styles.freshnessText}>{newest === null ? '' : timeAgo(newest)}</Text>
        </View>
      </View>

      {worstLive && (
        <View style={styles.liveBlock}>
          <Text style={styles.eyebrow}>
            Right now{liveFresh ? '' : ' · reading is old'}
          </Text>
          <LiveRouteRow route={worstLive} compact />
        </View>
      )}

      {all.length > 0 && (
        <>
          {!showingFresh && (
            <Text style={styles.staleNote}>
              Nothing reported in the last few hours. Showing earlier reports.
            </Text>
          )}
          <View style={styles.rows}>
            {lead && <TrafficRow report={lead} index={0} variant="hero" />}
            {rest.map((report, i) => <TrafficRow key={report.id} report={report} index={i + 1} />)}
          </View>
        </>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.allRoutes}
          onPress={() => (navigation as any).navigate('Traffic')}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="See all traffic"
        >
          <Text style={styles.allRoutesText}>All traffic</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
        {!!sources && <Text style={styles.source} numberOfLines={1}>via {sources}</Text>}
      </View>
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
  freshnessText: { fontSize: T.xs, fontWeight: '700', color: colors.textMuted },

  liveBlock: { paddingHorizontal: gutter, marginBottom: S.md, gap: S.sm },
  eyebrow: {
    fontSize: T.xs,
    fontWeight: '800',
    color: colors.textFaint,
    letterSpacing: tracking.label,
    textTransform: 'uppercase',
  },

  staleNote: {
    fontSize: T.xs,
    color: colors.textFaint,
    paddingHorizontal: gutter,
    marginBottom: S.md,
    lineHeight: T.xs * 1.4,
  },

  rows: { paddingHorizontal: gutter, gap: S.sm },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S.md,
    paddingHorizontal: gutter,
    paddingTop: S.md,
  },
  allRoutes: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  allRoutesText: { fontSize: T.sm, fontWeight: '700', color: colors.primary },
  source: { flex: 1, textAlign: 'right', fontSize: T.xs, color: colors.textFaint },
});
