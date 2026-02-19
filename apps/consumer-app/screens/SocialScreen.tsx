import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../config/supabase';

type Tab = 'feed' | 'communities' | 'people';

// Curated emoji library organized by Lagos-relevant categories
const COMMUNITY_EMOJIS = [
  // Nightlife
  '🌙', '🍸', '🎵', '🎉', '🕺', '💃', '🎤', '🎶',
  // Food & Drink
  '🍽️', '🍕', '🌮', '☕', '🥘', '🥩', '🍜', '🍷',
  // Sports & Fitness
  '⚽', '🏀', '🎾', '🏋️', '🏆', '🎯', '🏊', '🤸',
  // Culture & Arts
  '🎨', '🎭', '📚', '🎬', '📸', '🎪', '🎸', '🖼️',
  // Lagos Neighbourhoods
  '🏝️', '🌊', '🏢', '🌆', '🌃', '✈️', '🏘️', '🗺️',
  // Business & Social
  '💼', '💰', '📈', '💡', '🤝', '👥', '❤️', '🌟',
];

const COLOR_PALETTE = [
  { label: 'Indigo',  color: '#4338CA' },
  { label: 'Blue',   color: '#1D4ED8' },
  { label: 'Teal',   color: '#0891B2' },
  { label: 'Green',  color: '#059669' },
  { label: 'Gold',   color: '#D97706' },
  { label: 'Orange', color: '#EA580C' },
  { label: 'Red',    color: '#DC2626' },
  { label: 'Pink',   color: '#DB2777' },
  { label: 'Purple', color: '#7C3AED' },
  { label: 'Slate',  color: '#475569' },
];

interface Community {
  id: string;
  name: string;
  description: string;
  icon: string;
  color?: string;
  member_count: number;
  is_joined?: boolean;
}

interface Post {
  id: string;
  content: string;
  location: string | null;
  media_urls: string[] | null;
  created_at: string;
  user_id: string;
  community_id: string | null;
  likes_count: number;
  comments_count: number;
  profiles?: {
    full_name: string;
    avatar_url?: string | null;
  };
  communities?: {
    name: string;
  };
}

interface PeopleProfile {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  is_following: boolean;
  followers_count: number;
  following_count: number;
}

// Collapses to nothing if the remote image fails to load
function PostImage({ uri, style }: { uri: string; style: any }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function SocialScreen() {
  const navigation = useNavigation();
  const { colors, activeTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postLocation, setPostLocation] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Create community modal state
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');
  const [newCommunityEmoji, setNewCommunityEmoji] = useState('🌙');
  const [newCommunityColor, setNewCommunityColor] = useState('#4338CA');
  const [creatingCommunity, setCreatingCommunity] = useState(false);

  // People tab state
  const [people, setPeople] = useState<PeopleProfile[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [peopleSearch, setPeopleSearch] = useState('');

  // User profile modal state
  const [viewingProfile, setViewingProfile] = useState<PeopleProfile | null>(null);
  const [viewingProfilePosts, setViewingProfilePosts] = useState<Post[]>([]);
  const [viewingProfileLoading, setViewingProfileLoading] = useState(false);

  const styles = getStyles(colors);

  // Returns the stored color or derives a consistent one from the name hash
  const getCommunityColor = (community: Community): string => {
    if (community.color) return community.color;
    const hash = community.name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return COLOR_PALETTE[hash % COLOR_PALETTE.length].color;
  };

  // Load Orbitron font
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Orbitron_900Black,
  });

  // Fetch communities and posts — wait for currentUser before posts so edit buttons render immediately
  useEffect(() => {
    fetchCurrentUser().then(() => fetchFeedPosts());
    fetchCommunities();
  }, []);

  // Debug: log currentUserId vs post user_ids to diagnose delete button visibility
  useEffect(() => {
    if (currentUserId && feedPosts.length > 0) {
      console.log('[SocialScreen] currentUserId:', currentUserId);
      console.log('[SocialScreen] feedPost user_ids:', feedPosts.map(p => p.user_id));
      console.log('[SocialScreen] owned posts:', feedPosts.filter(p => p.user_id === currentUserId).length);
    }
  }, [currentUserId, feedPosts]);

  const fetchCurrentUser = async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // Not logged in — feed still loads, edit/delete buttons just won't show
      return;
    }

    console.log('[SocialScreen] Current user id:', user.id);
    setCurrentUserId(user.id);

    // Check if profile exists and whether full_name is empty
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    console.log('[SocialScreen] Profile row:', profile, 'error:', profileError?.message);

    const authFullName = user.user_metadata?.full_name;
    const emailUsername = user.email?.split('@')[0];
    const nameToUse = authFullName || emailUsername || 'User';

    if (!profile) {
      // Profile row missing — create it (handles users who pre-date trigger)
      console.warn('[SocialScreen] Profile missing, creating one with name:', nameToUse);
      await supabase.from('profiles').upsert(
        { user_id: user.id, full_name: nameToUse, role: 'Consumer' },
        { onConflict: 'user_id', ignoreDuplicates: false }
      );
    } else if (!profile.full_name || profile.full_name.trim() === '') {
      // Profile exists but name is empty — sync from auth metadata / email
      console.warn('[SocialScreen] Profile has empty name, syncing to:', nameToUse);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: nameToUse })
        .eq('user_id', user.id);
      if (updateError) {
        console.error('[SocialScreen] Failed to update profile name:', updateError.message);
      }
    }
  };

  const fetchCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('is_active', true)
        .order('member_count', { ascending: false });

      if (error) throw error;

      if (data) {
        const communitiesWithJoinStatus = data.map(community => ({
          ...community,
          is_joined: false
        }));
        setCommunities(communitiesWithJoinStatus);
      }
    } catch (error) {
      console.error('Error fetching communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedPosts = async () => {
    try {
      // Step 1: fetch posts + community names (no profiles join — FK points to profiles.user_id not profiles.id)
      const { data: posts, error } = await supabase
        .from('social_posts')
        .select('*, communities(name)')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!posts || posts.length === 0) { setFeedPosts([]); return; }

      // Step 2: fetch profiles for all unique authors in a single query
      const userIds = [...new Set(posts.map((p: any) => p.user_id as string))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

      console.log('[SocialScreen] posts user_ids:', userIds);
      console.log('[SocialScreen] profiles returned:', profiles?.map((p: any) => ({ uid: p.user_id, name: p.full_name })));

      // Step 3: attach profile data to each post
      const mergedPosts = posts.map((post: any) => {
        const prof = profileMap.get(post.user_id) ?? null;
        if (!prof) console.warn('[SocialScreen] No profile found for post.user_id:', post.user_id);
        return { ...post, profiles: prof };
      });
      setFeedPosts(mergedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Authentication Required', 'Please sign in to join communities');
        return;
      }

      const community = communities.find(c => c.id === communityId);
      const isJoined = community?.is_joined;

      if (isJoined) {
        const { error } = await supabase
          .from('community_members')
          .delete()
          .eq('user_id', user.id)
          .eq('community_id', communityId);

        if (error) throw error;

        Alert.alert('Left Community', `You've left ${community?.name}`);
      } else {
        const { error } = await supabase
          .from('community_members')
          .insert({
            user_id: user.id,
            community_id: communityId,
            role: 'member'
          });

        if (error) throw error;

        Alert.alert('Joined Community', `Welcome to ${community?.name}!`);
      }

      setCommunities(communities.map(c =>
        c.id === communityId ? { ...c, is_joined: !isJoined } : c
      ));

      fetchCommunities();
    } catch (error) {
      console.error('Error joining/leaving community:', error);
      Alert.alert('Error', 'Failed to update community membership');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInMs = now.getTime() - postDate.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 60) {
      return `${diffInMins}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) {
      Alert.alert('Content Required', 'Please enter some content for your post');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Authentication Required', 'Please sign in to create posts');
        return;
      }

      // Check if user has a name set in their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      if (!profile?.full_name || profile.full_name.trim() === '') {
        Alert.alert(
          'Profile Incomplete',
          'Please set your name in your profile before posting.',
          [{ text: 'OK' }]
        );
        setSubmitting(false);
        return;
      }

      // Upload image if selected
      let imageUrl = null;
      if (selectedImage) {
        const rawExt = selectedImage.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
        const fileExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(rawExt) ? rawExt : 'jpg';
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const mimeType = fileExt === 'jpg' ? 'image/jpeg' : `image/${fileExt}`;

        // Use XMLHttpRequest to read the file as ArrayBuffer — more reliable in React Native
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => resolve(xhr.response as ArrayBuffer);
          xhr.onerror = () => reject(new Error('Failed to read image file'));
          xhr.responseType = 'arraybuffer';
          xhr.open('GET', selectedImage, true);
          xhr.send(null);
        });

        const { error: uploadError } = await supabase.storage
          .from('social-media')
          .upload(fileName, arrayBuffer, {
            contentType: mimeType,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('social-media')
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      if (editingPost) {
        // Update existing post
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
        // Create new post
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

        // Ensure user_stats row exists (in case user pre-dates gamification rollout)
        await supabase.from('user_stats').upsert(
          { user_id: user.id },
          { onConflict: 'user_id', ignoreDuplicates: true }
        );

        // Track stats
        await supabase.rpc('increment_user_stat', { p_user_id: user.id, p_stat_name: 'posts_created', p_xp_amount: 10 });
        if (imageUrl) {
          await supabase.rpc('increment_user_stat', { p_user_id: user.id, p_stat_name: 'photos_uploaded', p_xp_amount: 5 });
        }

        Alert.alert('Success', 'Your post has been created!');
      }

      // Reset form and close modal
      setPostContent('');
      setPostLocation('');
      setSelectedCommunity(null);
      setSelectedImage(null);
      setEditingPost(null);
      setShowCreateModal(false);

      // Refresh feed
      fetchFeedPosts();
    } catch (error) {
      console.error('Error saving post:', error);
      Alert.alert('Error', 'Failed to save post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setPostContent(post.content);
    setPostLocation(post.location || '');
    setSelectedCommunity(post.community_id);
    setSelectedImage(post.media_urls?.[0] || null);
    setShowCreateModal(true);
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('social_posts')
                .delete()
                .eq('id', postId);

              if (error) throw error;

              Alert.alert('Success', 'Post deleted successfully');
              fetchFeedPosts();
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleOpenCreateModal = () => {
    // Reset form when opening for new post
    setEditingPost(null);
    setPostContent('');
    setPostLocation('');
    setSelectedCommunity(null);
    setSelectedImage(null);
    setShowCreateModal(true);
  };

  const handleOpenCreateCommunityModal = () => {
    setNewCommunityName('');
    setNewCommunityDescription('');
    setNewCommunityEmoji('🌙');
    setNewCommunityColor('#4338CA');
    setShowCreateCommunityModal(true);
  };

  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim()) {
      Alert.alert('Name Required', 'Please enter a community name');
      return;
    }

    setCreatingCommunity(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Authentication Required', 'Please sign in to create a community');
        return;
      }

      const { error } = await supabase.from('communities').insert({
        name: newCommunityName.trim(),
        description: newCommunityDescription.trim() || null,
        icon: newCommunityEmoji,
        color: newCommunityColor,
        created_by: user.id,
        is_public: true,
        is_active: true,
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Name Taken', 'A community with this name already exists. Try a different name.');
        } else {
          throw error;
        }
        return;
      }

      Alert.alert('Community Created!', `"${newCommunityName.trim()}" is now live.`);
      setShowCreateCommunityModal(false);
      fetchCommunities();
    } catch (error) {
      console.error('Error creating community:', error);
      Alert.alert('Error', 'Failed to create community. Please try again.');
    } finally {
      setCreatingCommunity(false);
    }
  };

  // ── People / Follow helpers ─────────────────────────────────────────

  const fetchFollowing = async (userId: string): Promise<Set<string>> => {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    const ids = new Set((data ?? []).map((r: any) => r.following_id as string));
    setFollowingIds(ids);
    return ids;
  };

  const fetchPeople = async () => {
    if (!currentUserId) return;
    setPeopleLoading(true);
    try {
      const [{ data: profiles }, { data: followingData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, bio')
          .neq('user_id', currentUserId)
          .order('full_name'),
        supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId),
      ]);

      const followingSet = new Set((followingData ?? []).map((r: any) => r.following_id as string));
      setFollowingIds(followingSet);

      // Batch follower counts for all profiles
      const userIds = (profiles ?? []).map((p: any) => p.user_id);
      const { data: followerRows } = await supabase
        .from('follows')
        .select('following_id')
        .in('following_id', userIds);

      const followerCounts: Record<string, number> = {};
      (followerRows ?? []).forEach((r: any) => {
        followerCounts[r.following_id] = (followerCounts[r.following_id] || 0) + 1;
      });

      const { data: followingRows } = await supabase
        .from('follows')
        .select('follower_id')
        .in('follower_id', userIds);

      const followingCounts: Record<string, number> = {};
      (followingRows ?? []).forEach((r: any) => {
        followingCounts[r.follower_id] = (followingCounts[r.follower_id] || 0) + 1;
      });

      setPeople(
        (profiles ?? []).map((p: any) => ({
          user_id: p.user_id,
          full_name: p.full_name || 'User',
          avatar_url: p.avatar_url,
          bio: p.bio,
          is_following: followingSet.has(p.user_id),
          followers_count: followerCounts[p.user_id] || 0,
          following_count: followingCounts[p.user_id] || 0,
        }))
      );
    } catch (err) {
      console.error('Error fetching people:', err);
    } finally {
      setPeopleLoading(false);
    }
  };

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUserId) {
      Alert.alert('Sign In Required', 'Please sign in to follow people.');
      return;
    }

    const isCurrentlyFollowing = followingIds.has(targetUserId);

    // Optimistic update
    const newIds = new Set(followingIds);
    if (isCurrentlyFollowing) {
      newIds.delete(targetUserId);
    } else {
      newIds.add(targetUserId);
    }
    setFollowingIds(newIds);

    // Update people list
    setPeople(prev =>
      prev.map(p =>
        p.user_id === targetUserId
          ? {
              ...p,
              is_following: !isCurrentlyFollowing,
              followers_count: p.followers_count + (isCurrentlyFollowing ? -1 : 1),
            }
          : p
      )
    );

    // Update profile modal if open
    if (viewingProfile?.user_id === targetUserId) {
      setViewingProfile(prev =>
        prev
          ? {
              ...prev,
              is_following: !isCurrentlyFollowing,
              followers_count: prev.followers_count + (isCurrentlyFollowing ? -1 : 1),
            }
          : null
      );
    }

    try {
      if (isCurrentlyFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId);
      } else {
        await supabase.from('follows').insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        });
      }
    } catch (err) {
      // Revert on error
      console.error('Follow toggle error:', err);
      setFollowingIds(followingIds);
      setPeople(prev =>
        prev.map(p =>
          p.user_id === targetUserId
            ? {
                ...p,
                is_following: isCurrentlyFollowing,
                followers_count: p.followers_count + (isCurrentlyFollowing ? 1 : -1),
              }
            : p
        )
      );
    }
  };

  const openUserProfile = async (userId: string) => {
    if (userId === currentUserId) return; // Don't open own profile in modal

    setViewingProfileLoading(true);
    setViewingProfile({
      user_id: userId,
      full_name: '',
      is_following: followingIds.has(userId),
      followers_count: 0,
      following_count: 0,
    });

    try {
      const [
        { data: profile },
        { count: followersCount },
        { count: followingCount },
        { data: posts },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, bio')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId),
        supabase
          .from('social_posts')
          .select('id, content, media_urls, created_at, user_id, likes_count, comments_count')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(12),
      ]);

      setViewingProfile({
        user_id: userId,
        full_name: profile?.full_name || 'User',
        avatar_url: profile?.avatar_url,
        bio: profile?.bio,
        is_following: followingIds.has(userId),
        followers_count: followersCount ?? 0,
        following_count: followingCount ?? 0,
      });
      setViewingProfilePosts((posts ?? []) as Post[]);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setViewingProfileLoading(false);
    }
  };

  // Load people list when People tab is selected
  const handleTabPress = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'people' && people.length === 0) {
      fetchPeople();
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={styles.backButtonContainer}
        >
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>SOCIAL</Text>
        </View>
        <Text style={styles.headerIcon}>🔔</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search communities, people, or posts..."
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feed' && styles.tabActive]}
          onPress={() => handleTabPress('feed')}
        >
          <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>
            📈 Feed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'communities' && styles.tabActive]}
          onPress={() => handleTabPress('communities')}
        >
          <Text style={[styles.tabText, activeTab === 'communities' && styles.tabTextActive]}>
            👥 Communities
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'people' && styles.tabActive]}
          onPress={() => handleTabPress('people')}
        >
          <Text style={[styles.tabText, activeTab === 'people' && styles.tabTextActive]}>
            👤 People
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {/* Feed Tab */}
        {activeTab === 'feed' && (
          <>
            {/* Create Post Button */}
            <TouchableOpacity
              style={styles.createPostButton}
              onPress={handleOpenCreateModal}
            >
              <Text style={styles.createPostIcon}>📷</Text>
              <Text style={styles.createPostText}>Create Post</Text>
            </TouchableOpacity>

            {/* Feed Posts */}
            {feedPosts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>💬</Text>
                <Text style={styles.emptyStateTitle}>No Posts Yet</Text>
                <Text style={styles.emptyStateText}>
                  Be the first to share something with the community!
                </Text>
              </View>
            ) : (
              feedPosts.map((post: Post) => (
                <View key={post.id} style={styles.postCard}>
                  {/* Post Header */}
                  <View style={styles.postHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getInitials((post.profiles?.full_name && post.profiles.full_name.trim()) || 'Anonymous')}
                      </Text>
                    </View>
                    <View style={styles.postAuthorInfo}>
                      <TouchableOpacity onPress={() => openUserProfile(post.user_id)}>
                        <Text style={styles.postAuthor}>
                          {(post.profiles?.full_name && post.profiles.full_name.trim()) || 'Anonymous User'}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.postMeta}>
                        <Text style={styles.postMetaText}>{post.communities?.name || 'General'}</Text>
                        <Text style={styles.postMetaText}> • </Text>
                        <Text style={styles.postMetaText}>{formatTimeAgo(post.created_at)}</Text>
                      </View>
                    </View>
                    {/* Edit/Delete Menu for User's Own Posts */}
                    {/* DEBUG: uncomment to diagnose → console.log('currentUserId:', currentUserId, 'post.user_id:', post.user_id, 'match:', currentUserId === post.user_id) */}
                    {currentUserId === post.user_id && (
                      <View style={styles.postMenu}>
                        <TouchableOpacity
                          style={styles.menuButton}
                          onPress={() => handleEditPost(post)}
                        >
                          <Text style={styles.menuButtonText}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.menuButton}
                          onPress={() => handleDeletePost(post.id)}
                        >
                          <Text style={styles.menuButtonText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Post Content */}
                  <View style={styles.postContent}>
                    <Text style={styles.postContentText}>{post.content}</Text>
                    {post.media_urls && post.media_urls.length > 0 && (
                      <PostImage uri={post.media_urls[0]} style={styles.postImage} />
                    )}
                  </View>

                  {/* Post Actions */}
                  <View style={styles.postActions}>
                    <TouchableOpacity style={styles.actionButton}>
                      <Text style={styles.actionIcon}>👍</Text>
                      <Text style={styles.actionText}>{post.likes_count || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Text style={styles.actionIcon}>💬</Text>
                      <Text style={styles.actionText}>{post.comments_count || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Text style={styles.actionIcon}>📤</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* Communities Tab */}
        {activeTab === 'communities' && (
          <>
            {/* Header row with title + create button */}
            <View style={styles.communitiesHeader}>
              <Text style={styles.sectionTitle}>All Communities</Text>
              <TouchableOpacity
                style={styles.createCommunityBtn}
                onPress={handleOpenCreateCommunityModal}
              >
                <Text style={styles.createCommunityBtnText}>+ Create</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.emptyStateText}>Loading communities...</Text>
              </View>
            ) : communities.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>👥</Text>
                <Text style={styles.emptyStateTitle}>No Communities Yet</Text>
                <Text style={styles.emptyStateText}>
                  Be the first to create a community!
                </Text>
              </View>
            ) : (
              communities.map((community: Community) => (
                <View key={community.id} style={styles.communityCard}>
                  <View style={styles.communityInfo}>
                    {/* Colored icon background derived from community's stored color */}
                    <View style={[styles.communityIcon, { backgroundColor: getCommunityColor(community) }]}>
                      <Text style={styles.communityIconText}>{community.icon}</Text>
                    </View>
                    <View style={styles.communityTextBlock}>
                      <Text style={styles.communityName}>{community.name}</Text>
                      <Text style={styles.communityMembers}>
                        {community.member_count.toLocaleString()} {community.member_count === 1 ? 'member' : 'members'}
                      </Text>
                      {community.description ? (
                        <Text style={styles.communityDescription} numberOfLines={1}>
                          {community.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.joinButton, community.is_joined && styles.joinedButton]}
                    onPress={() => handleJoinCommunity(community.id)}
                  >
                    <Text style={[styles.joinButtonText, community.is_joined && styles.joinedButtonText]}>
                      {community.is_joined ? 'Joined' : 'Join'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {/* People Tab */}
        {activeTab === 'people' && (
          <>
            <View style={styles.peopleSearchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search people..."
                placeholderTextColor={colors.textSecondary}
                value={peopleSearch}
                onChangeText={setPeopleSearch}
                autoCapitalize="none"
              />
            </View>

            {peopleLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.emptyStateText}>Finding people...</Text>
              </View>
            ) : people.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>👤</Text>
                <Text style={styles.emptyStateTitle}>No People Yet</Text>
                <Text style={styles.emptyStateText}>
                  Be the first to join the GIDI community!
                </Text>
              </View>
            ) : (
              people
                .filter(p =>
                  !peopleSearch.trim() ||
                  p.full_name.toLowerCase().includes(peopleSearch.toLowerCase())
                )
                .map(person => (
                  <TouchableOpacity
                    key={person.user_id}
                    style={styles.personCard}
                    onPress={() => openUserProfile(person.user_id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.personAvatarWrap}>
                      {person.avatar_url ? (
                        <Image source={{ uri: person.avatar_url }} style={styles.personAvatarImg} />
                      ) : (
                        <Text style={styles.personAvatarText}>
                          {getInitials(person.full_name)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.personInfo}>
                      <Text style={styles.personName}>{person.full_name}</Text>
                      <Text style={styles.personFollowers}>
                        {person.followers_count} {person.followers_count === 1 ? 'follower' : 'followers'}
                      </Text>
                      {person.bio ? (
                        <Text style={styles.personBio} numberOfLines={1}>{person.bio}</Text>
                      ) : null}
                    </View>
                    {currentUserId ? (
                      <TouchableOpacity
                        style={[
                          styles.followBtn,
                          person.is_following && styles.followingBtn,
                        ]}
                        onPress={() => handleFollowToggle(person.user_id)}
                      >
                        <Text style={[
                          styles.followBtnText,
                          person.is_following && styles.followingBtnText,
                        ]}>
                          {person.is_following ? 'Following' : 'Follow'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </TouchableOpacity>
                ))
            )}
          </>
        )}
      </ScrollView>

      {/* Create Post Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingPost ? 'Edit Post' : 'Create Post'}</Text>
              <TouchableOpacity
                onPress={handleCreatePost}
                disabled={submitting || !postContent.trim()}
              >
                <Text style={[
                  styles.modalSubmit,
                  (!postContent.trim() || submitting) && styles.modalSubmitDisabled
                ]}>
                  {submitting ? (editingPost ? 'Updating...' : 'Posting...') : (editingPost ? 'Update' : 'Post')}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Content Input */}
              <TextInput
                style={styles.modalTextArea}
                placeholder="What's on your mind?"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                value={postContent}
                onChangeText={setPostContent}
                maxLength={500}
              />

              {/* Character Count */}
              <Text style={styles.charCount}>{postContent.length}/500</Text>

              {/* Location Input */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>📍 Location (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Where are you?"
                  placeholderTextColor={colors.textSecondary}
                  value={postLocation}
                  onChangeText={setPostLocation}
                />
              </View>

              {/* Community Selection */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>👥 Community (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.communityOptions}>
                    <TouchableOpacity
                      style={[
                        styles.communityOption,
                        selectedCommunity === null && styles.communityOptionSelected
                      ]}
                      onPress={() => setSelectedCommunity(null)}
                    >
                      <Text style={styles.communityOptionText}>General</Text>
                    </TouchableOpacity>
                    {communities.slice(0, 5).map((community) => (
                      <TouchableOpacity
                        key={community.id}
                        style={[
                          styles.communityOption,
                          selectedCommunity === community.id && styles.communityOptionSelected
                        ]}
                        onPress={() => setSelectedCommunity(community.id)}
                      >
                        <Text style={styles.communityOptionIcon}>{community.icon}</Text>
                        <Text style={styles.communityOptionText}>{community.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Image Picker */}
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={handlePickImage}
              >
                <Text style={styles.imagePickerIcon}>📷</Text>
                <Text style={styles.imagePickerText}>
                  {selectedImage ? 'Change Image' : 'Add Image'}
                </Text>
              </TouchableOpacity>

              {selectedImage && (
                <View style={styles.imagePreview}>
                  <Text style={styles.imagePreviewText}>✓ Image selected</Text>
                  <TouchableOpacity onPress={() => setSelectedImage(null)}>
                    <Text style={styles.imageRemove}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Create Community Modal */}
      <Modal
        visible={showCreateCommunityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateCommunityModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateCommunityModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Community</Text>
              <TouchableOpacity
                onPress={handleCreateCommunity}
                disabled={creatingCommunity || !newCommunityName.trim()}
              >
                <Text style={[
                  styles.modalSubmit,
                  (!newCommunityName.trim() || creatingCommunity) && styles.modalSubmitDisabled
                ]}>
                  {creatingCommunity ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              {/* Live Preview */}
              <View style={styles.ccPreviewRow}>
                <View style={[styles.ccPreviewIcon, { backgroundColor: newCommunityColor }]}>
                  <Text style={styles.ccPreviewEmoji}>{newCommunityEmoji}</Text>
                </View>
                <View style={styles.ccPreviewText}>
                  <Text style={styles.ccPreviewName} numberOfLines={1}>
                    {newCommunityName.trim() || 'Community name'}
                  </Text>
                  <Text style={styles.ccPreviewMeta}>0 members</Text>
                </View>
              </View>

              {/* Name Input */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Community Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Lekki Foodies"
                  placeholderTextColor={colors.textSecondary}
                  value={newCommunityName}
                  onChangeText={setNewCommunityName}
                  maxLength={50}
                  autoCapitalize="words"
                />
              </View>

              {/* Description Input */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.modalInput, { minHeight: 72, textAlignVertical: 'top' }]}
                  placeholder="What is this community about?"
                  placeholderTextColor={colors.textSecondary}
                  value={newCommunityDescription}
                  onChangeText={setNewCommunityDescription}
                  maxLength={200}
                  multiline
                />
              </View>

              {/* Emoji Picker */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Choose Icon</Text>
                <View style={styles.emojiGrid}>
                  {COMMUNITY_EMOJIS.map((emoji, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.emojiCell,
                        newCommunityEmoji === emoji && { backgroundColor: newCommunityColor, borderColor: newCommunityColor },
                      ]}
                      onPress={() => setNewCommunityEmoji(emoji)}
                    >
                      <Text style={styles.emojiCellText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Color Picker */}
              <View style={[styles.modalInputGroup, { marginBottom: 32 }]}>
                <Text style={styles.modalInputLabel}>Choose Color</Text>
                <View style={styles.colorRow}>
                  {COLOR_PALETTE.map((item) => (
                    <TouchableOpacity
                      key={item.color}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: item.color },
                        newCommunityColor === item.color && styles.colorSwatchSelected,
                      ]}
                      onPress={() => setNewCommunityColor(item.color)}
                    />
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* User Profile Modal */}
      <Modal
        visible={!!viewingProfile}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setViewingProfile(null)}
      >
        <SafeAreaView style={styles.container}>
          {/* Modal Header */}
          <View style={styles.profileModalHeader}>
            <TouchableOpacity onPress={() => setViewingProfile(null)} style={styles.profileModalBack}>
              <Text style={styles.profileModalBackText}>← Back</Text>
            </TouchableOpacity>
          </View>

          {viewingProfileLoading || !viewingProfile?.full_name ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Profile Header */}
              <View style={styles.profileModalInfo}>
                <View style={styles.profileModalAvatar}>
                  {viewingProfile.avatar_url ? (
                    <Image source={{ uri: viewingProfile.avatar_url }} style={styles.profileModalAvatarImg} />
                  ) : (
                    <Text style={styles.profileModalAvatarText}>
                      {getInitials(viewingProfile.full_name)}
                    </Text>
                  )}
                </View>
                <Text style={styles.profileModalName}>{viewingProfile.full_name}</Text>
                {viewingProfile.bio ? (
                  <Text style={styles.profileModalBio}>{viewingProfile.bio}</Text>
                ) : null}

                {/* Stats row */}
                <View style={styles.profileModalStats}>
                  <View style={styles.profileModalStat}>
                    <Text style={styles.profileModalStatNum}>{viewingProfilePosts.length}</Text>
                    <Text style={styles.profileModalStatLabel}>Posts</Text>
                  </View>
                  <View style={styles.profileModalStatDivider} />
                  <View style={styles.profileModalStat}>
                    <Text style={styles.profileModalStatNum}>{viewingProfile.followers_count}</Text>
                    <Text style={styles.profileModalStatLabel}>Followers</Text>
                  </View>
                  <View style={styles.profileModalStatDivider} />
                  <View style={styles.profileModalStat}>
                    <Text style={styles.profileModalStatNum}>{viewingProfile.following_count}</Text>
                    <Text style={styles.profileModalStatLabel}>Following</Text>
                  </View>
                </View>

                {/* Follow / Unfollow */}
                {currentUserId ? (
                  <TouchableOpacity
                    style={[
                      styles.profileModalFollowBtn,
                      viewingProfile.is_following && styles.profileModalFollowingBtn,
                    ]}
                    onPress={() => handleFollowToggle(viewingProfile.user_id)}
                  >
                    <Text style={[
                      styles.profileModalFollowBtnText,
                      viewingProfile.is_following && styles.profileModalFollowingBtnText,
                    ]}>
                      {viewingProfile.is_following ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Posts grid */}
              {viewingProfilePosts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>📝</Text>
                  <Text style={styles.emptyStateText}>No posts yet</Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginBottom: 8 }]}>Posts</Text>
                  {viewingProfilePosts.map(post => (
                    <View key={post.id} style={[styles.postCard, { marginHorizontal: 16 }]}>
                      <Text style={styles.postContentText}>{post.content}</Text>
                      {post.media_urls && post.media_urls.length > 0 && (
                        <PostImage uri={post.media_urls[0]} style={styles.postImage} />
                      )}
                      <View style={[styles.postActions, { marginTop: 8 }]}>
                        <View style={styles.actionButton}>
                          <Text style={styles.actionIcon}>👍</Text>
                          <Text style={styles.actionText}>{post.likes_count || 0}</Text>
                        </View>
                        <View style={styles.actionButton}>
                          <Text style={styles.actionIcon}>💬</Text>
                          <Text style={styles.actionText}>{post.comments_count || 0}</Text>
                        </View>
                        <Text style={styles.postMetaText}>{formatTimeAgo(post.created_at)}</Text>
                      </View>
                    </View>
                  ))}
                  <View style={{ height: 32 }} />
                </>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '600',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontSize: 20,
    fontFamily: 'Orbitron_900Black',
    color: colors.primary,
    letterSpacing: 2,
  },
  headerIcon: {
    fontSize: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 16,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  createPostIcon: {
    fontSize: 20,
  },
  createPostText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  postCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.background,
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postMetaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  postMenu: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  menuButtonText: {
    fontSize: 16,
  },
  postContent: {
    marginBottom: 12,
  },
  postContentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  postContentText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 10,
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  communityIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityIconText: {
    fontSize: 24,
    fontFamily: '',
  },
  communityName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  communityMembers: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  joinButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  joinedButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  joinButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.background,
  },
  joinedButtonText: {
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    opacity: 0.5,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalClose: {
    fontSize: 24,
    color: colors.textSecondary,
    width: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalSubmit: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    width: 80,
    textAlign: 'right',
  },
  modalSubmitDisabled: {
    color: colors.textSecondary,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTextArea: {
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
  modalInputGroup: {
    marginBottom: 20,
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  modalInput: {
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
  imagePickerButton: {
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
  imagePickerIcon: {
    fontSize: 20,
  },
  imagePickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  imagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 80,
  },
  imagePreviewText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
  },
  imageRemove: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },

  // ── Communities tab ──────────────────────────────────────────────────
  communitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  createCommunityBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createCommunityBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background,
  },
  communityTextBlock: {
    flex: 1,
  },
  communityDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ── Create Community Modal ────────────────────────────────────────────
  // Preview row
  ccPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  ccPreviewIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ccPreviewEmoji: {
    fontSize: 28,
    fontFamily: '',
  },
  ccPreviewText: {
    flex: 1,
  },
  ccPreviewName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  ccPreviewMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Emoji grid
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiCell: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiCellText: {
    fontSize: 22,
    fontFamily: '',
  },

  // Color palette
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: colors.text,
    transform: [{ scale: 1.15 }],
  },

  // ── People tab ────────────────────────────────────────────────────────
  peopleSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 44,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  personAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  personAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  personAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  personFollowers: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  personBio: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  followingBtnText: {
    color: colors.primary,
  },

  // ── User Profile Modal ────────────────────────────────────────────────
  profileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileModalBack: {
    paddingVertical: 4,
    paddingRight: 16,
  },
  profileModalBackText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  profileModalInfo: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileModalAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  profileModalAvatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  profileModalAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  profileModalName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  profileModalBio: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 280,
    lineHeight: 20,
  },
  profileModalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginBottom: 20,
  },
  profileModalStat: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  profileModalStatNum: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  profileModalStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  profileModalStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  profileModalFollowBtn: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  profileModalFollowingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  profileModalFollowBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  profileModalFollowingBtnText: {
    color: colors.primary,
  },
});
