import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../config/supabase';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  external_url?: string;
  featured_image_url?: string;
  publish_date: string;
  source?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL   = 60 * 60 * 1000; // auto-refresh every 1 hour
const MAX_AGE_HOURS      = 24;              // show news from last 24 hours
const BREAKING_AGE_HOURS = 3;              // articles < 3 h old = "Breaking"

// Map hostnames → readable source names
const SOURCE_MAP: Record<string, string> = {
  'punchng.com':          'The Punch',
  'premiumtimesng.com':   'Premium Times',
  'bellanaija.com':       'BellaNaija',
  'lindaikejisblog.com':  'Linda Ikeji Blog',
  'pulse.ng':             'Pulse Nigeria',
  'legit.ng':             'Legit.ng',
  'informationng.com':    'Info Nigeria',
  '36ng.ng':              '36NG',
  'vanguardngr.com':      'Vanguard',
  'guardian.ng':          'The Guardian',
  'thecable.ng':          'The Cable',
  'dailypost.ng':         'Daily Post',
  'instablog9ja.com':     'Instablog9ja',
  'notjustok.com':        'NotJustOK',
  'thenationonlineng.net':'The Nation',
  'channelstv.com':       'Channels TV',
  'thisdaylive.com':      'ThisDay',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSourceName(source: string | undefined, url: string | undefined): string {
  if (source && source !== 'AI Agent' && source !== 'Unknown Source') return source;
  if (!url) return 'Lagos News';
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return SOURCE_MAP[host] || host;
  } catch {
    return 'Lagos News';
  }
}

function hoursAgo(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

function formatDate(dateString: string): string {
  const diffMs   = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs  = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs  < 24) return `${diffHrs}h ago`;
  if (diffDays <  7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function areTitlesSimilar(t1: string, t2: string): boolean {
  const w1 = new Set(t1.split(' ').filter(w => w.length > 3));
  const w2 = new Set(t2.split(' ').filter(w => w.length > 3));
  if (!w1.size || !w2.size) return false;
  let common = 0;
  for (const w of w1) if (w2.has(w)) common++;
  return common / Math.min(w1.size, w2.size) >= 0.7;
}

function deduplicateNews(articles: NewsItem[]): NewsItem[] {
  const out: NewsItem[] = [];
  const seen = new Set<string>();
  for (const a of articles) {
    const norm = normalizeTitle(a.title);
    let dup = false;
    for (const s of seen) {
      if (areTitlesSimilar(norm, s)) {
        dup = true;
        const idx = out.findIndex(x => normalizeTitle(x.title) === s);
        if (idx !== -1 && a.featured_image_url && !out[idx].featured_image_url) {
          out[idx] = a; seen.delete(s); seen.add(norm);
        }
        break;
      }
    }
    if (!dup) { out.push(a); seen.add(norm); }
  }
  return out;
}

function isValidUrl(url: string | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return url.startsWith('http') &&
    !lower.includes('example.com') &&
    !lower.includes('localhost') &&
    !lower.includes('test.com') &&
    !lower.includes('placeholder');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewsScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const styles = getStyles(colors);

  const [news, setNews]                 = useState<NewsItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);

  const categories = ['All', 'general', 'nightlife', 'events', 'traffic', 'food'];

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchNews = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
      const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('news')
        .select('id, title, summary, category, external_url, featured_image_url, publish_date, source')
        .not('external_url', 'is', null)
        .gte('publish_date', cutoff)          // last 24 hours
        .order('publish_date', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[News] fetch error:', error);
        // Keep existing news on error rather than clearing
        return;
      }

      const valid = (data || []).filter(item => isValidUrl(item.external_url));
      const deduped = deduplicateNews(valid).slice(0, 30);
      setNews(deduped);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[News] unexpected error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(() => fetchNews(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const filtered = news.filter(item =>
    activeCategory === 'All' ||
    item.category.toLowerCase() === activeCategory.toLowerCase()
  );

  const breaking = filtered.filter(item => hoursAgo(item.publish_date) <= BREAKING_AGE_HOURS);
  const latest   = filtered.filter(item => hoursAgo(item.publish_date) >  BREAKING_AGE_HOURS);

  const openArticle = (url?: string) => {
    if (url) Linking.openURL(url).catch(() => alert('Could not open article'));
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchNews(true)} tintColor={colors.primary} />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>GIDI NEWS</Text>
          <Ionicons name="newspaper" size={22} color={colors.text} />
        </View>

        {/* ── Title bar ── */}
        <View style={styles.titleSection}>
          <View style={styles.liveRow}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            {lastUpdated && (
              <Text style={styles.lastUpdatedText}>
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · hourly
              </Text>
            )}
          </View>
          <Text style={styles.title}>Latest Lagos News</Text>
          <Text style={styles.subtitle}>Last 24 hours from top Nigerian sources</Text>
        </View>

        {/* ── Categories ── */}
        <View style={styles.categoriesSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryBtn, activeCategory === cat && styles.categoryBtnActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.categoryBtnText, activeCategory === cat && styles.categoryBtnTextActive]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : filtered.length === 0 ? (
          /* ── Empty state ── */
          <View style={styles.emptyState}>
            <Ionicons name="mail-open-outline" size={52} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No recent news</Text>
            <Text style={styles.emptySubtitle}>
              Pull down to refresh, or check back soon.{'\n'}
              News updates every hour from Pulse, The Punch, BellaNaija and more.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Breaking News ── */}
            {breaking.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.breakingBadge}>
                    <View style={styles.breakingDot} />
                    <Text style={styles.breakingLabel}>BREAKING</Text>
                  </View>
                  <Text style={styles.sectionCount}>{breaking.length} stories</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breakingScroll}>
                  {breaking.map(article => (
                    <TouchableOpacity
                      key={article.id}
                      style={styles.breakingCard}
                      onPress={() => openArticle(article.external_url)}
                      activeOpacity={0.85}
                    >
                      {article.featured_image_url ? (
                        <Image source={{ uri: article.featured_image_url }} style={styles.breakingImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.breakingImage, styles.breakingImageFallback]}>
                          <Ionicons name="newspaper" size={40} color={colors.textSecondary} />
                        </View>
                      )}
                      {/* Overlay */}
                      <View style={styles.breakingOverlay} />
                      {/* Badges */}
                      <View style={styles.breakingTop}>
                        <View style={styles.breakingRedBadge}>
                          <Text style={styles.breakingRedText}>BREAKING</Text>
                        </View>
                        <Text style={styles.breakingTime}>{formatDate(article.publish_date)}</Text>
                      </View>
                      {/* Content */}
                      <View style={styles.breakingBottom}>
                        <View style={styles.breakingCatBadge}>
                          <Text style={styles.breakingCatText}>{article.category.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.breakingTitle} numberOfLines={3}>{article.title}</Text>
                        <Text style={styles.breakingSource}>
                          {getSourceName(article.source, article.external_url)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Latest News ── */}
            {latest.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Latest News</Text>
                  <Text style={styles.sectionCount}>{latest.length} articles</Text>
                </View>
                {latest.map(article => (
                  <TouchableOpacity
                    key={article.id}
                    style={styles.latestCard}
                    onPress={() => openArticle(article.external_url)}
                    activeOpacity={0.8}
                  >
                    {/* Thumbnail */}
                    {article.featured_image_url ? (
                      <Image source={{ uri: article.featured_image_url }} style={styles.latestThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.latestThumb, styles.latestThumbFallback]}>
                        <Ionicons name="newspaper" size={32} color={colors.textSecondary} />
                      </View>
                    )}

                    {/* Text */}
                    <View style={styles.latestContent}>
                      <View style={styles.latestMeta}>
                        <Text style={styles.latestCat}>{article.category.toUpperCase()}</Text>
                        <Text style={styles.latestTime}>{formatDate(article.publish_date)}</Text>
                      </View>
                      <Text style={styles.latestTitle} numberOfLines={2}>{article.title}</Text>
                      <Text style={styles.latestSource} numberOfLines={1}>
                        {getSourceName(article.source, article.external_url)} · Read more →
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (colors: any) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  scrollView:  { flex: 1 },
  loader:      { marginTop: 48 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton:  { fontSize: 24, color: colors.primary, fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary, letterSpacing: 1.5 },
  headerIcon:  { fontSize: 20 },

  // Title
  titleSection: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14 },
  liveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  liveText: { fontSize: 12, fontWeight: 'bold', color: colors.error, letterSpacing: 1 },
  lastUpdatedText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  title: { fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: 2 },
  subtitle: { fontSize: 13, color: colors.textSecondary },

  // Categories
  categoriesSection: { marginBottom: 20 },
  categoriesContent: { paddingHorizontal: 16, gap: 8 },
  categoryBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
  },
  categoryBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  categoryBtnTextActive: { color: '#000', fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  // Section wrappers
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  sectionCount: { fontSize: 12, color: colors.textSecondary },

  // Breaking badge in section header
  breakingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breakingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  breakingLabel: { fontSize: 16, fontWeight: 'bold', color: '#EF4444', letterSpacing: 0.5 },

  // Breaking cards (horizontal scroll)
  breakingScroll: { paddingHorizontal: 16, gap: 12 },
  breakingCard: {
    width: 280,
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
  },
  breakingImage: { width: '100%', height: '100%', position: 'absolute' },
  breakingImageFallback: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakingImageFallbackText: { fontSize: 48 },
  breakingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  breakingTop: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakingRedBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  breakingRedText: { fontSize: 10, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  breakingTime: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  breakingBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    gap: 6,
  },
  breakingCatBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  breakingCatText: { fontSize: 9, fontWeight: 'bold', color: '#000' },
  breakingTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', lineHeight: 22 },
  breakingSource: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  // Latest news (compact list)
  latestCard: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  latestThumb: { width: 90, height: 90, borderRadius: 12 },
  latestThumbFallback: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  latestThumbIcon: { fontSize: 28 },
  latestContent: { flex: 1, gap: 4 },
  latestMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  latestCat: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.primary,
    backgroundColor: colors.primary + '22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  latestTime: { fontSize: 11, color: colors.textSecondary },
  latestTitle: { fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 20 },
  latestSource: { fontSize: 11, color: colors.textSecondary },
});
