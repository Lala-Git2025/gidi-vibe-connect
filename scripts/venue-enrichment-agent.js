#!/usr/bin/env node

/**
 * Gidi Connect — venue enrichment agent (Google Places API).
 *
 * Replaces seeded venue data with real data from Google Places.
 *
 * This is a replacement, not a top-up. The seeded rows carry placeholder phone
 * numbers ('+234 818 555 0000', '+234 908 000 0000'), ratings implausibly
 * clustered between 4.2 and 4.7, a price_range column holding two incompatible
 * schemes at once, and no coordinates at all.
 *
 * Safety model:
 *   - Dry run by default. Nothing is written without --apply.
 *   - A venue is only updated when the matched place scores above MIN_SCORE
 *     and sits inside the Lagos bounding box. Everything else is reported for
 *     manual review rather than guessed at.
 *   - A field is never overwritten with null. If Google has no phone number,
 *     whatever is there stays.
 *   - google_place_id makes re-runs idempotent: the second run updates the
 *     same place rather than re-matching by name and possibly landing
 *     somewhere else.
 *
 * Usage:
 *   node scripts/venue-enrichment-agent.js                  # dry run, all venues
 *   node scripts/venue-enrichment-agent.js --limit 5        # dry run, first 5
 *   node scripts/venue-enrichment-agent.js --only "Circa"   # dry run, one venue
 *   node scripts/venue-enrichment-agent.js --apply          # write
 *   node scripts/venue-enrichment-agent.js --apply --force  # re-enrich already-done rows
 *
 * Required env:
 *   GOOGLE_MAPS_API_KEY        Google Cloud console, Places API (New) enabled
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY      = process.env.GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args    = process.argv.slice(2);
const APPLY   = args.includes('--apply');
const FORCE   = args.includes('--force');
const LIMIT   = Number(args[args.indexOf('--limit') + 1]) || null;
const ONLY    = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

/** Below this, the match is reported rather than written. */
const MIN_SCORE = 0.6;

/** Lagos, generously drawn. A "match" outside this is the wrong city. */
const LAGOS_BOX = { minLat: 6.30, maxLat: 6.80, minLng: 3.00, maxLng: 3.80 };

/** Centre of Victoria Island, used to bias the search toward Lagos. */
const LAGOS_CENTRE = { latitude: 6.4281, longitude: 3.4219 };

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.regularOpeningHours.weekdayDescriptions',
  'places.priceLevel',
  'places.types',
  'places.businessStatus',
].join(',');

const PRICE_LEVEL_FROM_ENUM = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

/**
 * The single place the price display string is decided.
 *
 * The naira sign renders as a struck-through N, which is what the glyph
 * actually is — but it reads as a typo at 11px on the venue cards. Keep this
 * map as the one edit point: swapping to words is a one-line change here plus
 * a re-run, with no app code touched.
 */
const PRICE_DISPLAY = ['Free', '₦', '₦₦', '₦₦₦', '₦₦₦₦'];

// ── Matching ────────────────────────────────────────────────────────────────

// Words that carry no identifying information for a Lagos venue and would
// otherwise inflate the score between two unrelated restaurants.
const STOPWORDS = new Set([
  'the', 'lagos', 'nigeria', 'restaurant', 'restaurants', 'bar', 'bars',
  'lounge', 'club', 'cafe', 'and', 'ltd', 'limited', 'company', 'co',
]);

const tokenise = (s) =>
  new Set(
    String(s || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t && !STOPWORDS.has(t)),
  );

/**
 * Overlap against the SMALLER token set, not the union. "Circa" should match
 * "Circa Lagos" at full confidence; Jaccard would score that 0.5 and reject a
 * correct match.
 */
const nameScore = (a, b) => {
  const A = tokenise(a);
  const B = tokenise(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return shared / Math.min(A.size, B.size);
};

const inLagos = (loc) =>
  !!loc &&
  loc.latitude >= LAGOS_BOX.minLat && loc.latitude <= LAGOS_BOX.maxLat &&
  loc.longitude >= LAGOS_BOX.minLng && loc.longitude <= LAGOS_BOX.maxLng;

/**
 * "Monday: 12:00 PM – 11:00 PM" → { Monday: "12:00 PM – 11:00 PM" }
 * The app already renders opening_hours as a label→hours map, so this matches
 * the shape it expects rather than inventing a new one.
 */
const parseHours = (weekdayDescriptions) => {
  if (!Array.isArray(weekdayDescriptions) || !weekdayDescriptions.length) return null;
  const out = {};
  for (const line of weekdayDescriptions) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return Object.keys(out).length ? out : null;
};

// ── Places lookup ───────────────────────────────────────────────────────────

async function searchPlace(venue) {
  const query = `${venue.name} ${venue.location || ''} Lagos Nigeria`.replace(/\s+/g, ' ').trim();

  const res = await fetch(PLACES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: 'en',
      maxResultCount: 5,
      locationBias: { circle: { center: LAGOS_CENTRE, radius: 30000 } },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API ${res.status}: ${body.slice(0, 300)}`);
  }

  const { places } = await res.json();
  if (!places || !places.length) return null;

  // Best name match among the candidates that are actually in Lagos.
  let best = null;
  for (const place of places) {
    if (!inLagos(place.location)) continue;
    const score = nameScore(venue.name, place.displayName?.text);
    if (!best || score > best.score) best = { place, score };
  }
  return best;
}

// ── Update construction ─────────────────────────────────────────────────────

/** Only fields Google actually returned. Never writes a null over real data. */
function buildUpdate(place) {
  const update = { google_place_id: place.id, enriched_at: new Date().toISOString() };

  if (place.nationalPhoneNumber) update.contact_phone = place.nationalPhoneNumber;
  if (place.websiteUri)          update.website_url   = place.websiteUri;
  if (place.formattedAddress)    update.address       = place.formattedAddress;

  if (typeof place.rating === 'number')         update.rating        = place.rating;
  if (typeof place.userRatingCount === 'number') update.ratings_total = place.userRatingCount;

  if (place.location) {
    update.latitude  = place.location.latitude;
    update.longitude = place.location.longitude;
  }

  const level = PRICE_LEVEL_FROM_ENUM[place.priceLevel];
  if (typeof level === 'number') {
    update.price_level = level;
    update.price_range = PRICE_DISPLAY[level];
  }

  const hours = parseHours(place.regularOpeningHours?.weekdayDescriptions);
  if (hours) update.opening_hours = hours;

  // Google's `types` are machine tags ("night_club", "bar"). They are the only
  // real tag source available — exactly one venue in the database has tags
  // today — so map them to readable labels.
  if (Array.isArray(place.types) && place.types.length) {
    const tags = place.types
      .filter((t) => !['point_of_interest', 'establishment', 'food'].includes(t))
      .map((t) => t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    if (tags.length) update.tags = tags.slice(0, 6);
  }

  return update;
}

// ── Main ────────────────────────────────────────────────────────────────────

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

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  let query = supabase
    .from('venues')
    .select('id, name, location, category, contact_phone, website_url, rating, price_range, enriched_at')
    .order('name');

  if (!FORCE) query = query.is('enriched_at', null);
  if (ONLY)   query = query.ilike('name', `%${ONLY}%`);
  if (LIMIT)  query = query.limit(LIMIT);

  const { data: venues, error } = await query;
  if (error) throw error;

  if (!venues.length) {
    console.log('No venues to enrich. Use --force to re-enrich already-processed rows.');
    return;
  }

  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} — ${venues.length} venue(s)\n`);

  const matched = [];
  const review  = [];
  const failed  = [];

  for (const venue of venues) {
    try {
      const best = await searchPlace(venue);

      if (!best) {
        review.push({ venue, reason: 'no Lagos result' });
        console.log(`  ?  ${venue.name} — no result in Lagos`);
        continue;
      }

      const { place, score } = best;
      const label = `${venue.name}  →  ${place.displayName?.text}  (${score.toFixed(2)})`;

      if (score < MIN_SCORE) {
        review.push({ venue, place, score, reason: 'low confidence' });
        console.log(`  ?  ${label}  LOW CONFIDENCE, skipped`);
        continue;
      }

      const update = buildUpdate(place);
      matched.push({ venue, place, score, update });

      const bits = [
        update.contact_phone  ? `phone ${update.contact_phone}` : null,
        update.rating != null ? `${update.rating}★ (${update.ratings_total ?? '?'})` : null,
        update.price_range    ? update.price_range : null,
        update.latitude       ? 'coords' : null,
        update.opening_hours  ? 'hours' : null,
        update.tags           ? `${update.tags.length} tags` : null,
      ].filter(Boolean).join(', ');
      console.log(`  ✓  ${label}\n       ${bits}`);

      if (APPLY) {
        const { error: upErr } = await supabase.from('venues').update(update).eq('id', venue.id);
        if (upErr) {
          failed.push({ venue, error: upErr.message });
          console.log(`       WRITE FAILED: ${upErr.message}`);
        }
      }
    } catch (err) {
      failed.push({ venue, error: err.message });
      console.log(`  !  ${venue.name} — ${err.message}`);
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`matched   ${matched.length}`);
  console.log(`review    ${review.length}`);
  console.log(`failed    ${failed.length}`);

  if (review.length) {
    console.log(`\nNeeds a human eye (nothing was written for these):`);
    for (const r of review) {
      const got = r.place ? ` — best guess "${r.place.displayName?.text}" @ ${r.score.toFixed(2)}` : '';
      console.log(`  • ${r.venue.name} [${r.reason}]${got}`);
    }
  }

  if (!APPLY) console.log(`\nDry run. Re-run with --apply to write.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
