#!/usr/bin/env node

/**
 * Gidi Connect — Lagos traffic agent (Gemini Flash classifier).
 *
 * ── SCHEDULING MOVED TO pg_cron (2026-10-08) ───────────────────────────────
 * The hourly GitHub schedule delivered ~5 runs/day (gaps of 4.0-7.5h), and a
 * missed scrape here is not a late report but NO report: the station posts a
 * handful of times a day and the app's LOOKBACK_MS is 12h, so a 7.5h gap can
 * retire a post before anything ever read it. supabase/functions/lagos-traffic
 * now owns the cadence. This script stays as the dry-run and manual-dispatch
 * path, and shares its selectors, prompt, schema and row shape with that
 * function via _shared/lagos-traffic.js so the two cannot drift.
 *
 * Dry run (writes nothing):  node scripts/lagos-traffic-agent.js --dry-run
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
 * Scheduled by pg_cron via supabase/functions/lagos-traffic; the workflow at
 * .github/workflows/traffic-agent.yml is manual-dispatch only.
 *
 * Required env:
 *   GEMINI_API_KEY               (Get free from aistudio.google.com)
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   TRAFFIC_SOURCE_URL           (default: https://trafficradio961.ng/news/traffic-updates/)
 *   TRAFFIC_MAX_POSTS            (default: 10)
 *   GEMINI_MODEL                 (default: gemini-flash-latest)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  SOURCE_URL as SHARED_SOURCE_URL,
  MAX_POSTS as SHARED_MAX_POSTS,
  DEFAULT_MODEL,
  HTTP_HEADERS,
  LISTING_LINK_SELECTOR,
  HEADLINE_SELECTOR,
  BODY_SELECTOR,
  BODY_MAX_CHARS,
  MIN_CONFIDENCE,
  isTrafficTitle,
  normalisePublishedAt,
  classify,
  buildReportRow,
} from '../supabase/functions/_shared/lagos-traffic.js';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

const SOURCE_URL   = process.env.TRAFFIC_SOURCE_URL || SHARED_SOURCE_URL;
const MAX_POSTS    = Number(process.env.TRAFFIC_MAX_POSTS || SHARED_MAX_POSTS);
const GEMINI_MODEL = process.env.GEMINI_MODEL || DEFAULT_MODEL;

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
const HEADERS = HTTP_HEADERS;

// ── Scraping ────────────────────────────────────────────────────────────

async function fetchListing() {
  const { data: html } = await axios.get(SOURCE_URL, { headers: HEADERS, timeout: 20000 });
  const $ = cheerio.load(html);
  const posts = [];
  const candidates = $(LISTING_LINK_SELECTOR).toArray();
  for (const el of candidates) {
    const a = $(el);
    const url = a.attr('href');
    const title = a.text().trim();
    if (!url || !title) continue;
    if (!url.startsWith('http')) continue;
    if (!isTrafficTitle(title)) continue;
    posts.push({ url, title });
    if (posts.length >= MAX_POSTS) break;
  }
  return posts;
}

async function fetchPost(url) {
  try {
    const { data: html } = await axios.get(url, { headers: HEADERS, timeout: 20000 });
    const $ = cheerio.load(html);
    const headline = $(HEADLINE_SELECTOR).first().text().trim();
    const body = $(BODY_SELECTOR).first().text().trim().slice(0, BODY_MAX_CHARS);
    let publishedAt =
      $('time[datetime]').attr('datetime') ||
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="publish_date"]').attr('content') ||
      null;
    // Shared: a timestamp with no zone used to be read as the RUNNER's local
    // time, so the same post dated differently from a GitHub runner than from
    // an edge region. normalisePublishedAt pins it to Lagos.
    return { headline: headline || null, body: body || null, published_at: normalisePublishedAt(publishedAt) };
  } catch (err) {
    console.warn(`  ! Could not fetch post body for ${url}: ${err.message}`);
    return { headline: null, body: null, published_at: null };
  }
}

async function partitionListing(urls) {
  if (urls.length === 0) return { fresh: [], existing: [] };
  const { data, error } = await supabase
    .from('traffic_reports')
    .select('source_url')
    .in('source_url', urls);
  if (error) {
    console.warn(`  ! Dedup query failed: ${error.message} — treating all as fresh.`);
    return { fresh: urls, existing: [] };
  }
  const seen = new Set((data || []).map((r) => r.source_url));
  return {
    fresh: urls.filter((u) => !seen.has(u)),
    existing: urls.filter((u) => seen.has(u)),
  };
}

// Bump expires_at on rows that are still on the source listing.
// The radio station leaves posts up for many hours and rarely republishes; if
// the URL is still listed, the state is still considered current. Without this,
// reports vanish from the consumer app after 2h of source quiet.
async function refreshExpiry(urls, ttlMinutes = 120) {
  if (urls.length === 0) return 0;
  if (DRY_RUN) return 0;
  const newExpiry = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  const { error, count } = await supabase
    .from('traffic_reports')
    .update({ expires_at: newExpiry }, { count: 'exact' })
    .in('source_url', urls);
  if (error) {
    console.warn(`  ! Refresh expiry failed: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

// ── Gemini classify ─────────────────────────────────────────────────────

// classify() comes from _shared/lagos-traffic.js — the prompt and schema live
// there so this script and the edge function cannot classify the same post
// two different ways.

// ── Insert ──────────────────────────────────────────────────────────────

async function writeReport({ post, full, classification }) {
  const row = buildReportRow({
    sourceUrl: post.url,
    publishedAt: full.published_at,
    classification,
  });
  if (DRY_RUN) {
    console.log(`\n      [dry run] would write ${JSON.stringify(row)}`);
    return;
  }
  const { error } = await supabase
    .from('traffic_reports')
    .upsert(row, { onConflict: 'source_url' });
  if (error) throw error;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Lagos traffic agent (Gemini ${GEMINI_MODEL})${DRY_RUN ? ' [DRY RUN — writes nothing]' : ''} — source: ${SOURCE_URL}`);
  const listing = await fetchListing();
  console.log(`  Found ${listing.length} post candidate(s) on the listing page.`);
  if (listing.length === 0) {
    console.log('  Nothing to do.');
    return;
  }

  const { fresh, existing } = await partitionListing(listing.map((p) => p.url));
  console.log(`  ${fresh.length} new, ${existing.length} already classified.`);

  const refreshed = await refreshExpiry(existing);
  if (refreshed > 0) console.log(`  Refreshed expiry on ${refreshed} existing report(s).`);

  const freshSet = new Set(fresh);
  let classified = 0;
  let skipped = 0;
  let failed = 0;

  for (const post of listing) {
    if (!freshSet.has(post.url)) continue;
    process.stdout.write(`  → ${post.title.slice(0, 70)}... `);
    try {
      const full = await fetchPost(post.url);
      const classification = await classify(
        { headline: full.headline || post.title, body: full.body },
        { apiKey: GEMINI_KEY, model: GEMINI_MODEL },
      );
      if (typeof classification.confidence === 'number' && classification.confidence < MIN_CONFIDENCE) {
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
