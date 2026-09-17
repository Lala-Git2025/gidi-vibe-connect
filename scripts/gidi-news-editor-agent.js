#!/usr/bin/env node

/**
 * Gidi Connect — news editor agent (Gemini Flash).
 *
 * Turns the headlines the scraper collects into content people read inside
 * the app. For each fresh row in `news` it:
 *
 *   1. Marks cross-source duplicates so one story appears once.
 *   2. Fetches the article body (the table only holds a 150-char snippet).
 *   3. Asks Gemini for a Gidi headline, a 3-5 sentence brief in Gidi's voice,
 *      a category from the Gidi taxonomy, a relevance score, and tags.
 *   4. Writes it back. Title, snippet and URL are kept, and the publisher is
 *      credited on the brief — this is a briefing product, not a rewrite that
 *      pretends the story was ours.
 *
 * The brief is facts-only. The prompt forbids adding anything the source does
 * not say, and when a body cannot be fetched the brief is built from the
 * title and snippet alone and kept short. A Gidi-branded error in a news story
 * is worse than a shorter brief.
 *
 * Runs after the scraper in .github/workflows/news-agent.yml. Free tier: Gemini
 * 2.5 Flash allows 15 RPM / 1,500 RPD; the default batch of 60 per hourly run
 * uses at most ~1,440/day and paces calls at ~13 RPM.
 *
 * Usage:
 *   node scripts/gidi-news-editor-agent.js            # curate up to 60 recent rows
 *   node scripts/gidi-news-editor-agent.js --dry-run  # print, write nothing
 *   NEWS_EDITOR_BATCH=5 node scripts/gidi-news-editor-agent.js
 *
 * Required env:
 *   GEMINI_API_KEY, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional:
 *   NEWS_EDITOR_BATCH (60), NEWS_EDITOR_LOOKBACK_HOURS (72), GEMINI_MODEL (gemini-flash-latest)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL   = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY     = process.env.GEMINI_API_KEY;
// Pinned to a LITE model on purpose, and pinned rather than aliased.
//
// 'gemini-flash-latest' looked like the safe, future-proof choice after
// gemini-2.5-flash was retired mid-flight. It wasn't: the alias tracks forward
// onto whatever the newest flash model is, and that model carries the
// *tightest* free-tier quota. It resolved to gemini-3.8-flash with a limit of
// 20 requests, which is why production runs returned a wall of 503s and then
// 429s and briefed 3 stories out of 60.
//
// Lite models carry far more generous free-tier limits, which is what a
// batch job over hundreds of rows actually needs. Pinning means a retirement
// shows up as a loud 404 (fix it deliberately) instead of a silent slide onto
// a model we can't afford to call.
const GEMINI_MODEL   = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const BATCH          = Number(process.env.NEWS_EDITOR_BATCH || 60);
const LOOKBACK_HOURS = Number(process.env.NEWS_EDITOR_LOOKBACK_HOURS || 72);
const DRY_RUN        = process.argv.includes('--dry-run');

/** ~13 requests a minute, under the free tier's 15. */
const PACE_MS = 4500;

for (const [name, val] of Object.entries({ GEMINI_API_KEY: GEMINI_KEY, VITE_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY })) {
  if (!val) { console.error(`Missing env: ${name}`); process.exit(1); }
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-NG,en;q=0.9',
};

// Mirrors SOURCE_MAP in NewsScreen so the credit line reads the same everywhere.
const SOURCE_BY_HOST = {
  'punchng.com': 'The Punch',
  'premiumtimesng.com': 'Premium Times',
  'bellanaija.com': 'BellaNaija',
  'lindaikejisblog.com': 'Linda Ikeji Blog',
  'pulse.ng': 'Pulse Nigeria',
  'legit.ng': 'Legit.ng',
  'informationng.com': 'Info Nigeria',
  '36ng.ng': '36NG',
  'vanguardngr.com': 'Vanguard',
  'guardian.ng': 'The Guardian',
  'thecable.ng': 'The Cable',
  'dailypost.ng': 'Daily Post',
  'instablog9ja.com': 'Instablog9ja',
  'notjustok.com': 'NotJustOK',
  'thenationonlineng.net': 'The Nation',
  'channelstv.com': 'Channels TV',
  'thisdaylive.com': 'ThisDay',
};

const JUNK_SOURCES = new Set(['AI Agent', 'Unknown Source', 'Lagos News', '', null, undefined]);

// One name per publisher. The scraper files The Punch as 'Punch' and Legit
// under two section names; the feed should never show both side by side.
const SOURCE_ALIASES = {
  'Punch': 'The Punch',
  'Legit.ng Nigeria': 'Legit.ng',
  'Legit.ng Entertainment': 'Legit.ng',
};

const CATEGORIES = ['nightlife', 'food-drink', 'music', 'events', 'culture', 'city', 'traffic', 'business', 'sport', 'politics', 'other'];

// ── Gemini ──────────────────────────────────────────────────────────────────

const BRIEF_SCHEMA = {
  type: 'object',
  properties: {
    gidi_headline: {
      type: 'string',
      description: 'Under 90 characters. Specific and plain. Sentence case. No clickbait, no question headlines, no ALL CAPS, no exclamation marks.',
    },
    brief: {
      type: 'string',
      description: '3-5 sentences, 60-120 words, that let someone skip the article. Facts from the source only. If the source text is thin, 2 sentences is fine.',
    },
    category: { type: 'string', enum: CATEGORIES },
    relevance: {
      type: 'integer',
      description: '0-100: how much a Lagos going-out audience — bars, restaurants, clubs, beach clubs, concerts, culture — cares about this story.',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Up to 5 lowercase tags: neighbourhoods, venues, artists, genres. e.g. "lekki", "afrobeats", "eko atlantic".',
    },
    is_lagos: { type: 'boolean', description: 'True if the story is about Lagos or happens in Lagos.' },
  },
  required: ['gidi_headline', 'brief', 'category', 'relevance', 'tags', 'is_lagos'],
};

const SYSTEM_PROMPT = `You are the editor of Gidi News, the news feed inside Gidi Connect — an app for going out in Lagos: bars, restaurants, clubs, beach clubs, concerts, events, culture, and the city life around all of it.

You receive a JSON object { title, snippet, body, source } describing a published article, and you return a brief written for Gidi Connect.

Voice:
- Warm, direct, informed. Like a Lagos friend who read the story and is telling you what matters.
- Short sentences. Plain words. British/Nigerian spelling.
- Places are named the way Lagosians say them: "VI", "Lekki Phase 1", "Third Mainland", "Yaba", "Eko Atlantic".
- No emojis. No "In a shocking turn of events". No moralising. No exclamation marks.

Facts:
- Use ONLY what is in the source text. Never add a name, number, date, cause or outcome that is not there. If the body is missing or thin, write a shorter brief from the title and snippet — two sentences is fine. A short brief is always better than an invented detail.
- Do not editorialise about people. Report what was said and by whom.
- If the story is not about Lagos at all, say so through a low relevance score; still write the brief.

Category — pick one:
  nightlife: bars, clubs, lounges, night-time going out
  food-drink: restaurants, cafés, chefs, food culture
  music: artists, releases, concerts, afrobeats, the industry
  events: festivals, fairs, shows, exhibitions, things with a date
  culture: film, fashion, art, celebrity, lifestyle
  city: Lagos itself — infrastructure, government, weather, transport, safety
  traffic: roads and traffic specifically
  business: companies, money, tech, startups
  sport: sport
  politics: elections, parties, national government
  other: none of the above

Relevance rubric (0-100):
  85-100  Lagos nightlife, food, music, events, culture — the reason the app exists
  60-84   Lagos city life that affects a night out: transport, roads, weather, safety, big civic changes
  35-59   Nigerian entertainment/culture not specific to Lagos; Lagos business or politics with a lifestyle angle
  10-34   National politics, crime, and business with no going-out angle
  0-9     Not Lagos, not Nigeria, or not something anyone here would tap`;

async function writeBrief(input) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: BRIEF_SCHEMA,
      temperature: 0.3,
    },
  };
  try {
    const res = await axios.post(url, payload, { timeout: 60000 });
    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned no text');
    return JSON.parse(text);
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.error?.message || err.response?.data || err.message;
    const e = new Error(status ? `Gemini ${status}: ${detail}` : String(detail));
    e.status = status;
    throw e;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Transient, worth retrying: 429 (rate limited), 503 (model overloaded), 500
 * and 504 (server-side blips). Anything else — 400 for a malformed request,
 * 403 for a dead key, 404 for a retired model — is a real problem that
 * retrying only hides, so it fails immediately and loudly.
 */
const RETRYABLE = new Set([429, 500, 503, 504]);

/**
 * Up to four attempts with exponential backoff (4s, 12s, 36s).
 *
 * The first version treated only 429 as retryable and gave up on everything
 * else. Gemini returned 503 "model is currently experiencing high demand" 17
 * times in one production run, so 22 of 60 stories failed outright and three
 * got briefs. Those rows keep `curated_at = null` and do come back around on
 * the next run, but at that hit rate the backlog grows faster than it drains
 * — 619 stories were sitting unbriefed when this was found.
 */
async function briefWithRetry(input, label) {
  const MAX_ATTEMPTS = 4;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await writeBrief(input);
    } catch (err) {
      const last = attempt === MAX_ATTEMPTS;
      if (!RETRYABLE.has(err.status) || last) {
        console.log(`  !  ${label}\n       ${err.message}`);
        return null;
      }
      const backoff = 4000 * Math.pow(3, attempt - 1);
      console.log(`       ${err.status} — retrying in ${Math.round(backoff / 1000)}s (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
      await sleep(backoff);
    }
  }
  return null;
}

const STOP = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'as', 'by', 'with', 'from', 'is', 'are', 'was', 'were', 'be', 'has', 'have', 'had', 'that', 'this', 'it', 'its', 'over', 'after', 'amid', 'says', 'say', 'said']);

/**
 * A stable key for "the same story": lowercase, punctuation stripped, stop
 * words dropped, first eight significant words. Two outlets' headlines for one
 * event usually share most of those; two different stories almost never do.
 */
const dedupeKey = (title) =>
  String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .slice(0, 8)
    .join(' ');

const sourceFor = (row) => {
  if (!JUNK_SOURCES.has(row.source)) return SOURCE_ALIASES[row.source] || row.source;
  try {
    const host = new URL(row.external_url).hostname.replace(/^www\./, '');
    return SOURCE_BY_HOST[host] || host;
  } catch {
    return row.source || null;
  }
};

async function fetchBody(url) {
  try {
    const { data: html } = await axios.get(url, { headers: HEADERS, timeout: 15000, maxContentLength: 3_000_000 });
    const $ = cheerio.load(html);
    $('script, style, nav, header, footer, aside, .related, .share, .comments').remove();
    const body = $('[itemprop="articleBody"], .entry-content, .post-content, .article-body, article')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);
    const ogImage = $('meta[property="og:image"]').attr('content') || null;
    return { body: body.length > 200 ? body : null, ogImage };
  } catch (err) {
    return { body: null, ogImage: null, error: err.message };
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const since = new Date(Date.now() - LOOKBACK_HOURS * 3600_000).toISOString();

  const { data: rows, error } = await supabase
    .from('news')
    .select('id, title, summary, external_url, featured_image_url, source, publish_date')
    .is('curated_at', null)
    .eq('is_active', true)
    .not('external_url', 'is', null)
    .gte('publish_date', since)
    .order('publish_date', { ascending: false })
    .limit(BATCH);
  if (error) throw error;

  if (!rows.length) {
    console.log('Nothing to curate.');
    return;
  }
  console.log(`${DRY_RUN ? 'DRY RUN' : 'CURATING'} — ${rows.length} row(s), lookback ${LOOKBACK_HOURS}h\n`);

  const stats = { briefed: 0, duplicates: 0, bodyMissing: 0, failed: 0 };
  const seenKeys = new Map(); // key → id of the row that keeps the story

  for (const row of rows) {
    const key = dedupeKey(row.title);
    const label = `${row.title.slice(0, 70)}${row.title.length > 70 ? '…' : ''}`;

    // ── Duplicates: same key already curated, or already seen this batch.
    let keeper = seenKeys.get(key) || null;
    if (!keeper && key) {
      const { data: prior } = await supabase
        .from('news')
        .select('id')
        .eq('dedupe_key', key)
        .is('duplicate_of', null)
        .not('curated_at', 'is', null)
        .neq('id', row.id)
        .limit(1);
      keeper = prior?.[0]?.id || null;
    }
    if (keeper) {
      stats.duplicates++;
      console.log(`  =  ${label}\n       duplicate of ${keeper}`);
      if (!DRY_RUN) {
        await supabase.from('news').update({
          dedupe_key: key, duplicate_of: keeper, is_active: false, curated_at: new Date().toISOString(),
        }).eq('id', row.id);
      }
      continue;
    }
    if (key) seenKeys.set(key, row.id);

    // ── Body
    const { body, ogImage } = await fetchBody(row.external_url);
    if (!body) stats.bodyMissing++;

    // ── Brief
    const out = await briefWithRetry(
      { title: row.title, snippet: row.summary || '', body: body || '', source: sourceFor(row) },
      label,
    );
    if (!out) {
      stats.failed++;
      await sleep(PACE_MS);
      continue;
    }

    const relevance = Math.max(0, Math.min(100, Math.round(Number(out.relevance) || 0)));
    const category = CATEGORIES.includes(out.category) ? out.category : 'other';
    const tags = Array.isArray(out.tags) ? out.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 5) : [];

    stats.briefed++;
    console.log(`  ✓  ${label}\n       → "${out.gidi_headline}"  [${category} · ${relevance}${body ? '' : ' · from snippet'}]`);

    if (!DRY_RUN) {
      const update = {
        gidi_headline: String(out.gidi_headline).slice(0, 140),
        brief: String(out.brief),
        gidi_category: category,
        relevance,
        tags,
        dedupe_key: key || null,
        body_fetched: Boolean(body),
        curated_at: new Date().toISOString(),
        curation_model: GEMINI_MODEL,
        source: sourceFor(row),
      };
      if (!row.featured_image_url && ogImage) update.featured_image_url = ogImage;

      const { error: upErr } = await supabase.from('news').update(update).eq('id', row.id);
      if (upErr) { stats.failed++; console.log(`       WRITE FAILED: ${upErr.message}`); }
    }

    await sleep(PACE_MS);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`briefed      ${stats.briefed}`);
  console.log(`duplicates   ${stats.duplicates}`);
  console.log(`no body      ${stats.bodyMissing}  (briefed from title + snippet)`);
  console.log(`failed       ${stats.failed}`);
  if (DRY_RUN) console.log('\nDry run — nothing written.');
}

main().catch((err) => { console.error(err); process.exit(1); });
