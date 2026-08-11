-- =====================================================
-- Mention notification trigger.
--
-- Parses @usernames out of social_posts.content and comments.content on
-- INSERT and writes a 'mention' notification for each matched profile.
-- Distinct match (so @ade twice in one post = one notification), skips
-- self-mentions, and only fires when the username column on profiles
-- actually exists for the handle.
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_mentions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_content    TEXT;
  v_actor      UUID;
  v_post_id    UUID;
  v_comment_id UUID;
  v_username   TEXT;
  v_user_id    UUID;
BEGIN
  IF TG_TABLE_NAME = 'social_posts' THEN
    v_content := NEW.content;
    v_actor := NEW.user_id;
    v_post_id := NEW.id;
    v_comment_id := NULL;
  ELSIF TG_TABLE_NAME = 'comments' THEN
    v_content := NEW.content;
    v_actor := NEW.user_id;
    v_post_id := NEW.post_id;
    v_comment_id := NEW.id;
  ELSE
    RETURN NEW;
  END IF;

  FOR v_username IN
    SELECT DISTINCT (regexp_matches(v_content, '@([A-Za-z0-9_]+)', 'g'))[1]
  LOOP
    SELECT user_id INTO v_user_id FROM public.profiles WHERE username = v_username LIMIT 1;
    IF v_user_id IS NOT NULL AND v_user_id <> v_actor THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, comment_id)
      VALUES (v_user_id, v_actor, 'mention', v_post_id, v_comment_id);
    END IF;
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_mentions_posts ON public.social_posts;
CREATE TRIGGER trg_notify_mentions_posts
  AFTER INSERT ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_mentions();

DROP TRIGGER IF EXISTS trg_notify_mentions_comments ON public.comments;
CREATE TRIGGER trg_notify_mentions_comments
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_mentions();
