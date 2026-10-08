/**
 * live-traffic — one pass over the Lagos corridors, driven by pg_cron.
 *
 * ── Why this exists when scripts/live-traffic-agent.js already did the job ──
 *
 * It did the job correctly and was delivered late. The workflow asked GitHub
 * for a run every 2 hours; measured over 17.6 days of traffic_route_readings
 * it got 4.7 runs a day, a 5.2-hour average gap and a 9.1-hour worst gap.
 * Free-tier scheduled workflows are throttled, and no cron expression fixes
 * that — GitHub is simply not a scheduler you can hold to a cadence.
 *
 * pg_cron runs inside the database and fires when it says it will. The 15
 * minute interval here is a real 15 minutes, which is the actual improvement:
 * not more frequent polling, but polling that happens when promised.
 *
 * 15 and not 5: the app shows a verdict ("worse than usual"), not a minute
 * count — an explicit product decision from 2026-09-17. A 15 km corridor's
 * verdict does not change inside five minutes, so a 5-minute cadence would
 * spend 2,304 Compute Routes calls a day (versus 768 here) redrawing the same
 * words. The signal that genuinely moves on a five-minute timescale is
 * incidents — a crash, a closure, a flood — and that belongs to the TomTom
 * half, not to a duration ratio.
 *
 * The Node agent in scripts/ is kept, not deleted: it is the dry-run tool
 * (`node scripts/live-traffic-agent.js` prints a table and writes nothing),
 * and its workflow is still dispatchable by hand as a fallback if this
 * function or pg_net is ever down. Its schedule is removed so the two cannot
 * both poll.
 *
 * ── Auth ────────────────────────────────────────────────────────────────────
 *
 * Deployed with --no-verify-jwt so pg_net can reach it without minting a user
 * token, then gated on a shared secret in the x-cron-secret header. The secret
 * lives in Supabase Vault and is read by the cron command, so it is never
 * written into cron.job.command in plaintext. A request without it gets 401
 * and costs nothing.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import {
  ROUTES,
  computeRoute,
  severityFor,
  vsUsualFor,
  lagosParts,
  DOW_NAMES,
} from '../_shared/lagos-corridors.js';

// Between calls. The Node agent uses 250ms; same reasoning — Routes API has a
// per-minute quota as well as a daily one, and eight calls arriving together
// is the shape that trips it.
const PACE_MS = 250;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Reading {
  route_key: string;
  observed_at: string;
  duration_seconds: number;
  free_flow_seconds: number;
  expected_duration_seconds: number | null;
  severity: string;
  vs_usual: string | null;
}

serve(async (req: Request) => {
  // Trimmed on read. Every secret here arrives by copy-paste through a shell,
  // and a trailing newline or a wrapping quote has now caused two separate
  // failures on this function — a 401 from the cron secret, then an
  // API_KEY_INVALID from the Maps key whose value was correct in .env and
  // worked from the same machine seconds later.
  const env = (name: string) => Deno.env.get(name)?.trim().replace(/^["']|["']$/g, '') || undefined;

  const cronSecret = env('TRAFFIC_CRON_SECRET');
  const apiKey = env('GOOGLE_MAPS_API_KEY');
  const supabaseUrl = env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');

  // Refuse before doing anything billable.
  //
  // Both sides are trimmed. A trailing newline is the overwhelmingly common
  // way this comparison fails — `echo` adds one, and so does pasting a value
  // out of a terminal — and the symptom is maximally unhelpful: pg_cron logs
  // the run as "succeeded" because the request was dispatched, while the
  // function quietly 401s and nothing is ever written.
  const presented = req.headers.get('x-cron-secret')?.trim() ?? '';
  const expected = cronSecret?.trim() ?? '';
  if (!expected || presented !== expected) {
    return new Response(
      JSON.stringify({
        error: 'unauthorized',
        // Enough to tell the three causes apart without leaking the secret:
        // env missing, header missing, or a genuine mismatch.
        detail: !expected
          ? 'TRAFFIC_CRON_SECRET is not set on this function'
          : !presented
            ? 'no x-cron-secret header on the request'
            : 'x-cron-secret did not match',
        presented_length: presented.length,
        expected_length: expected.length,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const missing = [
    !apiKey && 'GOOGLE_MAPS_API_KEY',
    !supabaseUrl && 'SUPABASE_URL',
    !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean);
  if (missing.length) {
    return new Response(JSON.stringify({ error: `missing env: ${missing.join(', ')}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });

  // Which baseline slot this run falls in. Read once, before the loop: a pass
  // takes a couple of seconds and must not straddle two hour buckets, which
  // would compare the last corridors against a different hour than the first.
  const { hour, dow } = lagosParts();

  const { data: baselineRows, error: baselineError } = await supabase
    .from('traffic_route_baseline')
    .select('route_key, expected_duration_seconds')
    .eq('dow', dow)
    .eq('hour', hour);

  const expectedFor = new Map<string, number>(
    (baselineRows ?? []).map((r: { route_key: string; expected_duration_seconds: number }) => [
      r.route_key,
      r.expected_duration_seconds,
    ]),
  );

  const readings: Reading[] = [];
  const failures: string[] = [];
  let noBaseline = 0;

  for (const route of ROUTES) {
    let reading;
    try {
      reading = await computeRoute(route, apiKey);
    } catch (err) {
      // One corridor failing must not cost the other seven. Collected and
      // reported in the response so a partial run is visible rather than
      // looking like a success with fewer rows.
      failures.push(`${route.key}: ${(err as Error).message}`);
      await sleep(PACE_MS);
      continue;
    }

    // Two independent axes, and the app shows both.
    //   severity — how congested, against a free-flow road
    //   vs_usual — how unusual, against what this hour normally looks like
    // HEAVY and NORMAL together is the combination that says waiting will not
    // help, which is a different decision from HEAVY and much worse.
    const severity = severityFor(reading.duration / reading.freeFlow);
    const expected = expectedFor.get(route.key) ?? null;
    const vsUsual = vsUsualFor(reading.duration, expected);
    if (expected === null) noBaseline++;

    const observedAt = new Date().toISOString();

    readings.push({
      route_key: route.key,
      observed_at: observedAt,
      duration_seconds: reading.duration,
      free_flow_seconds: reading.freeFlow,
      expected_duration_seconds: expected,
      severity,
      vs_usual: vsUsual,
    });

    const { error: upsertError } = await supabase.from('traffic_live_routes').upsert(
      {
        route_key: route.key,
        route_label: route.label,
        origin_address: route.origin,
        destination_address: route.destination,
        duration_seconds: reading.duration,
        // Still Google's staticDuration. The column name is a misnomer kept
        // for client compatibility — see the COMMENT on it in migration
        // 20260918024200. expected_duration_seconds is the real baseline.
        typical_duration_seconds: reading.freeFlow,
        expected_duration_seconds: expected,
        vs_usual: vsUsual,
        distance_meters: reading.distance,
        severity,
        updated_at: observedAt,
      },
      { onConflict: 'route_key' },
    );
    if (upsertError) failures.push(`${route.key} upsert: ${upsertError.message}`);

    await sleep(PACE_MS);
  }

  // Append every reading. traffic_live_routes overwrites one row per route, so
  // before this table existed each observation was destroyed by the next run.
  if (readings.length) {
    const { error } = await supabase.from('traffic_route_readings').insert(readings);
    if (error) failures.push(`readings insert: ${error.message}`);
  }

  const body = {
    slot: `${DOW_NAMES[dow]} ${String(hour).padStart(2, '0')}:00 Lagos`,
    routes: ROUTES.length,
    read: readings.length,
    no_baseline: noBaseline,
    baselines_available: expectedFor.size,
    baseline_lookup_error: baselineError?.message ?? null,
    failures,
  };

  // 207 when some corridors failed: the run did useful work and still needs
  // looking at, which a bare 200 would hide and a 500 would overstate.
  return new Response(JSON.stringify(body, null, 2), {
    status: failures.length === 0 ? 200 : 207,
    headers: { 'Content-Type': 'application/json' },
  });
});
