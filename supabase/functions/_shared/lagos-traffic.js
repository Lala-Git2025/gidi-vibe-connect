/**
 * Lagos Traffic Radio classification — shared by two runtimes.
 *
 * Consumers:
 *   • supabase/functions/lagos-traffic/index.ts   (Deno, driven by pg_cron)
 *   • scripts/lagos-traffic-agent.js              (Node, dry run + manual)
 *
 * ── This file must stay runtime-agnostic ────────────────────────────────────
 *
 * Same rule as `lagos-corridors.js`, and for the same reason: Deno can only
 * import from inside the functions directory once deployed. No `require`, no
 * `process`, no `node:` imports, no Deno globals, and **no HTML parser
 * import** — Node uses cheerio and Deno uses deno-dom, and neither specifier
 * resolves in the other runtime.
 *
 * So the parser is not shared; the *selectors* are. That is the right split,
 * because the selectors are the fragile, site-specific knowledge that must not
 * exist in two places — along with the prompt and the response schema, which
 * are the other things that would silently diverge and produce two different
 * classifications of the same post.
 *
 * Both cheerio and deno-dom accept these CSS selector strings, so each runtime
 * applies them with its own engine and gets the same nodes.
 */

/**
 * Note for anything here that reads a whole column back: `[api] max_rows` in
 * supabase/config.toml is 1000, and PostgREST truncates every response to it
 * silently — no error, no indication. That is how the news scraper's dedupe
 * guard came to check 870 URLs out of 38,635 rows. Page with `.range()`.
 */
export const SOURCE_URL = 'https://trafficradio961.ng/news/traffic-updates/';

export const MAX_POSTS = 10;

/**
 * Pinned to a LITE model, deliberately not an alias.
 *
 * Carried over verbatim from the Node agent because the history is the whole
 * point: gemini-2.0-flash was superseded, gemini-2.5-flash was blocked for
 * API-key access on 2026-09-16 while still appearing in the models listing,
 * and the obvious fix — 'gemini-flash-latest' — resolves to the NEWEST flash
 * model, which carries the TIGHTEST free-tier quota. It landed on
 * gemini-3.8-flash (limit 20 requests) and the news agent's briefs collapsed
 * under 429s. Pinned, so a retirement is a loud 404 we fix on purpose rather
 * than a silent slide onto a model the free tier cannot sustain.
 */
export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';

export const HTTP_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ── Selectors ───────────────────────────────────────────────────────────────
// A WordPress theme, so several candidate shapes are tried in one selector
// list. Shared rather than duplicated: a theme change breaks both runtimes at
// once, which is far better than breaking one of them quietly.

export const LISTING_LINK_SELECTOR =
  'article h2 a, article h3 a, .post-title a, .entry-title a, h2.entry-title a';

export const HEADLINE_SELECTOR = 'h1.entry-title, h1.post-title, h1';

export const BODY_SELECTOR = '.entry-content, .post-content, article .content, article';

export const PUBLISHED_AT_SELECTORS = [
  ['time[datetime]', 'datetime'],
  ['meta[property="article:published_time"]', 'content'],
  ['meta[name="publish_date"]', 'content'],
];

/** The listing carries non-traffic posts; only these are ours. */
export const isTrafficTitle = (title) => /traffic|incident|update/i.test(title ?? '');

export const BODY_MAX_CHARS = 4000;

/**
 * The source sometimes emits a local timestamp with no zone. `new Date(x)`
 * then reads it as the *runner's* local time — which differs between a GitHub
 * ubuntu runner (UTC) and a Deno edge region, and would shift every report's
 * age by hours depending on which producer happened to write it.
 */
export const normalisePublishedAt = (raw) => {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/Z|[+-]\d{2}:?\d{2}$/.test(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  // No zone given. Lagos is UTC+1 year-round (no DST), and the source is a
  // Lagos radio station publishing Lagos times.
  const d = new Date(`${value.replace(' ', 'T')}+01:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

// ── Gemini classification ───────────────────────────────────────────────────

export const CLASSIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    route_label: {
      type: 'string',
      description:
        'Route name in title case, e.g. "3rd Mainland Bridge", "Lekki-Epe Expressway", "Ikorodu Road / Onipan".',
    },
    area: {
      type: 'string',
      enum: ['Mainland', 'Island', 'Lekki', 'Mainland-Outer'],
      description:
        'Mainland=Yaba/Surulere/Ikeja/Ikorodu corridor. Island=VI/Ikoyi/CMS/Eko/Carter Bridge. Lekki=Lekki/Ajah/Ibeju. Mainland-Outer=Badagry/Lagos-Ibadan beyond Berger.',
    },
    severity: {
      type: 'string',
      enum: ['light', 'moderate', 'heavy', 'critical', 'closed'],
      description:
        'light=flowing, moderate=slow, heavy=major congestion, critical=gridlock, closed=road closure/major incident.',
    },
    summary: {
      type: 'string',
      description:
        '1-2 sentences written for a Lagos driver deciding whether to leave now: what is happening, where exactly, and the cause if given. Direct, plain, no headline restatement.',
    },
    confidence: { type: 'number', description: '0..1 confidence in route + severity classification.' },
    ttl_minutes: {
      type: 'integer',
      description: '60 for fast-changing incidents, 120 for normal congestion, 240 for road closures.',
    },
  },
  required: ['route_label', 'area', 'severity', 'summary', 'confidence', 'ttl_minutes'],
};

export const SYSTEM_PROMPT = `You classify Lagos traffic posts from Lagos Traffic Radio 96.1FM into structured reports.

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
4. Summary is written FOR Gidi Connect, not copied from the source. Speak to a Lagos driver deciding whether to leave now: say what is happening, where exactly (junction, direction — inward/outward), and the cause if given (accident, road work, broken-down vehicle, rain, flooding). 1-2 sentences, direct and plain. Use Lagos names as locals say them ("Third Mainland", "Lekki-Epe", "Ikorodu Road"). Never invent a detail the post does not contain; if the post is thin, keep the summary short rather than padding it. No headline restatement, no exclamation marks.
5. Confidence:
   - 0.9+ if route is clear and severity unambiguous
   - 0.7-0.9 if severity inferred indirectly
   - < 0.5 if ambiguous or off-topic → still emit JSON, the caller filters
6. TTL: 60 for incidents (fast-changing), 120 for general congestion, 240 for road closures.`;

/** Below this the classification is not trusted and the post is skipped. */
export const MIN_CONFIDENCE = 0.5;

/**
 * `fetch` only — no axios — so this runs unchanged in both runtimes.
 * Gemini's own status and message are surfaced, because 429 / 403 / 404 each
 * mean something different here and a generic "classify failed" hides which.
 */
export const classify = async ({ headline, body }, { apiKey, model = DEFAULT_MODEL, timeoutMs = 60000 } = {}) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify({ headline, body: body || '' }) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: CLASSIFICATION_SCHEMA,
      temperature: 0.2,
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const raw = await res.text();
  if (!res.ok) {
    let detail = raw;
    try { detail = JSON.parse(raw)?.error?.message ?? raw; } catch { /* keep raw */ }
    throw new Error(`Gemini ${res.status}: ${String(detail).slice(0, 300)}`);
  }

  let text;
  try {
    text = JSON.parse(raw)?.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch {
    throw new Error('Gemini returned a non-JSON envelope');
  }
  if (!text) throw new Error('Gemini returned no text');
  return JSON.parse(text);
};

/** The row shape written to traffic_reports, identical from either runtime. */
export const buildReportRow = ({ sourceUrl, publishedAt, classification, now = Date.now() }) => {
  const ttl = Number.isFinite(classification.ttl_minutes) ? classification.ttl_minutes : 120;
  return {
    route_label: String(classification.route_label),
    area: classification.area || null,
    severity: String(classification.severity),
    summary: String(classification.summary),
    source_url: sourceUrl,
    source_published_at: publishedAt,
    expires_at: new Date(now + ttl * 60_000).toISOString(),
    confidence: typeof classification.confidence === 'number' ? classification.confidence : null,
  };
};
