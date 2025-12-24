import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

interface NewsArticle {
  id: string;
  title: string;
  summary?: string;
  category: string;
  publish_date: string;
  external_url?: string;
  featured_image_url?: string;
  source?: string;
}

export default function NewsScreen() {
  const { data: news = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('is_active', true)
        .order('publish_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data as NewsArticle[]) || [];
    },
    refetchInterval: 3 * 60 * 60 * 1000, // Auto-refresh every 3 hours
    refetchIntervalInBackground: true, // Continue refreshing even when app is in background
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const sanitizeUrl = (url: string) => {
    if (!url) return null;
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return null;
  };

  const handleOpenArticle = (url: string) => {
    const safeUrl = sanitizeUrl(url);
    if (safeUrl) {
      Linking.openURL(safeUrl).catch((err) => console.error('Failed to open URL:', err));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>GIDI News</Text>
          <Text style={styles.subtitle}>Stay updated with the latest from Lagos</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScrollContent}
          style={styles.horizontalScroll}
        >
          {[...Array(5)].map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#EAB308" />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>GIDI News</Text>
            <Text style={styles.subtitle}>Latest from Lagos</Text>
          </View>
          <TouchableOpacity onPress={() => refetch()} style={styles.refreshButton} disabled={isRefetching}>
            <Text style={[styles.refreshIcon, isRefetching && styles.refreshIconSpinning]}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {news.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📰</Text>
          <Text style={styles.emptyText}>No news articles found.</Text>
          <TouchableOpacity style={styles.refreshTextButton} onPress={() => refetch()}>
            <Text style={styles.refreshTextButtonText}>Try refreshing</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScrollContent}
          style={styles.horizontalScroll}
        >
          {news.map((article) => {
            const safeUrl = sanitizeUrl(article.external_url || '');

            return (
              <TouchableOpacity
                key={article.id}
                style={styles.newsCard}
                onPress={() => safeUrl && handleOpenArticle(safeUrl)}
                disabled={!safeUrl}
              >
                <View style={styles.imageContainer}>
                  <Image
                    source={{
                      uri: article.featured_image_url || 'https://images.unsplash.com/photo-1568822617270-2e2b9c7c7a1e?w=800&q=80'
                    }}
                    style={styles.newsImage}
                    resizeMode="cover"
                  />
                </View>

                <View style={styles.newsContent}>
                  <Text style={styles.newsTitle} numberOfLines={3}>
                    {article.title}
                  </Text>

                  {article.summary && (
                    <Text style={styles.newsSummary} numberOfLines={3}>
                      {article.summary}
                    </Text>
                  )}

                  <View style={styles.newsFooter}>
                    <Text style={styles.newsDate}>{formatDate(article.publish_date)}</Text>
                    {article.source && (
                      <Text style={styles.newsSource} numberOfLines={1}>
                        {article.source}
                      </Text>
                    )}
                  </View>

                  {safeUrl && (
                    <View style={styles.linkIndicator}>
                      <Text style={styles.linkIcon}>↗</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTextContainer: { flex: 1 },
  title: { color: '#fff', fontSize: 30, fontWeight: '700' as const, marginBottom: 8 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiPoweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  aiIcon: { fontSize: 12 },
  aiText: { color: '#EAB308', fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
  subtitle: { color: '#9ca3af', fontSize: 12 },
  refreshButton: { padding: 8 },
  refreshIcon: { fontSize: 20 },
  refreshIconSpinning: { opacity: 0.5 },
  loadingContainer: { paddingHorizontal: 20 },
  horizontalScroll: {
    marginBottom: 20,
  },
  horizontalScrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  newsCard: {
    width: width * 0.85,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageContainer: { position: 'relative' as const, height: 200 },
  newsImage: { width: '100%', height: '100%' },
  categoryBadge: {
    position: 'absolute' as const,
    top: 8,
    left: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' as const },
  newsContent: { padding: 12 },
  newsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 6,
    lineHeight: 18,
  },
  newsSummary: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  newsFooter: { marginTop: 4 },
  newsDate: { color: '#6b7280', fontSize: 11, marginBottom: 2 },
  newsSource: { color: '#9ca3af', fontSize: 11, fontWeight: '500' as const },
  linkIndicator: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    backgroundColor: 'rgba(234, 179, 8, 0.9)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkIcon: { color: '#000', fontSize: 12, fontWeight: '700' as const },
  skeletonCard: {
    width: width * 0.85,
    height: 320,
    backgroundColor: '#1f2937',
    borderRadius: 12,
  },
  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { color: '#9ca3af', fontSize: 16, marginBottom: 16, textAlign: 'center' as const },
  refreshTextButton: { marginTop: 8 },
  refreshTextButtonText: { color: '#EAB308', fontSize: 14, fontWeight: '600' as const },
});
