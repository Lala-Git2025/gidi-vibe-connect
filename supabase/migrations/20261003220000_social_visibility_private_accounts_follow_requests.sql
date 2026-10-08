-- =============================================================================
-- Social visibility: private accounts, follow requests, per-post audience
-- =============================================================================
--
-- Before this migration `social_posts` had exactly one SELECT policy —
-- USING (true), granted to `public`, which includes `anon`. Every post in the
-- database was readable by anyone holding the publishable key, signed in or
-- not. Three separate protections were therefore decorative:
--
--   * `is_hidden` was not read by anything. The column was added for the
--     moderation_triage agent, and the consumer app never referenced it, so an
--     auto-hidden post kept rendering in every client.
--   * `blocked_users` was applied client-side only — SocialScreen fetched the
--     rows and then dropped them from a Set in JS, so a blocked person's posts
--     still crossed the wire.
--   * There was no notion of a private account or a post audience at all.
--
-- A client-side filter is not a privacy boundary; it only decides what an
-- honest client chooses to draw. This moves all three into RLS.
--
-- ── Model ────────────────────────────────────────────────────────────────────
--
-- Public by default, because this is a discovery product: the open feed is the
-- only reason a new account sees anything at all. Privacy is an opt-in per
-- account, plus an audience per post.
--
--   profiles.is_private     — account-level. A private account's posts are
--                             visible only to accepted followers.
--   follows.status          — 'pending' | 'accepted'. Following a public
--                             account is accepted immediately; following a
--                             private one is a request until approved.
--   social_posts.visibility — 'public' | 'followers' | 'mutuals'.
--
-- A *mutual* follow — both directions accepted — is this product's "friend" or
-- connection. It is deliberately DERIVED, not stored: a second symmetric table
-- would need its own request/accept state and two rows kept consistent, and the
-- answer is already an index lookup away. See public.is_mutual().
-- =============================================================================


-- ── 1. Schema ────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_private IS
  'Opt-in account privacy. When true, this account''s posts are visible only to accepted followers, and new follows arrive as pending requests.';

ALTER TABLE public.follows
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'accepted';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.follows'::regclass AND conname = 'follows_status_check'
  ) THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_status_check CHECK (status IN ('pending', 'accepted'));
  END IF;
END $$;

COMMENT ON COLUMN public.follows.status IS
  'Set by trg_set_follow_status from the target account''s privacy — never by the client. Only the followed account may move it to accepted.';

-- Existing rows default to 'accepted', which is correct: every account was
-- public before this migration, so every follow had in effect been accepted.

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.social_posts'::regclass AND conname = 'social_posts_visibility_check'
  ) THEN
    ALTER TABLE public.social_posts
      ADD CONSTRAINT social_posts_visibility_check
      CHECK (visibility IN ('public', 'followers', 'mutuals'));
  END IF;
END $$;

COMMENT ON COLUMN public.social_posts.visibility IS
  'Audience for this post. ''public'' still respects the author''s is_private flag — a private account has no public posts.';

-- The audience checks below look up (following_id, follower_id, status). The
-- existing idx_follows_follower_following covers the other direction; this one
-- makes the "is this viewer an accepted follower of that author" test an
-- index-only scan.
CREATE INDEX IF NOT EXISTS idx_follows_following_follower_status
  ON public.follows (following_id, follower_id, status);

-- Pending requests are read as a list ("who is waiting for me to approve"),
-- which is a small slice of a table that is overwhelmingly accepted.
CREATE INDEX IF NOT EXISTS idx_follows_pending_target
  ON public.follows (following_id, created_at DESC)
  WHERE status = 'pending';


-- ── 2. Audience helpers ──────────────────────────────────────────────────────
--
-- STABLE SECURITY DEFINER, matching auth_role()/is_admin(). SECURITY DEFINER
-- matters for more than convenience here: these run inside RLS policies, and a
-- plain subquery would itself be subject to the referenced table's RLS, which
-- is how policy recursion starts.

CREATE OR REPLACE FUNCTION public.is_account_private(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp' AS $$
  SELECT COALESCE((SELECT is_private FROM public.profiles WHERE user_id = p_user), false);
$$;

-- Does p_viewer have an ACCEPTED follow of p_author?
CREATE OR REPLACE FUNCTION public.follows_accepted(p_author uuid, p_viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.follows
    WHERE following_id = p_author
      AND follower_id  = p_viewer
      AND status = 'accepted'
  );
$$;

-- A mutual follow: the connection this product calls a friend.
CREATE OR REPLACE FUNCTION public.is_mutual(p_a uuid, p_b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp' AS $$
  SELECT public.follows_accepted(p_a, p_b) AND public.follows_accepted(p_b, p_a);
$$;

-- A block in either direction hides both parties from each other.
CREATE OR REPLACE FUNCTION public.is_blocked_between(p_a uuid, p_b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp' AS $$
  SELECT p_a IS NOT NULL AND p_b IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = p_a AND blocked_id = p_b)
       OR (blocker_id = p_b AND blocked_id = p_a)
  );
$$;

-- The single audience decision, used by every policy below so the rule has one
-- definition rather than one per table.
CREATE OR REPLACE FUNCTION public.can_view_post(p_author uuid, p_visibility text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp' AS $$
  SELECT CASE
    -- Guests browse, which the app supports: only fully public content.
    WHEN auth.uid() IS NULL
      THEN p_visibility = 'public' AND NOT public.is_account_private(p_author)
    WHEN auth.uid() = p_author THEN true
    WHEN public.is_blocked_between(p_author, auth.uid()) THEN false
    WHEN p_visibility = 'mutuals'   THEN public.is_mutual(p_author, auth.uid())
    WHEN p_visibility = 'followers' THEN public.follows_accepted(p_author, auth.uid())
    -- 'public' is still gated by the account: a private account has no public
    -- posts, only posts its accepted followers can see.
    ELSE NOT public.is_account_private(p_author)
         OR public.follows_accepted(p_author, auth.uid())
  END;
$$;

-- Same decision keyed by post id, for tables that hang off a post. Runs as
-- definer so it can read social_posts without re-entering its own policy.
CREATE OR REPLACE FUNCTION public.can_view_post_id(p_post uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.social_posts p
    WHERE p.id = p_post
      AND (NOT p.is_hidden OR p.user_id = auth.uid())
      AND public.can_view_post(p.user_id, p.visibility)
  );
$$;


-- ── 3. Post, comment and like visibility ─────────────────────────────────────

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.social_posts;

CREATE POLICY "social_posts_select_audience"
  ON public.social_posts FOR SELECT
  USING (
    public.is_admin()
    -- The author keeps seeing a hidden post; hidden_reason is there to explain
    -- it. Silently vanishing it reads as data loss and generates support mail.
    OR ((NOT is_hidden OR user_id = auth.uid())
        AND public.can_view_post(user_id, visibility))
  );

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;

CREATE POLICY "comments_select_visible_posts"
  ON public.comments FOR SELECT
  USING (
    public.is_admin()
    OR (public.can_view_post_id(post_id)
        AND NOT public.is_blocked_between(user_id, auth.uid()))
  );

-- Likes carried the same leak: who liked a post is a list of real accounts,
-- and it was readable for posts the viewer could not see.
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.post_likes;

CREATE POLICY "post_likes_select_visible_posts"
  ON public.post_likes FOR SELECT
  USING (public.is_admin() OR public.can_view_post_id(post_id));

-- Writes follow reads: you cannot comment on, or like, a post you cannot see.
DROP POLICY IF EXISTS "Users can create their own comments" ON public.comments;
CREATE POLICY "comments_insert_own_on_visible_post"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_view_post_id(post_id));

DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
CREATE POLICY "post_likes_insert_own_on_visible_post"
  ON public.post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_view_post_id(post_id));


-- ── 4. Follow requests ───────────────────────────────────────────────────────

-- status is derived, never supplied. Without this a client could post
-- {status: 'accepted'} against a private account and walk straight in.
CREATE OR REPLACE FUNCTION public.set_follow_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
  NEW.status := CASE
    WHEN public.is_account_private(NEW.following_id) THEN 'pending'
    ELSE 'accepted'
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_follow_status ON public.follows;
CREATE TRIGGER trg_set_follow_status
  BEFORE INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.set_follow_status();

-- Only the followed account may approve, and the only move it may make is to
-- 'accepted' — declining is a DELETE.
DROP POLICY IF EXISTS "follows_update_target_approves" ON public.follows;
CREATE POLICY "follows_update_target_approves"
  ON public.follows FOR UPDATE
  TO authenticated
  USING (auth.uid() = following_id)
  WITH CHECK (auth.uid() = following_id AND status = 'accepted');

-- Previously only the follower could delete, so a private account had no way
-- to decline a request or remove a follower it had already accepted.
DROP POLICY IF EXISTS "Users can unfollow others" ON public.follows;
CREATE POLICY "follows_delete_either_party"
  ON public.follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = following_id);


-- ── 5. Counts and notifications must understand 'pending' ────────────────────

-- update_follow_counts fired on INSERT OR DELETE and ignored status, so a
-- pending request would have inflated the target's follower_count on arrival
-- and approving it would have changed nothing.
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'accepted' THEN
      UPDATE public.profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
      UPDATE public.profiles SET follower_count  = follower_count  + 1 WHERE user_id = NEW.following_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'accepted' AND NEW.status = 'accepted' THEN
      UPDATE public.profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
      UPDATE public.profiles SET follower_count  = follower_count  + 1 WHERE user_id = NEW.following_id;
    ELSIF OLD.status = 'accepted' AND NEW.status <> 'accepted' THEN
      UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE user_id = NEW.follower_id;
      UPDATE public.profiles SET follower_count  = GREATEST(follower_count  - 1, 0) WHERE user_id = NEW.following_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'accepted' THEN
      UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE user_id = OLD.follower_id;
      UPDATE public.profiles SET follower_count  = GREATEST(follower_count  - 1, 0) WHERE user_id = OLD.following_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_update_follow_counts ON public.follows;
CREATE TRIGGER trg_update_follow_counts
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

-- Reconcile once, so the cached counts and the accepted edges agree from here.
UPDATE public.profiles p SET
  follower_count  = COALESCE((SELECT COUNT(*) FROM public.follows f
                              WHERE f.following_id = p.user_id AND f.status = 'accepted'), 0),
  following_count = COALESCE((SELECT COUNT(*) FROM public.follows f
                              WHERE f.follower_id  = p.user_id AND f.status = 'accepted'), 0)
WHERE p.follower_count <> COALESCE((SELECT COUNT(*) FROM public.follows f
                                    WHERE f.following_id = p.user_id AND f.status = 'accepted'), 0)
   OR p.following_count <> COALESCE((SELECT COUNT(*) FROM public.follows f
                                     WHERE f.follower_id = p.user_id AND f.status = 'accepted'), 0);

-- A pending request is not "started following you", and an approval is worth
-- telling the requester about.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'reply', 'follow', 'mention',
                  'follow_request', 'follow_accepted'));

CREATE OR REPLACE FUNCTION public.notify_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id,
            CASE WHEN NEW.status = 'pending' THEN 'follow_request' ELSE 'follow' END);

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Tell the person who asked. Recipient and actor are the other way round
    -- from the request: the account that approved is the actor.
    INSERT INTO public.notifications (recipient_id, actor_id, type)
    VALUES (NEW.follower_id, NEW.following_id, 'follow_accepted');
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_follow ON public.follows;
CREATE TRIGGER trg_notify_follow
  AFTER INSERT OR UPDATE OF status ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_follow();


-- ── 6. Feed reads ────────────────────────────────────────────────────────────
--
-- The Following feed is "authors I follow, plus communities I joined". Doing
-- that from the client means fetching the follow list, fetching the membership
-- list, then an .in() with both — three round trips whose first two results are
-- thrown away. This returns the ids in one call; RLS above still decides which
-- of those posts the caller may actually read.

CREATE OR REPLACE FUNCTION public.following_feed_sources()
RETURNS TABLE (author_ids uuid[], community_ids uuid[])
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path TO 'public', 'pg_temp' AS $$
  SELECT
    COALESCE(ARRAY(SELECT following_id FROM public.follows
                   WHERE follower_id = auth.uid() AND status = 'accepted'), '{}'::uuid[]),
    COALESCE(ARRAY(SELECT community_id FROM public.community_members
                   WHERE user_id = auth.uid()), '{}'::uuid[]);
$$;

GRANT EXECUTE ON FUNCTION public.following_feed_sources() TO authenticated;
