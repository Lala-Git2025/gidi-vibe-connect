#!/usr/bin/env node

/**
 * Gidi Connect — Lagos traffic agent (Gemini Flash classifier).
 *
 * Scrapes recent posts from Lagos Traffic Radio 96.1FM, classifies each new post
 * with Gemini 2.0 Flash (structured JSON output via responseSchema), and writes
 * structured rows directly to traffic_reports via the Supabase service role.
 *
 * Why Gemini, not Claude/agent-runner: this is a pure classification task with
 * no side effects on users. Gemini Flash has a generous free tier (~15 RPM,
 * ~hundreds of posts/day free) and we already have GEMINI_API_KEY set up for the
 * news agent. The Claude-as-admin pipeline (agent-runner / agent_runs audit log)
 * stays around for higher-stakes work like moderation.
 *
 * Idempotent: skips URLs already present in traffic_reports.
 * Runs hourly via .github/workflows/traffic-agent.yml.
 *
 * Required env:
 *   GEMINI_API_KEY               (Get free from aistudio.google.com)
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   TRAFFIC_SOURCE_URL           (default: https://trafficradio961.ng/news/traffic-updates/)
 *   TRAFFIC_MAX_POSTS            (default: 10)
 *   GEMINI_MODEL                 (default: gemini-2.0-flash)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SOURCE_URL   = process.env.TRAFFIC_SOURCE_URL || 'https://trafficradio961.ng/news/traffic-updates/';
const MAX_POSTS    = Number(process.env.TRAFFIC_MAX_POSTS || 10);
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY   = process.env.GEMINI_API_KEY;

for (const [name, val] of Object.entries({
  VITE_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  GEMINI_API_KEY: GEMINI_KEY,
})) {
  if (!val) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ── Gemini classification schema ────────────────────────────────────────
// Structured output: Gemini guarantees the response matches this schema.

const CLASSIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    route_label: {
      type: 'string',
      description: 'Route name in title case, e.g. "3rd Mainland Bridge", "Lekki-Epe Expressway", "Ikorodu Road / Onipan".',
    },
    area: {
      type: 'string',
      enum: ['Mainland', 'Island', 'Lekki', 'Mainland-Outer'],
      description: 'Mainland=Yaba/Surulere/Ikeja/Ikorodu corridor. Island=VI/Ikoyi/CMS/Eko/Carter Bridge. Lekki=Lekki/Ajah/Ibeju. Mainland-Outer=Badagry/Lagos-Ibadan beyond Berger.',
    },
    severity: {
      type: 'string',
      enum: ['light', 'moderate', 'heavy', 'critical', 'closed'],
      description: 'light=flowing, moderate=slow, heavy=major congestion, critical=gridlock, closed=road closure/major incident.',
    },
    summary: {
      type: 'string',
      description: '1-2 sentence plain-English summary citing the cause if mentioned. Do not just restate the headline.',
    },
    confidence: {
      type: 'number',
      description: '0..1 confidence in route + severity classification.',
    },
    ttl_minutes: {
      type: 'integer',
      description: '60 for fast-changing incidents, 120 for normal congestion, 240 for road closures.',
    },
  },
  required: ['route_label', 'area', 'severity', 'summary', 'confidence', 'ttl_minutes'],
};

const SYSTEM_PROMPT = `You classify Lagos traffic posts from Lagos Traffic Radio 96.1FM into structured reports.

Input is a JSON object: { headline, body }. Posts are short professional updates like:
  - "INCIDENT REPORT – IKORODU ROAD / ONIPAN AXIS"
  - "TRAFFIC UPDATE – 3RD MAINLAND BRIDGE / OBALENDE / CMS AXIS"

Rules:
1. Extract the route name from the headline. Title-case it ("3rd Mainland Bridge", "Ikorodu Road / Onipan").
2. Infer severity from body language:
   - "free flow", "moving", "easing" → light
   - "slow", "build-up", "gradual" → moderate
   - "heavy", "congested", "long queue" → heavy
   - "gridlock", "standstill", "stationary" → critical
   - "closed", "blocked", "diversion in effect", "road shut" → closed
   - "INCIDENT REPORT" headlines usually mean heavy/critical/closed — confirm with body.
3. Pick area from the enum.
4. Summary cites cause if mentioned (accident, road work, broken-down vehicle, rain). 1-2 sentences. Don't just rephrase the headline.
5. Confidence:
   - 0.9+ if route is clear and severity unambiguous
   - 0.7-0.9 if severity inferred indirectly
   - < 0.5 if ambiguous or off-topic → still emit JSON, the script filters
6. TTL: 60 for incidents (fast-changing), 120 for general congestion, 240 for road closures.`;

// ── Scraping ────────────────────────────────────────────────────────────

async function fetchListing() {
  const { data: html } = await axios.get(SOURCE_URL, { headers: HEADERS, timeout: 20000 });
  const $ = cheerio.load(html);
  const posts = [];
  const candidates = $('article h2 a, article h3 a, .post-title a, .entry-title a, h2.entry-title a').toArray();
  for (const el of candidates) {
    const a = $(el);
    const url = a.attr('href');
    const title = a.text().trim();
    if (!url || !title) continue;
    if (!url.startsWith('http')) continue;
    if (!/traffic|incident|update/i.test(title)) continue;
    posts.push({ url, title });
    if (posts.length >= MAX_POSTS) break;
  }
  return posts;
}

async function fetchPost(url) {
  try {
    const { data: html } = await axios.get(url, { headers: HEADERS, timeout: 20000 });
    const $ = cheerio.load(html);
    const headline = $('h1.entry-title, h1.post-title, h1').first().text().trim();
    const body = $('.entry-content, .post-content, article .content, article').first().text().trim().slice(0, 4000);
    let publishedAt =
      $('time[datetime]').attr('datetime') ||
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="publish_date"]').attr('content') ||
      null;
    if (publishedAt && !/Z|[+-]\d{2}:?\d{2}$/.test(publishedAt)) {
      publishedAt = new Date(publishedAt).toISOString();
    }
    return { headline: headline || null, body: body || null, published_at: publishedAt };
  } catch (err) {
    console.warn(`  ! Could not fetch post body for ${url}: ${err.message}`);
    return { headline: null, body: null, published_at: null };
  }
}

async function filterAlreadyClassified(urls) {
  if (urls.length === 0) return [];
  const { data, error } = await supabase
    .from('traffic_reports')
    .select('source_url')
    .in('source_url', urls);
  if (error) {
    console.warn(`  ! Dedup query failed: ${error.message} — will pass all through.`);
    return urls;
  }
  const seen = new Set((data || []).map((r) => r.source_url));
  return urls.filter((u) => !seen.has(u));
}

// ── Gemini classify ─────────────────────────────────────────────────────

async function classify({ headline, body }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      {
        role: 'user',
        parts: [{ text: JSON.stringify({ headline, body: body || '' }) }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: CLASSIFICATION_SCHEMA,
      temperature: 0.2,
    },
  };
  const res = await axios.post(url, payload, { timeout: 60000 });
  const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');
  return JSON.parse(text);
}

// ── Insert ──────────────────────────────────────────────────────────────

async function writeReport({ post, full, classification }) {
  const ttlMinutes = Number.isFinite(classification.ttl_minutes) ? classification.ttl_minutes : 120;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  const { error } = await supabase
    .from('traffic_reports')
    .upsert(
      {
        route_label: String(classification.route_label),
        area: classification.area || null,
        severity: String(classification.severity),
        summary: String(classification.summary),
        source_url: post.url,
        source_published_at: full.published_at,
        expires_at: expiresAt,
        confidence: typeof classification.confidence === 'number' ? classification.confidence : null,
      },
      { onConflict: 'source_url' },
    );
  if (error) throw error;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Lagos traffic agent (Gemini ${GEMINI_MODEL}) — source: ${SOURCE_URL}`);
  const listing = await fetchListing();
  console.log(`  Found ${listing.length} post candidate(s) on the listing page.`);
  if (listing.length === 0) {
    console.log('  Nothing to do.');
    return;
  }

  const fresh = await filterAlreadyClassified(listing.map((p) => p.url));
  console.log(`  ${fresh.length} new (${listing.length - fresh.length} already classified).`);

  const freshSet = new Set(fresh);
  let classified = 0;
  let skipped = 0;
  let failed = 0;

  for (const post of listing) {
    if (!freshSet.has(post.url)) continue;
    process.stdout.write(`  → ${post.title.slice(0, 70)}... `);
    try {
      const full = await fetchPost(post.url);
      const classification = await classify({
        headline: full.headline || post.title,
        body: full.body,
      });
      if (typeof classification.confidence === 'number' && classification.confidence < 0.5) {
        skipped++;
        console.log(`skipped (low confidence ${classification.confidence})`);
        continue;
      }
      await writeReport({ post, full, classification });
      classified++;
      console.log(`ok (${classification.severity}, conf=${(classification.confidence ?? 0).toFixed(2)})`);
    } catch (err) {
      failed++;
      console.log(`FAILED (${err.message})`);
    }
  }

  console.log(`\nDone. classified=${classified} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
