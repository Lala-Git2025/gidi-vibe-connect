import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - GRID_GAP * 2) / 3;

export interface GridPost {
  id: string;
  content: string;
  media_urls: string[] | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user_id: string;
}

interface PostGridProps {
  posts: GridPost[];
  emptyMessage?: string;
}

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

const formatTimeAgo = (dateString: string) => {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export const PostGrid = ({ posts, emptyMessage = 'No posts yet' }: PostGridProps) => {
  const { colors } = useTheme();
  const [selectedPost, setSelectedPost] = useState<GridPost | null>(null);

  const postsWithMedia = posts.filter(p => p.media_urls && p.media_urls.length > 0);
  const textOnlyPosts = posts.filter(p => !p.media_urls || p.media_urls.length === 0);

  if (posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Photo grid */}
      {postsWithMedia.length > 0 && (
        <View style={styles.grid}>
          {postsWithMedia.map(post => (
            <TouchableOpacity
              key={post.id}
              style={styles.tile}
              activeOpacity={0.8}
              onPress={() => setSelectedPost(post)}
            >
              <Image
                source={{ uri: post.media_urls![0] }}
                style={styles.tileImage}
                resizeMode="cover"
              />
              {/* Multi-image indicator */}
              {post.media_urls!.length > 1 && (
                <View style={styles.multiIndicator}>
                  <Ionicons name="copy-outline" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Text-only posts below the grid */}
      {textOnlyPosts.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginTop: postsWithMedia.length > 0 ? 16 : 0 }}>
          {textOnlyPosts.map(post => (
            <TouchableOpacity
              key={post.id}
              style={[styles.textPost, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              activeOpacity={0.8}
              onPress={() => setSelectedPost(post)}
            >
              <Text style={[styles.textPostContent, { color: colors.text }]} numberOfLines={3}>
                {post.content}
              </Text>
              <View style={styles.textPostMeta}>
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {formatTimeAgo(post.created_at)}
                </Text>
                <View style={styles.metaStats}>
                  <Ionicons name="heart-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary, marginLeft: 3 }]}>
                    {post.likes_count || 0}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Post detail modal */}
      <Modal
        visible={!!selectedPost}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedPost(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setSelectedPost(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Post</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Image */}
              {selectedPost?.media_urls && selectedPost.media_urls.length > 0 && (
                <PostImage
                  uri={selectedPost.media_urls[0]}
                  style={styles.modalImage}
                />
              )}

              {/* Content */}
              <View style={styles.modalBody}>
                <Text style={[styles.modalPostContent, { color: colors.text }]}>
                  {selectedPost?.content}
                </Text>

                {/* Actions row */}
                <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
                  <View style={styles.modalAction}>
                    <Ionicons name="heart-outline" size={22} color={colors.textSecondary} />
                    <Text style={[styles.modalActionText, { color: colors.textSecondary }]}>
                      {selectedPost?.likes_count || 0}
                    </Text>
                  </View>
                  <View style={styles.modalAction}>
                    <Ionicons name="chatbubble-outline" size={22} color={colors.textSecondary} />
                    <Text style={[styles.modalActionText, { color: colors.textSecondary }]}>
                      {selectedPost?.comments_count || 0}
                    </Text>
                  </View>
                  <Text style={[styles.modalTimeText, { color: colors.textSecondary }]}>
                    {selectedPost ? formatTimeAgo(selectedPost.created_at) : ''}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  multiIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  // Text-only posts
  textPost: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  textPostContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  textPostMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  metaText: {
    fontSize: 12,
  },
  metaStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalImage: {
    width: '100%',
    aspectRatio: 1,
  },
  modalBody: {
    padding: 16,
  },
  modalPostContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 20,
  },
  modalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalTimeText: {
    fontSize: 12,
    marginLeft: 'auto',
  },
});
