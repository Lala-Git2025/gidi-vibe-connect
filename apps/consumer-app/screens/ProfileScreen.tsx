import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Switch, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  // Load Orbitron font
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Orbitron_900Black,
  });

  // Auth state
  const [isGuest, setIsGuest] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [loading, setLoading] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');

  // Settings state
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  // Edit profile state
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Gamification state
  const [userStats, setUserStats] = useState({
    venues_visited: 0,
    events_attended: 0,
    reviews_written: 0,
    photos_uploaded: 0,
    posts_created: 0,
    xp: 0,
    level: 1,
  });
  const [userBadges, setUserBadges] = useState<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    earned_at: string;
  }>>([]);
  const [allBadges, setAllBadges] = useState<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    requirement_type: string;
    requirement_value: number;
  }>>([]);

  // Check authentication status
  useEffect(() => {
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsGuest(!currentUser);

      // Refetch user data when signing in
      if (currentUser) {
        fetchAvatar(currentUser.id);
        fetchUserStats(currentUser.id);
        fetchUserBadges(currentUser.id);
      } else {
        // Clear data on sign out
        setAvatarUrl(null);
        setUserStats({
          venues_visited: 0, events_attended: 0, reviews_written: 0,
          photos_uploaded: 0, posts_created: 0, xp: 0, level: 1,
        });
        setUserBadges([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setIsGuest(!user);

    // Fetch user data if logged in
    if (user) {
      fetchAvatar(user.id);
      fetchUserStats(user.id);
      fetchUserBadges(user.id);
    }

    // Fetch all badges for display
    fetchAllBadges();
  };

  const fetchUserStats = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.log('Error fetching user stats:', error);
        return;
      }

      if (data) {
        setUserStats({
          venues_visited: data.venues_visited || 0,
          events_attended: data.events_attended || 0,
          reviews_written: data.reviews_written || 0,
          photos_uploaded: data.photos_uploaded || 0,
          posts_created: data.posts_created || 0,
          xp: data.xp || 0,
          level: data.level || 1,
        });
      } else {
        // Create stats record if it doesn't exist
        await supabase.from('user_stats').insert({ user_id: userId });
      }
    } catch (error) {
      console.log('Error fetching user stats:', error);
    }
  };

  const fetchUserBadges = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          id,
          earned_at,
          badges (
            id,
            name,
            description,
            icon,
            category
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.log('Error fetching user badges:', error);
        return;
      }

      if (data) {
        const formattedBadges = data.map((ub: any) => ({
          id: ub.badges.id,
          name: ub.badges.name,
          description: ub.badges.description,
          icon: ub.badges.icon,
          category: ub.badges.category,
          earned_at: ub.earned_at,
        }));
        setUserBadges(formattedBadges);
      }
    } catch (error) {
      console.log('Error fetching user badges:', error);
    }
  };

  const fetchAllBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('requirement_value', { ascending: true });

      if (error) {
        console.log('Error fetching badges:', error);
        return;
      }

      if (data) {
        setAllBadges(data);
      }
    } catch (error) {
      console.log('Error fetching all badges:', error);
    }
  };

  // Helper function to increment a stat and award XP
  const incrementStat = async (
    statName: 'venues_visited' | 'events_attended' | 'reviews_written' | 'photos_uploaded' | 'posts_created',
    xpAmount: number = 10
  ) => {
    if (!user) return;

    try {
      // Update the stat in the database
      const { error } = await supabase.rpc('increment_user_stat', {
        p_user_id: user.id,
        p_stat_name: statName,
        p_xp_amount: xpAmount,
      });

      if (error) {
        console.log('Error incrementing stat:', error);
        return;
      }

      // Refresh stats
      fetchUserStats(user.id);
      fetchUserBadges(user.id);
    } catch (error) {
      console.log('Error incrementing stat:', error);
    }
  };

  const fetchAvatar = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', userId)
        .single();

      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.log('Error fetching avatar:', error);
    }
  };

  const pickImage = async () => {
    if (isGuest) {
      Alert.alert('Sign In Required', 'Please sign in to upload a profile picture.');
      return;
    }

    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile picture.');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user) return;

    setUploadingAvatar(true);
    try {
      // Get file extension
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/avatar.${ext}`;

      // Fetch the image as blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Convert blob to array buffer
      const arrayBuffer = await new Response(blob).arrayBuffer();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL (upsert ensures it works even if profile row is missing)
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(
          { user_id: user.id, avatar_url: publicUrl },
          { onConflict: 'user_id' }
        );

      if (updateError) throw updateError;

      // Update local state
      setAvatarUrl(publicUrl + '?t=' + Date.now()); // Add timestamp to bust cache
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const userName = isGuest ? "Guest User" : (user?.user_metadata?.full_name || user?.email || "User");
  const location = "Lagos, Nigeria";

  const stats = [
    { icon: "📍", label: "Venues Visited", value: userStats.venues_visited },
    { icon: "📅", label: "Events Attended", value: userStats.events_attended },
    { icon: "⭐", label: "Reviews Written", value: userStats.reviews_written },
    { icon: "📷", label: "Photos Uploaded", value: userStats.photos_uploaded },
  ];

  // Calculate XP required for next level
  const calculateXPForLevel = (level: number): number => {
    let xpNeeded = 100;
    for (let i = 1; i < level; i++) {
      xpNeeded += (i + 1) * 75;
    }
    return xpNeeded;
  };

  const calculateXPForPreviousLevel = (level: number): number => {
    if (level <= 1) return 0;
    return calculateXPForLevel(level - 1);
  };

  const currentLevel = userStats.level;
  const currentXP = userStats.xp;
  const xpForCurrentLevel = calculateXPForPreviousLevel(currentLevel);
  const xpForNextLevel = calculateXPForLevel(currentLevel);
  const xpProgress = currentXP - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const xpPercentage = xpNeeded > 0 ? Math.min((xpProgress / xpNeeded) * 100, 100) : 0;

  // Auth handlers
  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      Alert.alert('Success', 'Welcome back!');
      setAuthModalVisible(false);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !fullName || !username) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // Validate username format
    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting sign up for:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: username.toLowerCase(),
          }
        }
      });

      console.log('Sign up response:', { data, error });

      if (error) {
        console.error('Sign up error:', error);
        throw error;
      }

      // Check if user was created (some Supabase configs auto-confirm)
      if (data?.user) {
        if (data.user.identities && data.user.identities.length === 0) {
          // User already exists
          Alert.alert('Account Exists', 'An account with this email already exists. Please sign in instead.');
        } else if (data.session) {
          // Auto-confirmed, user is signed in
          Alert.alert('Welcome!', 'Your account has been created and you are now signed in.');
          setAuthModalVisible(false);
          setEmail('');
          setPassword('');
          setFullName('');
          setUsername('');
        } else {
          // Email confirmation required
          Alert.alert('Check Your Email', 'We sent a confirmation link to your email. Please verify to complete sign up.');
          setAuthModalVisible(false);
          setEmail('');
          setPassword('');
          setFullName('');
          setUsername('');
        }
      }
    } catch (error: any) {
      console.error('Sign up catch error:', error);
      const errorMessage = error.message || 'Failed to create account';
      // Provide more helpful error messages
      if (errorMessage.includes('already registered')) {
        Alert.alert('Account Exists', 'An account with this email already exists. Please sign in instead.');
      } else if (errorMessage.includes('Invalid email')) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
      } else if (errorMessage.includes('weak password')) {
        Alert.alert('Weak Password', 'Please use a stronger password with at least 6 characters.');
      } else {
        Alert.alert('Sign Up Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      Alert.alert('Signed Out', "You've been successfully signed out.");
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign out');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending password reset to:', email);
      // Don't use redirectTo - let Supabase handle password reset via its web interface
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);

      console.log('Password reset response:', { data, error });

      if (error) throw error;

      Alert.alert(
        'Password Reset',
        'Since email is not configured, please contact support or sign up again with a new password using the same email.',
        [
          { text: 'Sign Up Again', onPress: () => setAuthMode('signup') },
          { text: 'OK', onPress: () => setAuthMode('signin') }
        ]
      );
    } catch (error: any) {
      console.error('Forgot password error:', error);
      Alert.alert('Error', error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const openAuthModal = (mode: 'signin' | 'signup' | 'forgot') => {
    setAuthMode(mode);
    setAuthModalVisible(true);
  };

  // Settings handlers
  const openSettings = () => {
    setSettingsModalVisible(true);
  };

  const handleEditProfile = () => {
    if (isGuest) {
      Alert.alert('Sign In Required', 'Please sign in to edit your profile.');
      return;
    }
    setEditName(user?.user_metadata?.full_name || '');
    setEditBio('');
    setEditProfileModalVisible(true);
    setSettingsModalVisible(false);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: editName.trim() }
      });

      if (error) throw error;

      // Update profile in profiles table
      await supabase
        .from('profiles')
        .update({ full_name: editName.trim(), bio: editBio.trim() })
        .eq('user_id', user.id);

      Alert.alert('Success', 'Profile updated successfully');
      setEditProfileModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    if (isGuest) {
      Alert.alert('No Account', 'You are not signed in.');
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Sign out the user (actual deletion would need admin API)
              await supabase.auth.signOut();
              Alert.alert('Account Deleted', 'Your account has been deleted.');
              setSettingsModalVisible(false);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account');
            }
          }
        }
      ]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@gidivibeconnect.com?subject=Support Request');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://gidivibeconnect.com/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://gidivibeconnect.com/terms');
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 24 }} />
          <Text style={styles.appName}>PROFILE</Text>
          <Text style={styles.headerIcon}>🔔</Text>
        </View>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {/* Avatar */}
          <TouchableOpacity style={styles.avatar} onPress={pickImage} disabled={uploadingAvatar}>
            {uploadingAvatar ? (
              <ActivityIndicator size="large" color="#EAB308" />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarIcon}>👤</Text>
            )}
            {!isGuest && (
              <View style={styles.avatarEditBadge}>
                <Text style={styles.avatarEditIcon}>📷</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* User Info */}
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userLocation}>{location}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {isGuest ? (
              <>
                <TouchableOpacity
                  style={styles.signInButton}
                  onPress={() => openAuthModal('signin')}
                >
                  <Text style={styles.signInButtonText}>🔑 Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
                  <Text style={styles.settingsButtonText}>⚙️</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.signOutButton}
                  onPress={handleSignOut}
                >
                  <Text style={styles.signOutButtonText}>🚪 Sign Out</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
                  <Text style={styles.settingsButtonText}>⚙️</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {isGuest && (
            <TouchableOpacity
              style={styles.signUpButton}
              onPress={() => openAuthModal('signup')}
            >
              <Text style={styles.signUpButtonText}>Sign Up</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Your Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Text style={styles.statIcon}>{stat.icon}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Level & Progress */}
        <View style={styles.section}>
          <View style={styles.levelHeader}>
            <Text style={styles.sectionTitle}>Level & Progress</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>LEVEL {currentLevel}</Text>
            </View>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>{xpProgress} / {xpNeeded} XP</Text>
              <Text style={styles.progressText}>{xpPercentage}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${xpPercentage}%` }]} />
            </View>
            {isGuest && (
              <Text style={styles.progressMessage}>Sign in to start earning XP</Text>
            )}
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <View style={styles.badgesHeader}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <Text style={styles.badgeCount}>
              {userBadges.length} / {allBadges.length}
            </Text>
          </View>

          {userBadges.length > 0 ? (
            <View style={styles.badgesGrid}>
              {userBadges.map((badge) => (
                <View key={badge.id} style={styles.earnedBadgeCard}>
                  <Text style={styles.earnedBadgeIcon}>{badge.icon}</Text>
                  <Text style={styles.earnedBadgeName}>{badge.name}</Text>
                  <Text style={styles.earnedBadgeDesc}>{badge.description}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.badgesCard}>
              <View style={styles.badgeIconContainer}>
                <Text style={styles.badgeIcon}>🏆</Text>
              </View>
              <Text style={styles.badgeTitle}>No Badges Yet</Text>
              <Text style={styles.badgeMessage}>
                {isGuest
                  ? "Sign in and start exploring to earn badges"
                  : "Visit venues, write reviews, and attend events to earn badges"}
              </Text>
            </View>
          )}

          {/* Available Badges Preview */}
          {!isGuest && userBadges.length === 0 && allBadges.length > 0 && (
            <View style={styles.availableBadgesSection}>
              <Text style={styles.availableBadgesTitle}>Available Badges</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.availableBadgesScroll}>
                {allBadges.slice(0, 6).map((badge) => (
                  <View key={badge.id} style={styles.lockedBadgeCard}>
                    <Text style={styles.lockedBadgeIcon}>{badge.icon}</Text>
                    <Text style={styles.lockedBadgeName}>{badge.name}</Text>
                    <Text style={styles.lockedBadgeReq}>
                      {badge.requirement_value} {badge.requirement_type.replace('_', ' ')}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Auth Modal */}
      <Modal
        visible={authModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAuthModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {authMode === 'signin' ? 'Welcome Back!' : authMode === 'signup' ? 'Create Account' : 'Reset Password'}
              </Text>
              <TouchableOpacity
                onPress={() => setAuthModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              {authMode === 'signin'
                ? 'Sign in to your account to continue'
                : authMode === 'signup'
                ? 'Join Gidi Vibe Connect and start exploring Lagos'
                : 'Enter your email to receive a password reset link'}
            </Text>

            {/* Form */}
            <View style={styles.form}>
              {authMode === 'signup' && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="John Doe"
                      placeholderTextColor="#6b7280"
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Username</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="johndoe"
                      placeholderTextColor="#6b7280"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Text style={styles.inputHint}>Letters, numbers, and underscores only</Text>
                  </View>
                </>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#6b7280"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {authMode !== 'forgot' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#6b7280"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              )}

              {authMode === 'signin' && (
                <TouchableOpacity onPress={() => setAuthMode('forgot')}>
                  <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={authMode === 'signin' ? handleSignIn : authMode === 'signup' ? handleSignUp : handleForgotPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {authMode === 'signin' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.switchModeContainer}>
                {authMode === 'forgot' ? (
                  <>
                    <Text style={styles.switchModeText}>Remember your password? </Text>
                    <TouchableOpacity onPress={() => setAuthMode('signin')}>
                      <Text style={styles.switchModeLink}>Sign In</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.switchModeText}>
                      {authMode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                    >
                      <Text style={styles.switchModeLink}>
                        {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalContent}>
            {/* Settings Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity
                onPress={() => setSettingsModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.settingsList}>
              {/* Account Section */}
              {!isGuest && (
                <View style={styles.settingsSection}>
                  <Text style={styles.settingsSectionTitle}>Account</Text>

                  <TouchableOpacity style={styles.settingsItem} onPress={handleEditProfile}>
                    <Text style={styles.settingsItemIcon}>✏️</Text>
                    <Text style={styles.settingsItemText}>Edit Profile</Text>
                    <Text style={styles.settingsItemArrow}>›</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.settingsItem} onPress={handleDeleteAccount}>
                    <Text style={styles.settingsItemIcon}>🗑️</Text>
                    <Text style={[styles.settingsItemText, { color: '#ef4444' }]}>Delete Account</Text>
                    <Text style={styles.settingsItemArrow}>›</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Preferences Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Preferences</Text>

                <View style={styles.settingsItem}>
                  <Text style={styles.settingsItemIcon}>🔔</Text>
                  <Text style={styles.settingsItemText}>Push Notifications</Text>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: '#3f3f46', true: '#EAB308' }}
                    thumbColor={notificationsEnabled ? '#fff' : '#9ca3af'}
                  />
                </View>

                <View style={styles.settingsItem}>
                  <Text style={styles.settingsItemIcon}>📍</Text>
                  <Text style={styles.settingsItemText}>Location Services</Text>
                  <Switch
                    value={locationEnabled}
                    onValueChange={setLocationEnabled}
                    trackColor={{ false: '#3f3f46', true: '#EAB308' }}
                    thumbColor={locationEnabled ? '#fff' : '#9ca3af'}
                  />
                </View>
              </View>

              {/* Support Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Support</Text>

                <TouchableOpacity style={styles.settingsItem} onPress={handleContactSupport}>
                  <Text style={styles.settingsItemIcon}>📧</Text>
                  <Text style={styles.settingsItemText}>Contact Support</Text>
                  <Text style={styles.settingsItemArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingsItem} onPress={handlePrivacyPolicy}>
                  <Text style={styles.settingsItemIcon}>🔒</Text>
                  <Text style={styles.settingsItemText}>Privacy Policy</Text>
                  <Text style={styles.settingsItemArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingsItem} onPress={handleTermsOfService}>
                  <Text style={styles.settingsItemIcon}>📄</Text>
                  <Text style={styles.settingsItemText}>Terms of Service</Text>
                  <Text style={styles.settingsItemArrow}>›</Text>
                </TouchableOpacity>
              </View>

              {/* App Info Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>About</Text>

                <View style={styles.settingsItem}>
                  <Text style={styles.settingsItemIcon}>📱</Text>
                  <Text style={styles.settingsItemText}>App Version</Text>
                  <Text style={styles.settingsItemValue}>1.0.0</Text>
                </View>
              </View>

              {/* Sign In Prompt for Guests */}
              {isGuest && (
                <View style={styles.guestPrompt}>
                  <Text style={styles.guestPromptText}>Sign in to access all features</Text>
                  <TouchableOpacity
                    style={styles.guestPromptButton}
                    onPress={() => {
                      setSettingsModalVisible(false);
                      openAuthModal('signin');
                    }}
                  >
                    <Text style={styles.guestPromptButtonText}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditProfileModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              {/* Edit Profile Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity
                  onPress={() => setEditProfileModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDescription}>Update your profile information</Text>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your name"
                    placeholderTextColor="#6b7280"
                    value={editName}
                    onChangeText={setEditName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Bio</Text>
                  <TextInput
                    style={[styles.input, styles.bioInput]}
                    placeholder="Tell us about yourself..."
                    placeholderTextColor="#6b7280"
                    value={editBio}
                    onChangeText={setEditBio}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.submitButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setEditProfileModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  appName: {
    fontSize: 20,
    fontFamily: 'Orbitron_900Black',
    color: '#EAB308',
    letterSpacing: 2,
  },
  headerIcon: {
    fontSize: 20,
  },
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderWidth: 4,
    borderColor: '#EAB308',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarIcon: {
    fontSize: 64,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 64,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#EAB308',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#000',
  },
  avatarEditIcon: {
    fontSize: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 24,
  },
  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 400,
    marginBottom: 12,
  },
  signInButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#EAB308',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  signOutButton: {
    flex: 1,
    height: 56,
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  settingsButton: {
    width: 56,
    height: 56,
    backgroundColor: '#27272a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonText: {
    fontSize: 20,
    color: '#9ca3af',
  },
  signUpButton: {
    width: '100%',
    maxWidth: 400,
    height: 56,
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#18181b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 24,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    flex: 1,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Level & Progress
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  levelBadge: {
    backgroundColor: '#EAB308',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  progressCard: {
    backgroundColor: '#18181b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 24,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#27272a',
    borderRadius: 6,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#EAB308',
  },
  progressMessage: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  // Badges
  badgesCard: {
    backgroundColor: '#18181b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 32,
    alignItems: 'center',
  },
  badgeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badgeIcon: {
    fontSize: 32,
  },
  badgeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  badgeMessage: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    maxWidth: 300,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#9ca3af',
  },
  modalDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 24,
  },
  // Form
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  input: {
    height: 48,
    backgroundColor: '#27272a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
  },
  inputHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  forgotPasswordLink: {
    fontSize: 14,
    color: '#EAB308',
    textAlign: 'right',
    marginTop: -8,
  },
  submitButton: {
    height: 48,
    backgroundColor: '#EAB308',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  switchModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  switchModeLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EAB308',
  },
  // Settings Modal Styles
  settingsModalContent: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    marginTop: 'auto',
  },
  settingsList: {
    marginTop: 16,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingsItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingsItemText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  settingsItemArrow: {
    fontSize: 20,
    color: '#6b7280',
  },
  settingsItemValue: {
    fontSize: 14,
    color: '#6b7280',
  },
  guestPrompt: {
    backgroundColor: '#27272a',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  guestPromptText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
    textAlign: 'center',
  },
  guestPromptButton: {
    backgroundColor: '#EAB308',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  guestPromptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  // Edit Profile Styles
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  cancelButton: {
    height: 48,
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  // Badge styles
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeCount: {
    fontSize: 14,
    color: '#9ca3af',
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  earnedBadgeCard: {
    width: '30%',
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAB308',
    padding: 16,
    alignItems: 'center',
  },
  earnedBadgeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  earnedBadgeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  earnedBadgeDesc: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
  },
  availableBadgesSection: {
    marginTop: 24,
  },
  availableBadgesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
  },
  availableBadgesScroll: {
    flexDirection: 'row',
  },
  lockedBadgeCard: {
    width: 100,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
    padding: 12,
    alignItems: 'center',
    marginRight: 12,
    opacity: 0.6,
  },
  lockedBadgeIcon: {
    fontSize: 24,
    marginBottom: 8,
    opacity: 0.5,
  },
  lockedBadgeName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  lockedBadgeReq: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
  },
});
