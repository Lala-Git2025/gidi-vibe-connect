import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../config/supabase';
import { StoryViewer } from './StoryViewer';

interface Story {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  image_url: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  is_creator: boolean;
}

export const StorySection = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchStories();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          image_url,
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
    if (!currentUser) {
      Alert.alert('Sign in required', 'Please sign in to create a story');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll permissions to select an image');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadStory(result.assets[0].uri);
    }
  };

  const uploadStory = async (uri: string) => {
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, blob, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: currentUser.id,
          image_url: publicUrl,
        });

      if (insertError) throw insertError;

      Alert.alert('Success', 'Your story has been posted!');
      fetchStories();
    } catch (error) {
      console.error('Error uploading story:', error);
      Alert.alert('Error', 'Failed to upload story. Please try again.');
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
        <ActivityIndicator size="small" color="#EAB308" />
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
                <ActivityIndicator size="small" color="#EAB308" />
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
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
    borderColor: '#27272a',
    backgroundColor: '#18181b',
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
    backgroundColor: '#EAB308', // Primary yellow
  },
  userGradient: {
    backgroundColor: '#a855f7', // Purple
  },
  innerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#000',
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
    backgroundColor: '#EAB308',
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: {
    fontSize: 10,
  },
  storyUsername: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    maxWidth: 64,
    textAlign: 'center',
  },
});
