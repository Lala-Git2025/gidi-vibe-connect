import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '@react-navigation/native';

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

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backgroundImage: {
      width,
      height,
      position: 'absolute',
    },
    gradientOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 200,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    progressContainer: {
      flexDirection: 'row',
      gap: 4,
      paddingHorizontal: 8,
      paddingTop: 50,
      zIndex: 10,
    },
    progressBar: {
      flex: 1,
      height: 2,
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 1,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.text,
      position: 'absolute',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
      zIndex: 10,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatarContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: '#EAB308',
    },
    avatar: {
      width: '100%',
      height: '100%',
    },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    username: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    timestamp: {
      fontSize: 12,
      color: colors.text,
      opacity: 0.7,
    },
    closeButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeIcon: {
      fontSize: 24,
      color: colors.text,
      fontWeight: 'bold',
    },
    tapAreas: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
    },
    tapAreaLeft: {
      flex: 1,
    },
    tapAreaRight: {
      flex: 1,
    },
    captionContainer: {
      position: 'absolute',
      bottom: 40,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 12,
      borderRadius: 8,
    },
    caption: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
  });

export const StoryViewer = ({ stories, initialIndex, onClose }: StoryViewerProps) => {
  const theme = useTheme();
  const styles = getStyles(theme.colors);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<Video>(null);

  const currentStory = stories[currentIndex];
  const isVideo = currentStory.media_type === 'video';

  useEffect(() => {
    startProgress();

    // Play video if current story is a video
    if (isVideo && videoRef.current) {
      videoRef.current.playAsync();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Pause video when changing stories
      if (videoRef.current) {
        videoRef.current.pauseAsync();
      }
    };
  }, [currentIndex]);

  const startProgress = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleTapLeft = () => {
    handlePrevious();
  };

  const handleTapRight = () => {
    handleNext();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 50) {
          if (gestureState.dx > 0) {
            handlePrevious();
          } else {
            handleNext();
          }
        }
      },
    })
  ).current;

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  };

  return (
    <Modal visible={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container} {...panResponder.panHandlers}>
        {/* Background Media - Video or Image */}
        {isVideo ? (
          <Video
            ref={videoRef}
            source={{ uri: currentStory.image_url }}
            style={styles.backgroundImage}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted={false}
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded && status.didJustFinish && !status.isLooping) {
                handleNext();
              }
            }}
          />
        ) : (
          <Image
            source={{ uri: currentStory.image_url }}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
        )}

        {/* Gradient Overlay */}
        <View style={styles.gradientOverlay} />

        {/* Progress Bars */}
        <View style={styles.progressContainer}>
          {stories.map((_, index) => (
            <View key={index} style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      index < currentIndex
                        ? '100%'
                        : index === currentIndex
                        ? progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          })
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              {currentStory.avatar_url ? (
                <Image
                  source={{ uri: currentStory.avatar_url }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {currentStory.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View>
              <Text style={styles.username}>{currentStory.username}</Text>
              <Text style={styles.timestamp}>{getTimeAgo(currentStory.created_at)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tap Areas */}
        <View style={styles.tapAreas}>
          <TouchableOpacity
            style={styles.tapAreaLeft}
            onPress={handleTapLeft}
            activeOpacity={1}
          />
          <TouchableOpacity
            style={styles.tapAreaRight}
            onPress={handleTapRight}
            activeOpacity={1}
          />
        </View>

        {/* Caption */}
        {currentStory.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption}>{currentStory.caption}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};
