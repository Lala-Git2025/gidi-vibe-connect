import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useTheme } from '../contexts/ThemeContext';

interface PollOption {
  id: string;
  label: string;
  position: number;
  votes_count: number;
}

interface Props {
  postId: string;
  currentUserId: string | null;
}

export const PollCard = ({ postId, currentUserId }: Props) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [options, setOptions] = useState<PollOption[]>([]);
  const [myVoteOptionId, setMyVoteOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: opts }, { data: myVote }] = await Promise.all([
      supabase
        .from('poll_options')
        .select('id, label, position, votes_count')
        .eq('post_id', postId)
        .order('position', { ascending: true }),
      currentUserId
        ? supabase
            .from('poll_votes')
            .select('option_id')
            .eq('post_id', postId)
            .eq('user_id', currentUserId)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);
    setOptions((opts ?? []) as PollOption[]);
    setMyVoteOptionId(myVote?.option_id ?? null);
    setLoading(false);
  }, [postId, currentUserId]);

  useEffect(() => { load(); }, [load]);

  const totalVotes = options.reduce((s, o) => s + o.votes_count, 0);

  const handleVote = async (optionId: string) => {
    if (!currentUserId || voting) return;

    // If user already voted for this same option, withdraw (toggle off).
    // If they voted for a different option, switch (delete + insert).
    setVoting(true);
    try {
      if (myVoteOptionId === optionId) {
        // Withdraw
        await supabase
          .from('poll_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);
        // Optimistic
        setOptions(prev => prev.map(o => o.id === optionId ? { ...o, votes_count: Math.max(0, o.votes_count - 1) } : o));
        setMyVoteOptionId(null);
      } else {
        if (myVoteOptionId) {
          await supabase
            .from('poll_votes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', currentUserId);
          setOptions(prev => prev.map(o => o.id === myVoteOptionId ? { ...o, votes_count: Math.max(0, o.votes_count - 1) } : o));
        }
        const { error } = await supabase
          .from('poll_votes')
          .insert({ post_id: postId, option_id: optionId, user_id: currentUserId });
        if (error) throw error;
        setOptions(prev => prev.map(o => o.id === optionId ? { ...o, votes_count: o.votes_count + 1 } : o));
        setMyVoteOptionId(optionId);
      }
    } catch (e) {
      // Refetch to recover any drift
      await load();
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (options.length === 0) return null;

  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const pct = totalVotes > 0 ? Math.round((opt.votes_count / totalVotes) * 100) : 0;
        const isMine = myVoteOptionId === opt.id;
        return (
          <TouchableOpacity
            key={opt.id}
            style={styles.optionRow}
            activeOpacity={0.85}
            onPress={() => handleVote(opt.id)}
            disabled={voting || !currentUserId}
          >
            {/* fill bar */}
            <View style={[styles.bar, { width: `${pct}%`, backgroundColor: isMine ? colors.primary + '50' : colors.cardBackground }]} />
            <View style={styles.optionContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                {isMine && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
                <Text style={[styles.optionLabel, isMine && styles.optionLabelMine]} numberOfLines={1}>
                  {opt.label}
                </Text>
              </View>
              <Text style={styles.optionPct}>{pct}%</Text>
            </View>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.totalText}>
        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        {!currentUserId && ' · Sign in to vote'}
      </Text>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  optionRow: {
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    gap: 8,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  optionLabelMine: {
    fontWeight: '800',
  },
  optionPct: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  totalText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
