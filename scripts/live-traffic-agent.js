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

dotenv.config();

const API_KEY      = process.env.GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY        = process.argv.includes('--apply');

const ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const PACE_MS = 250;

// ── Routes ──────────────────────────────────────────────────────────────────
// A curated set of the corridors that decide whether a night out happens at
// all — the mainland↔island crossings first, then the big mainland arteries.
// route_key is the stable UPSERT identity and must never change once live;
// route_label is what the app shows and may be reworded freely.

const ROUTES = [
  {
    key: 'third-mainland-bridge',
    label: 'Third Mainland Bridge',
    origin: 'Iyana Oworo, Lagos, Nigeria',
    destination: 'Adeniji Adele Road, Lagos Island, Lagos, Nigeria',
  },
  {
    key: 'eko-bridge',
    label: 'Eko Bridge',
    origin: 'Costain, Lagos, Nigeria',
    destination: 'Idumota, Lagos Island, Lagos, Nigeria',
  },
  {
    key: 'lekki-epe-expressway',
    label: 'Lekki-Epe Expressway',
    origin: 'Falomo, Ikoyi, Lagos, Nigeria',
    destination: 'Ajah, Lagos, Nigeria',
  },
  {
    key: 'ikorodu-road',
    label: 'Ikorodu Road',
    origin: 'Ojota, Lagos, Nigeria',
    destination: 'Fadeyi, Lagos, Nigeria',
  },
  {
    key: 'apapa-oshodi-expressway',
    label: 'Apapa-Oshodi Expressway',
    origin: 'Apapa, Lagos, Nigeria',
    destination: 'Oshodi, Lagos, Nigeria',
  },
  {
    key: 'agege-motor-road',
    label: 'Agege Motor Road',
    origin: 'Oshodi, Lagos, Nigeria',
    destination: 'Iyana Ipaja, Lagos, Nigeria',
  },
  {
    key: 'funsho-williams-avenue',
    label: 'Funsho Williams Avenue',
    origin: 'Costain, Lagos, Nigeria',
    destination: 'Alaka, Surulere, Lagos, Nigeria',
  },
  {
    key: 'airport-road',
    label: 'Airport Road',
    origin: 'Mafoluku, Lagos, Nigeria',
    destination: 'Murtala Muhammed International Airport, Lagos, Nigeria',
  },
];

// ── Severity from the duration ratio ────────────────────────────────────────
// duration / typical. Thresholds are a judgement call, chosen to match how a
// Lagos driver would describe the road: a fifth slower than normal is
// noticeable but fine; nearly double is a real problem.

const severityFor = (ratio) => {
  if (ratio < 1.15) return 'light';
  if (ratio < 1.4)  return 'moderate';
  if (ratio < 1.8)  return 'heavy';
  return 'critical';
};

// Routes API returns durations as strings like "1234s".
const seconds = (s) => (typeof s === 'string' ? parseInt(s, 10) : null);

// ── Routes API ──────────────────────────────────────────────────────────────

async function computeRoute(route) {
  const res = await fetch(ROUTES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      // Only these fields — the mask decides the pricing SKU, and duration
      // versus staticDuration is the entire signal. Segment-level traffic
      // along the polyline is a pricier tier and isn't needed for a ratio.
      'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters',
    },
    body: JSON.stringify({
      origin:      { address: route.origin },
      destination: { address: route.destination },
      travelMode: 'DRIVE',
      // TRAFFIC_AWARE makes `duration` reflect current conditions;
      // `staticDuration` stays the no-traffic baseline regardless.
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Routes API ${res.status}: ${body.slice(0, 300)}`);
  }

  const { routes } = await res.json();
  const r = routes?.[0];
  if (!r) throw new Error('Routes API returned no route');

  const duration = seconds(r.duration);
  const typical  = seconds(r.staticDuration);
  if (!duration || !typical) throw new Error(`Unparseable durations: ${JSON.stringify(r)}`);

  return { duration, typical, distance: r.distanceMeters ?? null };
}

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

  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} — ${ROUTES.length} routes\n`);

  const stats = { ok: 0, failed: 0 };

  for (const route of ROUTES) {
    let reading;
    try {
      reading = await computeRoute(route);
    } catch (err) {
      stats.failed++;
      console.log(`  !  ${route.label}\n       ${err.message}`);
      await sleep(PACE_MS);
      continue;
    }

    const ratio = reading.duration / reading.typical;
    const severity = severityFor(ratio);
    const delay = mins(reading.duration - reading.typical);

    stats.ok++;
    console.log(
      `  ${severity === 'light' ? '✓' : '▲'}  ${route.label.padEnd(26)} ` +
      `${String(mins(reading.duration)).padStart(3)} min  ` +
      `(normally ${mins(reading.typical)}, ${delay >= 0 ? '+' : ''}${delay})  ` +
      `${severity.toUpperCase()}`,
    );

    if (APPLY) {
      const { error } = await supabase.from('traffic_live_routes').upsert(
        {
          route_key: route.key,
          route_label: route.label,
          origin_address: route.origin,
          destination_address: route.destination,
          duration_seconds: reading.duration,
          typical_duration_seconds: reading.typical,
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

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`read      ${stats.ok}`);
  console.log(`failed    ${stats.failed}`);
  if (!APPLY) console.log('\nDry run — nothing written. Re-run with --apply to write.');
}

main().catch((err) => { console.error(err); process.exit(1); });
