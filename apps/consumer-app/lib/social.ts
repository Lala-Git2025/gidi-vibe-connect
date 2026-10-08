/**
 * The social graph, and the two feeds it produces.
 *
 * ── Why two lanes ───────────────────────────────────────────────────────────
 *
 * Before this, the feed was a single global pool of every post in the database,
 * sorted New / Top / Hot. That is Reddit's shape, and it had two consequences:
 * following somebody changed nothing about what you saw, so the gesture had no
 * reward and almost nobody made it; and there was no surface where a private
 * post could meaningfully exist.
 *
 * It is replaced by two lanes, not one:
 *
 *   following — accounts you follow, communities you joined, and your own posts
 *   discover  — the open Lagos pool
 *
 * Discover is not a fallback or a compromise; it is load-bearing. This is a
 * discovery product, and on a graph this young a follows-only feed shows a new
 * account an empty screen. Instagram is public-by-default for the same reason.
 * `pickLane` below encodes the cold-start rule rather than leaving a newcomer
 * staring at nothing.
 *
 * ── Where privacy actually lives ────────────────────────────────────────────
 *
 * Not here. Every query in this file is written as if it could ask for
 * anything, because RLS decides what comes back — see migration
 * 20261003220000. That ordering matters: the previous code filtered blocked
 * accounts out of a Set in JS *after* the rows had crossed the wire, which
 * decides what an honest client draws and nothing more. If a query here is
 * wrong, the result is a worse feed; it is no longer a leak.
 */

import { supabase } from '../config/supabase';

export type FeedLane = 'following' | 'discover';

/** Who may read a post. Mirrors social_posts.visibility. */
export type PostVisibility = 'public' | 'followers' | 'mutuals';

/**
 * Where a follow stands. 'none' and 'pending' are distinct on purpose: a
 * request to a private account is outstanding, not failed, and a button that
 * says "Follow" after you already asked invites a pointless second tap.
 */
export type FollowState = 'none' | 'pending' | 'accepted';

export interface FeedPost {
  id: string;
  user_id: string;
  content: string | null;
  media_urls: string[] | null;
  location: string | null;
  community_id: string | null;
  visibility: PostVisibility;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_hidden: boolean;
  hidden_reason: string | null;
  /** Drives PollCard vs a standard post — omitting it silently kills polls. */
  post_type?: 'standard' | 'poll';
  communities?: { name: string } | null;
  profiles?: {
    user_id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_private?: boolean;
  } | null;
}

export interface FollowRequest {
  follow_id: string;
  user_id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  requested_at: string;
}

const POST_COLUMNS =
  'id, user_id, content, media_urls, location, community_id, visibility, ' +
  'likes_count, comments_count, created_at, is_hidden, hidden_reason, post_type';

const FEED_LIMIT = 50;

/**
 * Below this many posts the Following lane isn't worth showing as a landing
 * surface. Three is deliberately low: enough to prove the lane works, low
 * enough that someone who follows two active people lands on it.
 */
export const FOLLOWING_LANE_MIN = 3;

/** Attaches author profiles to a batch of posts in one round trip. */
const withAuthors = async (posts: any[]): Promise<FeedPost[]> => {
  if (posts.length === 0) return [];

  const userIds = [...new Set(posts.map((p) => p.user_id as string))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, username, avatar_url, is_private')
    .in('user_id', userIds);

  const byId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
  return posts.map((p) => ({ ...p, profiles: byId.get(p.user_id) ?? null })) as FeedPost[];
};

/**
 * The Following lane: accounts you follow, communities you joined, and your
 * own posts.
 *
 * The source ids come from one RPC rather than two client queries whose results
 * are then thrown away — see following_feed_sources() in the migration.
 */
export const fetchFollowingFeed = async (currentUserId: string): Promise<FeedPost[]> => {
  const { data: sources, error: srcError } = await supabase
    .rpc('following_feed_sources')
    .maybeSingle();
  if (srcError) throw srcError;

  const authorIds: string[] = (sources as any)?.author_ids ?? [];
  const communityIds: string[] = (sources as any)?.community_ids ?? [];

  // Your own posts belong in your feed, and they mean a brand-new account with
  // no follows still sees something it recognises.
  const authors = [...new Set([...authorIds, currentUserId])];

  // PostgREST parses .or() as a comma-separated filter list, but commas inside
  // in.(...) parentheses are part of that syntax and are handled. An empty
  // in.() is not valid, hence the guard.
  const clauses = [`user_id.in.(${authors.join(',')})`];
  if (communityIds.length > 0) {
    clauses.push(`community_id.in.(${communityIds.join(',')})`);
  }

  const { data, error } = await supabase
    .from('social_posts')
    .select(`${POST_COLUMNS}, communities(name)`)
    .or(clauses.join(','))
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT);
  if (error) throw error;

  const posts = await withAuthors(data ?? []);
  return rankFollowing(posts, authorIds);
};

/**
 * The open pool. RLS has already removed anything this viewer may not see, so
 * this asks for everything and takes what it gets.
 */
export const fetchDiscoverFeed = async (): Promise<FeedPost[]> => {
  const { data, error } = await supabase
    .from('social_posts')
    .select(`${POST_COLUMNS}, communities(name)`)
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT);
  if (error) throw error;
  return withAuthors(data ?? []);
};

/**
 * Recency first, with mutuals nudged up.
 *
 * Deliberately not an engagement score: with single-digit likes across the
 * whole table, ranking on engagement ranks on noise. The one signal worth
 * applying is who the post is from — a mutual follow is this product's closest
 * relationship, so it wins ties within the same day. Any stronger ordering
 * should wait until there is traffic to learn from.
 */
const rankFollowing = (posts: FeedPost[], followedIds: string[]): FeedPost[] => {
  const followed = new Set(followedIds);
  const dayOf = (iso: string) => Math.floor(new Date(iso).getTime() / 86_400_000);

  return [...posts].sort((a, b) => {
    const dayDiff = dayOf(b.created_at) - dayOf(a.created_at);
    if (dayDiff !== 0) return dayDiff;
    const aRank = followed.has(a.user_id) ? 1 : 0;
    const bRank = followed.has(b.user_id) ? 1 : 0;
    if (aRank !== bRank) return bRank - aRank;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

/**
 * Which lane to land on. Called once per session with the Following lane's
 * size; afterwards the user's own choice wins and this is not consulted again.
 */
export const pickLane = (followingPostCount: number): FeedLane =>
  followingPostCount >= FOLLOWING_LANE_MIN ? 'following' : 'discover';

// ── Follow graph ────────────────────────────────────────────────────────────

/**
 * Where this viewer stands with each of `userIds`.
 *
 * Reads `status`, so a request to a private account reports 'pending' rather
 * than passing for a completed follow.
 */
export const fetchFollowStates = async (
  currentUserId: string,
  userIds: string[],
): Promise<Map<string, FollowState>> => {
  const states = new Map<string, FollowState>();
  if (userIds.length === 0) return states;

  const { data } = await supabase
    .from('follows')
    .select('following_id, status')
    .eq('follower_id', currentUserId)
    .in('following_id', userIds);

  (data ?? []).forEach((r: any) => states.set(r.following_id, r.status as FollowState));
  return states;
};

/**
 * Follows, and reports what actually happened.
 *
 * The caller cannot predict the outcome: `status` is set by a BEFORE INSERT
 * trigger from the target's privacy, precisely so a client cannot award itself
 * 'accepted' against a private account. So this reads the row back rather than
 * assuming, and the button label follows the database.
 */
export const followUser = async (targetUserId: string): Promise<FollowState> => {
  const { data, error } = await supabase
    .from('follows')
    .insert({ follower_id: (await requireUserId()), following_id: targetUserId })
    .select('status')
    .single();
  if (error) throw error;
  return (data?.status as FollowState) ?? 'accepted';
};

export const unfollowUser = async (targetUserId: string): Promise<void> => {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', await requireUserId())
    .eq('following_id', targetUserId);
  if (error) throw error;
};

/** Requests waiting on this account to approve them. */
export const fetchFollowRequests = async (currentUserId: string): Promise<FollowRequest[]> => {
  const { data, error } = await supabase
    .from('follows')
    .select('id, follower_id, created_at')
    .eq('following_id', currentUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, username, avatar_url')
    .in('user_id', data.map((r: any) => r.follower_id));

  const byId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

  return data.map((r: any) => {
    const p = byId.get(r.follower_id);
    return {
      follow_id: r.id,
      user_id: r.follower_id,
      full_name: p?.full_name || 'Someone',
      username: p?.username ?? null,
      avatar_url: p?.avatar_url ?? null,
      requested_at: r.created_at,
    };
  });
};

/** Approve. Only the followed account may do this — enforced by RLS. */
export const approveFollowRequest = async (followId: string): Promise<void> => {
  const { error } = await supabase
    .from('follows')
    .update({ status: 'accepted' })
    .eq('id', followId);
  if (error) throw error;
};

/**
 * Decline — a delete, not a status. There is no 'rejected' state to store:
 * keeping one would mean deciding whether a declined person may ask again, and
 * a deleted row already answers that with "yes, and you won't be told".
 */
export const declineFollowRequest = async (followId: string): Promise<void> => {
  const { error } = await supabase.from('follows').delete().eq('id', followId);
  if (error) throw error;
};

/** The accounts that follow this user back: the mutuals. */
export const fetchMutuals = async (currentUserId: string): Promise<Set<string>> => {
  const [{ data: outbound }, { data: inbound }] = await Promise.all([
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId)
      .eq('status', 'accepted'),
    supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', currentUserId)
      .eq('status', 'accepted'),
  ]);

  const theyFollowMe = new Set((inbound ?? []).map((r: any) => r.follower_id as string));
  return new Set(
    (outbound ?? [])
      .map((r: any) => r.following_id as string)
      .filter((id) => theyFollowMe.has(id)),
  );
};

// ── Account privacy ─────────────────────────────────────────────────────────

export const fetchIsPrivate = async (currentUserId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('profiles')
    .select('is_private')
    .eq('user_id', currentUserId)
    .maybeSingle();
  return Boolean(data?.is_private);
};

/**
 * Flips account privacy.
 *
 * Going private does NOT retroactively demote existing followers to pending —
 * they were accepted under the terms that applied at the time, and silently
 * revoking them would be a worse surprise than the setting itself. It changes
 * who may follow from here on, and gates the posts accordingly.
 */
export const setIsPrivate = async (currentUserId: string, isPrivate: boolean): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_private: isPrivate })
    .eq('user_id', currentUserId);
  if (error) throw error;
};

const requireUserId = async (): Promise<string> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in to do that.');
  return session.user.id;
};
