-- =====================================================
-- Codify the pg_cron jobs that were previously only scheduled via the
-- Supabase Dashboard SQL editor. Migrations are the source of truth, so
-- this guarantees they survive a project restore or a fresh environment
-- bring-up.
--
-- Idempotent: if a job with the same name already exists (e.g. on the
-- live project where these were originally added by hand) we unschedule
-- it first, then re-create with the canonical definition.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-trending-venues') THEN
    PERFORM cron.unschedule('refresh-trending-venues');
  END IF;
  PERFORM cron.schedule(
    'refresh-trending-venues',
    '*/10 * * * *',
    'SELECT public.refresh_trending_venues();'
  );

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-stories') THEN
    PERFORM cron.unschedule('cleanup-expired-stories');
  END IF;
  PERFORM cron.schedule(
    'cleanup-expired-stories',
    '0 3 * * *',
    'SELECT public.cleanup_expired_stories();'
  );
END $$;
