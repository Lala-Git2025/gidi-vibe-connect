import { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform,
  Image, Animated, Easing, Dimensions, Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme, polished } from '../contexts/ThemeContext';
import { supabase } from '../config/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { PostGrid } from '../components/PostGrid';
import { EditingPost } from '../components/CreatePostModal';
import { useCreatePostModal } from '../contexts/CreatePostModalContext';
import { COMMUNITY_ICON_MAP } from '../constants/communityIcons';
import { SocialDrawer, DrawerView } from '../components/SocialDrawer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Curated emoji library organized by Lagos-relevant categories
const COMMUNITY_EMOJIS = [
  // Nightlife
  '\u{1F319}', '\u{1F378}', '\u{1F3B5}', '\u{1F389}', '\u{1F57A}', '\u{1F483}', '\u{1F3A4}', '\u{1F3B6}',
  // Food & Drink
  '\u{1F37D}', '\u{1F355}', '\u{1F32E}', '\u{2615}', '\u{1F958}', '\u{1F969}', '\u{1F35C}', '\u{1F377}',
  // Sports & Fitness
  '\u{26BD}', '\u{1F3C0}', '\u{1F3BE}', '\u{1F3CB}', '\u{1F3C6}', '\u{1F3AF}', '\u{1F3CA}', '\u{1F938}',
  // Culture & Arts
  '\u{1F3A8}', '\u{1F3AD}', '\u{1F4DA}', '\u{1F3AC}', '\u{1F4F8}', '\u{1F3AA}', '\u{1F3B8}', '\u{1F5BC}',
  // Lagos Neighbourhoods
  '\u{1F3DD}', '\u{1F30A}', '\u{1F3E2}', '\u{1F306}', '\u{1F303}', '\u{2708}', '\u{1F3D8}', '\u{1F5FA}',
  // Business & Social
  '\u{1F4BC}', '\u{1F4B0}', '\u{1F4C8}', '\u{1F4A1}', '\u{1F91D}', '\u{1F465}', '\u{2764}', '\u{1F31F}',
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
    username?: string | null;
    avatar_url?: string | null;
  };
  communities?: {
    name: string;
  };
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url?: string | null;
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
  const insets = useSafeAreaInsets();

  // ── Drawer state ────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<DrawerView>('feed');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [selectedCommunityName, setSelectedCommunityName] = useState<string>('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { open: openComposer } = useCreatePostModal();

  // ── Data state ──────────────────────────────────────────────────────
  const [communities, setCommunities] = useState<Community[]>([]);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  // showCreateModal + editingPost state removed — composer is now app-level
  // (mounted once via CreatePostModalProvider). Opened via openComposer().
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');

  // Create community modal state
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');
  const [newCommunityEmoji, setNewCommunityEmoji] = useState('\u{1F319}');
  const [newCommunityColor, setNewCommunityColor] = useState('#4338CA');
  const [creatingCommunity, setCreatingCommunity] = useState(false);

  // Feed search
  const [feedSearch, setFeedSearch] = useState('');

  // People tab state
  const [people, setPeople] = useState<PeopleProfile[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [peopleSearch, setPeopleSearch] = useState('');

  // User profile modal state
  const [viewingProfile, setViewingProfile] = useState<PeopleProfile | null>(null);
  const [viewingProfilePosts, setViewingProfilePosts] = useState<Post[]>([]);
  const [viewingProfileLoading, setViewingProfileLoading] = useState(false);

  // Likes / Comments state
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [commentsModalPost, setCommentsModalPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const styles = getStyles(colors, insets);

  // Pulsing green "live" dot — same pattern as HomeScreen's polished header.
  const livePulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, {
          toValue: 0.4, duration: 800,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(livePulse, {
          toValue: 1, duration: 800,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [livePulse]);

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

  // ── Drawer animation ───────────────────────────────────────────────
  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setDrawerVisible(false));
  };

  // ── Drawer navigation handlers ─────────────────────────────────────
  const handleSelectFeed = () => {
    setCurrentView('feed');
    setSelectedCommunityId(null);
    setSelectedCommunityName('');
  };

  const handleSelectCommunities = () => {
    setCurrentView('communities');
    setSelectedCommunityId(null);
    setSelectedCommunityName('');
  };

  const handleSelectCommunity = (community: Community) => {
    setCurrentView('community');
    setSelectedCommunityId(community.id);
    setSelectedCommunityName(community.name);
  };

  const handleSelectPeople = () => {
    setCurrentView('people');
    setSelectedCommunityId(null);
    if (people.length === 0) fetchPeople();
  };

  // Top-level inline tabs replace the hamburger-drawer primary nav.
  const handleTabPress = (tab: 'feed' | 'communities' | 'people') => {
    if (tab === 'feed') handleSelectFeed();
    else if (tab === 'communities') handleSelectCommunities();
    else if (tab === 'people') handleSelectPeople();
  };

  // ── Data fetching ──────────────────────────────────────────────────
  // Auth (current user, likes set, etc.) only needs to load once on mount.
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Refetch feed posts + communities on every focus so newly-created posts
  // and joined/left communities reflect immediately after navigating back.
  useFocusEffect(
    useCallback(() => {
      fetchFeedPosts();
      fetchCommunities();
    }, []),
  );

  const fetchCurrentUser = async () => {
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (authError || !user) return;

    setCurrentUserId(user.id);
    fetchUserLikes(user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', user.id)
      .single();

    const authFullName = user.user_metadata?.full_name;
    const emailUsername = user.email?.split('@')[0];
    const nameToUse = authFullName || emailUsername || 'User';

    if (!profile) {
      await supabase.from('profiles').upsert(
        { user_id: user.id, full_name: nameToUse, role: 'Consumer' },
        { onConflict: 'user_id', ignoreDuplicates: false }
      );
      setCurrentUserName(nameToUse);
    } else if (!profile.full_name || profile.full_name.trim() === '') {
      await supabase
        .from('profiles')
        .update({ full_name: nameToUse })
        .eq('user_id', user.id);
      setCurrentUserName(nameToUse);
    } else {
      setCurrentUserName(profile.full_name);
      setCurrentUserAvatar(profile.avatar_url ?? null);
    }
  };

  const fetchCommunities = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;

      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('is_active', true)
        .order('member_count', { ascending: false });

      if (error) throw error;

      if (data) {
        let joinedIds = new Set<string>();
        if (uid) {
          const { data: memberRows } = await supabase
            .from('community_members')
            .select('community_id')
            .eq('user_id', uid);
          joinedIds = new Set((memberRows ?? []).map((r: any) => r.community_id as string));
        }

        setCommunities(data.map(community => ({
          ...community,
          is_joined: joinedIds.has(community.id),
        })));
      }
    } catch (error) {
      console.error('Error fetching communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedPosts = async () => {
    try {
      const { data: posts, error } = await supabase
        .from('social_posts')
        .select('*, communities(name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!posts || posts.length === 0) { setFeedPosts([]); return; }

      const userIds = [...new Set(posts.map((p: any) => p.user_id as string))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

      const mergedPosts = posts.map((post: any) => ({
        ...post,
        profiles: profileMap.get(post.user_id) ?? null,
      }));
      setFeedPosts(mergedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to join communities');
      return;
    }

    const community = communities.find(c => c.id === communityId);
    if (!community) return;
    const isJoined = community.is_joined;

    setCommunities(prev => prev.map(c =>
      c.id === communityId
        ? { ...c, is_joined: !isJoined, member_count: c.member_count + (isJoined ? -1 : 1) }
        : c
    ));

    try {
      if (isJoined) {
        const { error } = await supabase
          .from('community_members')
          .delete()
          .eq('user_id', user.id)
          .eq('community_id', communityId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('community_members')
          .insert({ user_id: user.id, community_id: communityId, role: 'member' });
        if (error) throw error;
      }
    } catch (error: any) {
      setCommunities(prev => prev.map(c =>
        c.id === communityId
          ? { ...c, is_joined: isJoined, member_count: community.member_count }
          : c
      ));
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

    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleEditPost = (post: Post) => {
    openComposer({
      editingPost: post as unknown as EditingPost,
      onPostCreated: fetchFeedPosts,
    });
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
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
    openComposer({ onPostCreated: fetchFeedPosts });
  };

  const handleOpenCreateCommunityModal = () => {
    setNewCommunityName('');
    setNewCommunityDescription('');
    setNewCommunityEmoji('\u{1F319}');
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
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
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

    const newIds = new Set(followingIds);
    if (isCurrentlyFollowing) newIds.delete(targetUserId);
    else newIds.add(targetUserId);
    setFollowingIds(newIds);

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
    if (userId === currentUserId) return;

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

  // ── Likes / Comments / Share ───────────────────────────────────────
  const fetchUserLikes = async (uid: string) => {
    const { data } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', uid);
    if (data) setLikedPostIds(new Set(data.map((r: any) => r.post_id as string)));
  };

  const handleLikeToggle = async (post: Post) => {
    if (!currentUserId) {
      Alert.alert('Sign In Required', 'Please sign in to like posts.');
      return;
    }

    const isLiked = likedPostIds.has(post.id);

    // Optimistic update
    const newLiked = new Set(likedPostIds);
    if (isLiked) newLiked.delete(post.id);
    else newLiked.add(post.id);
    setLikedPostIds(newLiked);

    setFeedPosts(prev => prev.map(p =>
      p.id === post.id
        ? { ...p, likes_count: (p.likes_count || 0) + (isLiked ? -1 : 1) }
        : p
    ));

    try {
      if (isLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId);
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: post.id, user_id: currentUserId });
      }
      // social_posts.likes_count is updated by the trg_update_post_likes_count
      // trigger — no manual sync needed.
    } catch (err) {
      // Revert on error
      console.error('Like toggle error:', err);
      setLikedPostIds(likedPostIds);
      setFeedPosts(prev => prev.map(p =>
        p.id === post.id ? { ...p, likes_count: post.likes_count } : p
      ));
    }
  };

  const handleShare = async (post: Post) => {
    const authorName = post.profiles?.full_name?.trim() || 'someone on Gidi Connect';
    const message = `"${post.content}"\n\n— ${authorName} on Gidi Connect`;
    const hasImage = !!(post.media_urls && post.media_urls.length > 0);

    // Text-only post → use the platform Share sheet
    if (!hasImage) {
      try {
        await Share.share({ message, title: 'Post from Gidi Connect' });
      } catch (err) {
        console.error('Share error:', err);
      }
      return;
    }

    // Image post → download to cache and share the file as an attachment
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        await Share.share({ message, title: 'Post from Gidi Connect' });
        return;
      }

      const url = post.media_urls![0];
      const ext = (url.split('.').pop()?.split('?')[0] || 'jpg').toLowerCase();
      const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
      const filename = `gidi-share-${post.id}.${safeExt}`;
      const mimeType = safeExt === 'png' ? 'image/png'
        : safeExt === 'webp' ? 'image/webp'
        : safeExt === 'gif' ? 'image/gif'
        : 'image/jpeg';

      const file = await File.downloadFileAsync(
        url,
        new File(Paths.cache, filename),
        { idempotent: true }
      );

      await Sharing.shareAsync(file.uri, {
        mimeType,
        dialogTitle: 'Share post',
        UTI: safeExt === 'png' ? 'public.png' : 'public.jpeg',
      });
    } catch (err) {
      console.error('Image share failed, falling back to text:', err);
      try {
        await Share.share({ message, title: 'Post from Gidi Connect' });
      } catch {}
    }
  };

  const openComments = async (post: Post) => {
    setCommentsModalPost(post);
    setComments([]);
    setCommentsLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!rows || rows.length === 0) { setComments([]); return; }

      const userIds = [...new Set(rows.map((r: any) => r.user_id as string))];
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profMap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      setComments(rows.map((r: any) => ({ ...r, profiles: profMap.get(r.user_id) ?? null })));
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const submitComment = async () => {
    if (!commentsModalPost || !newComment.trim()) return;
    if (!currentUserId) {
      Alert.alert('Sign In Required', 'Please sign in to comment.');
      return;
    }

    setSubmittingComment(true);
    const content = newComment.trim();
    try {
      const { data: inserted, error } = await supabase
        .from('comments')
        .insert({ post_id: commentsModalPost.id, user_id: currentUserId, content })
        .select()
        .single();
      if (error) throw error;

      // Append to list with current user's profile
      const myProfile = {
        full_name: currentUserName || 'You',
        avatar_url: currentUserAvatar,
      };
      setComments(prev => [...prev, { ...(inserted as any), profiles: myProfile }]);
      setNewComment('');

      // Optimistically reflect the new count locally. The authoritative
      // social_posts.comments_count is updated by the
      // trg_update_post_comments_count trigger — no manual sync needed.
      const newCount = (commentsModalPost.comments_count || 0) + 1;
      setFeedPosts(prev => prev.map(p =>
        p.id === commentsModalPost.id ? { ...p, comments_count: newCount } : p
      ));
      setCommentsModalPost(prev => prev ? { ...prev, comments_count: newCount } : null);
    } catch (err) {
      console.error('Submit comment error:', err);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // ── Derived data ───────────────────────────────────────────────────
  const joinedCommunities = communities.filter(c => c.is_joined);

  const getHeaderTitle = (): string => {
    if (currentView === 'people') return 'People';
    if (currentView === 'community' && selectedCommunityName) return selectedCommunityName;
    return 'Home Feed';
  };

  // Filter posts based on current view
  const getVisiblePosts = (): Post[] => {
    let posts = feedPosts;

    // Community-specific filter
    if (currentView === 'community' && selectedCommunityId) {
      posts = posts.filter(p => p.community_id === selectedCommunityId);
    }

    // Search filter
    if (feedSearch.trim()) {
      const q = feedSearch.toLowerCase();
      posts = posts.filter(post =>
        post.content.toLowerCase().includes(q) ||
        (post.profiles?.full_name ?? '').toLowerCase().includes(q) ||
        (post.communities?.name ?? '').toLowerCase().includes(q)
      );
    }

    return posts;
  };

  if (!fontsLoaded) return null;

  const visiblePosts = getVisiblePosts();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={openDrawer}
          style={styles.hamburgerBtn}
          accessibilityLabel="Open menu"
          accessibilityRole="button"
        >
          <Ionicons name="menu" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>{getHeaderTitle()}</Text>
          {currentView === 'feed' && (
            <Animated.View style={[styles.headerLiveDot, { opacity: livePulse }]} />
          )}
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {}}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            <View style={styles.headerNotifPip} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Polished segmented tabs (Feed | Communities | People) ── */}
      {currentView !== 'community' && (
        <View style={styles.tabsRow}>
          {(['feed', 'communities', 'people'] as const).map((t) => {
            const active = currentView === t;
            const label = t === 'feed' ? 'Feed' : t === 'communities' ? 'Communities' : 'People';
            const inner = (
              <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
            );
            return active ? (
              <TouchableOpacity
                key={t}
                onPress={() => handleTabPress(t)}
                style={styles.tabBtnActiveWrap}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#FDE047', '#EAB308']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.tabBtnActiveGradient}
                >
                  {inner}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                key={t}
                onPress={() => handleTabPress(t)}
                style={styles.tabBtn}
                activeOpacity={0.7}
              >
                {inner}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Search Bar (feed / community views) ────────────────────── */}
      {(currentView === 'feed' || currentView === 'community') && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={currentView === 'community' ? `Search in ${selectedCommunityName}...` : 'Search posts...'}
            placeholderTextColor={colors.textSecondary}
            value={feedSearch}
            onChangeText={setFeedSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {feedSearch.length > 0 && (
            <TouchableOpacity onPress={() => setFeedSearch('')}>
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Community Info Bar ─────────────────────────────────────── */}
      {currentView === 'community' && selectedCommunityId && (() => {
        const comm = communities.find(c => c.id === selectedCommunityId);
        if (!comm) return null;
        return (
          <View style={styles.communityInfoBar}>
            <View style={[styles.communityInfoDot, { backgroundColor: getCommunityColor(comm) }]}>
              <Text style={styles.communityInfoIcon}>{COMMUNITY_ICON_MAP[comm.name] ?? comm.icon}</Text>
            </View>
            <View style={styles.communityInfoText}>
              <Text style={styles.communityInfoName}>{comm.name}</Text>
              <Text style={styles.communityInfoMembers}>
                {comm.member_count} {comm.member_count === 1 ? 'member' : 'members'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.communityJoinBtn, comm.is_joined && styles.communityJoinedBtn]}
              onPress={() => handleJoinCommunity(comm.id)}
            >
              <Text style={[styles.communityJoinBtnText, comm.is_joined && styles.communityJoinedBtnText]}>
                {comm.is_joined ? 'Joined' : 'Join'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* ── Main Content ───────────────────────────────────────────── */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Composer card — only on the top-level Feed view (not inside a community) */}
        {currentView === 'feed' && currentUserId && (
          <View style={styles.composerCard}>
            <View style={styles.composerAvatar}>
              {currentUserAvatar ? (
                <Image source={{ uri: currentUserAvatar }} style={styles.composerAvatarImg} />
              ) : (
                <Text style={styles.composerAvatarText}>{getInitials(currentUserName || 'You')}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.composerInputBtn}
              onPress={handleOpenCreateModal}
              activeOpacity={0.85}
            >
              <Text style={styles.composerPlaceholder}>Share a vibe with Lagos…</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.composerCameraBtn}
              onPress={handleOpenCreateModal}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FDE047', '#EAB308']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.composerCameraGradient}
              >
                <Ionicons name="camera" size={18} color="#18181B" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Feed / Community Feed View */}
        {(currentView === 'feed' || currentView === 'community') && (
          <>
            {visiblePosts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name={currentView === 'community' ? 'people-outline' : 'chatbubble-outline'}
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyStateTitle}>
                  {currentView === 'community' ? 'No Posts in This Community' : 'No Posts Yet'}
                </Text>
                <Text style={styles.emptyStateText}>
                  {currentView === 'community'
                    ? 'Be the first to post in this community!'
                    : 'Be the first to share something with the community!'}
                </Text>
              </View>
            ) : (
              visiblePosts.map((post: Post) => (
                <View key={post.id} style={styles.postCard}>
                  {/* Post Header */}
                  <View style={styles.postHeader}>
                    <TouchableOpacity onPress={() => openUserProfile(post.user_id)}>
                      <View style={styles.avatar}>
                        {post.profiles?.avatar_url ? (
                          <Image source={{ uri: post.profiles.avatar_url }} style={styles.avatarImg} />
                        ) : (
                          <Text style={styles.avatarText}>
                            {getInitials(
                              post.profiles?.full_name?.trim() ||
                              post.profiles?.username?.trim() ||
                              'A'
                            )}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                    <View style={styles.postAuthorInfo}>
                      <TouchableOpacity onPress={() => openUserProfile(post.user_id)}>
                        <Text style={styles.postAuthor}>
                          {post.profiles?.full_name?.trim() ||
                           (post.profiles?.username ? `@${post.profiles.username}` : 'Anonymous User')}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.postMeta}>
                        {post.communities?.name && currentView !== 'community' && (
                          <>
                            <Text style={styles.postCommunityTag}>{post.communities.name}</Text>
                            <Text style={styles.postMetaText}> · </Text>
                          </>
                        )}
                        <Text style={styles.postMetaText}>{formatTimeAgo(post.created_at)}</Text>
                      </View>
                    </View>
                    {currentUserId === post.user_id && (
                      <View style={styles.postMenu}>
                        <TouchableOpacity
                          style={styles.menuButton}
                          onPress={() => handleEditPost(post)}
                        >
                          <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.menuButton, styles.menuButtonDelete]}
                          onPress={() => handleDeletePost(post.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.error} />
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
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleLikeToggle(post)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={likedPostIds.has(post.id) ? 'heart' : 'heart-outline'}
                        size={20}
                        color={likedPostIds.has(post.id) ? '#E11D48' : colors.textSecondary}
                      />
                      <Text style={[
                        styles.actionText,
                        likedPostIds.has(post.id) && { color: '#E11D48' },
                      ]}>
                        {post.likes_count || 0}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openComments(post)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                      <Text style={styles.actionText}>{post.comments_count || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleShare(post)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            <View style={{ height: 80 }} />
          </>
        )}

        {/* Communities View — polished gradient-emoji cards */}
        {currentView === 'communities' && (
          <>
            {/* Create community CTA */}
            <TouchableOpacity
              style={styles.createCommunityRow}
              onPress={handleOpenCreateCommunityModal}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FDE047', '#EAB308']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createCommunityIcon}
              >
                <Ionicons name="add" size={20} color="#18181B" />
              </LinearGradient>
              <Text style={styles.createCommunityText}>Start a community</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {communities.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-circle-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyStateTitle}>No Communities Yet</Text>
                <Text style={styles.emptyStateText}>Be the first to start one for your part of Lagos.</Text>
              </View>
            ) : (
              communities.map((comm) => {
                const color = getCommunityColor(comm);
                const icon = COMMUNITY_ICON_MAP[comm.name] ?? comm.icon;
                return (
                  <TouchableOpacity
                    key={comm.id}
                    style={styles.communityCard}
                    onPress={() => handleSelectCommunity(comm)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[color, color + '88']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.communityCardEmoji}
                    >
                      <Text style={styles.communityCardEmojiText}>{icon}</Text>
                    </LinearGradient>
                    <View style={styles.communityCardInfo}>
                      <Text style={styles.communityCardName} numberOfLines={1}>{comm.name}</Text>
                      <Text style={styles.communityCardMeta}>
                        <Text style={styles.communityCardMembers}>{comm.member_count}</Text>
                        {comm.member_count === 1 ? ' member' : ' members'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation?.(); handleJoinCommunity(comm.id); }}
                      activeOpacity={0.85}
                    >
                      {comm.is_joined ? (
                        <View style={styles.communityCardJoinedBtn}>
                          <Text style={styles.communityCardJoinedText}>Joined</Text>
                        </View>
                      ) : (
                        <LinearGradient
                          colors={['#FDE047', '#EAB308']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={styles.communityCardJoinBtn}
                        >
                          <Text style={styles.communityCardJoinText}>Join</Text>
                        </LinearGradient>
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 80 }} />
          </>
        )}

        {/* People View */}
        {currentView === 'people' && (
          <>
            <View style={styles.peopleSearchBar}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
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
                <Ionicons name="person-outline" size={48} color={colors.textSecondary} />
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
                .map(person => {
                  // "HOT" badge for people who have meaningful audience — matches the V2 polish.
                  const isHot = person.followers_count >= 1000;
                  return (
                    <TouchableOpacity
                      key={person.user_id}
                      style={styles.personCard}
                      onPress={() => openUserProfile(person.user_id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.personAvatarOuter}>
                        <View style={styles.personAvatarWrap}>
                          {person.avatar_url ? (
                            <Image source={{ uri: person.avatar_url }} style={styles.personAvatarImg} />
                          ) : (
                            <Text style={styles.personAvatarText}>
                              {getInitials(person.full_name)}
                            </Text>
                          )}
                        </View>
                        {isHot && (
                          <LinearGradient
                            colors={['#FDE047', '#EAB308']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.personHotBadge}
                          >
                            <Text style={styles.personHotBadgeText}>HOT</Text>
                          </LinearGradient>
                        )}
                      </View>
                      <View style={styles.personInfo}>
                        <Text style={styles.personName}>{person.full_name}</Text>
                        {person.bio ? (
                          <Text style={styles.personBio} numberOfLines={1}>{person.bio}</Text>
                        ) : null}
                        <Text style={styles.personFollowers}>
                          <Text style={styles.personFollowersNum}>{person.followers_count.toLocaleString()}</Text>
                          {person.followers_count === 1 ? ' follower' : ' followers'}
                        </Text>
                      </View>
                      {currentUserId ? (
                        <TouchableOpacity
                          onPress={() => handleFollowToggle(person.user_id)}
                          activeOpacity={0.85}
                        >
                          {person.is_following ? (
                            <View style={styles.followingBtn}>
                              <Text style={styles.followingBtnText}>Following</Text>
                            </View>
                          ) : (
                            <LinearGradient
                              colors={['#FDE047', '#EAB308']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 0, y: 1 }}
                              style={styles.followBtn}
                            >
                              <Text style={styles.followBtnText}>Follow</Text>
                            </LinearGradient>
                          )}
                        </TouchableOpacity>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
            )}
            <View style={{ height: 80 }} />
          </>
        )}
      </ScrollView>

      {/* ── Floating Action Button ─────────────────────────────────── */}
      {currentView !== 'people' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleOpenCreateModal}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#000" />
        </TouchableOpacity>
      )}

      {/* ── Slide-out Drawer ───────────────────────────────────────── */}
      <SocialDrawer
        visible={drawerVisible}
        onClose={closeDrawer}
        communities={communities}
        joinedCommunities={joinedCommunities}
        onSelectFeed={handleSelectFeed}
        onSelectCommunity={handleSelectCommunity}
        onSelectPeople={handleSelectPeople}
        onCreateCommunity={handleOpenCreateCommunityModal}
        currentView={currentView}
        selectedCommunityId={selectedCommunityId}
        avatarUrl={currentUserAvatar}
        userName={currentUserName}
        slideAnim={slideAnim}
      />

      {/* CreatePostModal is mounted once at App.tsx via CreatePostModalProvider.
          Open it via handleOpenCreateModal / handleEditPost above. */}

      {/* ── Create Community Modal ─────────────────────────────────── */}
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
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateCommunityModal(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
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

      {/* ── User Profile Modal ─────────────────────────────────────── */}
      <Modal
        visible={!!viewingProfile}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setViewingProfile(null)}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.profileModalHeader}>
            <TouchableOpacity onPress={() => setViewingProfile(null)} style={styles.profileModalBack}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {viewingProfileLoading || !viewingProfile?.full_name ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

              <PostGrid posts={viewingProfilePosts} emptyMessage="No posts yet" />
              <View style={{ height: 32 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ── Comments Modal ─────────────────────────────────────────── */}
      <Modal
        visible={!!commentsModalPost}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setCommentsModalPost(null); setNewComment(''); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.commentsSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setCommentsModalPost(null); setNewComment(''); }}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
              </Text>
              <View style={{ width: 22 }} />
            </View>

            {/* Comments list */}
            <ScrollView
              style={styles.commentsList}
              contentContainerStyle={{ paddingVertical: 12 }}
              keyboardShouldPersistTaps="handled"
            >
              {commentsLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
              ) : comments.length === 0 ? (
                <View style={styles.emptyComments}>
                  <Ionicons name="chatbubble-outline" size={36} color={colors.textSecondary} />
                  <Text style={styles.emptyCommentsText}>Be the first to comment</Text>
                </View>
              ) : (
                comments.map(c => (
                  <View key={c.id} style={styles.commentRow}>
                    <View style={styles.commentAvatar}>
                      {c.profiles?.avatar_url ? (
                        <Image source={{ uri: c.profiles.avatar_url }} style={styles.commentAvatarImg} />
                      ) : (
                        <Text style={styles.commentAvatarText}>
                          {getInitials(c.profiles?.full_name || 'A')}
                        </Text>
                      )}
                    </View>
                    <View style={styles.commentBody}>
                      <View style={styles.commentBubble}>
                        <Text style={styles.commentName}>{c.profiles?.full_name || 'User'}</Text>
                        <Text style={styles.commentText}>{c.content}</Text>
                      </View>
                      <Text style={styles.commentTime}>{formatTimeAgo(c.created_at)}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Input */}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor={colors.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.commentSendBtn,
                  (!newComment.trim() || submittingComment) && styles.commentSendBtnDisabled,
                ]}
                onPress={submitComment}
                disabled={!newComment.trim() || submittingComment}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Ionicons name="send" size={18} color="#000" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // ── Header — polished ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(234,179,8,0.08)',
    gap: 10,
  },
  hamburgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: 'Orbitron_900Black',
    color: polished.goldMid,
    letterSpacing: 2,
    textShadowColor: 'rgba(234,179,8,0.55)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  headerLiveDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerNotifPip: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: colors.background,
  },
  // ── Search ──────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
  },
  // ── Community Info Bar ──────────────────────────────────────────────
  communityInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  communityInfoDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityInfoIcon: {
    fontSize: 18,
  },
  communityInfoText: {
    flex: 1,
  },
  communityInfoName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  communityInfoMembers: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  communityJoinBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: polished.goldDeep,
    shadowColor: polished.goldDeep,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  communityJoinedBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  communityJoinBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#18181B',
    letterSpacing: 0.2,
  },
  communityJoinedBtnText: {
    color: colors.textSecondary,
  },
  // ── Content ─────────────────────────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  // ── Post Cards — polished ──────────────────────────────────────────
  postCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 0,
    marginBottom: 12,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#27272A',
    borderWidth: 2,
    borderColor: polished.goldDeep,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '900',
    color: polished.goldMid,
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  postCommunityTag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  postMenu: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  menuButtonDelete: {
    backgroundColor: colors.error + '18',
  },
  postContent: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  postContentText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    marginTop: 10,
  },
  postActions: {
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  // ── FAB ─────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 20,
    bottom: insets.bottom + 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  // ── People ──────────────────────────────────────────────────────────
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
    borderRadius: 999,
  },
  followingBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#18181B',
    letterSpacing: 0.2,
  },
  followingBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  personAvatarOuter: {
    position: 'relative',
  },
  personHotBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    shadowColor: '#EAB308',
    shadowOpacity: 0.65,
    shadowRadius: 6,
    elevation: 4,
  },
  personHotBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#18181B',
    letterSpacing: 0.5,
  },
  personFollowersNum: {
    color: polished.goldMid,
    fontWeight: '800',
  },
  // ── Tabs row (Feed | Communities | People) ──────────────────────────
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 5,
    backgroundColor: '#0F0F12',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabBtnActiveWrap: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: polished.goldDeep,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  tabBtnActiveGradient: {
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  tabBtnTextActive: {
    color: '#18181B',
    fontWeight: '800',
  },
  // ── Composer card ───────────────────────────────────────────────────
  composerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  composerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#27272A',
    borderWidth: 2,
    borderColor: polished.goldDeep,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  composerAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  composerAvatarText: {
    fontSize: 15,
    fontWeight: '900',
    color: polished.goldMid,
  },
  composerInputBtn: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0F0F12',
    justifyContent: 'center',
  },
  composerPlaceholder: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  composerCameraBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: polished.goldDeep,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  composerCameraGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Communities tab cards ───────────────────────────────────────────
  createCommunityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  createCommunityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCommunityText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  communityCardEmoji: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityCardEmojiText: {
    fontSize: 26,
  },
  communityCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  communityCardName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  communityCardMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  communityCardMembers: {
    color: polished.goldMid,
    fontWeight: '800',
  },
  communityCardJoinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: polished.goldDeep,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  communityCardJoinText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#18181B',
    letterSpacing: 0.2,
  },
  communityCardJoinedBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  communityCardJoinedText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  // ── Empty State ─────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  // ── Create Community Modal ──────────────────────────────────────────
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
  // ── User Profile Modal ──────────────────────────────────────────────
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
  // ── Comments Modal ──────────────────────────────────────────────────
  commentsSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyCommentsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commentAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  commentBody: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 19,
  },
  commentTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    marginLeft: 12,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: insets.bottom + 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
    backgroundColor: colors.background,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendBtnDisabled: {
    opacity: 0.4,
  },
});
