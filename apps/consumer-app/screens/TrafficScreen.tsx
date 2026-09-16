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
import { LiveDot } from '../components/LiveDot';
import { useTrafficReports, verdict, timeAgo, isFreshAt } from '../lib/traffic';

/**
 * Every route the source has classified in the last twelve hours, split by
 * whether it still describes the road now. Reached from Home's traffic band.
 */
export default function TrafficScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const styles = getStyles(colors);
  const { fresh, earlier, all, newestAt, loading, load } = useTrafficReports();
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({ Orbitron_900Black });

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!fontsLoaded) return null;

  const currentlyFresh = newestAt !== null && isFreshAt(newestAt);
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
          {all.length > 0 && (
            <View style={styles.titleMeta}>
              <Text style={styles.verdict}>{verdict(all)}</Text>
              {newestAt !== null && (
                <View style={styles.freshness}>
                  {currentlyFresh && <LiveDot color={colors.live} />}
                  <Text style={styles.freshnessText}>{timeAgo(newestAt)}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: S.huge }} />
        ) : all.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={44} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>No reports right now</Text>
            <Text style={styles.emptyBody}>
              Nothing has come through in the last twelve hours. Pull down to check again.
            </Text>
          </View>
        ) : (
          <>
            {fresh.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Now</Text>
                <View style={styles.rows}>
                  {fresh.map((report, i) => (
                    <TrafficRow key={report.id} report={report} index={i} variant={i === 0 ? 'hero' : 'row'} />
                  ))}
                </View>
              </View>
            )}

            {earlier.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Earlier</Text>
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

            {!!sourceName && (
              <Text style={styles.source}>Reports via {sourceName}, summarised for Gidi Connect.</Text>
            )}
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
  sectionLabel: {
    fontSize: T.xs,
    fontWeight: '800',
    color: colors.textFaint,
    letterSpacing: tracking.label,
    textTransform: 'uppercase',
    paddingHorizontal: gutter,
    marginBottom: S.md,
  },
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
