import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useTheme, polished } from '../contexts/ThemeContext';
import { useStoryCreator } from '../contexts/StoryCreatorContext';
import { StoryViewer } from './StoryViewer';

interface StoryItem {
  id: string;
  user_id: string;
  image_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  created_at: string;
  expires_at: string;
  filter_effect: string;
  overlays: any[];
}

interface UserStoryGroup {
  user_id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  is_creator: boolean;
  stories: StoryItem[];
  has_unseen: boolean;
}

// Shared rotation driver — one looped Animated.Value powers every ring on
// screen, so we don't pay for N parallel animations.
const useRingRotation = () => {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);
  return rotation;
};

interface PolishedRingProps {
  kind: 'creator' | 'peer' | 'add';
  rotation: Animated.Value;
  seen: boolean;
  children: React.ReactNode;
}

// Animated ring: outer wrapper is static; only the gradient layer rotates
// inside it. The avatar is a sibling of the rotating layer, so the photo
// stays perfectly still while the ring spins around it.
const PolishedRing = ({ kind, rotation, seen, children }: PolishedRingProps) => {
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (kind === 'add') {
    return (
      <View style={ringBase.addRing}>
        {children}
      </View>
    );
  }

  if (seen) {
    return (
      <View style={[ringBase.ring, ringBase.ringSeen]}>
        <View style={ringBase.ringInner}>{children}</View>
      </View>
    );
  }

  const stops =
    kind === 'creator'
      ? (polished.creatorRingStops as readonly string[])
      : (polished.peerRingStops as readonly string[]);

  return (
    <View style={ringBase.ring}>
      {/* Rotating gradient layer — image is NOT inside this, so it stays still */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { transform: [{ rotate: spin }] }]}
      >
        <LinearGradient
          colors={stops as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      {/* Static avatar — sibling of the spinner, sits centered on top */}
      <View style={ringBase.ringInner}>
        {children}
      </View>
    </View>
  );
};

export const StorySection = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const ringRotation = useRingRotation();

  const { open: openStoryCreator } = useStoryCreator();

  const [userGroups, setUserGroups] = useState<UserStoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);

  useEffect(() => {
    initData();
  }, []);

  // Refetch when Home regains focus — picks up stories created from Profile.
  useFocusEffect(useCallback(() => {
    if (currentUserId !== null) fetchStories(currentUserId);
  }, [currentUserId]));

  const initData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    setCurrentUserId(uid);
    await fetchStories(uid);
  };

  const fetchStories = async (uid: string | null) => {
    try {
      setLoading(true);

      // 1. Fetch all active stories
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select('id, user_id, image_url, media_type, caption, created_at, expires_at, filter_effect, overlays')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (storiesError) {
        console.error('[Stories] fetch error:', storiesError);
        return;
      }

      if (!storiesData || storiesData.length === 0) {
        setUserGroups([]);
        return;
      }

      // 2. Fetch profiles for story authors
      const userIds = [...new Set(storiesData.map((s: any) => s.user_id as string))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url, role')
        .in('user_id', userIds);

      if (profilesError) console.warn('[Stories] profiles fetch warning:', profilesError);

      const profileMap = new Map(
        (profilesData || []).map((p: any) => [p.user_id as string, p])
      );

      // 3. Fetch which stories the current user has already seen
      let viewedSet = new Set<string>();
      if (uid) {
        const { data: viewsData, error: viewsError } = await supabase
          .from('story_views')
          .select('story_id')
          .eq('viewer_id', uid);
        if (viewsError) console.warn('[Stories] story_views fetch warning (table may not exist yet):', viewsError.message);
        viewedSet = new Set((viewsData || []).map((v: any) => v.story_id as string));
      }

      // 4. Group by user_id
      const groupMap = new Map<string, UserStoryGroup>();
      for (const story of storiesData as any[]) {
        const profile = profileMap.get(story.user_id);
        if (!groupMap.has(story.user_id)) {
          groupMap.set(story.user_id, {
            user_id: story.user_id,
            full_name: profile?.full_name?.trim() || profile?.username || 'User',
            username: profile?.username || null,
            avatar_url: profile?.avatar_url || null,
            is_creator: profile?.role === 'Creator',
            stories: [],
            has_unseen: false,
          });
        }
        const group = groupMap.get(story.user_id)!;
        group.stories.push({
          id: story.id,
          user_id: story.user_id,
          image_url: story.image_url,
          media_type: story.media_type || 'image',
          caption: story.caption,
          created_at: story.created_at,
          expires_at: story.expires_at,
          filter_effect: story.filter_effect || 'none',
          overlays: Array.isArray(story.overlays) ? story.overlays : [],
        });
        if (!viewedSet.has(story.id)) {
          group.has_unseen = true;
        }
      }

      // 5. Sort: own → unseen → seen
      const groups = Array.from(groupMap.values()).sort((a, b) => {
        if (a.user_id === uid) return -1;
        if (b.user_id === uid) return 1;
        if (a.has_unseen && !b.has_unseen) return -1;
        if (!a.has_unseen && b.has_unseen) return 1;
        return 0;
      });

      setUserGroups(groups);
    } catch (error) {
      console.error('[Stories] unexpected error in fetchStories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Picker + upload pipeline lives in StoryCreatorContext so Profile can reuse it.
  const handleCreateStory = () => {
    openStoryCreator({ onCreated: () => fetchStories(currentUserId) });
  };

  // ── Seen tracking ───────────────────────────────────────────────────────────

  const handleMarkSeen = async (storyId: string) => {
    if (!currentUserId) return;
    try {
      await supabase.from('story_views').insert({
        story_id: storyId,
        viewer_id: currentUserId,
      });
    } catch {
      // UNIQUE constraint violation = already seen — ignore
    }
  };

  const handleCloseViewer = () => {
    setSelectedGroupIndex(null);
    fetchStories(currentUserId);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── My Vibe ──
              If the signed-in user has an active story, the My Vibe tile
              IS that story (avatar + story ring, tap to view, small +
              overlay to add another). Otherwise it's the add button.
              Either way it's always the first tile. */}
          {(() => {
            const ownIdx = userGroups.findIndex((g) => g.user_id === currentUserId);
            if (ownIdx < 0) {
              return (
                <TouchableOpacity style={styles.storyItem} onPress={handleCreateStory}>
                  <PolishedRing kind="add" rotation={ringRotation} seen={false}>
                    <View style={styles.addInner}>
                      <Ionicons name="add" size={28} color={colors.primary} />
                    </View>
                  </PolishedRing>
                  <Text style={styles.label}>My Vibe</Text>
                </TouchableOpacity>
              );
            }
            const own = userGroups[ownIdx];
            return (
              <TouchableOpacity
                style={styles.storyItem}
                onPress={() => setSelectedGroupIndex(ownIdx)}
              >
                <View style={styles.ringWrap}>
                  <PolishedRing kind={own.is_creator ? 'creator' : 'peer'} rotation={ringRotation} seen={false}>
                    {own.avatar_url ? (
                      <Image source={{ uri: own.avatar_url }} style={styles.avatar} resizeMode="cover" />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarInitial}>
                          {own.full_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </PolishedRing>
                  {/* + overlay so tapping the ring views, tapping the + adds another */}
                  <TouchableOpacity
                    style={styles.addAnotherBadge}
                    onPress={handleCreateStory}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="add" size={14} color="#000" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.label} numberOfLines={1}>My Vibe</Text>
              </TouchableOpacity>
            );
          })()}

          {/* ── Other users' story groups (own already rendered above) ── */}
          {userGroups.map((group, idx) => {
            if (group.user_id === currentUserId) return null;
            const kind: 'creator' | 'peer' = group.is_creator ? 'creator' : 'peer';
            return (
              <TouchableOpacity
                key={group.user_id}
                style={styles.storyItem}
                onPress={() => setSelectedGroupIndex(idx)}
              >
                <View style={styles.ringWrap}>
                  <PolishedRing kind={kind} rotation={ringRotation} seen={!group.has_unseen}>
                    {group.avatar_url ? (
                      <Image
                        source={{ uri: group.avatar_url }}
                        style={styles.avatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarInitial}>
                          {group.full_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </PolishedRing>
                  {group.is_creator && (
                    <LinearGradient
                      colors={['#FDE047', '#EAB308']}
                      style={styles.verifiedBadge}
                    >
                      <Text style={styles.verifiedStar}>⭐</Text>
                    </LinearGradient>
                  )}
                </View>
                <Text style={styles.label} numberOfLines={1}>
                  {group.full_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Story Viewer ── */}
      {selectedGroupIndex !== null && userGroups[selectedGroupIndex] && (
        <StoryViewer
          stories={userGroups[selectedGroupIndex].stories}
          username={userGroups[selectedGroupIndex].full_name}
          avatarUrl={userGroups[selectedGroupIndex].avatar_url}
          onClose={handleCloseViewer}
          onStorySeen={handleMarkSeen}
        />
      )}
    </>
  );
};

// Ring styles — used by the PolishedRing primitive. Theme-independent.
const ringBase = StyleSheet.create({
  ring: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSeen: {
    backgroundColor: '#3F3F46',
  },
  ringInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#000',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  addRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const getStyles = (colors: any) =>
  StyleSheet.create({
    loadingContainer: {
      height: 100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    container: {
      backgroundColor: colors.background,
      paddingVertical: 12,
    },
    scrollContent: {
      paddingHorizontal: 18,
      gap: 14,
    },
    storyItem: {
      alignItems: 'center',
      gap: 6,
      width: 76,
    },
    ringWrap: {
      position: 'relative',
      width: 72,
      height: 72,
    },
    addInner: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#18181B',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: { width: '100%', height: '100%' },
    avatarFallback: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: 22,
      fontWeight: '900',
      color: polished.goldMid,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
      maxWidth: 72,
      textAlign: 'center',
    },
    verifiedBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 3,
      borderColor: '#000',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: polished.goldDeep,
      shadowOpacity: 0.8,
      shadowRadius: 6,
      elevation: 6,
    },
    verifiedStar: {
      fontSize: 9,
    },
    addAnotherBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: polished.goldMid,
      borderWidth: 3,
      borderColor: '#000',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
