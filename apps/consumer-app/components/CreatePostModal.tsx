import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../config/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { resolveCommunityIcon } from '../constants/communityIcons';

interface Community {
  id: string;
  name: string;
  icon: string;
}

export interface EditingPost {
  id: string;
  content: string;
  location: string | null;
  community_id: string | null;
  media_urls: string[] | null;
}

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  editingPost?: EditingPost | null;
  // When set, the composer destination is fixed — picker is replaced
  // by a 'Posting to X' pill at the top.
  lockedCommunity?: { id: string; name: string; icon?: string | null } | null;
}

export const CreatePostModal = ({
  visible,
  onClose,
  onPostCreated,
  editingPost = null,
  lockedCommunity = null,
}: CreatePostModalProps) => {
  const { colors } = useTheme();

  const [postContent, setPostContent] = useState('');
  const [postLocation, setPostLocation] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);

  // ── @mention autocomplete state ─────────────────────────────────────────
  const [contentSelection, setContentSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [mentionSuggestions, setMentionSuggestions] = useState<Array<{ username: string; full_name: string }>>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null); // null = not in mention mode

  // Load communities for the picker
  useEffect(() => {
    if (visible) {
      fetchCommunities();
    }
  }, [visible]);

  // Pre-fill form when editing, or pre-lock to a community when posting
  // from inside one. Editing always wins (preserves the post's existing
  // community); otherwise we honour lockedCommunity from the caller.
  useEffect(() => {
    if (editingPost) {
      setPostContent(editingPost.content);
      setPostLocation(editingPost.location || '');
      setSelectedCommunity(editingPost.community_id);
      setSelectedImage(editingPost.media_urls?.[0] || null);
    } else {
      resetForm();
      if (lockedCommunity) setSelectedCommunity(lockedCommunity.id);
    }
  }, [editingPost, lockedCommunity, visible]);

  const resetForm = () => {
    setPostContent('');
    setPostLocation('');
    setSelectedCommunity(null);
    setSelectedImage(null);
  };

  // Detect if the cursor is currently inside an @mention token. Returns the
  // prefix string after @ (e.g. "fe" for "@fe"), or null if not in one.
  const computeMentionPrefix = (text: string, cursor: number): string | null => {
    if (cursor <= 0) return null;
    // Walk backwards from cursor until whitespace or @ — stop conditions.
    let i = cursor - 1;
    while (i >= 0) {
      const ch = text[i];
      if (ch === '@') {
        // Must be at start of string OR preceded by whitespace
        if (i === 0 || /\s/.test(text[i - 1])) {
          return text.slice(i + 1, cursor);
        }
        return null;
      }
      if (/\s/.test(ch)) return null;
      i--;
    }
    return null;
  };

  // Query profiles when the prefix changes (debounced via the effect's
  // dependency-driven re-run pattern).
  useEffect(() => {
    if (mentionQuery === null || mentionQuery.length < 1) {
      setMentionSuggestions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, full_name')
        .ilike('username', `${mentionQuery}%`)
        .not('username', 'is', null)
        .limit(5);
      if (!cancelled) setMentionSuggestions((data ?? []) as any);
    })();
    return () => { cancelled = true; };
  }, [mentionQuery]);

  const handleContentChange = (text: string) => {
    setPostContent(text);
    const prefix = computeMentionPrefix(text, contentSelection.end);
    setMentionQuery(prefix);
  };

  const handleContentSelection = (e: any) => {
    const sel = e.nativeEvent.selection;
    setContentSelection(sel);
    const prefix = computeMentionPrefix(postContent, sel.end);
    setMentionQuery(prefix);
  };

  // Replace the current @prefix with @username + space, place cursor after.
  const insertMention = (username: string) => {
    const cursor = contentSelection.end;
    // Find the @ that began this token
    let atIdx = cursor - 1;
    while (atIdx >= 0 && postContent[atIdx] !== '@') atIdx--;
    if (atIdx < 0) return;
    const before = postContent.slice(0, atIdx);
    const after = postContent.slice(cursor);
    const next = `${before}@${username} ${after}`;
    setPostContent(next);
    setMentionQuery(null);
    setMentionSuggestions([]);
  };

  const fetchCommunities = async () => {
    const { data } = await supabase
      .from('communities')
      .select('id, name, icon')
      .eq('is_active', true)
      .order('member_count', { ascending: false })
      .limit(5);
    setCommunities((data as Community[]) ?? []);
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photos');
        return;
      }

      // NB: in-app crop is iOS-only. On Android (Samsung in particular) the
      // system crop UI lacks a visible confirm button on some phones, leaving
      // users stuck. iOS PHPicker handles the crop sheet cleanly.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        ...(Platform.OS === 'ios' && { allowsEditing: true, aspect: [4, 3] as [number, number] }),
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Image picker failed:', err);
      Alert.alert('Image picker error', 'Could not open the image library. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!postContent.trim()) {
      Alert.alert('Content Required', 'Please enter some content for your post');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (!user) {
        Alert.alert('Authentication Required', 'Please sign in to create posts');
        return;
      }

      // Check profile has a name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      if (!profile?.full_name || profile.full_name.trim() === '') {
        Alert.alert('Profile Incomplete', 'Please set your name in your profile before posting.');
        setSubmitting(false);
        return;
      }

      // Upload image if selected (and it's a local file, not an existing URL)
      let imageUrl = null;
      if (selectedImage && !selectedImage.startsWith('http')) {
        const rawExt = selectedImage.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
        const fileExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(rawExt) ? rawExt : 'jpg';
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const mimeType = fileExt === 'jpg' ? 'image/jpeg' : `image/${fileExt}`;

        // Read the image as base64 via expo-file-system and decode to bytes.
        // XHR with responseType:'arraybuffer' returns 0-byte buffers for the
        // photo-picker `content://` URIs that Android hands us, so we can't
        // use that path. The base64 round-trip is the pattern StorySection
        // already uses for the same reason.
        const base64 = await FileSystem.readAsStringAsync(selectedImage!, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          encoding: 'base64' as any,
        });
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const { error: uploadError } = await supabase.storage
          .from('social-media')
          .upload(fileName, bytes, { contentType: mimeType, upsert: false });

        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
          .from('social-media')
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      } else if (selectedImage?.startsWith('http')) {
        // Keep existing image URL when editing
        imageUrl = selectedImage;
      }

      if (editingPost) {
        const { error } = await supabase
          .from('social_posts')
          .update({
            content: postContent.trim(),
            location: postLocation.trim() || null,
            community_id: selectedCommunity,
            media_urls: imageUrl ? [imageUrl] : (selectedImage ? editingPost.media_urls : null),
          })
          .eq('id', editingPost.id);
        if (error) throw error;
        Alert.alert('Success', 'Your post has been updated!');
      } else {
        const { error } = await supabase
          .from('social_posts')
          .insert({
            user_id: user.id,
            content: postContent.trim(),
            location: postLocation.trim() || null,
            community_id: selectedCommunity,
            media_urls: imageUrl ? [imageUrl] : null,
          });
        if (error) throw error;

        // Track stats
        await supabase.from('user_stats').upsert(
          { user_id: user.id },
          { onConflict: 'user_id', ignoreDuplicates: true }
        );
        await supabase.rpc('increment_user_stat', { p_user_id: user.id, p_stat_name: 'posts_created', p_xp_amount: 10 });
        if (imageUrl) {
          await supabase.rpc('increment_user_stat', { p_user_id: user.id, p_stat_name: 'photos_uploaded', p_xp_amount: 5 });
        }

        Alert.alert('Success', 'Your post has been created!');
      }

      resetForm();
      onClose();
      onPostCreated();
    } catch (error) {
      console.error('Error saving post:', error);
      Alert.alert('Error', 'Failed to save post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = getStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>{editingPost ? 'Edit Post' : 'Create Post'}</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || !postContent.trim()}
            >
              <Text style={[
                styles.submitText,
                (!postContent.trim() || submitting) && styles.submitDisabled,
              ]}>
                {submitting
                  ? (editingPost ? 'Updating...' : 'Posting...')
                  : (editingPost ? 'Update' : 'Post')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Content */}
            <TextInput
              style={styles.textArea}
              placeholder="What's on your mind?  Type @ to mention someone."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              value={postContent}
              onChangeText={handleContentChange}
              onSelectionChange={handleContentSelection}
              selection={contentSelection}
              maxLength={500}
              autoFocus={!editingPost}
            />
            <Text style={styles.charCount}>{postContent.length}/500</Text>

            {/* @mention suggestions */}
            {mentionQuery !== null && mentionSuggestions.length > 0 && (
              <View style={styles.mentionList}>
                {mentionSuggestions.map((s) => (
                  <TouchableOpacity
                    key={s.username}
                    style={styles.mentionItem}
                    onPress={() => insertMention(s.username)}
                  >
                    <Text style={styles.mentionUsername}>@{s.username}</Text>
                    <Text style={styles.mentionFullName}>{s.full_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Where are you?"
                placeholderTextColor={colors.textSecondary}
                value={postLocation}
                onChangeText={setPostLocation}
              />
            </View>

            {/* Community — when locked (entered the composer from a
                community feed), show a fixed pill instead of the picker. */}
            {lockedCommunity ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Posting to</Text>
                <View style={styles.lockedCommunityPill}>
                  <Text style={styles.communityOptionIcon}>
                    {resolveCommunityIcon(lockedCommunity.name, lockedCommunity.icon ?? null)}
                  </Text>
                  <Text style={styles.lockedCommunityName}>{lockedCommunity.name}</Text>
                  <Ionicons name="lock-closed" size={12} color={colors.textSecondary} style={{ marginLeft: 6 }} />
                </View>
              </View>
            ) : communities.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Community (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.communityOptions}>
                    <TouchableOpacity
                      style={[styles.communityOption, selectedCommunity === null && styles.communityOptionSelected]}
                      onPress={() => setSelectedCommunity(null)}
                    >
                      <Text style={styles.communityOptionText}>General</Text>
                    </TouchableOpacity>
                    {communities.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.communityOption, selectedCommunity === c.id && styles.communityOptionSelected]}
                        onPress={() => setSelectedCommunity(c.id)}
                      >
                        <Text style={styles.communityOptionIcon}>{resolveCommunityIcon(c.name, c.icon)}</Text>
                        <Text style={styles.communityOptionText}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Image Picker */}
            <TouchableOpacity style={styles.imagePickerBtn} onPress={handlePickImage}>
              <Ionicons name="camera" size={24} color={colors.primary} />
              <Text style={styles.imagePickerText}>
                {selectedImage ? 'Change Image' : 'Add Image'}
              </Text>
            </TouchableOpacity>

            {selectedImage && (
              <View style={styles.imagePreview}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.imagePreviewThumb}
                  resizeMode="cover"
                />
                <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.imageRemoveBtn}>
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    width: 80,
    textAlign: 'right',
  },
  submitDisabled: {
    color: colors.textSecondary,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  textArea: {
    fontSize: 16,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  communityOptions: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  mentionList: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  mentionItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mentionUsername: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  mentionFullName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  lockedCommunityPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  lockedCommunityName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  communityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.border,
  },
  communityOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  communityOptionIcon: {
    fontSize: 16,
  },
  communityOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  imagePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  imagePickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 80,
  },
  imagePreviewThumb: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
});
