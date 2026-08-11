-- Recovered from remote history (applied 2026-07-09 via MCP, never exported).
-- Pins search_path on all SECURITY DEFINER / trigger functions per Supabase
-- security advisor (function_search_path_mutable).

ALTER FUNCTION public.agent_cost_last_24h() SET search_path = public, pg_temp;
ALTER FUNCTION public.auth_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_level(xp_amount integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.can_create_event(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.can_create_venue(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.can_upload_photo(p_user_id uuid, p_venue_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_and_award_badges(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_event_creation_limit(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_photo_upload_limit(p_user_id uuid, p_venue_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_venue_creation_limit(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_expired_stories() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_business_subscription() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_user_stats() SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_expired_stories() SET search_path = public, pg_temp;
ALTER FUNCTION public.expire_old_stories() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_subscription_status(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_venue_analytics_summary(p_user_id uuid, p_venue_id uuid, p_start_date date, p_end_date date) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_xp_for_next_level(current_level integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_user_stat(p_user_id uuid, p_stat_name text, p_xp_amount integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_super_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_user_activity(p_user_id uuid, p_action_type text, p_resource_type text, p_resource_id uuid, p_metadata jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.record_venue_view(p_venue_id uuid, p_view_type text) SET search_path = public, pg_temp;
ALTER FUNCTION public.refresh_trending_venues() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_subscription_limits() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_event_active_from_published() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_event_active_on_insert() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_community_member_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_follow_counts() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_poll_option_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_post_comments_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_post_likes_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
