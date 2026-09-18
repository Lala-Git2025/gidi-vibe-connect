#!/usr/bin/env node

/**
 * Gidi Connect — traffic baseline agent.
 *
 * Builds the thing "worse than usual" is measured against: for every corridor,
 * what it normally takes at each hour of each day of the week.
 *
 * WHY THIS EXISTS. The live agent stored Google's `staticDuration` in a column
 * named `typical_duration_seconds` and the app printed it as "normally N min".
 * staticDuration is the drive with NO traffic — an empty road. On Third
 * Mainland it reads 16 minutes; the real Tuesday-08:00 expectation is 31. So
 * the app was comparing every reading against a road that has never existed.
 * Two consequences, both bad: chronically busy corridors read HEAVY all day, so
 * the badge stopped discriminating; and "+36 min" invited users to believe they
 * were losing 36 minutes when they were having an ordinary Thursday.
 *
 * HOW. The Routes API accepts a FUTURE `departureTime` for driving and returns
 * its historical prediction for that slot. Probed before building this:
 *
 *     Third Mainland Bridge, free-flow 16 min throughout
 *       Tue 07:00   31 min   (1.90x)   <- am peak, into the island
 *       Tue 11:00   20 min   (1.21x)
 *       Tue 18:00   18 min   (1.07x)   <- evening crush is the other way
 *       Sun 11:00   15 min   (0.92x)
 *
 * That is a real curve, and it arrives on day one rather than after weeks of
 * self-collected history. traffic_route_readings accumulates our own
 * observations in parallel so the baseline can later be recomputed from what
 * Lagos actually does — see `source` on traffic_route_baseline.
 *
 * WHY FULL DAY-OF-WEEK. This started as weekday/weekend and that was wrong.
 * Google's own predictions for Third Mainland at 07:00 run:
 *
 *       Mon 42 · Tue 31 · Wed 29 · Thu 24 · Fri 22 · Sat 15 · Sun 14
 *
 * Monday is nearly double Friday on the same road at the same hour, declining
 * monotonically across the week. One "weekday" bucket has to pick a middle
 * value, and then reports every ordinary Monday commute as "much worse than
 * usual" — the exact false alarm this baseline exists to remove.
 *
 * COST. 8 routes x 7 days x 24 hours = 1,344 Compute Routes calls per run.
 * Run MONTHLY, not weekly: a historical traffic model does not move week to
 * week, and monthly keeps combined Routes usage (this plus the hourly live
 * agent, ~5,800/month) near the free allowance rather than several times over.
 *
 * RESUMABLE, because the quota is small. This project's Routes API cap is
 * `ComputeRoutesRequestsPerDay` = 100 — small enough that the hourly live agent
 * (8 routes x 24 runs = 192/day) was already exceeding it and silently failing
 * for the back half of every day. Rather than require the cap be raised before
 * anything works, this agent skips slots that are already filled and recent,
 * and takes a `--limit` on calls per run. Run it daily and the table fills in
 * over a couple of weeks; raise the quota and it fills in one run. Either way
 * the app degrades honestly in the meantime — a missing baseline row means the
 * comparison is omitted, never guessed.
 *
 * Usage:
 *   node scripts/traffic-baseline-agent.js            # dry run — print, write nothing
 *   node scripts/traffic-baseline-agent.js --apply    # fill missing/stale slots
 *   node scripts/traffic-baseline-agent.js --apply --limit 80
 *   node scripts/traffic-baseline-agent.js --route third-mainland-bridge
 *   node scripts/traffic-baseline-agent.js --refresh  # ignore existing rows
 *
 * Required env:
 *   GOOGLE_MAPS_API_KEY   Routes API must be enabled on the project.
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  ROUTES, computeRoute, severityFor,
  LAGOS_UTC_OFFSET_HOURS, DOW_NAMES,
} from './lagos-corridors.js';

dotenv.config();

const API_KEY      = process.env.GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY        = process.argv.includes('--apply');

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const ONLY_ROUTE = arg('--route');
const REFRESH    = process.argv.includes('--refresh');
// Default sits just under the observed 100/day project cap, leaving headroom
// for the hourly live agent to keep working on the same quota.
const CALL_LIMIT = Number(arg('--limit', '60'));

/** A slot older than this is refetched; Google's model shifts slowly. */
const STALE_DAYS = 45;

const PACE_MS = 220;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mins  = (s) => Math.round(s / 60);

/**
 * The next future instant at `hour` Lagos time on the given day of the week.
 *
 * Must be in the future: the Routes API only accepts a past departureTime for
 * TRANSIT, and this is a DRIVE query. Being a few days out is fine and in fact
 * desirable — a prediction that far ahead is purely Google's historical model,
 * with no live incident bleeding into it, which is exactly what a baseline
 * should be.
 */
function nextSlot(dow, hour) {
  const d = new Date();
  d.setUTCHours(hour - LAGOS_UTC_OFFSET_HOURS, 0, 0, 0);

  for (let i = 0; i < 14; i++) {
    if (d.getUTCDay() === dow && d.getTime() > Date.now() + 60_000) return d;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  throw new Error(`No future slot found for dow ${dow} hour ${hour}`);
}

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

  const routes = ONLY_ROUTE ? ROUTES.filter(r => r.key === ONLY_ROUTE) : ROUTES;
  if (routes.length === 0) {
    console.error(`No route matching --route ${ONLY_ROUTE}`);
    process.exit(1);
  }

  const dows = [1, 2, 3, 4, 5, 6, 0];   // Mon-first reads better than Sun-first

  // What is already filled, so a run under a small quota resumes rather than
  // restarting. Keyed route|dow|hour.
  const have = new Set();
  if (!REFRESH) {
    const staleBefore = new Date(Date.now() - STALE_DAYS * 86400_000).toISOString();
    const { data, error } = await supabase
      .from('traffic_route_baseline')
      .select('route_key, dow, hour')
      // Scoped to the routes this run covers, so --route reports a correct
      // "remaining" instead of subtracting other routes' rows from its own total.
      .in('route_key', routes.map(r => r.key))
      .gte('updated_at', staleBefore);
    if (error) console.log(`  existing-rows lookup failed (${error.message}) — treating all slots as missing`);
    for (const r of data ?? []) have.add(`${r.route_key}|${r.dow}|${r.hour}`);
  }

  const total = routes.length * dows.length * 24;
  const todo = total - have.size;
  console.log(
    `${APPLY ? 'APPLYING' : 'DRY RUN'} — ${routes.length} routes x 7 days x 24h = ${total} slots, ` +
    `${have.size} already fresh, ${todo} to fetch, limit ${CALL_LIMIT} this run\n`,
  );

  const stats = { ok: 0, failed: 0, written: 0 };
  // Distinct failure messages with counts. A per-cell '?' tells you something
  // broke but not what, and 1,344 stack traces tell you nothing either.
  const failures = new Map();

  for (const route of routes) {
    console.log(`  ${route.label}`);

    for (const dow of dows) {
      const rows = [];
      // One line per day rather than 24 — the shape of the curve is the
      // reviewable thing, and 1,344 individual lines is not readable output.
      const cells = [];

      for (let hour = 0; hour < 24; hour++) {
        if (have.has(`${route.key}|${dow}|${hour}`)) { cells.push('  ·'); continue; }
        if (stats.ok + stats.failed >= CALL_LIMIT) { cells.push('  -'); continue; }

        let reading;
        try {
          reading = await computeRoute(route, API_KEY, nextSlot(dow, hour));
          stats.ok++;
        } catch (err) {
          stats.failed++;
          const key = String(err.message).slice(0, 160);
          failures.set(key, (failures.get(key) ?? 0) + 1);
          cells.push('  ?');
          await sleep(PACE_MS);
          continue;
        }

        const ratio = reading.duration / reading.freeFlow;
        cells.push(String(mins(reading.duration)).padStart(3));

        rows.push({
          route_key: route.key,
          dow,
          hour,
          expected_duration_seconds: reading.duration,
          free_flow_seconds: reading.freeFlow,
          source: 'google_prediction',
          updated_at: new Date().toISOString(),
        });

        await sleep(PACE_MS);
      }

      const peak = rows.reduce((a, b) => (b.expected_duration_seconds > (a?.expected_duration_seconds ?? 0) ? b : a), null);
      console.log(`    ${DOW_NAMES[dow].padEnd(4)} ${cells.join('')}`);
      if (peak) {
        console.log(
          `    ${' '.repeat(4)} peak ${mins(peak.expected_duration_seconds)} min at ${String(peak.hour).padStart(2, '0')}:00 ` +
          `(free-flow ${mins(peak.free_flow_seconds)}, ${severityFor(peak.expected_duration_seconds / peak.free_flow_seconds)})`,
        );
      }

      if (APPLY && rows.length) {
        const { error } = await supabase
          .from('traffic_route_baseline')
          .upsert(rows, { onConflict: 'route_key,dow,hour' });
        if (error) {
          console.log(`    WRITE FAILED: ${error.message}`);
          stats.failed += rows.length;
        } else {
          stats.written += rows.length;
        }
      }
    }
    console.log('');
  }

  console.log('─'.repeat(70));
  console.log('legend:  N = fetched   · = already fresh   - = beyond this run\'s limit   ? = failed\n');
  console.log(`read      ${stats.ok}`);
  console.log(`failed    ${stats.failed}`);
  console.log(`written   ${stats.written}`);
  console.log(`remaining ${Math.max(0, todo - stats.ok)}${todo - stats.ok > 0 ? '  (re-run to continue)' : ''}`);
  if (failures.size) {
    console.log('\nfailures:');
    for (const [msg, n] of [...failures.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(4)} x  ${msg}`);
    }
  }
  if (!APPLY) console.log('\nDry run — nothing written. Re-run with --apply to write.');
}

main().catch((err) => { console.error(err); process.exit(1); });
