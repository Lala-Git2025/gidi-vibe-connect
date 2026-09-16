#!/usr/bin/env node

/**
 * Gidi Connect — venue discovery agent (Google Places API).
 *
 * Finds real venues for Lagos areas the app knows about but the database
 * doesn't. Five of the ten areas in the consumer app's area list currently
 * hold zero venues (Yaba, Surulere, Ajah, Festac, Lagos Island, Maryland);
 * the rest hold between 2 and 14. "Explore the area" already reads real data
 * — it was rebuilt to do that — so this is the entire remaining gap.
 *
 * This is additive: it only INSERTS venues that are genuinely new. It never
 * touches an existing row. venue-enrichment-agent.js is the complementary
 * script that fills in missing fields on rows that already exist — run that
 * afterward (or first) to backfill the 33 seeded venues, which this script
 * leaves untouched by design.
 *
 * Safety model, same shape as venue-enrichment-agent.js:
 *   - Dry run by default. Nothing is written without --apply.
 *   - A candidate is skipped, not inserted, when: its Google place_id already
 *     exists in `venues`; its name closely matches an existing venue already
 *     bucketed in the same area (the enrichment script should touch that one
 *     instead); it has no rating/review signal AND no confident category; or
 *     Google reports it CLOSED_PERMANENTLY / CLOSED_TEMPORARILY.
 *   - Category is only ever assigned from Google's own place type or an
 *     explicit keyword in the name (e.g. "Rooftop", "Lounge", "Beach Club").
 *     A candidate with neither is skipped and reported, never guessed at.
 *
 * Runs in two phases. Phase 1 searches every in-scope area and attributes
 * each result to its REAL area from Google's own formattedAddress, not from
 * whichever area's search query happened to surface it — Lagos neighbourhoods
 * overlap, so "bars in Ikoyi" legitimately returns venues whose address says
 * Victoria Island. A first version trusted the query area, and a full dry run
 * showed the same real venue (Vaniti Lagos, The View Rooftop Lounge) turning
 * up as an apparent "new" candidate in four or five different areas, filed
 * under whichever happened to be searched first. Phase 2 takes each area's
 * correctly-attributed pool, filters, caps at MAX_PER_AREA, and inserts.
 *
 * Phase 1 also reports a feedback signal: whenever a venue's address matches
 * NONE of our curated aliases, its own Google-reported neighbourhood is
 * tallied and printed at the end, ranked by how often it turned up. LAGOS_AREAS
 * is still hand-curated — this doesn't create areas automatically — but it
 * means expanding it is a data-driven decision (Google saying "Ikate Elegushi"
 * came up 14 times) rather than another round of guessing neighbourhood names
 * from memory, which is how the previous expansion was done.
 *
 * `location` is set to the area's canonical name, which is also the area's
 * first alias in the app's LAGOS_AREAS list — the same alias-matching code
 * the app uses (`matchArea` in apps/consumer-app/lib/areas.ts) will bucket it
 * correctly. AREAS below duplicates that file's names + aliases rather than
 * importing it: this is a plain Node/CommonJS-friendly script, the app file
 * is TypeScript inside an Expo project, and the other scripts in this repo
 * already follow the same "small overlapping constant, not a shared module"
 * pattern. If apps/consumer-app/lib/areas.ts's area list changes, update the
 * AREAS array below to match.
 *
 * Usage:
 *   node scripts/venue-discovery-agent.js                    # dry run, all areas
 *   node scripts/venue-discovery-agent.js --area Yaba         # dry run, one area
 *   node scripts/venue-discovery-agent.js --apply             # write
 *   node scripts/venue-discovery-agent.js --apply --area Yaba
 *
 * Required env:
 *   GOOGLE_MAPS_API_KEY   Google Cloud console, Places API (New) enabled,
 *                         billing attached (the $200/month free credit covers
 *                         this run many times over — see the walkthrough).
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY      = process.env.GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args        = process.argv.slice(2);
const APPLY        = args.includes('--apply');
const ONLY_AREA    = args.includes('--area') ? args[args.indexOf('--area') + 1] : null;
const MAX_PER_AREA = Number(process.env.DISCOVERY_MAX_PER_AREA || 15);

const SEARCH_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const PACE_MS = 300; // Places quotas are generous; this is politeness, not survival.

// ── Areas — mirrors apps/consumer-app/lib/areas.ts ─────────────────────────

const AREAS = [
  { name: 'Victoria Island', aliases: ['Victoria Island', 'V/I'] },
  { name: 'Lekki',           aliases: ['Lekki', 'Lekki Phase 1', 'Lekki Phase 2', 'Chevron', 'Chevy View'] },
  { name: 'Ikoyi',           aliases: ['Ikoyi'] },
  { name: 'Oniru',           aliases: ['Oniru'] },
  { name: 'Ikeja',           aliases: ['Ikeja', 'Ikeja GRA'] },
  { name: 'Yaba',            aliases: ['Yaba'] },
  { name: 'Surulere',        aliases: ['Surulere'] },
  { name: 'Ajah',            aliases: ['Ajah', 'Sangotedo'] },
  { name: 'Festac',          aliases: ['Festac', 'Festac Town'] },
  { name: 'Lagos Island',    aliases: ['Lagos Island', 'Isale Eko', 'Marina', 'Broad Street'] },
  { name: 'Maryland',        aliases: ['Maryland'] },
  // Mainland expansion — see the matching comment in apps/consumer-app/lib/areas.ts
  // for why these are here and Oniru/Lagos Island didn't get more neighbours instead.
  { name: 'Opebi',           aliases: ['Opebi', 'Opebi Road'] },
  { name: 'Gbagada',         aliases: ['Gbagada'] },
  { name: 'Magodo',          aliases: ['Magodo', 'Magodo GRA'] },
  { name: 'Ogudu',           aliases: ['Ogudu', 'Ogudu GRA'] },
  { name: 'Anthony',         aliases: ['Anthony', 'Anthony Village'] },
  { name: 'Ilupeju',         aliases: ['Ilupeju'] },
  { name: 'Apapa',           aliases: ['Apapa', 'Apapa GRA'] },
  { name: 'Amuwo Odofin',    aliases: ['Amuwo Odofin', 'Amuwo'] },
  { name: 'Isolo',           aliases: ['Isolo'] },
  { name: 'Oshodi',          aliases: ['Oshodi'] },
  { name: 'Agege',           aliases: ['Agege'] },
  { name: 'Ikorodu',         aliases: ['Ikorodu'] },
  { name: 'Shomolu',         aliases: ['Shomolu', 'Bariga'] },
  { name: 'Epe',             aliases: ['Epe'] },
];

/** One search per line of attack per area: nightlife, food, and the harder-to-type ones. */
const QUERY_TEMPLATES = [
  (area) => `bars and nightclubs in ${area}, Lagos, Nigeria`,
  (area) => `restaurants in ${area}, Lagos, Nigeria`,
  (area) => `lounges and rooftop bars in ${area}, Lagos, Nigeria`,
];

// ── Category mapping ─────────────────────────────────────────────────────

// Exact-match cases for Google types that share no substring with any keyword
// below ('pub' and 'bistro' don't contain "bar" or "restaurant" themselves).
const EXACT_TYPE_CATEGORY = { pub: 'Bar', bistro: 'Restaurant' };

/**
 * Category from Google's primaryType, then overridden by an explicit keyword
 * in the venue's own name — a "Club" whose name says "Rooftop" is shown as
 * Rooftop, because that keyword is a stronger, more specific signal than the
 * broad type bucket. Returns null (never a guess) when neither is present.
 *
 * The type check is substring-based against an ORDERED list, not an exact
 * dictionary lookup. Google's Places taxonomy has grown far past a short
 * fixed set — a single dry run on one area alone surfaced bar_and_grill,
 * lounge_bar and fine_dining_restaurant, none of which an exact-match
 * dictionary would ever contain in full. Order matters for correctness, not
 * just style: 'restaurant' is checked before 'bar' because several
 * restaurant subtypes (barbecue_restaurant, wine_bar_restaurant) would
 * otherwise be wrongly caught by the broader, later 'bar' check.
 */
const TYPE_KEYWORDS = [
  ['restaurant', 'Restaurant'],
  ['cafe', 'Cafe'],
  ['coffee', 'Cafe'],
  ['night_club', 'Club'],
  ['club', 'Club'],
  ['lounge', 'Lounge'],
  ['bar', 'Bar'],
  ['event', 'Event Center'],
  ['banquet', 'Event Center'],
];

function categoryFor(place) {
  const name = (place.displayName?.text || '').toLowerCase();
  const type = (place.primaryType || '').toLowerCase();

  if (/rooftop/.test(name)) return 'Rooftop';
  if (/beach\s?club|beach\s?bar/.test(name)) return 'Beach Club';

  if (EXACT_TYPE_CATEGORY[type]) return EXACT_TYPE_CATEGORY[type];
  for (const [keyword, category] of TYPE_KEYWORDS) {
    if (type.includes(keyword)) return category;
  }

  // No type signal at all (e.g. a bare 'establishment') — one more chance via
  // a plain keyword in the name before giving up.
  if (/\blounge\b/.test(name)) return 'Lounge';
  return null;
}

const PRICE_DISPLAY = ['Free', '₦', '₦₦', '₦₦₦', '₦₦₦₦'];
const PRICE_LEVEL_FROM_ENUM = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

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

// ── Name matching, for "we already have this one" ──────────────────────────
// Identical approach to venue-enrichment-agent.js's nameScore: overlap against
// the SMALLER token set, so "Circa" still matches "Circa Lagos" at full score.

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

const nameScore = (a, b) => {
  const A = tokenise(a);
  const B = tokenise(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return shared / Math.min(A.size, B.size);
};

const ALREADY_SEEDED_THRESHOLD = 0.6;

/**
 * Every (alias, area) pair, longest alias first — same principle as
 * apps/consumer-app/lib/areas.ts's ALIAS_INDEX. Used to find a place's REAL
 * area from its own formattedAddress, rather than trusting whichever area's
 * search query happened to surface it.
 *
 * Why this exists: a full dry run surfaced real venues like "Vaniti Lagos"
 * and "The View Rooftop Lounge" as apparent "new" candidates in four or five
 * different areas at once — because Lagos neighbourhoods overlap and a
 * text-biased search for "bars in Ikoyi" legitimately returns venues close
 * enough to Ikoyi to match, even when their actual address says Victoria
 * Island. Trusting the query area would file that venue under whichever area
 * happened to be searched first in AREAS order — an accident of array
 * ordering, not a fact about the venue.
 */
const AREA_ALIAS_INDEX = AREAS
  .flatMap(area => area.aliases.map(alias => ({ alias: alias.toLowerCase(), area })))
  .sort((a, b) => b.alias.length - a.alias.length);

/** The area implied by a place's own address, or null if none of ours match. */
const areaFromAddress = (address) => {
  if (!address) return null;
  const haystack = address.toLowerCase();
  return AREA_ALIAS_INDEX.find(entry => haystack.includes(entry.alias))?.area ?? null;
};

/**
 * Google's own name for where a place sits, independent of our curated list —
 * the feedback signal for Option A. `addressComponents` is structured, unlike
 * the flat `formattedAddress` string: each component carries `types` like
 * 'neighborhood' or 'sublocality_level_1'. Ordered most-specific first, since
 * a finer-grained name ("Ikate Elegushi") is more useful as an expansion
 * candidate than a coarse one ("Lekki") we probably already have.
 *
 * This is reporting only. It never creates an area or writes anything — it
 * surfaces what real venues are telling us via their own Google data, so
 * expanding LAGOS_AREAS becomes a data-driven decision instead of another
 * round of guessing neighbourhood names from memory.
 */
const NEIGHBOURHOOD_TYPE_PRIORITY = ['neighborhood', 'sublocality_level_2', 'sublocality_level_1', 'sublocality'];

function googleNeighbourhood(place) {
  const components = place.addressComponents;
  if (!Array.isArray(components)) return null;
  for (const type of NEIGHBOURHOOD_TYPE_PRIORITY) {
    const hit = components.find(c => Array.isArray(c.types) && c.types.includes(type));
    if (hit?.longText) return hit.longText;
  }
  return null;
}

// ── Places lookup ───────────────────────────────────────────────────────────

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
  'places.primaryType',
  'places.businessStatus',
  'places.editorialSummary',
  'places.photos',
  'places.addressComponents',
].join(',');

async function searchText(query) {
  const res = await fetch(SEARCH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'en', maxResultCount: 10 }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API ${res.status}: ${body.slice(0, 300)}`);
  }
  const { places } = await res.json();
  return places || [];
}

/**
 * Resolves a photo reference to a real, public, Google-hosted image URL. The
 * request itself needs the API key, but the response is an HTTP redirect to
 * a plain lh3.googleusercontent.com URL — `fetch` follows it by default, and
 * `response.url` is that final address with no key attached. That's the URL
 * stored on the venue, so the key never ships to a client.
 */
async function resolvePhotoUrl(photo) {
  if (!photo?.name) return null;
  try {
    const url = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1200&key=${API_KEY}`;
    const res = await fetch(url);
    return res.ok ? res.url : null;
  } catch {
    return null;
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  const { data: existingVenues, error } = await supabase
    .from('venues')
    .select('id, name, location, google_place_id');
  if (error) throw error;

  const existingPlaceIds = new Set(existingVenues.filter(v => v.google_place_id).map(v => v.google_place_id));

  const areas = ONLY_AREA ? AREAS.filter(a => a.name.toLowerCase() === ONLY_AREA.toLowerCase()) : AREAS;
  if (ONLY_AREA && areas.length === 0) {
    console.error(`No area named "${ONLY_AREA}". Known areas: ${AREAS.map(a => a.name).join(', ')}`);
    process.exit(1);
  }

  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} — ${areas.length} area(s), up to ${MAX_PER_AREA} new venues each\n`);

  const totals = {
    inserted: 0, alreadySeeded: 0, skippedNoCategory: 0, skippedClosed: 0,
    duplicateAcrossQueries: 0, reattributed: 0, outOfScope: 0,
  };

  // ── Phase 1: search every in-scope area, attribute every result to its
  // REAL area, drop exact duplicates globally (not per-area) ────────────────
  const inScopeNames = new Set(areas.map(a => a.name));
  const globalSeenPlaceIds = new Set();
  const poolByArea = new Map(areas.map(a => [a.name, []]));

  // Option A feedback signal: every real neighbourhood Google reports for a
  // venue whose address matched NONE of our curated aliases. Reported at the
  // end, never acted on automatically — expanding LAGOS_AREAS stays a human
  // decision, just an informed one instead of a guess from memory.
  const areaSuggestions = new Map(); // name -> { count, examples: Set }

  for (const area of areas) {
    for (const template of QUERY_TEMPLATES) {
      const query = template(area.name);
      let places;
      try {
        places = await searchText(query);
      } catch (err) {
        console.log(`  !  "${query}"\n       ${err.message}`);
        await sleep(PACE_MS);
        continue;
      }

      for (const place of places) {
        if (existingPlaceIds.has(place.id)) continue; // already in the DB from a prior run
        if (globalSeenPlaceIds.has(place.id)) { totals.duplicateAcrossQueries++; continue; }
        globalSeenPlaceIds.add(place.id);

        const matchedArea = areaFromAddress(place.formattedAddress);
        if (!matchedArea) {
          const suggestion = googleNeighbourhood(place);
          if (suggestion) {
            const entry = areaSuggestions.get(suggestion) ?? { count: 0, examples: new Set() };
            entry.count++;
            if (entry.examples.size < 3) entry.examples.add(place.displayName?.text || '?');
            areaSuggestions.set(suggestion, entry);
          }
        }

        const trueArea = matchedArea || area;
        if (trueArea.name !== area.name) totals.reattributed++;

        // A place's true area can fall outside the areas this run is
        // covering (relevant only for `--area X`, which searches one area
        // but can still surface a neighbour's venue). Drop it here rather
        // than inserting under an area nobody asked for this run — it will
        // surface correctly whenever that area is actually processed.
        if (!inScopeNames.has(trueArea.name)) { totals.outOfScope++; continue; }

        poolByArea.get(trueArea.name).push(place);
      }
      await sleep(PACE_MS);
    }
  }

  // ── Phase 2: per real area, filter, cap, report, insert ────────────────────
  for (const area of areas) {
    console.log(`── ${area.name} ──────────────────────────────────────`);

    // Venues already bucketed in this area, for the name-similarity check.
    const inArea = existingVenues.filter(v =>
      area.aliases.some(alias => (v.location || '').toLowerCase().includes(alias.toLowerCase())),
    );

    // Best-reviewed first, so MAX_PER_AREA keeps the strongest candidates.
    const candidates = poolByArea.get(area.name)
      .sort((a, b) => (b.userRatingCount || 0) - (a.userRatingCount || 0));

    let acceptedThisArea = 0;
    for (const place of candidates) {
      if (acceptedThisArea >= MAX_PER_AREA) break;

      if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') {
        totals.skippedClosed++;
        continue;
      }

      const already = inArea.find(v => nameScore(v.name, place.displayName?.text) >= ALREADY_SEEDED_THRESHOLD);
      if (already) {
        totals.alreadySeeded++;
        console.log(`  =  ${place.displayName?.text}\n       matches existing "${already.name}" — run venue-enrichment-agent.js for this one instead`);
        continue;
      }

      const category = categoryFor(place);
      if (!category) {
        totals.skippedNoCategory++;
        console.log(`  ?  ${place.displayName?.text}  [${place.primaryType || 'no type'}] — no confident category, skipped`);
        continue;
      }

      const level = PRICE_LEVEL_FROM_ENUM[place.priceLevel];
      const photoUrl = APPLY ? await resolvePhotoUrl(place.photos?.[0]) : null;

      const row = {
        name: place.displayName?.text || 'Unnamed venue',
        location: area.name,
        category,
        description: place.editorialSummary?.text || null,
        address: place.formattedAddress || null,
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
        rating: typeof place.rating === 'number' ? place.rating : null,
        ratings_total: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
        contact_phone: place.nationalPhoneNumber || null,
        website_url: place.websiteUri || null,
        opening_hours: parseHours(place.regularOpeningHours?.weekdayDescriptions),
        price_level: typeof level === 'number' ? level : null,
        price_range: typeof level === 'number' ? PRICE_DISPLAY[level] : null,
        professional_media_urls: photoUrl ? [photoUrl] : null,
        google_place_id: place.id,
        enriched_at: new Date().toISOString(),
        is_verified: false,
      };

      const bits = [
        row.rating ? `${row.rating}★ (${row.ratings_total ?? '?'})` : 'no rating',
        row.contact_phone ? 'phone' : null,
        row.opening_hours ? 'hours' : null,
        row.professional_media_urls ? 'photo' : null,
      ].filter(Boolean).join(', ');
      console.log(`  +  ${row.name}  [${category}]\n       ${bits}`);

      if (APPLY) {
        const { error: insErr } = await supabase.from('venues').insert(row);
        if (insErr) {
          console.log(`       INSERT FAILED: ${insErr.message}`);
        } else {
          existingPlaceIds.add(place.id); // in case the same place surfaces again in a later --apply run
          totals.inserted++;
        }
      } else {
        totals.inserted++;
      }
      acceptedThisArea++;
    }

    if (acceptedThisArea === 0) {
      console.log(`  (nothing new to add)`);
    }
    console.log('');
  }

  console.log('─'.repeat(60));
  console.log(`${APPLY ? 'inserted' : 'would insert'}       ${totals.inserted}`);
  console.log(`already seeded        ${totals.alreadySeeded}  (enrich these instead of inserting)`);
  console.log(`no confident category ${totals.skippedNoCategory}`);
  console.log(`closed / inactive     ${totals.skippedClosed}`);
  console.log(`duplicate results     ${totals.duplicateAcrossQueries}  (same place, seen again by a later query)`);
  console.log(`reattributed          ${totals.reattributed}  (address said a different area than the query)`);
  if (totals.outOfScope) {
    console.log(`out of scope          ${totals.outOfScope}  (true area wasn't part of this run)`);
  }

  if (areaSuggestions.size) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Areas Google reports that aren't in LAGOS_AREAS yet:`);
    const ranked = [...areaSuggestions.entries()].sort((a, b) => b[1].count - a[1].count);
    for (const [name, { count, examples }] of ranked.slice(0, 20)) {
      console.log(`  ${String(count).padStart(3)}  ${name}`);
      console.log(`       e.g. ${[...examples].join(', ')}`);
    }
    if (ranked.length > 20) console.log(`  … and ${ranked.length - 20} more, seen only once or twice each`);
    console.log(`\nThese are a signal, not an action — nothing here was inserted anywhere.`);
    console.log(`Add any that are genuinely distinct to LAGOS_AREAS by hand, in both`);
    console.log(`apps/consumer-app/lib/areas.ts and the AREAS array in this file.`);
  }

  if (!APPLY) console.log('\nDry run — nothing written. Re-run with --apply to write.');
}

main().catch((err) => { console.error(err); process.exit(1); });
