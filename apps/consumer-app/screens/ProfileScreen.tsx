import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

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
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Check authentication status
  useEffect(() => {
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsGuest(!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setIsGuest(!user);
  };

  const userName = isGuest ? "Guest User" : (user?.user_metadata?.full_name || user?.email || "User");
  const location = "Lagos, Nigeria";

  const stats = [
    { icon: "📍", label: "Venues Visited", value: 0 },
    { icon: "📅", label: "Events Attended", value: 0 },
    { icon: "⭐", label: "Reviews Written", value: 0 },
    { icon: "📷", label: "Photos Uploaded", value: 0 },
  ];

  const currentLevel = 1;
  const currentXP = 0;
  const maxXP = 100;
  const xpPercentage = (currentXP / maxXP) * 100;

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
    if (!email || !password || !fullName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;

      Alert.alert('Account Created!', 'Please check your email to verify your account.');
      setAuthModalVisible(false);
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'Failed to create account');
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

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthModalVisible(true);
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
          <View style={styles.avatar}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>

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
                <TouchableOpacity style={styles.settingsButton}>
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
                <TouchableOpacity style={styles.settingsButton}>
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
              <Text style={styles.progressText}>{currentXP} / {maxXP} XP</Text>
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
          <Text style={styles.sectionTitle}>Badges</Text>
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
                {authMode === 'signin' ? 'Welcome Back!' : 'Create Account'}
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
                : 'Join Gidi Vibe Connect and start exploring Lagos'}
            </Text>

            {/* Form */}
            <View style={styles.form}>
              {authMode === 'signup' && (
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

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={authMode === 'signin' ? handleSignIn : handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.switchModeContainer}>
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
              </View>
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
});
