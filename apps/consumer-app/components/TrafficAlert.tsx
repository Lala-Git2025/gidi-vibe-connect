import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native';
import { useTheme, polished } from '../contexts/ThemeContext';
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

// Polished severity styling — three visual tiers (heavy / slow / free).
const POLISHED_SEV: Record<
  TrafficData['severity'],
  { tint: string; color: string; dot: string; label: string }
> = {
  critical: { tint: 'rgba(239,68,68,0.18)',  color: '#FCA5A5', dot: '#EF4444', label: 'Heavy' },
  heavy:    { tint: 'rgba(239,68,68,0.18)',  color: '#FCA5A5', dot: '#EF4444', label: 'Heavy' },
  moderate: { tint: 'rgba(249,115,22,0.18)', color: '#FB923C', dot: '#F97316', label: 'Slow'  },
  light:    { tint: 'rgba(16,185,129,0.18)', color: '#34D399', dot: '#10B981', label: 'Free'  },
};

// Shared blink animation — drives the severity-dot pulse on every card.
const usePulse = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return pulse;
};

export const TrafficAlert = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const pulse = usePulse();
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

  // Live indicator (matches the polished VibeCheck "Live · ..." pattern).
  const updatedText = lastUpdated
    ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
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

      {/* Polished horizontal rail — shows every route, scrolls sideways. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {trafficAlerts.map((traffic) => {
          const s = POLISHED_SEV[traffic.severity];
          return (
            <TouchableOpacity key={traffic.id} style={styles.card} activeOpacity={0.85}>
              <View style={styles.cardHeader}>
                <View style={[styles.tile, { backgroundColor: s.tint }]}>
                  <Ionicons name={getSeverityIcon(traffic.severity)} size={18} color={s.color} />
                  <Animated.View
                    style={[
                      styles.tileDot,
                      { backgroundColor: s.dot, shadowColor: s.dot, opacity: pulse },
                    ]}
                  />
                </View>
                <View style={styles.areaPill}>
                  <Text style={styles.areaPillText}>{traffic.area}</Text>
                </View>
              </View>
              <Text style={styles.location} numberOfLines={1}>{traffic.location}</Text>
              <Text style={styles.description} numberOfLines={2}>
                {traffic.description}
              </Text>
              <View style={[styles.severityBadge, { backgroundColor: s.tint }]}>
                <Text style={[styles.severityLabel, { color: s.color }]}>{s.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  liveIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
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
  // Horizontal rail
  railContent: {
    paddingHorizontal: 18, gap: 12,
  },
  card: {
    width: 220,
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
  location: {
    fontSize: 14, fontWeight: '800', color: colors.text,
  },
  description: {
    fontSize: 12, color: colors.textSecondary,
    marginTop: 4, lineHeight: 16,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 6, marginTop: 10,
  },
  severityLabel: {
    fontSize: 10, fontWeight: '900',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
});
