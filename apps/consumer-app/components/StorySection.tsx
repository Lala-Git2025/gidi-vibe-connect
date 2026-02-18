import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../config/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { StoryViewer } from './StoryViewer';

interface Story {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  image_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  created_at: string;
  expires_at: string;
  is_creator: boolean;
}

export const StorySection = () => {
  const { colors } = useTheme();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const styles = getStyles(colors);

  useEffect(() => {
    fetchCurrentUser();
    fetchStories();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        console.log('No active session');
        setCurrentUser(null);
        return;
      }
      setCurrentUser(session.user);
      console.log('Current user set:', session.user?.id);
    } catch (error) {
      console.error('Error in fetchCurrentUser:', error);
      setCurrentUser(null);
    }
  };

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          image_url,
          media_type,
          caption,
          created_at,
          expires_at,
          profiles!stories_user_id_fkey (
            username,
            avatar_url,
            role
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedStories: Story[] = (data || []).map((story: any) => ({
        id: story.id,
        user_id: story.user_id,
        username: story.profiles?.username || 'User',
        avatar_url: story.profiles?.avatar_url || null,
        image_url: story.image_url,
        media_type: story.media_type || 'image',
        caption: story.caption,
        created_at: story.created_at,
        expires_at: story.expires_at,
        is_creator: story.profiles?.role === 'Creator',
      }));

      setStories(formattedStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStory = async () => {
    try {
      // Try to get the session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('No active session:', sessionError);
        Alert.alert(
          'Authentication Required',
          'Please sign in to create a story. Go to Profile tab to sign in.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get user from session
      const user = session.user;

      // Update current user if it was stale
      if (!currentUser) {
        setCurrentUser(user);
      }

      console.log('Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Permission status:', status);

      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Camera roll access is required to upload photos. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('Launching media picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max for videos
      });

      console.log('Image picker result:', result);

      if (result.canceled) {
        console.log('User canceled image selection');
        return;
      }

      if (result.assets && result.assets[0]) {
        console.log('Selected image:', result.assets[0].uri);
        await uploadStory(result.assets[0].uri);
      } else {
        console.error('No image selected');
        Alert.alert('Error', 'No image was selected. Please try again.');
      }
    } catch (error) {
      console.error('Error in handleCreateStory:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  const uploadStory = async (uri: string, mediaType?: string) => {
    setUploading(true);
    try {
      // Get session
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (authError || !session) {
        throw new Error('User not authenticated');
      }

      const user = session.user;

      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Determine media type based on file extension
      const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
      const isVideo = videoExtensions.includes(fileExt);
      const detectedMediaType = mediaType || (isVideo ? 'video' : 'image');

      // Set correct content type
      let contentType = `image/${fileExt}`;
      if (isVideo) {
        contentType = fileExt === 'mov' ? 'video/quicktime' : `video/${fileExt}`;
      }

      console.log(`Uploading ${detectedMediaType}: ${fileName}`);

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, blob, {
          contentType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          media_type: detectedMediaType,
        });

      if (insertError) throw insertError;

      Alert.alert('Success', `Your ${detectedMediaType === 'video' ? 'video' : 'photo'} has been posted!`);
      fetchStories();
    } catch (error) {
      console.error('Error uploading story:', error);
      Alert.alert('Error', 'Failed to upload. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleStoryPress = (index: number) => {
    setSelectedStoryIndex(index);
  };

  const handleCloseViewer = () => {
    setSelectedStoryIndex(null);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
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
          {/* Add Your Story */}
          <TouchableOpacity
            style={styles.storyItem}
            onPress={handleCreateStory}
            disabled={uploading}
          >
            <View style={styles.addStoryCircle}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.addIcon}>➕</Text>
              )}
            </View>
            <Text style={styles.storyUsername}>My Vibe</Text>
          </TouchableOpacity>

          {/* Stories */}
          {stories.map((story, index) => (
            <TouchableOpacity
              key={story.id}
              style={styles.storyItem}
              onPress={() => handleStoryPress(index)}
            >
              <View style={[
                styles.storyCircle,
                story.is_creator ? styles.creatorGradient : styles.userGradient
              ]}>
                <View style={styles.innerCircle}>
                  <Image
                    source={{ uri: story.image_url }}
                    style={styles.storyImage}
                    resizeMode="cover"
                  />
                </View>
                {story.is_creator && (
                  <View style={styles.creatorBadge}>
                    <Text style={styles.starIcon}>⭐</Text>
                  </View>
                )}
              </View>
              <Text style={styles.storyUsername} numberOfLines={1}>
                {story.username}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selectedStoryIndex !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={selectedStoryIndex}
          onClose={handleCloseViewer}
        />
      )}
    </>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingVertical: 16,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyItem: {
    alignItems: 'center',
    gap: 8,
    width: 64,
  },
  addStoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 24,
  },
  storyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    position: 'relative',
  },
  creatorGradient: {
    backgroundColor: colors.primary, // Primary yellow
  },
  userGradient: {
    backgroundColor: colors.primary,
  },
  innerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.background,
    overflow: 'hidden',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  creatorBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: {
    fontSize: 10,
  },
  storyUsername: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    maxWidth: 64,
    textAlign: 'center',
  },
});
