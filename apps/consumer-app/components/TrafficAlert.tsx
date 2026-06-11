import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Animated, Easing, Linking } from 'react-native';
import { useTheme, polished } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';

const REFRESH_INTERVAL = 5 * 60 * 1000;

type Severity = 'light' | 'moderate' | 'heavy' | 'critical' | 'closed';

interface TrafficReport {
  id: string;
  route_label: string;
  area: string | null;
  severity: Severity;
  summary: string;
  source_name: string;
  source_url: string | null;
  source_published_at: string | null;
  expires_at: string;
}

const getSeverityIcon = (severity: Severity): keyof typeof Ionicons.glyphMap => {
  switch (severity) {
    case 'closed':   return 'close-circle';
    case 'critical': return 'alert-circle';
    case 'heavy':    return 'warning';
    case 'moderate': return 'flash';
    case 'light':    return 'checkmark-circle';
  }
};

// Polished severity styling — closed/critical/heavy share the red treatment.
const POLISHED_SEV: Record<Severity, { tint: string; color: string; dot: string; label: string }> = {
  closed:   { tint: 'rgba(239,68,68,0.22)',  color: '#FCA5A5', dot: '#EF4444', label: 'Closed' },
  critical: { tint: 'rgba(239,68,68,0.18)',  color: '#FCA5A5', dot: '#EF4444', label: 'Gridlock' },
  heavy:    { tint: 'rgba(239,68,68,0.18)',  color: '#FCA5A5', dot: '#EF4444', label: 'Heavy' },
  moderate: { tint: 'rgba(249,115,22,0.18)', color: '#FB923C', dot: '#F97316', label: 'Slow' },
  light:    { tint: 'rgba(16,185,129,0.18)', color: '#34D399', dot: '#10B981', label: 'Free' },
};

const usePulse = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return pulse;
};

const formatTimeAgo = (iso: string | null): string => {
  if (!iso) return '';
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1)  return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  return `${h}h ago`;
};

export const TrafficAlert = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const pulse = usePulse();
  const [reports, setReports]   = useState<TrafficReport[]>([]);
  const [loading, setLoading]   = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const loadTraffic = async () => {
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('traffic_reports')
        .select('id, route_label, area, severity, summary, source_name, source_url, source_published_at, expires_at')
        .gt('expires_at', nowIso)
        .order('source_published_at', { ascending: false, nullsFirst: false })
        .order('scraped_at', { ascending: false })
        .limit(20);
      if (!error && data) {
        setReports(data as TrafficReport[]);
        setLastFetch(new Date());
      }
    } catch (err) {
      console.log('Traffic fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTraffic();
    const interval = setInterval(loadTraffic, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Fetching live traffic...</Text>
      </View>
    );
  }

  if (reports.length === 0) return null; // no active reports — hide the section entirely

  const updatedText = lastFetch
    ? `Updated ${lastFetch.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Live';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Lagos <Text style={styles.headerAccent}>Traffic</Text> Now
        </Text>
        <View style={styles.liveIndicator}>
          <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
          <Text style={styles.liveText}>{updatedText}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {reports.map((r) => {
          const s = POLISHED_SEV[r.severity];
          const openSource = () => {
            if (r.source_url) Linking.openURL(r.source_url).catch(() => {});
          };
          return (
            <TouchableOpacity key={r.id} style={styles.card} activeOpacity={0.85} onPress={openSource}>
              <View style={styles.cardHeader}>
                <View style={[styles.tile, { backgroundColor: s.tint }]}>
                  <Ionicons name={getSeverityIcon(r.severity)} size={18} color={s.color} />
                  <Animated.View style={[styles.tileDot, { backgroundColor: s.dot, shadowColor: s.dot, opacity: pulse }]} />
                </View>
                {r.area && (
                  <View style={styles.areaPill}>
                    <Text style={styles.areaPillText}>{r.area}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.location} numberOfLines={1}>{r.route_label}</Text>
              <Text style={styles.description} numberOfLines={2}>{r.summary}</Text>
              <View style={styles.footer}>
                <View style={[styles.severityBadge, { backgroundColor: s.tint }]}>
                  <Text style={[styles.severityLabel, { color: s.color }]}>{s.label}</Text>
                </View>
                <Text style={styles.timeAgo}>{formatTimeAgo(r.source_published_at)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Source attribution — single line under the rail. */}
      <Text style={styles.sourceLine}>
        via {reports[0].source_name}
      </Text>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: { paddingBottom: 24 },
  loadingContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, marginBottom: 20,
  },
  loadingText: { fontSize: 13, color: colors.textSecondary },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
    paddingHorizontal: 18,
  },
  headerTitle: {
    fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.3,
  },
  headerAccent: { color: polished.goldMid },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E', shadowOpacity: 0.9, shadowRadius: 4,
    elevation: 3,
  },
  liveText: {
    fontSize: 11, fontWeight: '700',
    color: colors.textSecondary, letterSpacing: 0.3,
  },
  railContent: { paddingHorizontal: 18, gap: 12 },
  card: {
    width: 240,
    backgroundColor: colors.cardBackground,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, padding: 14,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  tile: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  tileDot: {
    position: 'absolute', top: -3, right: -3,
    width: 10, height: 10, borderRadius: 5,
    shadowOpacity: 1, shadowRadius: 6,
    elevation: 4,
  },
  areaPill: {
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(234,179,8,0.18)',
  },
  areaPillText: {
    fontSize: 10, fontWeight: '800',
    color: polished.goldMid,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  location: { fontSize: 14, fontWeight: '800', color: colors.text },
  description: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10,
  },
  severityBadge: {
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 6,
  },
  severityLabel: {
    fontSize: 10, fontWeight: '900',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  timeAgo: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  sourceLine: {
    fontSize: 10, color: colors.textSecondary,
    paddingHorizontal: 18, marginTop: 8,
    fontStyle: 'italic',
  },
});
