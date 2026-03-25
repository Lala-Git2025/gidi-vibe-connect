import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';

const REFRESH_INTERVAL = 5 * 60 * 1000;

// Fallback key used only when the edge function is not yet deployed.
// Once `get-traffic` is deployed and the secret is set, this is never called.
const TOMTOM_API_KEY = 'oPf90mRaSNN4TZkUy8TGCqcOJoMbgsWi';

interface TrafficData {
  id: string;
  location: string;
  severity: 'light' | 'moderate' | 'heavy' | 'critical';
  description: string;
  area: string;
}

interface RoutePoint {
  name: string;
  area: 'Mainland' | 'Island' | 'Lekki';
  lat: number;
  lon: number;
}

const MAJOR_ROUTES: RoutePoint[] = [
  { name: 'Third Mainland Bridge',   area: 'Mainland', lat: 6.4950, lon: 3.3800 },
  { name: 'Lagos-Ibadan Expressway', area: 'Mainland', lat: 6.6342, lon: 3.3517 },
  { name: 'Ikorodu Road',            area: 'Mainland', lat: 6.5833, lon: 3.3833 },
  { name: 'Apapa-Oshodi Expressway', area: 'Mainland', lat: 6.4747, lon: 3.3406 },
  { name: 'Western Avenue',          area: 'Mainland', lat: 6.4972, lon: 3.3597 },
  { name: 'Badagry Expressway',      area: 'Mainland', lat: 6.4833, lon: 3.2833 },
  { name: 'Eko Bridge',              area: 'Island',   lat: 6.4553, lon: 3.3725 },
  { name: 'Carter Bridge',           area: 'Island',   lat: 6.4544, lon: 3.3769 },
  { name: 'Ozumba Mbadiwe Avenue',   area: 'Island',   lat: 6.4265, lon: 3.4247 },
  { name: 'Ahmadu Bello Way',        area: 'Island',   lat: 6.4267, lon: 3.4217 },
  { name: 'Lekki-Epe Expressway',    area: 'Lekki',    lat: 6.4427, lon: 3.4783 },
  { name: 'Admiralty Way',           area: 'Lekki',    lat: 6.4394, lon: 3.4792 },
];

const speedRatioToSeverity = (ratio: number): TrafficData['severity'] => {
  if (ratio >= 0.80) return 'light';
  if (ratio >= 0.60) return 'moderate';
  if (ratio >= 0.40) return 'heavy';
  return 'critical';
};

const severityToLabel = (severity: TrafficData['severity']): string => {
  switch (severity) {
    case 'light':    return 'Traffic flowing well';
    case 'moderate': return 'Moderate slowdown';
    case 'heavy':    return 'Heavy congestion';
    case 'critical': return 'Severe gridlock';
  }
};

// Direct TomTom fetch — used as fallback when edge function is unavailable
const fetchRouteFlow = async (route: RoutePoint): Promise<TrafficData | null> => {
  try {
    const url =
      `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json` +
      `?key=${TOMTOM_API_KEY}&point=${route.lat},${route.lon}&unit=KMPH`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const flow = data.flowSegmentData;
    if (!flow) return null;
    if (flow.roadClosure) {
      return { id: route.name, location: route.name, area: route.area, severity: 'critical', description: 'Road closed' };
    }
    const currentSpeed: number  = flow.currentSpeed  ?? 0;
    const freeFlowSpeed: number = flow.freeFlowSpeed ?? 1;
    const ratio    = currentSpeed / freeFlowSpeed;
    const severity = speedRatioToSeverity(ratio);
    return {
      id: route.name, location: route.name, area: route.area, severity,
      description: `${severityToLabel(severity)} · ${currentSpeed} km/h (free flow ${freeFlowSpeed} km/h)`,
    };
  } catch { return null; }
};

const fetchDirectFromTomTom = async (): Promise<TrafficData[]> => {
  const results = await Promise.all(MAJOR_ROUTES.map(fetchRouteFlow));
  const mainland = results.filter((r): r is TrafficData => r !== null && r.area === 'Mainland');
  const island   = results.filter((r): r is TrafficData => r !== null && r.area !== 'Mainland');
  const mixed: TrafficData[] = [];
  const maxLen = Math.max(mainland.length, island.length);
  for (let i = 0; i < maxLen; i++) {
    if (island[i])   mixed.push(island[i]);
    if (mainland[i]) mixed.push(mainland[i]);
  }
  return mixed;
};

const getSeverityColor = (severity: string, colors: any) => {
  switch (severity) {
    case 'critical': return colors.error;
    case 'heavy':    return colors.error;
    case 'moderate': return colors.primary;
    case 'light':    return colors.success;
    default:         return colors.primary;
  }
};

const getSeverityIcon = (severity: string): keyof typeof Ionicons.glyphMap => {
  switch (severity) {
    case 'critical': return 'alert-circle';
    case 'heavy':    return 'warning';
    case 'moderate': return 'flash';
    case 'light':    return 'checkmark-circle';
    default:         return 'warning';
  }
};

export const TrafficAlert = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [trafficAlerts, setTrafficAlerts] = useState<TrafficData[]>([]);
  const [loading, setLoading]             = useState(true);
  const [lastUpdated, setLastUpdated]     = useState<Date | null>(null);

  const loadTraffic = async () => {
    try {
      // ── Primary: edge function (server-side cached, key never exposed) ──
      const { data, error } = await supabase.functions.invoke('get-traffic');

      if (!error && data?.data?.length > 0) {
        setTrafficAlerts(data.data);
        setLastUpdated(new Date());
        return;
      }

      // ── Fallback: direct TomTom (used until edge function is deployed) ──
      const fresh = await fetchDirectFromTomTom();
      if (fresh.length > 0) {
        setTrafficAlerts(fresh);
        setLastUpdated(new Date());
      }
    } catch (err) {
      // Edge function not reachable — try TomTom directly
      try {
        const fresh = await fetchDirectFromTomTom();
        if (fresh.length > 0) {
          setTrafficAlerts(fresh);
          setLastUpdated(new Date());
        }
      } catch (fallbackErr) {
        console.log('Traffic fetch error:', fallbackErr);
      }
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

  if (trafficAlerts.length === 0) return null;

  const updatedText = lastUpdated
    ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Live';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Traffic Updates</Text>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{updatedText}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {trafficAlerts.map((traffic) => (
          <View key={traffic.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.indicator, { backgroundColor: getSeverityColor(traffic.severity, colors) }]}>
                <Ionicons name={getSeverityIcon(traffic.severity)} size={16} color="#fff" />
              </View>
              <Text style={styles.areaTag}>{traffic.area}</Text>
            </View>

            <View style={styles.content}>
              <Text style={styles.location} numberOfLines={1}>
                {traffic.location}
              </Text>
              <Text style={styles.description} numberOfLines={2}>
                {traffic.description}
              </Text>
              <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(traffic.severity, colors) + '20' }]}>
                <Text style={[styles.severityText, { color: getSeverityColor(traffic.severity, colors) }]}>
                  {traffic.severity.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: { marginBottom: 20 },
  loadingContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, marginBottom: 20,
  },
  loadingText: { fontSize: 13, color: colors.textSecondary },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, marginBottom: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  scrollContent: { paddingHorizontal: 16, gap: 12 },
  card: {
    width: 200, backgroundColor: colors.cardBackground,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  indicator: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 16, fontFamily: '' },
  areaTag: {
    fontSize: 10, fontWeight: 'bold', color: colors.primary,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  content: { gap: 6 },
  location: { fontSize: 14, fontWeight: 'bold', color: colors.text },
  description: { fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
  severityBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 6, marginTop: 4,
  },
  severityText: { fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  liveText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
});
