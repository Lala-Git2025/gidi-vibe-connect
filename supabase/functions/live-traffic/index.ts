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

/**
 * ── Daily quota pacing ──────────────────────────────────────────────────────
 *
 * The cron fires every 15 minutes and a pass costs one Routes API call per
 * corridor, so this function wants 96 × 8 = 768 Compute Routes calls a day.
 * The project's `ComputeRoutesRequestsPerDay` quota is **100**. The result,
 * measured over six days of traffic_route_readings:
 *
 *     PT day       readings   first reading   last reading
 *     2026-10-08        107       00:00:03       03:30:05
 *     2026-10-07        115       00:00:05       16:15:51
 *     2026-10-06        112       00:00:03       11:45:04
 *
 * Every day starts at 00:00:0x Pacific — the moment Google's daily quota
 * resets — burns the whole allowance inside a few hours, then 429s until the
 * next reset. On 2026-10-08 the app had no live reading for 20.5 of 24 hours.
 * pg_cron logged all 144 runs as "succeeded" throughout, because
 * `net.http_post` reports that it queued the request, not what came back.
 *
 * So the cadence has to fit the quota that exists. With a budget of N calls
 * and 8 corridors, the day affords floor(N / 8) passes; spacing them evenly
 * gives a minimum interval between passes. At N=100 that is 12 passes a day,
 * one every two hours — worse than 15 minutes, and far better than three
 * hours of coverage followed by twenty-one of nothing.
 *
 * Raising the quota in the Cloud Console is free and remains the real fix.
 * When it is raised, set ROUTES_DAILY_BUDGET to the new value and the spacing
 * tightens automatically; at 800 the interval falls below the 15-minute tick
 * and this guard stops having any effect.
 *
 * Spacing on the newest reading rather than a counter is deliberate: it needs
 * no new table, it is self-correcting after an outage (a long gap means the
 * next tick runs immediately), and it holds across the Pacific midnight
 * boundary without knowing where that boundary is — an even spread over any
 * rolling 24 hours is also an even spread within each quota day.
 */
const DEFAULT_DAILY_BUDGET = 100;

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

  // ── Quota pacing ──────────────────────────────────────────────────────────
  // Before anything billable. See DEFAULT_DAILY_BUDGET above for the measured
  // reason this exists.
  const budgetRaw = Number(env('ROUTES_DAILY_BUDGET') ?? DEFAULT_DAILY_BUDGET);
  const dailyBudget = Number.isFinite(budgetRaw) && budgetRaw > 0
    ? budgetRaw
    : DEFAULT_DAILY_BUDGET;

  const passesPerDay = Math.max(1, Math.floor(dailyBudget / ROUTES.length));
  const minIntervalMs = Math.floor(86_400_000 / passesPerDay);

  const { data: newest, error: newestError } = await supabase
    .from('traffic_route_readings')
    .select('observed_at')
    .order('observed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // A failed lookup must not block the run — losing a reading to a transient
  // read error is worse than one extra call against the budget.
  if (newestError) console.error('pacing: could not read last observation', newestError.message);

  const lastAt = newest?.observed_at ? Date.parse(newest.observed_at) : null;
  const sinceLastMs = lastAt === null ? Infinity : Date.now() - lastAt;

  if (sinceLastMs < minIntervalMs) {
    // 200, not an error: skipping is the function working correctly. The body
    // states the budget it is pacing against so a reader can tell this apart
    // from a crash, and from the 429s this exists to prevent.
    return new Response(
      JSON.stringify({
        skipped: 'paced',
        reason:
          `Routes API budget is ${dailyBudget} calls/day for ${ROUTES.length} corridors ` +
          `= ${passesPerDay} passes/day, one every ${Math.round(minIntervalMs / 60_000)} min.`,
        minutes_since_last_pass: Math.round(sinceLastMs / 60_000),
        minutes_until_next_pass: Math.ceil((minIntervalMs - sinceLastMs) / 60_000),
        raise_quota:
          'ComputeRoutesRequestsPerDay in the Google Cloud console; then set ROUTES_DAILY_BUDGET to match.',
      }, null, 2),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

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
  let quotaExhausted = false;

  for (const route of ROUTES) {
    let reading;
    try {
      reading = await computeRoute(route, apiKey);
    } catch (err) {
      const message = (err as Error).message;
      // One corridor failing must not cost the other seven. Collected and
      // reported in the response so a partial run is visible rather than
      // looking like a success with fewer rows.
      failures.push(`${route.key}: ${message}`);

      // A 429 is not a per-corridor fault — the daily quota is gone and the
      // remaining corridors would each produce an identical rejection. Every
      // run in the dead window was firing all eight regardless, which is how
      // the failure stayed invisible: eight identical quota errors look like
      // eight broken routes.
      if (/\b429\b|RESOURCE_EXHAUSTED|Quota exceeded/i.test(message)) {
        quotaExhausted = true;
        break;
      }

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
    // Keep this. The status code is derived from failures.length, so dropping
    // the field (as an earlier edit did) produces a 207 with nothing on the
    // response explaining it — the exact "status without evidence" shape this
    // whole file exists to avoid.
    failures,
    // Named separately from `failures` because it is one fact about the
    // account, not N facts about corridors, and it is the one that explains
    // a silent feature.
    quota_exhausted: quotaExhausted,
    ...(quotaExhausted
      ? {
          quota_note:
            `Routes API daily quota is gone. Pacing assumes ${dailyBudget} calls/day ` +
            `(${passesPerDay} passes); if that is above the real quota, lower ` +
            'ROUTES_DAILY_BUDGET or raise ComputeRoutesRequestsPerDay in the Cloud console. ' +
            'Also check nothing else is spending the same quota — the GitHub workflow ' +
            'live-traffic-agent.yml must stay unscheduled.',
        }
      : {}),
    paced_every_minutes: Math.round(minIntervalMs / 60_000),
  };

  // 207 when some corridors failed: the run did useful work and still needs
  // looking at, which a bare 200 would hide and a 500 would overstate.
  return new Response(JSON.stringify(body, null, 2), {
    status: failures.length === 0 ? 200 : 207,
    headers: { 'Content-Type': 'application/json' },
  });
});
