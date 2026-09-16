import { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { type as T, space as S, radius as R, gutter, tracking } from '../theme/tokens';

export interface ReadableNews {
  id: string;
  /** Gidi's headline where one exists, otherwise the original. */
  title: string;
  /** Gidi's brief. Null until the editor agent has reached this story. */
  brief?: string | null;
  /** The scraper's 150-character snippet — the fallback while brief is null. */
  summary?: string | null;
  categoryLabel: string;
  featured_image_url?: string;
  publish_date: string;
  sourceName: string;
  external_url?: string;
  timeLabel: string;
}

interface Props {
  item: ReadableNews | null;
  onClose: () => void;
}

/**
 * The story, read here. Was a tap that threw the user into a browser.
 *
 * What's shown is Gidi's brief, credited to the publisher. The original is
 * still reachable — a small line at the very end — because the credit should
 * be real, not decorative, and because a reader who wants the full piece has
 * every right to it. It is simply no longer the only way to read anything.
 */
export const NewsReader = ({ item, onClose }: Props) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  // A publisher image that 404s or refuses the hotlink would otherwise leave
  // a blank block the height of a 16:10 photo above the headline. Hide it
  // and let the headline take the top instead. Reset per story.
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => { setImageFailed(false); }, [item?.id]);

  if (!item) return null;

  const briefed = !!item.brief;
  const showImage = !!item.featured_image_url && !imageFailed;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.sheet} edges={['top']}>
        <View style={styles.bar}>
          <Text style={styles.barTitle}>GIDI NEWS</Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {showImage && (
            <Image
              source={{ uri: item.featured_image_url }}
              style={styles.hero}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
          )}

          <View style={styles.metaRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{item.categoryLabel.toUpperCase()}</Text>
            </View>
            <Text style={styles.time}>{item.timeLabel}</Text>
          </View>

          <Text style={styles.headline}>{item.title}</Text>

          {briefed ? (
            <Text style={styles.brief}>{item.brief}</Text>
          ) : (
            <>
              {!!item.summary && <Text style={styles.brief}>{item.summary}</Text>}
              <Text style={styles.pending}>
                Gidi's brief for this story is on its way — it's written within the hour of a story landing.
              </Text>
            </>
          )}

          <View style={styles.rule} />

          <Text style={styles.credit}>
            {briefed ? 'Briefed by Gidi from ' : 'From '}
            <Text style={styles.creditSource}>{item.sourceName}</Text>
          </Text>

          {!!item.external_url && (
            <TouchableOpacity
              style={styles.original}
              onPress={() => Linking.openURL(item.external_url!).catch(() => {})}
              accessibilityRole="link"
              accessibilityLabel={`Read the original at ${item.sourceName}`}
            >
              <Text style={styles.originalText}>Read the original</Text>
              <Ionicons name="open-outline" size={13} color={colors.textFaint} />
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  barTitle: {
    fontSize: T.xs,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: tracking.label + 1,
  },
  content: { paddingBottom: S.giant },

  hero: { width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.surfaceRaised },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    marginTop: S.xl,
  },
  chip: {
    backgroundColor: `${colors.primary}1F`,
    paddingHorizontal: S.sm,
    paddingVertical: S.xs,
    borderRadius: R.sm,
  },
  chipText: {
    fontSize: T.xs,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: tracking.label,
  },
  time: { fontSize: T.xs, fontWeight: '600', color: colors.textFaint },

  headline: {
    fontSize: T.xl,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: tracking.tight,
    lineHeight: T.xl * 1.2,
    paddingHorizontal: gutter,
    marginTop: S.md,
  },
  brief: {
    fontSize: T.md,
    color: colors.text,
    lineHeight: T.md * 1.6,
    paddingHorizontal: gutter,
    marginTop: S.lg,
  },
  pending: {
    fontSize: T.sm,
    color: colors.textFaint,
    lineHeight: T.sm * 1.5,
    paddingHorizontal: gutter,
    marginTop: S.md,
    fontStyle: 'italic',
  },

  rule: { height: 1, backgroundColor: colors.line, marginHorizontal: gutter, marginTop: S.xxl },

  credit: { fontSize: T.sm, color: colors.textMuted, paddingHorizontal: gutter, marginTop: S.lg },
  creditSource: { fontWeight: '700', color: colors.text },

  original: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: gutter,
    marginTop: S.sm,
  },
  originalText: { fontSize: T.xs, color: colors.textFaint, fontWeight: '600' },
});
