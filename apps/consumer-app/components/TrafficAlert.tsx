import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface TrafficData {
  id: string;
  location: string;
  severity: 'light' | 'moderate' | 'heavy' | 'critical';
  description: string;
  area: string;
}

const LAGOS_HOTSPOTS = [
  { location: 'Third Mainland Bridge', direction: 'Inward Island', area: 'Island' },
  { location: 'Eko Bridge', direction: 'Both Directions', area: 'Island' },
  { location: 'Carter Bridge', direction: 'Outward Mainland', area: 'Mainland' },
  { location: 'Ikorodu Road', direction: 'Ketu to Ojota', area: 'Mainland' },
  { location: 'Lekki-Epe Expressway', direction: 'Lekki to Ajah', area: 'Lekki' },
  { location: 'Apapa-Oshodi Expressway', direction: 'Both Directions', area: 'Mainland' },
  { location: 'Lagos-Ibadan Expressway', direction: 'Berger to Kara', area: 'Mainland' },
  { location: 'Ozumba Mbadiwe', direction: 'VI to Lekki', area: 'Island' },
  { location: 'Iyana-Ipaja', direction: 'Inward Ikeja', area: 'Mainland' },
  { location: 'Admiralty Way', direction: 'Both Directions', area: 'Lekki' },
  { location: 'Allen Avenue', direction: 'Ikeja', area: 'Mainland' },
  { location: 'Falomo Bridge', direction: 'Ikoyi to VI', area: 'Island' },
];

const generateTrafficAlerts = (): TrafficData[] => {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  const severityTexts = {
    light: 'Light traffic flow',
    moderate: 'Moderate traffic',
    heavy: 'Heavy gridlock',
    critical: 'Critical congestion'
  };

  const getSeverityForTime = () => {
    // Weekdays (Monday-Friday)
    if (day >= 1 && day <= 5) {
      // Morning rush (6am-10am) or Evening rush (4pm-8pm)
      if ((hour >= 6 && hour <= 10) || (hour >= 16 && hour <= 20)) {
        return Math.random() > 0.5 ? 'heavy' : 'critical';
      }
      // Midday (11am-3pm)
      else if (hour >= 11 && hour <= 15) {
        return Math.random() > 0.5 ? 'moderate' : 'heavy';
      }
      // Off-peak hours
      else {
        return Math.random() > 0.7 ? 'moderate' : 'light';
      }
    }
    // Weekends
    else {
      if (hour >= 14 && hour <= 20) {
        return Math.random() > 0.6 ? 'moderate' : 'light';
      } else {
        return 'light';
      }
    }
  };

  // Generate traffic for 4-6 random hotspots
  const numberOfAlerts = Math.floor(Math.random() * 3) + 4; // 4-6 alerts
  const shuffled = [...LAGOS_HOTSPOTS].sort(() => Math.random() - 0.5);
  const selectedHotspots = shuffled.slice(0, numberOfAlerts);

  return selectedHotspots.map((hotspot, index) => {
    const severity = getSeverityForTime() as 'light' | 'moderate' | 'heavy' | 'critical';

    return {
      id: `traffic-${Date.now()}-${index}`,
      location: hotspot.location,
      area: hotspot.area,
      severity,
      description: `${severityTexts[severity]} - ${hotspot.direction}`
    };
  });
};

const getSeverityColor = (severity: string, colors: any) => {
  switch (severity) {
    case 'critical': return colors.error;
    case 'heavy': return colors.error;
    case 'moderate': return colors.primary;
    case 'light': return colors.success;
    default: return colors.primary;
  }
};

const getSeverityEmoji = (severity: string) => {
  switch (severity) {
    case 'critical': return '🚨';
    case 'heavy': return '⚠️';
    case 'moderate': return '⚡';
    case 'light': return '✅';
    default: return '⚠️';
  }
};

export const TrafficAlert = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [trafficAlerts, setTrafficAlerts] = useState<TrafficData[]>([]);

  useEffect(() => {
    setTrafficAlerts(generateTrafficAlerts());

    // Update traffic every 5 minutes
    const interval = setInterval(() => {
      setTrafficAlerts(generateTrafficAlerts());
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (trafficAlerts.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚦 Live Traffic Updates</Text>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
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
                <Text style={styles.emoji}>{getSeverityEmoji(traffic.severity)}</Text>
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
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 200,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  indicator: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 16,
  },
  areaTag: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  content: {
    gap: 6,
  },
  location: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  severityText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
