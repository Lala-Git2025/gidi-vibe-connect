-- =============================================================================
-- Move the live traffic readings off GitHub's scheduler onto pg_cron.
-- =============================================================================
--
-- The live agent's workflow asked GitHub for a run every 2 hours. Measured
-- over 17.6 days of traffic_route_readings it actually got:
--
--     scheduled   12 runs/day          (cron: '30 */2 * * *')
--     delivered    4.7 runs/day
--     average gap  5.2 hours
--     worst gap    9.1 hours
--
-- Free-tier scheduled workflows are throttled under load, and no cron
-- expression changes that — asking GitHub for every 5 minutes would have
-- produced the same 5 hours. This is the same conclusion CLAUDE.md already
-- recorded for the news scraper: the fix is pg_cron plus an edge function, not
-- a smaller number in the workflow.
--
-- ── Why 15 minutes and not 5 ────────────────────────────────────────────────
--
-- The app shows a verdict ("worse than usual"), not a minute count — the
-- explicit product decision of 2026-09-17. A 15 km corridor's verdict does not
-- change inside five minutes, so a 5-minute cadence would spend 2,304 Compute
-- Routes calls a day instead of 768 to redraw the same two words. What does
-- move on a five-minute timescale is incidents — a crash, a closure, a flood —
-- and that is the TomTom half, not a duration ratio.
--
--     8 corridors x 4 runs/hour x 24h = 768 Compute Routes calls/day
--
-- Raise or lower the interval by editing the schedule below; the per-day cost
-- is 8 x (60 / minutes) x 24.
--
-- ── Prerequisites, in this order ────────────────────────────────────────────
--
-- This migration is written to be safe to apply before any of the following
-- exist: it creates the job, and the job's requests simply fail (and log to
-- net._http_response) until the function and the secrets are in place.
--
--   1. Deploy the function, which must NOT verify JWTs because pg_net does not
--      mint one:
--
--        npx supabase functions deploy live-traffic --no-verify-jwt
--
--   2. Give the function its secrets. GOOGLE_MAPS_API_KEY is the same key the
--      GitHub workflow uses; TRAFFIC_CRON_SECRET is new and arbitrary —
--      generate it with `openssl rand -hex 32`:
--
--        npx supabase secrets set GOOGLE_MAPS_API_KEY=...
--        npx supabase secrets set TRAFFIC_CRON_SECRET=...
--
--      SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
--
--   3. Put the SAME TRAFFIC_CRON_SECRET into Vault, under this exact name, so
--      the cron command below can read it without storing it in
--      cron.job.command as plaintext:
--
--        SELECT vault.create_secret('<the same value>', 'traffic_cron_secret');
--
--      To rotate later: SELECT vault.update_secret(
--        (SELECT id FROM vault.secrets WHERE name = 'traffic_cron_secret'),
--        '<new value>');
--      then re-run `supabase secrets set TRAFFIC_CRON_SECRET=<new value>`.
--
-- ── Verifying ───────────────────────────────────────────────────────────────
--
--   SELECT jobid, jobname, schedule, active FROM cron.job;
--   SELECT * FROM cron.job_run_details
--     WHERE jobname = 'live-traffic-every-15-min'
--     ORDER BY start_time DESC LIMIT 5;
--
--   -- pg_cron reports the *request* succeeding, not the response. The HTTP
--   -- status comes back asynchronously and lands here:
--   SELECT id, status_code, LEFT(content, 300) AS body, created
--   FROM net._http_response ORDER BY created DESC LIMIT 5;
--
--   -- And the thing that actually matters:
--   SELECT route_key, severity, vs_usual, updated_at
--   FROM traffic_live_routes ORDER BY updated_at DESC;
-- =============================================================================


-- pg_net issues the HTTP request from inside the database. pg_cron 1.6 and
-- supabase_vault 0.3.1 are already installed on this project; pg_net is not.
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- Idempotent: unschedule first so re-applying this migration, or changing the
-- interval, does not leave two jobs polling the same corridors.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'live-traffic-every-15-min') THEN
    PERFORM cron.unschedule('live-traffic-every-15-min');
  END IF;
END $$;


SELECT cron.schedule(
  'live-traffic-every-15-min',
  '*/15 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://xvtjcpwkrsoyrhhptdmc.supabase.co/functions/v1/live-traffic',
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
    -- A full pass is eight Routes API calls paced 250ms apart, so ~3s of
    -- requests. 30s leaves room for a slow upstream without letting a hung
    -- request overlap the next run.
    timeout_milliseconds := 30000
  );
  $job$
);


COMMENT ON EXTENSION pg_net IS
  'Used by the live-traffic-every-15-min cron job to invoke the live-traffic edge function. See migration 20261006010000.';
