import { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useFonts, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { type as T, space as S, gutter, tracking } from '../theme/tokens';
import { TrafficRow } from '../components/TrafficRow';
import { LiveRouteRow } from '../components/LiveRouteRow';
import { LiveDot } from '../components/LiveDot';
import {
  useTrafficReports, useLiveRoutes, verdict, timeAgo, isFreshAt,
  newestLiveAt, LIVE_STALE_MS, type Severity,
} from '../lib/traffic';

/**
 * Everything the app knows about the roads, in two kinds of row.
 *
 * "Right now": every curated corridor with its live Google travel time,
 * worst first. Quantitative, always fresh, silent on causes.
 *
 * "Reported" / "Earlier": the radio reports, split by whether they still
 * describe the road. Qualitative — the accident, the spillage, the closure —
 * and only as current as the last post.
 */
export default function TrafficScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const styles = getStyles(colors);
  const { fresh, earlier, all, newestAt, loading: reportsLoading, load: loadReports } = useTrafficReports();
  const { routes, loading: liveLoading, load: loadLive } = useLiveRoutes();
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({ Orbitron_900Black });

  const load = useCallback(() => { loadReports(); loadLive(); }, [loadReports, loadLive]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadReports(), loadLive()]);
    setRefreshing(false);
  };

  if (!fontsLoaded) return null;

  const loading = reportsLoading && liveLoading;
  const nothing = all.length === 0 && routes.length === 0;

  const liveAt = newestLiveAt(routes);
  const liveFresh = liveAt !== null && Date.now() - liveAt <= LIVE_STALE_MS;
  const reportsFresh = newestAt !== null && isFreshAt(newestAt);
  const newest = Math.max(liveAt ?? 0, newestAt ?? 0) || null;
  const currentlyFresh = liveFresh || reportsFresh;

  const liveForVerdict = routes.flatMap(r => (r.severity ? [{ severity: r.severity as Severity }] : []));
  const verdictLine = verdict(liveForVerdict.length ? liveForVerdict : all);
  const sourceName = all[0]?.source_name;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.appName}>TRAFFIC</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: S.giant }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>Lagos Traffic</Text>
          {!nothing && (
            <View style={styles.titleMeta}>
              <Text style={styles.verdict}>{verdictLine}</Text>
              {newest !== null && (
                <View style={styles.freshness}>
                  {currentlyFresh && <LiveDot color={colors.live} />}
                  <Text style={styles.freshnessText}>{timeAgo(newest)}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: S.huge }} />
        ) : nothing ? (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={44} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>No readings right now</Text>
            <Text style={styles.emptyBody}>
              Nothing has come through yet. Pull down to check again.
            </Text>
          </View>
        ) : (
          <>
            {routes.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionLabel}>Right now</Text>
                  {liveAt !== null && (
                    <Text style={styles.sectionMeta}>via Google · {timeAgo(liveAt)}</Text>
                  )}
                </View>
                {!liveFresh && (
                  <Text style={styles.sectionNote}>
                    This reading is older than it should be — the live check may not have run recently.
                  </Text>
                )}
                <View style={styles.rows}>
                  {routes.map(route => <LiveRouteRow key={route.route_key} route={route} />)}
                </View>
              </View>
            )}

            {fresh.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Reported</Text>
                <View style={styles.rows}>
                  {fresh.map((report, i) => (
                    <TrafficRow key={report.id} report={report} index={i} variant={i === 0 ? 'hero' : 'row'} />
                  ))}
                </View>
              </View>
            )}

            {earlier.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Reported earlier</Text>
                <Text style={styles.sectionNote}>
                  Over four hours old — the road may have cleared since.
                </Text>
                <View style={styles.rows}>
                  {earlier.map((report, i) => (
                    <TrafficRow key={report.id} report={report} index={fresh.length + i} />
                  ))}
                </View>
              </View>
            )}

            <Text style={styles.source}>
              {routes.length > 0 ? 'Live times via Google. ' : ''}
              {sourceName ? `Reports via ${sourceName}, summarised for Gidi Connect.` : ''}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

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

  titleSection: { paddingHorizontal: gutter, paddingTop: S.xxl, paddingBottom: S.xl },
  title: {
    fontSize: T.xl,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: tracking.tight,
  },
  titleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S.md,
    marginTop: S.xs,
  },
  verdict: { flex: 1, fontSize: T.sm, color: colors.textMuted },
  freshness: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  freshnessText: { fontSize: T.xs, fontWeight: '700', color: colors.textMuted },

  section: { marginBottom: S.xxxl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    marginBottom: S.md,
  },
  sectionLabel: {
    fontSize: T.xs,
    fontWeight: '800',
    color: colors.textFaint,
    letterSpacing: tracking.label,
    textTransform: 'uppercase',
    paddingHorizontal: gutter,
    marginBottom: S.md,
  },
  sectionMeta: { fontSize: T.xs, fontWeight: '600', color: colors.textFaint },
  sectionNote: {
    fontSize: T.xs,
    color: colors.textFaint,
    paddingHorizontal: gutter,
    marginTop: -S.sm,
    marginBottom: S.md,
  },
  rows: { paddingHorizontal: gutter, gap: S.sm },

  empty: { alignItems: 'center', paddingHorizontal: S.xxxl, paddingTop: S.huge, gap: S.md },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: colors.text },
  emptyBody: {
    fontSize: T.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: T.sm * 1.45,
  },

  source: {
    fontSize: T.xs,
    color: colors.textFaint,
    paddingHorizontal: gutter,
    lineHeight: T.xs * 1.5,
  },
});
