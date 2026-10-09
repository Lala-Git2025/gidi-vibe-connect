/**
 * lagos-traffic — the radio half, driven by pg_cron instead of GitHub.
 *
 * ── Why this exists when scripts/lagos-traffic-agent.js already did the job ─
 *
 * Same reason as live-traffic, and the measurement is the same shape. The
 * workflow asks GitHub for a run every hour at :15. Measured on 2026-10-08,
 * the last six scheduled runs landed at:
 *
 *     02:12, 22:06, 16:31, 09:01, 01:57, 22:00
 *
 * Gaps of 4.1, 5.6, 7.5, 7.1 and 4.0 hours against a one-hour cron — roughly
 * five runs a day instead of twenty-four. Free-tier scheduled workflows are
 * throttled under load and no cron expression changes that; every workflow in
 * this repo has the same record. pg_cron fires inside the database when it
 * says it will.
 *
 * This matters more for the radio half than it looks. The reports are the only
 * source that says *why* a road is bad, the station posts a handful of times a
 * day, and the consumer app's LOOKBACK_MS is 12 hours — so a 7.5-hour gap can
 * put a post past the window before anything ever scraped it. A missed scrape
 * is not a late report, it is no report.
 *
 * ── Parser ──────────────────────────────────────────────────────────────────
 *
 * deno-dom rather than cheerio: it is built for this runtime and avoids
 * pulling a Node-shaped dependency tree into an edge function. The selectors,
 * prompt, schema and row shape all come from _shared/lagos-traffic.js so the
 * Node agent and this function cannot classify the same post differently.
 *
 * ── Auth ────────────────────────────────────────────────────────────────────
 *
 * Deployed with --no-verify-jwt so pg_net can reach it without minting a user
 * token, then gated on the same x-cron-secret shared secret as live-traffic,
 * read from Vault by the cron command. A request without it gets 401 and costs
 * nothing — checked before any fetch, any Gemini call and any write.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { DOMParser, type Element } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts';
import {
  SOURCE_URL,
  MAX_POSTS,
  DEFAULT_MODEL,
  HTTP_HEADERS,
  LISTING_LINK_SELECTOR,
  HEADLINE_SELECTOR,
  BODY_SELECTOR,
  PUBLISHED_AT_SELECTORS,
  BODY_MAX_CHARS,
  MIN_CONFIDENCE,
  isTrafficTitle,
  normalisePublishedAt,
  classify,
  buildReportRow,
} from '../_shared/lagos-traffic.js';

// Between Gemini calls. The free tier is per-minute as well as per-day, and a
// burst of ten arriving together is the shape that trips it.
const PACE_MS = 1200;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const fetchHtml = async (url: string, timeoutMs = 20000): Promise<string> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: HTTP_HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
};

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

serve(async (req: Request) => {
  // Trimmed on read — a trailing newline or a wrapping quote has caused two
  // separate failures on the live-traffic function, and the symptom is a 401
  // that pg_cron still logs as "succeeded".
  const env = (name: string) =>
    Deno.env.get(name)?.trim().replace(/^["']|["']$/g, '') || undefined;

  const cronSecret = env('TRAFFIC_CRON_SECRET');
  const geminiKey = env('GEMINI_API_KEY');
  const supabaseUrl = env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const model = env('GEMINI_MODEL') ?? DEFAULT_MODEL;

  const presented = req.headers.get('x-cron-secret')?.trim() ?? '';
  const expected = cronSecret?.trim() ?? '';
  if (!expected || presented !== expected) {
    return new Response(
      JSON.stringify({
        error: 'unauthorized',
        detail: !expected
          ? 'TRAFFIC_CRON_SECRET is not set on this function'
          : !presented
            ? 'no x-cron-secret header on the request'
            : 'x-cron-secret did not match',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const missing = [
    !geminiKey && 'GEMINI_API_KEY',
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
  const failures: string[] = [];

  // ── 1. Listing ────────────────────────────────────────────────────────────
  let listing: Array<{ url: string; title: string }> = [];
  try {
    const doc = parse(await fetchHtml(SOURCE_URL));
    const seen = new Set<string>();
    for (const node of doc?.querySelectorAll(LISTING_LINK_SELECTOR) ?? []) {
      const el = node as unknown as Element;
      const url = el.getAttribute('href')?.trim();
      const title = el.textContent?.trim();
      if (!url || !title || !url.startsWith('http')) continue;
      if (!isTrafficTitle(title)) continue;
      if (seen.has(url)) continue;
      seen.add(url);
      listing.push({ url, title });
      if (listing.length >= MAX_POSTS) break;
    }
  } catch (err) {
    // The listing is the whole run — a failure here is not partial.
    return new Response(
      JSON.stringify({ error: `listing fetch failed: ${(err as Error).message}`, source: SOURCE_URL }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (listing.length === 0) {
    return new Response(
      JSON.stringify({ source: SOURCE_URL, found: 0, note: 'no traffic posts on the listing page' }, null, 2),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── 2. Which are new ──────────────────────────────────────────────────────
  const urls = listing.map((p) => p.url);
  const { data: known, error: knownError } = await supabase
    .from('traffic_reports')
    .select('source_url')
    .in('source_url', urls);

  if (knownError) failures.push(`dedupe query: ${knownError.message} — treating all as new`);
  const existing = new Set((known ?? []).map((r: { source_url: string }) => r.source_url));
  const fresh = listing.filter((p) => !existing.has(p.url));

  // ── 3. Keep still-listed reports alive ────────────────────────────────────
  // The station leaves posts up for hours and rarely republishes; if the URL
  // is still on the listing the state is still current. Without this, reports
  // expire out of the consumer app after their TTL while the road is unchanged.
  let refreshed = 0;
  if (existing.size > 0) {
    const { error, count } = await supabase
      .from('traffic_reports')
      .update({ expires_at: new Date(Date.now() + 120 * 60_000).toISOString() }, { count: 'exact' })
      .in('source_url', [...existing]);
    if (error) failures.push(`refresh expiry: ${error.message}`);
    else refreshed = count ?? 0;
  }

  // ── 4. Classify and write the new ones ────────────────────────────────────
  let classified = 0;
  let skipped = 0;

  for (const post of fresh) {
    try {
      const doc = parse(await fetchHtml(post.url));

      const headline = doc?.querySelector(HEADLINE_SELECTOR)?.textContent?.trim() || post.title;
      const body =
        doc?.querySelector(BODY_SELECTOR)?.textContent?.trim().slice(0, BODY_MAX_CHARS) || null;

      let publishedRaw: string | null = null;
      for (const [selector, attr] of PUBLISHED_AT_SELECTORS) {
        const found = doc?.querySelector(selector)?.getAttribute(attr);
        if (found) { publishedRaw = found; break; }
      }

      const classification = await classify({ headline, body }, { apiKey: geminiKey!, model });

      if (typeof classification.confidence === 'number' && classification.confidence < MIN_CONFIDENCE) {
        skipped++;
        await sleep(PACE_MS);
        continue;
      }

      const { error } = await supabase.from('traffic_reports').upsert(
        buildReportRow({
          sourceUrl: post.url,
          publishedAt: normalisePublishedAt(publishedRaw),
          classification,
        }),
        { onConflict: 'source_url' },
      );
      if (error) throw new Error(`upsert: ${error.message}`);
      classified++;
    } catch (err) {
      failures.push(`${post.title.slice(0, 60)}: ${(err as Error).message}`);
    }
    await sleep(PACE_MS);
  }

  const body = {
    source: SOURCE_URL,
    model,
    found: listing.length,
    already_known: existing.size,
    classified,
    skipped_low_confidence: skipped,
    expiry_refreshed: refreshed,
    failures,
  };

  // 207 when some posts failed: the run did useful work and still needs
  // looking at, which a bare 200 would hide and a 500 would overstate.
  return new Response(JSON.stringify(body, null, 2), {
    status: failures.length === 0 ? 200 : 207,
    headers: { 'Content-Type': 'application/json' },
  });
});
