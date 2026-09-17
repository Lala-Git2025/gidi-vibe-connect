import { useState, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { type as T, space as S, radius as R, gutter, tracking } from '../theme/tokens';
import { LAGOS_AREAS } from '../lib/areas';
import {
  useSearch, useRecentSearches, MIN_QUERY_LENGTH, PER_GROUP,
  type SearchResult, type SearchGroup, type ResultKind,
} from '../lib/search';

/**
 * Search across everything the app holds.
 *
 * Home's search bar previously navigated to Explore with no params — a control
 * labelled "Search venues, areas…" that searched nothing and filtered nothing.
 * This is the screen it should have been opening: a text field that queries
 * venues, Lagos areas, events, Gidi News and people at once, groups the hits by
 * what they are, and opens each one where it actually lives.
 *
 * Empty state is deliberate. A blank field with a blinking cursor tells the
 * user nothing about what is searchable, so before a query is typed the screen
 * shows recent searches and the areas themselves — both are one tap to a real
 * destination, so the screen is useful even to someone who types nothing.
 */

/**
 * One hue family per result kind, not neighbouring shades of gold.
 *
 * The light palette resolves `warning` and `primary` to the same `#A16207`,
 * which is how two ladder steps in the traffic work ended up rendering
 * identically. These five are gold / blue / rose / grey / green — distinct in
 * both themes, and distinguishable without relying on the colour alone, since
 * every row also carries its own icon and a group heading.
 */
const KIND_TONE: Record<ResultKind, string> = {
  venue: 'primary',
  area: 'info',
  event: 'hot',
  news: 'textMuted',
  person: 'success',
};

/** Shown before anything is typed — one tap each, no query required. */
const QUICK_CATEGORIES: Array<{ label: string; icon: keyof typeof Ionicons.glyphMap; category: string }> = [
  { label: 'Bars',        icon: 'wine',           category: 'Bar' },
  { label: 'Restaurants', icon: 'restaurant',     category: 'Restaurant' },
  { label: 'Nightlife',   icon: 'musical-notes',  category: 'Club' },
  { label: 'Beach clubs', icon: 'sunny',          category: 'Beach Club' },
];

export default function SearchScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const styles = getStyles(colors);

  const [query, setQuery] = useState('');
  /** Groups the user has asked to see in full, reset whenever the query does. */
  const [expanded, setExpanded] = useState<ResultKind[]>([]);
  const inputRef = useRef<TextInput>(null);

  const { groups, loading, total } = useSearch(query);
  const { recent, remember, clear } = useRecentSearches();

  // Raise the keyboard when arriving at an empty field — the user tapped a
  // search bar, so typing is the only reason they are here. When results are
  // already on screen (coming back from a venue, say) leave it down rather
  // than covering what they came back to look at.
  useFocusEffect(
    useCallback(() => {
      if (query.trim().length === 0) {
        const timer = setTimeout(() => inputRef.current?.focus(), 250);
        return () => clearTimeout(timer);
      }
    }, [query]),
  );

  // A new query invalidates any "show more" the user did against the old one.
  const onChangeQuery = (next: string) => {
    setQuery(next);
    setExpanded([]);
  };

  const open = (result: SearchResult) => {
    remember(query);
    Keyboard.dismiss();
    (navigation as any).navigate(result.screen, result.params);
  };

  const openOverflow = (group: SearchGroup) => {
    if (!group.overflow) return;
    remember(query);
    Keyboard.dismiss();
    (navigation as any).navigate(group.overflow.screen, group.overflow.params);
  };

  const typed = query.trim().length >= MIN_QUERY_LENGTH;
  const showEmptyState = !typed;
  const noMatches = typed && !loading && total === 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />

      {/* ── Search field ─────────────────────────────────────────────────── */}
      {/* The field is the header. A separate title bar above it would push the
          one control on the screen further from the thumb for no gain. */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.field}>
          <Ionicons name="search" size={17} color={colors.textFaint} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Venues, areas, events, news, people"
            placeholderTextColor={colors.textFaint}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => remember(query)}
            accessibilityLabel="Search Gidi Connect"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => { onChangeQuery(''); inputRef.current?.focus(); }}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={17} color={colors.textFaint} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: S.giant }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* ── Before anything is typed ───────────────────────────────────── */}
        {showEmptyState && (
          <>
            {recent.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionLabel}>Recent</Text>
                  <TouchableOpacity
                    onPress={clear}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear recent searches"
                  >
                    <Text style={styles.sectionAction}>Clear</Text>
                  </TouchableOpacity>
                </View>
                {recent.map(term => (
                  <TouchableOpacity
                    key={term}
                    style={styles.recentRow}
                    onPress={() => onChangeQuery(term)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Search again for ${term}`}
                  >
                    <Ionicons name="time-outline" size={17} color={colors.textFaint} />
                    <Text style={styles.recentText} numberOfLines={1}>{term}</Text>
                    <Ionicons name="arrow-up-outline" size={15} color={colors.textFaint} style={styles.recentArrow} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionLabel}>Browse by category</Text>
              </View>
              <View style={styles.chipWrap}>
                {QUICK_CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.label}
                    style={styles.chip}
                    onPress={() => (navigation as any).navigate('Explore', { category: c.category })}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Browse ${c.label}`}
                  >
                    <Ionicons name={c.icon} size={15} color={colors.primary} />
                    <Text style={styles.chipText}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionLabel}>Browse by area</Text>
              </View>
              <View style={styles.chipWrap}>
                {LAGOS_AREAS.slice(0, 10).map(area => (
                  <TouchableOpacity
                    key={area.id}
                    style={styles.chip}
                    onPress={() => (navigation as any).navigate('ExploreArea', { area: area.id })}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Browse venues in ${area.name}`}
                  >
                    <Ionicons name={area.icon} size={15} color={colors.info} />
                    <Text style={styles.chipText}>{area.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ── Working ────────────────────────────────────────────────────── */}
        {typed && loading && total === 0 && (
          <View style={styles.centred}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {/* ── Nothing found ──────────────────────────────────────────────── */}
        {noMatches && (
          <View style={styles.centred}>
            <Ionicons name="search-outline" size={30} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>No matches for “{query.trim()}”</Text>
            <Text style={styles.emptyBody}>
              Try a venue name, a Lagos area like Lekki or Yaba, or a category
              such as lounge or rooftop.
            </Text>
          </View>
        )}

        {/* ── Results ────────────────────────────────────────────────────── */}
        {typed && groups.map(group => {
          const isExpanded = expanded.includes(group.kind);
          const shown = isExpanded ? group.results : group.results.slice(0, PER_GROUP);
          const hidden = group.total - shown.length;

          return (
          <View key={group.kind} style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>{group.label}</Text>
              <Text style={styles.sectionCount}>{group.total}</Text>
            </View>

            {shown.map(result => (
              <TouchableOpacity
                key={`${result.kind}:${result.id}`}
                style={styles.row}
                onPress={() => open(result)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${result.title}. ${result.subtitle}`}
              >
                <View style={styles.rowIcon}>
                  <Ionicons
                    name={result.icon}
                    size={17}
                    color={(colors as any)[KIND_TONE[result.kind]]}
                  />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{result.title}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>{result.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
              </TouchableOpacity>
            ))}

            {/* Two ways to reach the rest, and the group always has one of
                them. Where a screen can hold the whole filtered list, go there;
                otherwise reveal them here rather than printing a count of
                results the user cannot get to. */}
            {hidden > 0 && group.overflow && (
              <TouchableOpacity
                style={styles.moreRow}
                onPress={() => openOverflow(group)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Show all ${group.total} ${group.label.toLowerCase()}`}
              >
                <Text style={styles.moreText}>
                  Show all {group.total} {group.label.toLowerCase()}
                </Text>
                <Ionicons name="arrow-forward" size={15} color={colors.primary} />
              </TouchableOpacity>
            )}

            {hidden > 0 && !group.overflow && (
              <TouchableOpacity
                style={styles.moreRow}
                onPress={() => setExpanded(prev => [...prev, group.kind])}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Show ${hidden} more ${group.label.toLowerCase()}`}
              >
                <Text style={styles.moreText}>Show {hidden} more</Text>
                <Ionicons name="chevron-down" size={15} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centred: { alignItems: 'center', paddingTop: S.huge, paddingHorizontal: S.xxxl, gap: S.sm },

  // ── Header field ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingHorizontal: gutter,
    paddingVertical: S.md,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    // Vertical padding on iOS only: Android TextInput carries its own.
    paddingVertical: S.sm,
  },
  input: {
    flex: 1,
    fontSize: T.base,
    color: colors.text,
    padding: 0,
  },

  // ── Sections ──
  section: { paddingHorizontal: gutter, marginBottom: S.xxl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: S.md,
  },
  // Vertical rhythm lives on `sectionHead`, never on the labels inside it —
  // a margin on both stacks two gaps wherever a section has a trailing action.
  sectionLabel: {
    fontSize: T.xs,
    fontWeight: '700',
    color: colors.textFaint,
    letterSpacing: tracking.label,
    textTransform: 'uppercase',
  },
  sectionCount: { fontSize: T.xs, fontWeight: '700', color: colors.textFaint },
  sectionAction: { fontSize: T.sm, fontWeight: '700', color: colors.primary },

  // ── Result row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: R.md,
    padding: S.md,
    marginBottom: S.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: T.base, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: T.sm, color: colors.textMuted, marginTop: 1 },

  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    paddingVertical: S.md,
  },
  moreText: { fontSize: T.sm, fontWeight: '700', color: colors.primary },

  // ── Recent ──
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  recentText: { flex: 1, fontSize: T.base, color: colors.text },
  recentArrow: { transform: [{ rotate: '45deg' }] },

  // ── Chips ──
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: R.full,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
  },
  chipText: { fontSize: T.sm, fontWeight: '600', color: colors.text },

  // ── Empty ──
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyBody: {
    fontSize: T.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: T.sm * 1.5,
  },
});
