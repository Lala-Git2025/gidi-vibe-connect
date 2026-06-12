import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../config/supabase';
import { useTheme } from '../contexts/ThemeContext';

type NotifType = 'like' | 'comment' | 'reply' | 'follow' | 'mention';

interface NotificationRow {
  id: string;
  type: NotifType;
  actor_id: string | null;
  post_id: string | null;
  comment_id: string | null;
  read_at: string | null;
  created_at: string;
  actor?: { full_name: string; username: string | null; avatar_url: string | null } | null;
}

const VERB: Record<NotifType, string> = {
  like:    'liked your post',
  comment: 'commented on your post',
  reply:   'replied to your comment',
  follow:  'started following you',
  mention: 'mentioned you',
};

const ICON: Record<NotifType, keyof typeof Ionicons.glyphMap> = {
  like:    'heart',
  comment: 'chatbubble',
  reply:   'arrow-undo',
  follow:  'person-add',
  mention: 'at',
};

const formatTimeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
};

export const NotificationsBell = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  // Resolve current user once
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
    })();
  }, []);

  // Initial unread count fetch
  const refreshUnreadCount = useCallback(async () => {
    if (!userId) return;
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null);
    setUnread(count ?? 0);
  }, [userId]);

  useEffect(() => { refreshUnreadCount(); }, [refreshUnreadCount]);

  // Realtime: new rows tick the badge; updates (read_at flipped) decrement.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        () => refreshUnreadCount(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        () => refreshUnreadCount(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, refreshUnreadCount]);

  const fetchList = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: rows } = await supabase
        .from('notifications')
        .select('id, type, actor_id, post_id, comment_id, read_at, created_at')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      const list = (rows ?? []) as NotificationRow[];

      const actorIds = [...new Set(list.map(r => r.actor_id).filter(Boolean) as string[])];
      if (actorIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name, username, avatar_url')
          .in('user_id', actorIds);
        const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
        for (const r of list) {
          if (r.actor_id) r.actor = map.get(r.actor_id) ?? null;
        }
      }
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleOpen = () => {
    setOpen(true);
    fetchList();
  };

  const markAllRead = async () => {
    if (!userId || unread === 0) return;
    // Optimistic
    setUnread(0);
    setItems(prev => prev.map(i => i.read_at ? i : { ...i, read_at: new Date().toISOString() }));
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .is('read_at', null);
  };

  if (!userId) {
    // Guest — render an inert bell that nudges to sign in.
    return (
      <TouchableOpacity style={styles.bellBtn}>
        <Ionicons name="notifications-outline" size={20} color={colors.text} />
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity style={styles.bellBtn} onPress={handleOpen}>
        <Ionicons name="notifications-outline" size={20} color={colors.text} />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.sheet} edges={['top', 'bottom']}>
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Notifications</Text>
            <TouchableOpacity onPress={markAllRead} disabled={unread === 0}>
              <Text style={[styles.markAll, unread === 0 && { opacity: 0.4 }]}>Mark all read</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={42} color={colors.textSecondary} />
              <Text style={styles.emptyText}>You're all caught up.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {items.map((n) => {
                const name = n.actor?.full_name || n.actor?.username || 'Someone';
                return (
                  <View
                    key={n.id}
                    style={[styles.row, !n.read_at && styles.rowUnread]}
                  >
                    <View style={styles.avatar}>
                      {n.actor?.avatar_url ? (
                        <Image source={{ uri: n.actor.avatar_url }} style={styles.avatarImg} />
                      ) : (
                        <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
                      )}
                      <View style={[styles.typeDot, { backgroundColor: typeColor(n.type, colors) }]}>
                        <Ionicons name={ICON[n.type]} size={9} color="#fff" />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowText}>
                        <Text style={styles.rowName}>{name}</Text> {VERB[n.type]}
                      </Text>
                      <Text style={styles.rowTime}>{formatTimeAgo(n.created_at)}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
};

const typeColor = (t: NotifType, colors: any) => {
  switch (t) {
    case 'like':    return '#E11D48';
    case 'comment':
    case 'reply':   return colors.primary;
    case 'follow':  return '#10B981';
    case 'mention': return '#A855F7';
  }
};

const getStyles = (colors: any) => StyleSheet.create({
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E11D48',
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  markAll: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  loader: { padding: 32, alignItems: 'center' },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowUnread: {
    backgroundColor: colors.cardBackground,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  avatarLetter: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  typeDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  rowText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  rowName: {
    fontWeight: '800',
  },
  rowTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
