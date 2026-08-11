-- Recovered from remote history (applied 2026-07-09 via MCP, never exported).
-- Covers unindexed foreign keys flagged by the performance advisor.

CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON public.comments (parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON public.communities (created_by);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_reviewed_by ON public.moderation_queue (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_reported_by ON public.moderation_queue (reported_by);
CREATE INDEX IF NOT EXISTS idx_news_feed_author_id ON public.news_feed (author_id);
CREATE INDEX IF NOT EXISTS idx_news_feed_venue_id ON public.news_feed (venue_id);
CREATE INDEX IF NOT EXISTS idx_notifications_post_id ON public.notifications (post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_comment_id ON public.notifications (comment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications (actor_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON public.poll_votes (option_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON public.saved_posts (post_id);
CREATE INDEX IF NOT EXISTS idx_venue_photos_uploaded_by ON public.venue_photos (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_verification_requests_reviewed_by ON public.verification_requests (reviewed_by);
