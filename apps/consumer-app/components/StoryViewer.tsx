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
  StatusBar,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '../contexts/ThemeContext';
import { FILTER_OVERLAY_MAP } from './StoryEditor';
import { Ionicons } from '@expo/vector-icons';

interface StoryItem {
  id: string;
  user_id: string;
  image_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  created_at: string;
  expires_at: string;
  filter_effect: string;
  overlays: OverlayItem[];
}

// Overlay types stored as JSON in the DB
interface OverlayItem {
  type: 'text' | 'sticker';
  id: string;
  x: number; // 0–1 relative
  y: number; // 0–1 relative
  // text-specific
  content?: string;
  color?: string;
  size?: number;
  bold?: boolean;
  bg?: boolean;
  // sticker-specific
  emoji?: string;
}

interface StoryViewerProps {
  stories: StoryItem[];
  username: string;
  avatarUrl: string | null;
  onClose: () => void;
  onStorySeen: (storyId: string) => void;
}

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5000;

export const StoryViewer = ({
  stories,
  username,
  avatarUrl,
  onClose,
  onStorySeen,
}: StoryViewerProps) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [currentIndex, setCurrentIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const currentStory = stories[currentIndex];
  // Detect video by media_type OR by URL extension (fallback for older stories)
  const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'quicktime'];
  const urlExt = currentStory?.image_url?.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  const isVideo = currentStory?.media_type === 'video' || VIDEO_EXTS.includes(urlExt);

  console.log('[StoryViewer] story:', {
    id: currentStory?.id,
    media_type: currentStory?.media_type,
    isVideo,
    urlExt,
    image_url: currentStory?.image_url,
  });
  const filterColor = FILTER_OVERLAY_MAP[currentStory?.filter_effect ?? 'none'] ?? 'transparent';

  // expo-video player — always created, only active when isVideo
  const videoPlayer = useVideoPlayer(
    isVideo ? { uri: currentStory?.image_url ?? '' } : null,
    (player) => {
      player.loop = false;
      player.play();
    }
  );

  // Advance to next story when video finishes
  useEffect(() => {
    if (!isVideo || !videoPlayer) return;
    try {
      const subscription = videoPlayer.addListener('playToEnd', () => {
        handleNext();
      });
      return () => { try { subscription.remove(); } catch {} };
    } catch {
      // expo-video native module not ready — needs native rebuild
    }
  }, [currentIndex, videoPlayer]);

  useEffect(() => {
    if (!currentStory) return;
    onStorySeen(currentStory.id);
    startProgress();

    return () => {
      animRef.current?.stop();
      if (isVideo) {
        try { videoPlayer?.pause(); } catch {
          // expo-video native object may not exist until native rebuild (npx expo run:ios)
        }
      }
    };
  }, [currentIndex]);

  const startProgress = () => {
    animRef.current?.stop();
    progressAnim.setValue(0);

    if (!isVideo) {
      animRef.current = Animated.timing(progressAnim, {
        toValue: 1,
        duration: STORY_DURATION,
        useNativeDriver: false,
      });
      animRef.current.start(({ finished }) => {
        if (finished) handleNext();
      });
    } else {
      // For video: animate over generous max; actual advance fires on playToEnd
      animRef.current = Animated.timing(progressAnim, {
        toValue: 1,
        duration: 60000,
        useNativeDriver: false,
      });
      animRef.current.start();
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  if (!currentStory) return null;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar hidden />
      <View style={styles.container}>

        {/* ── Background media ── */}
        {isVideo ? (
          <VideoView
            player={videoPlayer}
            style={styles.media}
            contentFit="cover"
            nativeControls={false}
          />
        ) : (
          <Image
            source={{ uri: currentStory.image_url }}
            style={styles.media}
            resizeMode="cover"
            onError={(e) => console.error('[StoryViewer] Image load error:', e.nativeEvent.error, 'URL:', currentStory.image_url)}
            onLoad={() => console.log('[StoryViewer] Image loaded OK:', currentStory.image_url)}
          />
        )}

        {/* ── Filter colour-wash ── */}
        {filterColor !== 'transparent' && (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: filterColor }]}
            pointerEvents="none"
          />
        )}

        {/* ── Overlays: text and stickers ── */}
        {(currentStory.overlays || []).map((item) => {
          const absX = item.x * width;
          const absY = item.y * height;

          if (item.type === 'text' && item.content) {
            return (
              <View
                key={item.id}
                style={[
                  styles.overlayItem,
                  { left: absX, top: absY },
                  item.bg && styles.textBubble,
                ]}
                pointerEvents="none"
              >
                <Text
                  style={{
                    color: item.color ?? '#fff',
                    fontSize: item.size ?? 22,
                    fontWeight: item.bold ? 'bold' : '600',
                    textShadowColor: 'rgba(0,0,0,0.6)',
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 3,
                  }}
                >
                  {item.content}
                </Text>
              </View>
            );
          }

          if (item.type === 'sticker' && item.emoji) {
            return (
              <View
                key={item.id}
                style={[styles.overlayItem, { left: absX, top: absY }]}
                pointerEvents="none"
              >
                <Text style={{ fontSize: item.size ?? 48, fontFamily: '' }}>{item.emoji}</Text>
              </View>
            );
          }

          return null;
        })}

        {/* ── Dark gradient behind header ── */}
        <View style={styles.topGradient} pointerEvents="none" />

        {/* ── Progress bars ── */}
        <View style={styles.progressContainer}>
          {stories.map((_, i) => (
            <View key={i} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      i < currentIndex
                        ? '100%'
                        : i === currentIndex
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

        {/* ── Header: avatar + username + close ── */}
        <View style={styles.header}>
          <View style={styles.userRow}>
            <View style={styles.avatarRing}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>
                    {username.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View>
              <Text style={styles.username}>{username}</Text>
              <Text style={styles.timestamp}>{getTimeAgo(currentStory.created_at)}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Tap left / right to navigate ── */}
        <View style={styles.tapAreas} pointerEvents="box-none">
          <TouchableOpacity style={styles.tapLeft} onPress={handlePrev} activeOpacity={1} />
          <TouchableOpacity style={styles.tapRight} onPress={handleNext} activeOpacity={1} />
        </View>

        {/* ── Caption (if any) ── */}
        {currentStory.caption ? (
          <View style={styles.captionBox} pointerEvents="none">
            <Text style={styles.captionText}>{currentStory.caption}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    media: {
      position: 'absolute',
      top: 0,
      left: 0,
      width,
      height,
    },
    topGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 220,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    // Overlays
    overlayItem: {
      position: 'absolute',
    },
    textBubble: {
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    // Progress
    progressContainer: {
      flexDirection: 'row',
      gap: 4,
      paddingHorizontal: 12,
      paddingTop: 56,
      zIndex: 10,
    },
    progressTrack: {
      flex: 1,
      height: 2,
      backgroundColor: 'rgba(255,255,255,0.35)',
      borderRadius: 1,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#fff',
      position: 'absolute',
    },
    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 10,
      zIndex: 10,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    avatarRing: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 2,
      borderColor: colors.primary,
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
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
    },
    username: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
    timestamp: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.7)',
    },
    closeBtn: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
      borderRadius: 17,
    },
    closeIcon: {
      fontSize: 16,
      color: '#fff',
      fontWeight: 'bold',
    },
    // Tap zones
    tapAreas: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
    },
    tapLeft: { flex: 1 },
    tapRight: { flex: 1 },
    // Caption
    captionBox: {
      position: 'absolute',
      bottom: 60,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
    },
    captionText: {
      fontSize: 14,
      color: '#fff',
      lineHeight: 20,
    },
  });
