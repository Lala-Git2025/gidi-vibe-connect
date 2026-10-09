-- ============================================================================
-- Lagos Traffic Radio scraping moves from GitHub Actions to pg_cron
-- ============================================================================
--
-- WHY
--
-- .github/workflows/traffic-agent.yml asks for a run every hour at :15.
-- Measured on 2026-10-08, the six most recent scheduled runs landed at:
--
--     02:12, 22:06, 16:31, 09:01, 01:57, 22:00
--
-- Gaps of 4.1, 5.6, 7.5, 7.1 and 4.0 hours — about five runs a day against a
-- one-hour cron. Free-tier scheduled workflows are throttled under load; this
-- is the same record every scheduled workflow in this repo has, and it is why
-- live-traffic moved to pg_cron in 20261006010000.
--
-- It matters more here than the raw lateness suggests. These reports are the
-- only source that says *why* a road is bad, the station posts a handful of
-- times a day, and the consumer app's LOOKBACK_MS is 12 hours. A 7.5-hour gap
-- can therefore retire a post before anything ever scraped it: a missed run is
-- not a late report, it is no report at all.
--
-- CADENCE
--
-- Every 20 minutes, at :07/:27/:47 — deliberately offset from
-- live-traffic-every-15-min (:00/:15/:30/:45) so the two never fire together.
-- A run where nothing new has been posted costs one listing fetch and one
-- SELECT; Gemini is called only for URLs not already in traffic_reports,
-- which is roughly seven a day. So the cadence buys punctuality almost for
-- free, unlike the Routes API half where every pass is billable.
--
-- PREREQUISITES — the job will 401 or 500 without these
--
--   1. Deploy the function (it must not verify JWT, because pg_net mints no
--      token; the x-cron-secret header is the gate):
--
--        npx supabase functions deploy lagos-traffic --no-verify-jwt
--
--   2. Secrets on the function. TRAFFIC_CRON_SECRET already exists for
--      live-traffic and is reused; GEMINI_API_KEY is NEW for functions — it
--      has only ever been a GitHub repo secret:
--
--        npx supabase secrets set GEMINI_API_KEY=...
--
--   3. The Vault entry `traffic_cron_secret` already exists from
--      20261006010000 and is reused as-is. Nothing to do.
--
-- Verify afterwards with row freshness, never with job status — pg_cron logs
-- "succeeded" for a request that 401s, because net.http_post reports that it
-- queued the call, not what came back:
--
--   SELECT max(scraped_at) FROM traffic_reports;
--   SELECT status_code, left(content,200) FROM net._http_response
--     ORDER BY created DESC LIMIT 5;
-- ============================================================================

-- Idempotent: unschedule first so re-applying this migration, or changing the
-- cadence, does not leave two jobs racing each other.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lagos-traffic-every-20-min') THEN
    PERFORM cron.unschedule('lagos-traffic-every-20-min');
  END IF;
END $$;

SELECT cron.schedule(
  'lagos-traffic-every-20-min',
  '7,27,47 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://xvtjcpwkrsoyrhhptdmc.supabase.co/functions/v1/lagos-traffic',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- Read from Vault at call time rather than baked into this command, so
      -- the secret is not sitting in cron.job.command in plaintext and can be
      -- rotated without rescheduling the job.
      'x-cron-secret', (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'traffic_cron_secret' LIMIT 1
      )
    ),
    body := '{}'::jsonb,
    -- A run fetches the listing, then one article page plus one Gemini call
    -- per genuinely new post, paced 1.2s apart. Ten new posts is the cap, so
    -- the worst case is well under a minute; 90s leaves room for a slow
    -- upstream without letting a hung request overlap the next run.
    timeout_milliseconds := 90000
  );
  $job$
);
