/**
 * lagos-events-agent — real Lagos events, from sources that publish them for
 * machines to read.
 *
 * ── Why this one is not the last one ────────────────────────────────────────
 *
 * Two previous "event ingesters" were deleted on 2026-10-06 and a third was
 * unwired on 2026-10-05, so this file has to earn its place:
 *
 *   - `scrape-nigerian-events.js` imported Puppeteer and a stealth plugin and
 *     then wrote a hardcoded array of invented events. Eight fabricated rows
 *     reached production with ticket URLs that 404.
 *   - `sync-eventbrite-events.js` called `GET /v3/events/search/`, withdrawn
 *     from public access in December 2019.
 *   - `supabase/functions/fetch-lagos-events` SELECTs from public.events and
 *     UPSERTs the result back into public.events, answering
 *     `source: 'live_scraping'`.
 *
 * The difference here is that **every field traces to a document the source
 * published for this purpose.** These sites emit schema.org `Event` JSON-LD —
 * the same markup that puts events in Google's search results. Reading it is
 * the intended use, not a workaround. Nothing in this file invents a date, a
 * price, a venue or a URL, and a field the source omits stays null.
 *
 * ── What is deliberately not scraped ───────────────────────────────────────
 *
 * Measured 2026-10-05, with a self-identifying User-Agent:
 *
 *   tix.africa        403 — on /discover AND on /robots.txt
 *   10times.com       403
 *   bandsintown.com   403
 *
 * **A 403 is an answer, not an obstacle.** Those hosts are skipped and this
 * agent will never be given a browser-shaped User-Agent, a headless browser or
 * a stealth plugin to get past one. Defeating bot protection on a ticketing
 * platform would also poison the partnership that is the real way into its
 * catalogue. If tix.africa is wanted, the route is a conversation with them.
 *
 * `robots.txt` is fetched and enforced at runtime rather than checked once by
 * hand, so the permission is a property of the code and not of a comment that
 * can go stale. A path the host disallows is not crawled; a declared
 * Crawl-delay is obeyed, including allevents.in's 30 seconds.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *
 *   node scripts/lagos-events-agent.js                  # dry run, writes nothing
 *   node scripts/lagos-events-agent.js --write          # upsert into events
 *   node scripts/lagos-events-agent.js --write --retire # also close out past events
 *   node scripts/lagos-events-agent.js --source meetup  # one source
 *   node scripts/lagos-events-agent.js --pages 3        # more Eventbrite pages
 *
 * Dry-run by default, like venue-discovery-agent.js: the first thing anyone
 * does with a scraper is look at what it found.
 *
 * Needs, for --write only:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Says who we are and how to reach us. A scraper that identifies itself can be
 * rate-limited or blocked on purpose by the host, which is the whole point —
 * it makes the host's consent a real thing rather than something we assume.
 */
const USER_AGENT = 'GidiConnectBot/1.0 (+https://gidiconnect.com; Lagos events aggregator)';

// ── args ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const arg = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const WRITE = has('--write');
const RETIRE = has('--retire');
const ONLY_SOURCE = arg('--source', null);

// `Number('')` is 0, which silently means "fetch nothing" — the trap that made
// the baseline workflow's schedule a no-op. Refuse anything non-positive.
const positiveInt = (flag, fallback) => {
  const raw = arg(flag, String(fallback));
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`${flag} must be a positive number (got ${JSON.stringify(raw)})`);
    process.exit(1);
  }
  return Math.floor(n);
};

const PAGES = positiveInt('--pages', 2);
const LIMIT = positiveInt('--limit', 200);

// ── http ────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchText = async (url, timeoutMs = 20000) => {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      signal: ac.signal,
      redirect: 'follow',
    });
    const body = res.ok ? await res.text() : '';
    return { status: res.status, body };
  } catch (err) {
    return { status: 0, body: '', error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(timer);
  }
};

// ── robots.txt ──────────────────────────────────────────────────────────────

/**
 * Minimal robots.txt reader: the `User-agent: *` group only.
 *
 * We never match a more specific group, because we would only do that to find
 * a looser rule than the one meant for anonymous crawlers — which is the
 * opposite of complying. Longest-prefix Allow beats Disallow, as the spec says.
 */
const parseRobots = (text) => {
  const groups = [];
  let current = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const ua = line.match(/^user-agent:\s*(.*)$/i);
    if (ua) {
      if (!current || current.rules.length) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(ua[1].trim().toLowerCase());
      continue;
    }
    if (!current) continue;
    const rule = line.match(/^(disallow|allow|crawl-delay):\s*(.*)$/i);
    if (rule) current.rules.push({ kind: rule[1].toLowerCase(), value: rule[2].trim() });
  }

  const star = groups.find((g) => g.agents.includes('*'));
  if (!star) return { disallow: [], allow: [], crawlDelay: 0 };

  const pick = (kind) => star.rules.filter((r) => r.kind === kind && r.value).map((r) => r.value);
  const delays = star.rules
    .filter((r) => r.kind === 'crawl-delay')
    .map((r) => Number(r.value))
    .filter((n) => Number.isFinite(n) && n > 0);

  return {
    disallow: pick('disallow'),
    allow: pick('allow'),
    // The strictest declared delay, not the first — some files list several.
    crawlDelay: delays.length ? Math.max(...delays) * 1000 : 0,
  };
};

/** A robots pattern may contain `*` and a terminating `$`. */
const robotsMatch = (pattern, path) => {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  const anchored = pattern.endsWith('$') ? `^${escaped.slice(0, -2)}$` : `^${escaped}`;
  try { return new RegExp(anchored).test(path); } catch { return false; }
};

const robotsCache = new Map();

const robotsFor = async (origin) => {
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  const res = await fetchText(`${origin}/robots.txt`);
  // A 403 or 401 on robots.txt means the host is refusing anonymous clients
  // outright. Treat that as a full disallow — it is the clearest "no" a server
  // can give, and tix.africa gives exactly this one.
  const rules =
    res.status === 403 || res.status === 401
      ? { disallow: ['/'], allow: [], crawlDelay: 0, refused: true }
      : res.status === 200
        ? parseRobots(res.body)
        // Anything else (404, 5xx, network error): no rules published, which
        // the spec treats as full allow. Still paced by the source's own delay.
        : { disallow: [], allow: [], crawlDelay: 0 };
  robotsCache.set(origin, rules);
  return rules;
};

const isAllowed = (rules, path) => {
  const longest = (patterns) =>
    patterns.filter((p) => robotsMatch(p, path)).reduce((a, b) => (b.length > a.length ? b : a), '');
  const d = longest(rules.disallow);
  const a = longest(rules.allow);
  if (!d) return true;
  return a.length >= d.length;
};

const lastHit = new Map();

/** Fetch with robots enforcement and per-host pacing. */
const politeFetch = async (url, minDelayMs) => {
  const { origin, pathname, search } = new URL(url);
  const rules = await robotsFor(origin);
  const path = pathname + search;

  if (!isAllowed(rules, path)) {
    return { status: -1, body: '', blocked: true, refused: rules.refused === true };
  }

  const delay = Math.max(rules.crawlDelay, minDelayMs);
  const since = Date.now() - (lastHit.get(origin) ?? 0);
  if (since < delay) await sleep(delay - since);
  lastHit.set(origin, Date.now());

  return fetchText(url);
};

// ── JSON-LD ─────────────────────────────────────────────────────────────────

const jsonLdObjects = (html) => {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try { out.push(JSON.parse(m[1].trim())); } catch { /* malformed block, skip */ }
  }
  return out;
};

const EVENT_TYPE = /(^|[A-Za-z])Event$|^Festival$/;

/** Walk a JSON-LD tree and collect every schema.org Event-ish node. */
const collectEvents = (node, acc = [], depth = 0) => {
  if (depth > 8 || node == null) return acc;
  if (Array.isArray(node)) { for (const n of node) collectEvents(n, acc, depth + 1); return acc; }
  if (typeof node !== 'object') return acc;

  const types = [].concat(node['@type'] ?? []);
  if (types.some((t) => typeof t === 'string' && EVENT_TYPE.test(t))) acc.push(node);

  for (const key of ['@graph', 'itemListElement', 'item', 'subEvent', 'mainEntity']) {
    if (node[key]) collectEvents(node[key], acc, depth + 1);
  }
  return acc;
};

// ── normalisation ───────────────────────────────────────────────────────────

const text = (v) => {
  if (typeof v === 'string') return v.trim() || null;
  if (v && typeof v === 'object' && typeof v.name === 'string') return v.name.trim() || null;
  return null;
};

const firstImage = (v) => {
  const raw = Array.isArray(v) ? v[0] : v;
  const url = typeof raw === 'string' ? raw : raw?.url;
  if (typeof url !== 'string') return null;
  // Meetup falls back to generic group-cover art on a relative path. A
  // placeholder is worse than null: EventsScreen already picks a
  // category-themed image when image_url is empty.
  return url.startsWith('http') ? url : null;
};

/**
 * The source's own date string, kept as an instant.
 *
 * Eventbrite listing pages carry date-only values ("2026-10-10"); the detail
 * page carries the real offset ("2026-10-13T09:00:00+01:00"). A bare date is
 * parsed by JS as UTC midnight, which in Lagos (+01:00) displays as 01:00 on
 * the right day — wrong by an hour but never the wrong day. We take it only
 * when no detail page is available, and never invent a start time.
 */
const parseInstant = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
  const ms = Date.parse(dateOnly ? `${value.trim()}T00:00:00+01:00` : value);
  return Number.isFinite(ms) ? { iso: new Date(ms).toISOString(), approximate: dateOnly } : null;
};

const isOnlineOnly = (ev) => {
  const mode = String(ev.eventAttendanceMode ?? '');
  if (/OnlineEventAttendanceMode/i.test(mode)) return true;
  const place = ev.location;
  const name = text(place) ?? '';
  if (/^(online|virtual|zoom|google meet|webinar)\b/i.test(name)) return true;
  const types = [].concat(place?.['@type'] ?? []);
  return types.includes('VirtualLocation');
};

/**
 * Lagos, and only Lagos.
 *
 * Eventbrite's `nigeria--lagos` browse page is not strictly Lagos: the first
 * dry run brought back "Afrobeat Vibes Night - Port Harcourt" (addressRegion
 * Rivers) and a conference in Ogun State. Country is not a fine enough filter
 * for a Lagos app, and `addressRegion` is the field that settles it.
 */
// Not anchored: organisers type "LA", "Lagos", "Lagos State" and "Lagos state."
// into this field, and an anchored `^lagos$` rejected the last of those — a
// genuine Lagos event dropped over a trailing full stop.
const LAGOS_REGION = /\b(la|lagos)\b/i;

const NOT_LAGOS = new RegExp(
  '\\b(' +
  'port\\s?harcourt|abuja|ibadan|abeokuta|ogun|kano|kaduna|enugu|benin\\s?city|' +
  'warri|asaba|owerri|uyo|calabar|jos|ilorin|akure|osogbo|awka|onitsha|aba\\b|' +
  'maiduguri|sokoto|yola|minna|lokoja|makurdi|bauchi|zaria|rivers\\s?state|' +
  'oyo\\s?state|delta\\s?state|anambra|imo\\s?state|edo\\s?state|kwara|ekiti|ondo\\s?state' +
  ')\\b',
  'i',
);

/**
 * A venue name that carries no information. Eventbrite lets organisers type
 * anything here, and the dry run produced `location.name = "Nigeria"` on an
 * event whose street address was perfectly good. Null is better than a label
 * that tells the reader nothing — EventsScreen omits the field when empty.
 */
const USELESS_VENUE = /^(nigeria|lagos|lagos,?\s*nigeria|online|virtual|tba|tbd|to\s?be\s?announced|n\/?a|none|-{1,})$/i;

/** Category strings must match EventsScreen's filter chips or the chip is dead. */
const CATEGORY_RULES = [
  ['Nightlife', /\b(night\s?life|night\s?club|club night|rave|after[\s-]?party|lounge|dj set|party)\b/i],
  ['Concert', /\b(concert|live music|gig|tour|unplugged|album launch|listening party)\b/i],
  ['Comedy', /\b(comedy|stand[\s-]?up|improv|comedian)\b/i],
  ['Food & Dining', /\b(food|dining|restaurant|brunch|tasting|wine|cocktail|chef|culinary|bbq|barbecue)\b/i],
  ['Arts & Culture', /\b(art|gallery|exhibition|museum|theatre|theater|play|poetry|dance|film|screening|book|literary|fashion|culture)\b/i],
  ['Sports', /\b(sport|football|match|marathon|fitness|yoga|basketball|tennis|padel|run\b|race)\b/i],
  ['Technology', /\b(tech|developer|software|ai\b|data|cloud|cyber|startup|devops|engineering|hackathon|blockchain|aws|azure)\b/i],
  // Conferences dominate the Eventbrite listing, and without this they all
  // landed in the Entertainment catch-all — 17 of 36 on the first dry run.
  ['Networking', /\b(network|mixer|meet[\s-]?up|connect|mingle|professionals|business show|summit|forum|conference|roundtable|symposium|expo|awards?\b|table series)\b/i],
  ['Workshop', /\b(workshop|masterclass|training|bootcamp|class\b|course|seminar|clinic)\b/i],
  ['Entertainment', /\b(entertainment|show|festival|carnival|pageant|talent)\b/i],
];

const categorise = (title, description) => {
  const haystack = `${title} ${description ?? ''}`;
  for (const [label, re] of CATEGORY_RULES) if (re.test(haystack)) return label;
  return 'Entertainment';
};

const priceOf = (ev) => {
  const offers = [].concat(ev.offers ?? []).filter(Boolean);
  if (!offers.length) return { is_free: null, min: null, max: null, currency: null, info: null };

  const nums = offers.flatMap((o) => [o.lowPrice, o.highPrice, o.price].map(Number)).filter(Number.isFinite);
  if (!nums.length) return { is_free: null, min: null, max: null, currency: null, info: null };

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const currency = offers.find((o) => o.priceCurrency)?.priceCurrency ?? null;
  const free = max === 0;

  /*
    `price_info` always carries the currency code, and that is load-bearing
    rather than cosmetic.

    EventsScreen's `formatPrice` falls back to `₦${ticket_price_min}` on the
    raw numbers and **never reads the `currency` column**. Eventbrite serves
    these figures already converted — the dry run returned USD, GBP and NOK
    for Lagos events — so a null `price_info` beside `ticket_price_min = 12.51`
    would render a ₦19,000 ticket as "₦12.51".

    Two defences, because one is not enough:
      - a currency-qualified `price_info` whenever we have a currency, so the
        ₦ fallback is never reached;
      - and when the source gave a number with no currency at all, the numeric
        columns are dropped as well, so there is nothing for that fallback to
        mislabel. The figure is unusable without its unit either way.

    No exchange rate is applied anywhere. Converting a price with a rate we
    invented is how a made-up number gets a currency symbol in front of it.
  */
  const info = free
    ? 'Free'
    : currency
      ? min === max
        ? `${currency} ${min.toLocaleString('en-NG')}`
        : `${currency} ${min.toLocaleString('en-NG')} – ${max.toLocaleString('en-NG')}`
      : null;

  if (!free && !currency) return { is_free: false, min: null, max: null, currency: null, info: null };

  return { is_free: free, min, max, currency, info };
};

const clip = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

// ── sources ─────────────────────────────────────────────────────────────────

/**
 * Eventbrite, via the public city browse page.
 *
 * The *API* path is closed — `/v3/events/search/` was withdrawn in 2019 — but
 * the city page emits one JSON-LD block listing every event on it, and
 * robots.txt allows both `/d/...` and `/e/...` under `User-agent: *`. The
 * listing has no time of day and no price, so each event's own page is fetched
 * for the full record; Eventbrite declares Crawl-delay 0.5–0.7s and we take
 * the larger.
 */
const eventbrite = {
  key: 'eventbrite',
  source: 'eventbrite',
  label: 'Eventbrite',
  minDelayMs: 700,

  async collect(log) {
    const found = new Map();

    for (let page = 1; page <= PAGES; page++) {
      const url = `https://www.eventbrite.com/d/nigeria--lagos/events/?page=${page}`;
      const res = await politeFetch(url, this.minDelayMs);
      if (res.blocked) { log(`  robots.txt disallows ${url} — skipping`); break; }
      if (res.status !== 200) { log(`  page ${page}: HTTP ${res.status}${res.error ? ` (${res.error})` : ''}`); break; }

      const listed = jsonLdObjects(res.body).flatMap((b) => collectEvents(b));
      log(`  page ${page}: ${listed.length} listed`);
      if (!listed.length) break;

      for (const ev of listed) {
        const href = text(ev.url);
        if (!href || !/^https:\/\/www\.eventbrite\.com\/e\//.test(href)) continue;
        if (!found.has(href)) found.set(href, ev);
      }
      if (found.size >= LIMIT) break;
    }

    const urls = [...found.keys()].slice(0, LIMIT);
    log(`  ${urls.length} unique event pages to read`);

    const out = [];
    for (const [i, href] of urls.entries()) {
      const res = await politeFetch(href, this.minDelayMs);
      if (res.blocked || res.status !== 200) {
        // Fall back to the listing entry — fewer fields, still the source's
        // own data, and flagged approximate so nothing claims a start time.
        out.push({ raw: found.get(href), href });
        continue;
      }
      const detail = jsonLdObjects(res.body).flatMap((b) => collectEvents(b))[0];
      out.push({ raw: detail ?? found.get(href), href });
      if ((i + 1) % 10 === 0) log(`  read ${i + 1}/${urls.length}`);
    }
    return out;
  },

  externalId(href) {
    // .../e/<slug>-tickets-<id> — the trailing digit run is the event id.
    const m = href.match(/-(\d{6,})(?:\?|$|#)/) ?? href.match(/(\d{6,})\/?$/);
    return m ? m[1] : null;
  },
};

/**
 * Meetup, via the Lagos find page.
 *
 * Its listing JSON-LD already carries a full ISO start with offset, the
 * organiser and the description, so detail pages are not fetched — fewer
 * requests for the same data. `/find/` is allowed and no Crawl-delay is
 * declared for `*`; a second between requests is our own courtesy.
 */
const meetup = {
  key: 'meetup',
  source: 'meetup',
  label: 'Meetup',
  minDelayMs: 1000,

  async collect(log) {
    const url = 'https://www.meetup.com/find/?location=ng--Lagos&source=EVENTS';
    const res = await politeFetch(url, this.minDelayMs);
    if (res.blocked) { log('  robots.txt disallows /find/ — skipping'); return []; }
    if (res.status !== 200) { log(`  HTTP ${res.status}${res.error ? ` (${res.error})` : ''}`); return []; }

    const listed = jsonLdObjects(res.body).flatMap((b) => collectEvents(b));
    log(`  ${listed.length} listed`);
    return listed
      .filter((ev) => /^https:\/\/www\.meetup\.com\//.test(text(ev.url) ?? ''))
      .slice(0, LIMIT)
      .map((ev) => ({ raw: ev, href: text(ev.url) }));
  },

  externalId(href) {
    const m = href.match(/\/events\/(\d+)/);
    return m ? m[1] : null;
  },
};

const SOURCES = [eventbrite, meetup];

// ── mapping + validation ────────────────────────────────────────────────────

/**
 * Turn one JSON-LD Event into an `events` row, or explain why not.
 *
 * Every rejection reason is counted and printed. A scraper that silently drops
 * rows is indistinguishable from one that is broken.
 */
const toRow = (src, { raw, href }) => {
  if (!raw) return { skip: 'no JSON-LD event object' };

  const title = text(raw.name);
  if (!title) return { skip: 'no title' };

  const start = parseInstant(raw.startDate);
  if (!start) return { skip: 'unparseable start date' };
  if (Date.parse(start.iso) < Date.now() - 6 * 60 * 60 * 1000) return { skip: 'already past' };

  const externalId = src.externalId(href);
  if (!externalId) return { skip: 'no external id in url' };

  if (isOnlineOnly(raw)) return { skip: 'online-only' };

  if (/cancelled|postponed/i.test(String(raw.eventStatus ?? ''))) return { skip: 'cancelled or postponed' };

  const place = raw.location ?? {};
  const address = place.address ?? {};
  const streetAddress = text(address.streetAddress);
  const locality = text(address.addressLocality);
  const region = text(address.addressRegion);

  // Where the source states a country, it must be Nigeria. Both listings are
  // already Lagos-scoped, so a missing country is accepted rather than guessed.
  if (typeof address.addressCountry === 'string' && !/^(NG|Nigeria)$/i.test(address.addressCountry.trim())) {
    return { skip: `outside Nigeria (${address.addressCountry})` };
  }

  // addressRegion is the decisive field when present: "Rivers" and "Ogun" are
  // both in Nigeria and neither is Lagos.
  if (region && !LAGOS_REGION.test(region)) return { skip: `outside Lagos (${region})` };

  // Then look for another city by name — in the title as well as the address,
  // and *regardless* of what the region field said. "Security Leadership
  // Conference, Ogun State" carries addressRegion "Lagos" and announces the
  // truth in its own title; the organiser's prose beats a mis-set dropdown.
  // Over-excluding is the right error for a single-city app, and every
  // rejection is printed with its reason so the call stays auditable.
  const haystack = [title, text(place), streetAddress, locality].filter(Boolean).join(' ');
  const elsewhere = haystack.match(NOT_LAGOS);
  if (elsewhere) return { skip: `names another city (${elsewhere[0]})` };

  const end = parseInstant(raw.endDate);
  const description = text(raw.description);
  const price = priceOf(raw);

  // Drop a venue name that says nothing, and prefer the street address when
  // the organiser typed the country into the venue field.
  const rawVenue = text(place);
  const venueName = rawVenue && !USELESS_VENUE.test(rawVenue) ? rawVenue : streetAddress ?? null;

  return {
    row: {
      title,
      description,
      short_description: clip(description, 180),
      category: categorise(title, description),
      start_date: start.iso,
      end_date: end?.iso ?? null,
      timezone: 'Africa/Lagos',
      venue_name: venueName,
      venue_address: [streetAddress, locality].filter(Boolean).join(', ') || null,
      location: locality ? `${locality}, Lagos` : 'Lagos, Nigeria',
      is_free: price.is_free ?? false,
      ticket_price_min: price.min,
      ticket_price_max: price.max,
      currency: price.currency ?? 'NGN',
      price_info: price.info,
      ticket_url: href,
      image_url: firstImage(raw.image),
      featured_image_url: firstImage(raw.image),
      organizer_name: text(raw.organizer),
      organizer_url: text(raw.organizer?.url) ?? null,
      source: src.source,
      external_id: externalId,
      external_url: href,
      status: 'upcoming',
      // Nobody has checked this against the organiser, and the badge should
      // say so. is_published is the kill switch: one UPDATE takes a bad event
      // off every screen without touching this agent.
      is_verified: false,
      is_published: true,
      is_active: true,
      last_synced_at: new Date().toISOString(),
    },
    approximateStart: start.approximate,
  };
};

// ── main ────────────────────────────────────────────────────────────────────

const main = async () => {
  const chosen = ONLY_SOURCE ? SOURCES.filter((s) => s.key === ONLY_SOURCE) : SOURCES;
  if (!chosen.length) {
    console.error(`--source must be one of: ${SOURCES.map((s) => s.key).join(', ')}`);
    process.exit(1);
  }

  console.log(`\nLagos events agent — ${WRITE ? 'WRITE' : 'dry run (nothing is written)'}`);
  console.log(`sources: ${chosen.map((s) => s.label).join(', ')}\n`);

  let supabase = null;
  if (WRITE) {
    const missing = [!SUPABASE_URL && 'VITE_SUPABASE_URL', !SERVICE_KEY && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean);
    if (missing.length) {
      console.error(`Missing env: ${missing.join(', ')}`);
      process.exit(1);
    }
    supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  }

  const rows = [];
  const skips = new Map();
  let approximate = 0;

  for (const src of chosen) {
    console.log(`${src.label}:`);
    const log = (m) => console.log(m);
    let collected = [];
    try {
      collected = await src.collect(log);
    } catch (err) {
      console.log(`  failed: ${err.message}`);
      continue;
    }

    let kept = 0;
    for (const item of collected) {
      const result = toRow(src, item);
      if (result.skip) {
        skips.set(result.skip, (skips.get(result.skip) ?? 0) + 1);
        continue;
      }
      if (result.approximateStart) approximate++;
      rows.push(result.row);
      kept++;
    }
    console.log(`  kept ${kept}\n`);
  }

  if (skips.size) {
    console.log('skipped:');
    for (const [reason, n] of [...skips].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${reason}`);
    console.log('');
  }

  if (!rows.length) {
    console.log('No events to write.');
    return;
  }

  // Same event on two platforms: keep one. (source, external_id) is unique in
  // the table, so cross-source duplicates would both insert.
  const byTitleDate = new Map();
  for (const r of rows) {
    const key = `${r.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${r.start_date.slice(0, 10)}`;
    if (!byTitleDate.has(key)) byTitleDate.set(key, r);
  }
  const unique = [...byTitleDate.values()].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const crossDupes = rows.length - unique.length;

  console.log(`${unique.length} events${crossDupes ? ` (${crossDupes} cross-source duplicate${crossDupes === 1 ? '' : 's'} collapsed)` : ''}`);
  if (approximate) console.log(`${approximate} have a date but no start time from the source\n`);

  for (const r of unique) {
    const when = new Date(r.start_date).toLocaleString('en-NG', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      timeZone: 'Africa/Lagos',
    });
    console.log(
      `  ${when.padEnd(26)} ${String(r.category).padEnd(15)} ${clip(r.title, 52).padEnd(53)} ` +
      `${(r.venue_name ? clip(r.venue_name, 28) : '—').padEnd(29)} ${r.price_info ?? ''}`,
    );
  }

  if (!WRITE) {
    console.log(`\nDry run. Re-run with --write to upsert these ${unique.length} rows.`);
    return;
  }

  console.log('\nWriting…');
  const { data, error } = await supabase
    .from('events')
    .upsert(unique, { onConflict: 'source,external_id' })
    .select('id');

  if (error) {
    console.error(`Upsert failed: ${error.message}`);
    // The enum is the one schema dependency this agent adds.
    if (/invalid input value for enum event_source/.test(error.message)) {
      console.error('\nThe `meetup` value is missing from the event_source enum.');
      console.error('Apply supabase/migrations/20261006030000_event_source_add_meetup.sql, then re-run.');
    }
    process.exitCode = 1;
    return;
  }
  console.log(`Upserted ${data?.length ?? unique.length} events.`);

  if (RETIRE) {
    // `status` has been permanently 'upcoming' on every row since the table was
    // created, which made the column meaningless and `fetch-lagos-events`'s
    // `status='upcoming'` filter a no-op. Close out what has finished.
    const { data: closed, error: retireError } = await supabase
      .from('events')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .lt('start_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .eq('status', 'upcoming')
      .select('id');
    if (retireError) console.error(`Retire failed: ${retireError.message}`);
    else console.log(`Marked ${closed?.length ?? 0} past events completed.`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
