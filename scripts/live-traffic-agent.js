#!/usr/bin/env node

/**
 * Gidi Connect — live traffic agent (Google Routes API).
 *
 * The quantitative half of a hybrid. For each route in ROUTES it asks Google
 * how long the drive takes RIGHT NOW versus how long it typically takes with
 * no traffic, and derives a severity from the ratio. That number is always
 * fresh — it does not depend on anyone at a radio station posting anything.
 *
 * It deliberately does not replace lagos-traffic-agent.js. This agent can say
 * "Third Mainland Bridge is 3× slower than normal"; it cannot say why. The
 * radio pipeline says "a flatbed truck spilled its load near Ajibade Bus
 * Stop" — the detail people actually act on — but only when someone posts,
 * which in practice is a few times a day. The two signals answer different
 * questions and sit side by side in the app. (This app ran on TomTom's
 * traffic API before, and dropped it for the radio pipeline precisely because
 * a number alone wasn't enough. That lesson is why this is additive.)
 *
 * Routes are given as place-name ADDRESSES, not coordinates, and Google's own
 * geocoding resolves them. Hand-typing lat/lng from memory is how a route
 * ends up silently measuring the wrong stretch of road; a badly-resolved
 * address at least fails loudly.
 *
 * Severity excludes 'closed' on purpose — a closed road and a very slow one
 * are indistinguishable to a duration ratio. Only a human-sourced report can
 * make that call, so it stays with traffic_reports.
 *
 * Usage:
 *   node scripts/live-traffic-agent.js            # dry run — fetch and print, write nothing
 *   node scripts/live-traffic-agent.js --apply    # upsert into traffic_live_routes
 *
 * Required env:
 *   GOOGLE_MAPS_API_KEY   Same key as venue discovery, but the ROUTES API must
 *                         also be enabled on the project — it's a separate API
 *                         from Places API (New), with its own quota bucket.
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  ROUTES, computeRoute, severityFor, vsUsualFor, lagosParts, DOW_NAMES,
} from './lagos-corridors.js';

dotenv.config();

const API_KEY      = process.env.GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY        = process.argv.includes('--apply');

const PACE_MS = 250;

// ── Main ────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mins  = (s) => Math.round(s / 60);

async function main() {
  const missing = [
    !API_KEY && 'GOOGLE_MAPS_API_KEY',
    !SUPABASE_URL && 'VITE_SUPABASE_URL',
    !SERVICE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean);
  if (missing.length) {
    console.error(`Missing env: ${missing.join(', ')}`);
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Which baseline slot this run falls in. Read once: a run takes a couple of
  // seconds and must not straddle two hour buckets halfway through, which
  // would compare the last routes against a different hour than the first.
  const { hour, dow } = lagosParts();

  const { data: baselineRows, error: baselineError } = await supabase
    .from('traffic_route_baseline')
    .select('route_key, expected_duration_seconds')
    .eq('dow', dow)
    .eq('hour', hour);

  if (baselineError) {
    console.log(`  baseline lookup failed (${baselineError.message}) — continuing without comparisons`);
  }
  const expectedFor = new Map((baselineRows ?? []).map(r => [r.route_key, r.expected_duration_seconds]));

  console.log(
    `${APPLY ? 'APPLYING' : 'DRY RUN'} — ${ROUTES.length} routes, ` +
    `${DOW_NAMES[dow]} ${String(hour).padStart(2, '0')}:00 Lagos, ` +
    `${expectedFor.size}/${ROUTES.length} baselines available\n`,
  );

  const stats = { ok: 0, failed: 0, noBaseline: 0 };
  const readings = [];

  for (const route of ROUTES) {
    let reading;
    try {
      reading = await computeRoute(route, API_KEY);
    } catch (err) {
      stats.failed++;
      console.log(`  !  ${route.label}\n       ${err.message}`);
      await sleep(PACE_MS);
      continue;
    }

    // Two independent axes, and the app shows both.
    //   severity  — how congested, against a free-flow road
    //   vs_usual  — how unusual, against what this hour normally looks like
    // A corridor can be genuinely HEAVY and entirely NORMAL for the time, and
    // that combination is the one that tells you waiting will not help.
    const severity = severityFor(reading.duration / reading.freeFlow);
    const expected = expectedFor.get(route.key) ?? null;
    const vsUsual = vsUsualFor(reading.duration, expected);
    if (!expected) stats.noBaseline++;

    stats.ok++;
    const now = mins(reading.duration);
    console.log(
      `  ${severity === 'light' ? '✓' : '▲'}  ${route.label.padEnd(26)} ` +
      `${String(now).padStart(3)} min  ` +
      `${severity.toUpperCase().padEnd(9)} ` +
      (expected
        ? `usually ${String(mins(expected)).padStart(3)} → ${vsUsual}`
        : `free-flow ${String(mins(reading.freeFlow)).padStart(3)} (no baseline yet)`),
    );

    readings.push({
      route_key: route.key,
      observed_at: new Date().toISOString(),
      duration_seconds: reading.duration,
      free_flow_seconds: reading.freeFlow,
      expected_duration_seconds: expected,
      severity,
      vs_usual: vsUsual,
    });

    if (APPLY) {
      const { error } = await supabase.from('traffic_live_routes').upsert(
        {
          route_key: route.key,
          route_label: route.label,
          origin_address: route.origin,
          destination_address: route.destination,
          duration_seconds: reading.duration,
          // Still Google staticDuration. The column name is a misnomer kept
          // for client compatibility — see the COMMENT on it in migration
          // 20260918024200. `expected_duration_seconds` is the real baseline.
          typical_duration_seconds: reading.freeFlow,
          expected_duration_seconds: expected,
          vs_usual: vsUsual,
          distance_meters: reading.distance,
          severity,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'route_key' },
      );
      if (error) {
        stats.failed++;
        console.log(`       WRITE FAILED: ${error.message}`);
      }
    }

    await sleep(PACE_MS);
  }

  // Append every reading. The live table above overwrites one row per route,
  // so before this existed each observation was destroyed an hour after it was
  // taken — including all the history that would have let us build a baseline
  // from what Lagos actually does rather than what Google predicts.
  if (APPLY && readings.length) {
    const { error } = await supabase.from('traffic_route_readings').insert(readings);
    if (error) console.log(`  readings insert FAILED: ${error.message}`);
    else console.log(`\n  ${readings.length} readings appended`);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`read         ${stats.ok}`);
  console.log(`failed       ${stats.failed}`);
  console.log(`no baseline  ${stats.noBaseline}${stats.noBaseline ? '  (run traffic-baseline-agent.js --apply)' : ''}`);
  if (!APPLY) console.log('\nDry run — nothing written. Re-run with --apply to write.');
}

main().catch((err) => { console.error(err); process.exit(1); });
