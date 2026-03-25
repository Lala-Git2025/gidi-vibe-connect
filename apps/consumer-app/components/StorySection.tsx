import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../config/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { StoryEditor, StoryEditorData } from './StoryEditor';
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

export const StorySection = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [userGroups, setUserGroups] = useState<UserStoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  // Story editor state
  const [editorData, setEditorData] = useState<{
    uri: string;
    mediaType: 'image' | 'video';
    mimeType?: string;
  } | null>(null);

  useEffect(() => {
    initData();
  }, []);

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

  // ── Pick media and open editor ──────────────────────────────────────────────

  const handleCreateStory = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      Alert.alert('Sign In Required', 'Please sign in to post a story.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll access is required to upload.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false, // editor handles cropping
      quality: 0.9,
      videoMaxDuration: 60,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    // Use asset.type from ImagePicker — more reliable than parsing URI extension
    const mediaType: 'image' | 'video' = asset.type === 'video' ? 'video' : 'image';

    // Open StoryEditor
    setEditorData({ uri: asset.uri, mediaType, mimeType: asset.mimeType ?? undefined });
  };

  // ── Upload story after editor is done ──────────────────────────────────────

  const handleEditorDone = async (data: StoryEditorData) => {
    // Capture mimeType before clearing editorData (state is null by the time uploadStory reads it)
    const mimeType = editorData?.mimeType;
    setEditorData(null);
    await uploadStory(data, mimeType);
  };

  const handleEditorCancel = () => {
    setEditorData(null);
  };

  const uploadStory = async (data: StoryEditorData, mimeType?: string) => {
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated — please sign in again.');

      const user = session.user;
      const { uri, mediaType, caption, filter, textOverlays, stickerOverlays } = data;

      // Build overlays JSON
      const overlaysJson = [
        ...textOverlays.map((t) => ({ type: 'text', ...t })),
        ...stickerOverlays.map((s) => ({ type: 'sticker', ...s })),
      ];

      // Upload media to stories bucket.
      // Use expo-file-system to read the file as base64, then decode to bytes.
      // fetch(uri).blob() returns empty blobs for photo-picker URIs on iOS.
      const ext = uri.split('.').pop()?.toLowerCase() || (mediaType === 'video' ? 'mp4' : 'jpg');
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const contentType = mimeType ?? (
        mediaType === 'video'
          ? (ext === 'mov' ? 'video/quicktime' : `video/${ext}`)
          : `image/${ext}`
      );

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
      });
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, bytes, { contentType, upsert: false });

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from('stories').getPublicUrl(fileName);

      // Insert story row
      const { error: insertError } = await supabase.from('stories').insert({
        user_id: user.id,
        image_url: publicUrl,
        media_type: mediaType,
        caption: caption || null,
        filter_effect: filter,
        overlays: overlaysJson,
      });

      if (insertError) throw new Error(`Story save failed: ${insertError.message}`);

      Alert.alert('Posted!', 'Your story is live for 24 hours.', [{ text: 'OK' }]);
      await fetchStories(user.id);
    } catch (error: any) {
      console.error('[Story upload] caught error:', error);
      Alert.alert('Upload Failed', error.message || 'An unexpected error occurred.');
    } finally {
      setUploading(false);
    }
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
          {/* ── My Vibe: always the "add story" button ── */}
          <TouchableOpacity
            style={styles.storyItem}
            onPress={handleCreateStory}
            disabled={uploading}
          >
            <View style={styles.addCircle}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.addIcon}>+</Text>
              )}
            </View>
            <Text style={styles.label}>My Vibe</Text>
          </TouchableOpacity>

          {/* ── All user story groups ── */}
          {userGroups.map((group, idx) => {
            const isOwn = group.user_id === currentUserId;
            return (
              <TouchableOpacity
                key={group.user_id}
                style={styles.storyItem}
                onPress={() => setSelectedGroupIndex(idx)}
              >
                <View
                  style={[
                    styles.ring,
                    isOwn || group.has_unseen ? styles.ringUnseen : styles.ringSeen,
                  ]}
                >
                  <View style={styles.ringInner}>
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
                  </View>
                </View>
                <Text style={styles.label} numberOfLines={1}>
                  {isOwn ? 'My Vibe' : group.full_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Story Editor Modal ── */}
      {editorData && (
        <StoryEditor
          uri={editorData.uri}
          mediaType={editorData.mediaType}
          onDone={handleEditorDone}
          onCancel={handleEditorCancel}
        />
      )}

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

const getStyles = (colors: any) =>
  StyleSheet.create({
    loadingContainer: {
      height: 100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    container: {
      backgroundColor: colors.background,
      paddingVertical: 16,
    },
    scrollContent: {
      paddingHorizontal: 16,
      gap: 16,
    },
    storyItem: {
      alignItems: 'center',
      gap: 6,
      width: 68,
    },
    addCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      backgroundColor: colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addIcon: {
      fontSize: 28,
      lineHeight: 32,
      color: colors.primary,
      fontWeight: 'bold',
    },
    ring: {
      width: 64,
      height: 64,
      borderRadius: 32,
      padding: 3,
    },
    ringUnseen: { backgroundColor: colors.primary },
    ringSeen: { backgroundColor: colors.border },
    ringInner: {
      flex: 1,
      borderRadius: 29,
      borderWidth: 2,
      borderColor: colors.background,
      overflow: 'hidden',
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
      fontWeight: 'bold',
      color: colors.primary,
    },
    label: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.text,
      maxWidth: 68,
      textAlign: 'center',
    },
  });
