import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

// Hardcoded icon map for seeded communities
const COMMUNITY_ICON_MAP: Record<string, string> = {
  'Nightlife Lagos':    '\u{1F319}',
  'Restaurant Reviews': '\u{1F37D}',
  'Events & Concerts':  '\u{1F3B5}',
  'Island Vibes':       '\u{1F3DD}',
  'Mainland Connect':   '\u{1F3D9}',
  'Foodies United':     '\u{1F355}',
  'Party People':       '\u{1F389}',
  'Culture & Arts':     '\u{1F3A8}',
};

interface Community {
  id: string;
  name: string;
  description: string;
  icon: string;
  color?: string;
  member_count: number;
  is_joined?: boolean;
}

export type DrawerView = 'feed' | 'community' | 'people';

interface SocialDrawerProps {
  visible: boolean;
  onClose: () => void;
  communities: Community[];
  joinedCommunities: Community[];
  onSelectFeed: () => void;
  onSelectCommunity: (community: Community) => void;
  onSelectPeople: () => void;
  onCreateCommunity: () => void;
  currentView: DrawerView;
  selectedCommunityId: string | null;
  avatarUrl: string | null;
  userName: string;
  slideAnim: Animated.Value;
}

const COLOR_PALETTE = [
  '#4338CA', '#1D4ED8', '#0891B2', '#059669', '#D97706',
  '#EA580C', '#DC2626', '#DB2777', '#7C3AED', '#475569',
];

export const SocialDrawer = ({
  visible,
  onClose,
  communities,
  joinedCommunities,
  onSelectFeed,
  onSelectCommunity,
  onSelectPeople,
  onCreateCommunity,
  currentView,
  selectedCommunityId,
  avatarUrl,
  userName,
  slideAnim,
}: SocialDrawerProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [showAllCommunities, setShowAllCommunities] = useState(false);

  const getCommunityColor = (community: Community): string => {
    if (community.color) return community.color;
    const hash = community.name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return COLOR_PALETTE[hash % COLOR_PALETTE.length];
  };

  if (!visible) return null;

  const styles = getStyles(colors, insets);

  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* User header */}
          <View style={styles.userSection}>
            <View style={styles.userAvatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.userAvatarImg} />
              ) : (
                <Ionicons name="person" size={24} color={colors.textSecondary} />
              )}
            </View>
            <Text style={styles.userName} numberOfLines={1}>{userName || 'Guest'}</Text>
          </View>

          <View style={styles.divider} />

          {/* Main Navigation */}
          <TouchableOpacity
            style={[styles.navItem, currentView === 'feed' && !selectedCommunityId && styles.navItemActive]}
            onPress={() => { onSelectFeed(); onClose(); }}
          >
            <Ionicons name="home" size={22} color={currentView === 'feed' && !selectedCommunityId ? colors.primary : colors.text} />
            <Text style={[styles.navItemText, currentView === 'feed' && !selectedCommunityId && styles.navItemTextActive]}>Home Feed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, currentView === 'people' && styles.navItemActive]}
            onPress={() => { onSelectPeople(); onClose(); }}
          >
            <Ionicons name="people" size={22} color={currentView === 'people' ? colors.primary : colors.text} />
            <Text style={[styles.navItemText, currentView === 'people' && styles.navItemTextActive]}>People</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Joined Communities */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>YOUR COMMUNITIES</Text>
            <TouchableOpacity onPress={onCreateCommunity} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {joinedCommunities.length === 0 ? (
            <Text style={styles.emptyHint}>Join communities to see them here</Text>
          ) : (
            joinedCommunities.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.communityItem, selectedCommunityId === c.id && styles.navItemActive]}
                onPress={() => { onSelectCommunity(c); onClose(); }}
              >
                <View style={[styles.communityDot, { backgroundColor: getCommunityColor(c) }]}>
                  <Text style={styles.communityDotIcon}>{COMMUNITY_ICON_MAP[c.name] ?? c.icon}</Text>
                </View>
                <Text style={[styles.communityItemName, selectedCommunityId === c.id && styles.navItemTextActive]} numberOfLines={1}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))
          )}

          <View style={styles.divider} />

          {/* All Communities (expandable) */}
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowAllCommunities(!showAllCommunities)}
          >
            <Text style={styles.sectionLabel}>ALL COMMUNITIES</Text>
            <Ionicons
              name={showAllCommunities ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showAllCommunities && communities.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.communityItem, selectedCommunityId === c.id && styles.navItemActive]}
              onPress={() => { onSelectCommunity(c); onClose(); }}
            >
              <View style={[styles.communityDot, { backgroundColor: getCommunityColor(c) }]}>
                <Text style={styles.communityDotIcon}>{COMMUNITY_ICON_MAP[c.name] ?? c.icon}</Text>
              </View>
              <View style={styles.communityItemInfo}>
                <Text style={[styles.communityItemName, selectedCommunityId === c.id && styles.navItemTextActive]} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.communityItemMembers}>
                  {c.member_count} {c.member_count === 1 ? 'member' : 'members'}
                </Text>
              </View>
              {c.is_joined && (
                <View style={styles.joinedBadge}>
                  <Text style={styles.joinedBadgeText}>Joined</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          <View style={styles.divider} />

          {/* Create Community */}
          <TouchableOpacity style={styles.navItem} onPress={() => { onCreateCommunity(); onClose(); }}>
            <Ionicons name="add" size={22} color={colors.primary} />
            <Text style={[styles.navItemText, { color: colors.primary }]}>Create a Community</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const getStyles = (colors: any, insets: any) => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: insets.top + 8,
  },
  // User section
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userAvatarImg: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  // Nav items
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  navItemActive: {
    backgroundColor: colors.cardBackground,
  },
  navItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  navItemTextActive: {
    color: colors.primary,
  },
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  // Community items
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 8,
  },
  communityDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityDotIcon: {
    fontSize: 16,
  },
  communityItemInfo: {
    flex: 1,
  },
  communityItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  communityItemMembers: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  joinedBadge: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  joinedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
});
