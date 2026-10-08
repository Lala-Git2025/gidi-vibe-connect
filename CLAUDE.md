# CLAUDE.md - Project Context for Claude Code

This file contains persistent context, decisions, and conventions for the Gidi Vibe Connect project. Claude Code will automatically read this file to understand the project.

## Project Overview

**Gidi Vibe Connect** is a mobile app + business web portal for discovering Lagos nightlife, events, venues, and social connections. Built with React Native (Expo) and Supabase backend.

### Tech Stack
- **Consumer App:** React Native with Expo (SDK 54), `newArchEnabled: false`
- **Business Portal:** React + Vite + Tailwind CSS + shadcn/ui (runs on port 3001) — Business Owner role only
- **Admin Portal:** React + Vite + Tailwind CSS (runs on port 3002) — Admin/Super Admin role only (separate app)
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State Management:** React Context (ThemeContext for consumer app, BusinessAuthContext for portal)
- **Navigation:** React Navigation v7 (Bottom Tabs) — custom tab bar
- **Icons:** Ionicons from `@expo/vector-icons` (all UI icons — no bare emoji)
- **Fonts:** Orbitron via `@expo-google-fonts/orbitron` (brand headers only)
- **Data Fetching (portal):** @tanstack/react-query

## Project Structure

```
gidi-vibe-connect/
├── apps/
│   ├── consumer-app/          # Main mobile app (React Native + Expo)
│   │   ├── screens/           # App screens
│   │   ├── components/        # Shared components
│   │   ├── contexts/          # ThemeContext
│   │   ├── config/            # Supabase client config
│   │   └── App.tsx            # Root component with custom tab bar
│   ├── business-portal/       # Web portal for venue owners (port 3001)
│   └── admin-portal/          # Separate web portal for platform admins (port 3002)
│       └── src/
│           ├── pages/         # Overview, Analytics, VenueManager, PromotionsManager, UserManager, Login
│           ├── hooks/         # useAnalytics.ts (analytics data fetching)
│           ├── hooks/         # useVenues.ts, useEvents.ts
│           ├── contexts/      # BusinessAuthContext
│           └── components/    # DashboardLayout, Sidebar, Header
├── supabase/
│   ├── migrations/            # All DB migrations (timestamped)
│   └── functions/             # Edge functions (create-venue, get-traffic)
└── scripts/
    └── lagos-news-agent.js    # Auto news scraper (GitHub Actions every 1h, macOS launchd every 3h)
```

## Key Screens (Consumer App)

| Screen | File | Purpose |
|--------|------|---------|
| Home | `HomeScreen.tsx` | Stories, trending venues, news, traffic, vibe check |
| Explore | `ExploreScreen.tsx` | Search and discover venues by category/area |
| Events | `EventsScreen.tsx` | Browse and RSVP to events |
| Social | `SocialScreen.tsx` | Feed, Communities, People tabs + Stories |
| Profile | `ProfileScreen.tsx` | User profile, auth (sign in/up/guest/forgot) |
| News | `NewsScreen.tsx` | Full news feed (navigated programmatically) |
| ExploreArea | `ExploreAreaScreen.tsx` | Lagos area grid |
| Discover | `DiscoverScreen.tsx` | Activity feed |

## Business Portal Pages (port 3001 — Business Owner only)

| Route | Page | Purpose |
|-------|------|---------|
| `/dashboard` | Dashboard | Business stats overview |
| `/venues` | Venue list | Owned venues |
| `/venues/:id` | Venue details | Photos, info, contact, amenities, tags |
| `/analytics` | Analytics | Premium tier |
| `/events` | Events | Owned events |
| `/offers` | Offers | Premium tier |
| `/subscription` | Subscription plans | Free/Premium/Enterprise |
| `/settings` | Account settings | — |

## Admin Portal Pages (port 3002 — Admin/Super Admin only)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Overview | Platform stats: users, venues, promotions, new signups |
| `/analytics` | Analytics | Full dashboard: user growth, role breakdown, venue stats, top venues, events, subscriptions, activity feed |
| `/venues` | Venue Manager | All venues — search by area, promote/remove, paginated |
| `/promotions` | Promotions Manager | Active/expired tracking, expiry countdown |
| `/users` | User Manager | Search, filter by role, inline role change, paginated |

## Database Schema (Supabase)

### Core Tables
- **profiles** - `user_id, full_name, username, bio, avatar_url, role` (role: Consumer | Business Owner | Content Creator | Admin | Super Admin)
- **venues** - `name, location, category (TEXT), rating, is_promoted, promoted_until, promotion_label, amenities[], tags[], instagram_handle, owner_id`
- **events** - `title, venue_name, date, organizer_id, is_published, source`
- **posts** - `content, user_id, community_id, image_url`
- **communities** - `name, description, icon, color, member_count`
- **community_members** - join records
- **follows** - `follower_id, following_id`
- **stories** - `user_id, image_url, media_type, filter_effect, overlays (JSON), expires_at`
- **story_views** - `story_id, viewer_id`
- **venue_check_ins** - `user_id, venue_id, checked_in_at`
- **event_rsvps** - `user_id, event_id, status`
- **venue_reviews** - `user_id, venue_id, rating, comment`
- **business_profiles** - `user_id, business_name, business_email, business_phone, business_address, website_url, instagram_handle, is_verified`
- **admin_profiles** - `user_id, department, permissions[], assigned_areas[], can_manage_users/venues/promotions/content`
- **business_subscriptions** - `user_id, tier, max_venues, max_events_per_month, etc.`
- **news** - `title, content, image_url, publish_date, source_url`

### Views
- **trending_venues** — Time-decayed hot score. Promoted venues score 999999. Score formula: `(checkins_24h × 10 + checkins_7d × 3 + live_rating × 20) / (hours_since_last_activity + 2)^1.5`

### Storage Buckets
- **avatars** - Profile pictures
- **social-media** - Post images and story media
- **venue-photos** - Business portal venue photos
- **event-images** - Event banners

## Image Upload Guidelines (Venue Photos)

| Property | Value |
|---|---|
| **Minimum resolution** | 1200 × 800 px (3:2 aspect ratio) |
| **Recommended** | 1600 × 1067 px |
| **Max file size** | 5 MB (bucket allows 10 MB) |
| **Formats** | JPEG, PNG, WebP |

Consumer app trending venue cards display at 280×320 px. Images should be at least 1200 px wide for sharp rendering on high-DPI screens. The 3:2 aspect ratio allows good cropping for both horizontal and vertical display contexts.

## Authentication

- Supabase Auth with email/password
- Guest mode supported (limited features)
- Profile auto-created via `handle_new_user` trigger
- Password reset via email (requires SMTP setup — not yet configured)
- Business portal: `BusinessAuthContext` handles sign in/up, subscription, profile, verification

## Theming (Consumer App)

Uses `ThemeContext` for dark/light mode:
```tsx
const { colors, activeTheme } = useTheme();
```
Always use `colors.xxx` from theme context, never hardcode colors.

## Conventions & Patterns

### Icons
- **All UI icons in consumer app**: Ionicons from `@expo/vector-icons` — NEVER bare emoji for UI
- **Community icons**: Unicode via `COMMUNITY_ICON_MAP` (Unicode escape sequences)
- **Sticker overlays**: `fontFamily: ''` in StoryViewer/StoryEditor — intentional exception for user emoji

### Code Style
- TypeScript for all new code
- Functional components with hooks
- Use `useFocusEffect` for data refresh on screen focus
- Use `useSafeAreaInsets` for bottom padding (not `Platform.OS` checks)
- Business portal data fetching via `@tanstack/react-query`

### Error Handling
- `try/catch` with `console.log` for non-critical errors
- `Alert.alert` for user-facing errors in consumer app
- Graceful fallbacks (e.g., TrendingVenues falls back to hardcoded data on DB error)

### Profile Data
- Always fetch from `profiles` table; fallback to auth metadata, then email prefix
- Sync auth metadata to profiles on first load if empty

### Admin Access
- Admin portal (`AdminLayout`) only allows `Admin` or `Super Admin` roles
- Business portal (`DashboardLayout`) only allows `Business Owner` role
- RLS policies: owners see/edit own venues; admins can SELECT/UPDATE all venues
- To make a user admin: `UPDATE profiles SET role = 'Admin' WHERE user_id = '<uuid>';`

## Recent Decisions

### October 2026
- **New app icon: a gold hub with four coloured reaches, on white (2026-10-06)** — [scripts/generate-app-icons.mjs](scripts/generate-app-icons.mjs) redraws all four Expo assets from one SVG source. The old icon was a gold disc whose negative space was meant to read as a map pin and **read as a question mark** instead. A location pin also says nothing about this product that every other discovery app does not also say; the app is called *Connect*, and a hub-and-spoke is the most direct thing that word can look like.
  - **The artwork is source now, not output.** The previous icon survived only as `gidi-connect-logo.svg.bak` plus four flattened PNGs, so changing it meant redrawing it. `ART` in the generator is the single source; `assets/icon-source.svg` and the PNGs are build artefacts. Re-run the script after any edit.
  - **Two shapes that do not read as networks**, both discarded after rendering: **a regular polygon reads as a polygon** (five nodes joined into a pentagon is a pentagon; four into a square with a diagonal is a crop tool) because a closed outline becomes a shape and the shape is then what the eye names; and **straight segments between scattered nodes read as a chart**, which is the one thing a nightlife app must not look like. The hub is open by construction.
  - **Four even 90° spokes make an asterisk**, and an asterisk is a footnote mark. The spokes sit at −95°, −8°, 72° and 162° with radii varying 290–310, which is what keeps it a network rather than a symbol.
  - **Reserve a colour for the focal point.** Gold was a spoke in the first pass, and where that spoke met the gold hub ring the two fused — the arm read as the hub leaking sideways. Gold is now the hub and nothing else; the spokes take teal, rose, indigo, violet.
  - **Three outputs, three different problems, and two bite silently.** `icon.png` is full-bleed and **opaque — App Store icons may not carry an alpha channel**. `adaptive-icon.png` is scaled to 0.60 because **Android crops the outer third** of that canvas to the launcher mask. `splash-icon.png` floats on `splash.backgroundColor` at `resizeMode: contain`. Both `splash.backgroundColor` and `adaptiveIcon.backgroundColor` are now `#FFFFFF`; **if either drifts from the icon's own ground the layers stop matching**, which is how the preceding dark version lost its near-black towers against Android's flat background entirely.
  - **The test that decides an icon is the small render, not the 1024.** Everything here was checked at 120px and 60px; a dark skyline alternative looked rich at full size and turned to mush at tile size, because anything under ~28px at 1024 simply disappears. The generator takes a `{ file, size, opaque, bg, svg }` entry to emit a proof at any size, `bg` compositing a transparent layer over a colour.
  - **Icons are compiled into the native project**: a JS reload will not show it. Needs `expo prebuild` and a fresh build, and on device the old icon persists until the app is reinstalled.
- **Real events, from sources that publish them for machines (2026-10-05)** — [scripts/lagos-events-agent.js](scripts/lagos-events-agent.js), [workflow](.github/workflows/lagos-events-agent.yml) daily at 05:30 UTC. **31 real Lagos events are live**, across 6 categories, every one with a working ticket URL. `npm run events-agent` is a dry run; `events-agent:write` commits.
  - **The thing that makes this different from the three ingesters before it: every field traces to a document the source published for this purpose.** Eventbrite's public city pages and Meetup's find page emit **schema.org `Event` JSON-LD** — the same markup that puts events in Google's results. Reading it is the intended use, not a workaround. The *API* being closed since 2019 was never the only route. Nothing invents a date, price, venue or URL; a field the source omits stays null.
  - **A 403 is an answer, not an obstacle.** Measured with a self-identifying User-Agent: **tix.africa 403 (on `/discover` and on `/robots.txt`), 10times.com 403, bandsintown.com 403.** Those are skipped permanently, and this agent must never be given a browser-shaped UA, a headless browser or a stealth plugin to get past one — that is how the deleted `scrape-nigerian-events.js` was dressed, and it would poison the partnership that is the real route into a ticketing catalogue. **`robots.txt` is fetched and enforced at runtime** — a disallowed path is not crawled and a declared Crawl-delay is obeyed (allevents.in asks 30s) — so the permission is a property of the code, not of a comment that can go stale. A 403 on `robots.txt` itself is treated as a blanket disallow.
  - **`addressCountry` is too coarse for a single-city app.** The first dry run returned a Port Harcourt concert (addressRegion Rivers) and an Ogun State conference, both `NG`. `addressRegion` settles it when present — but the Ogun event *carried addressRegion "Lagos"* and told the truth only in its title, so the city deny-list runs against the title too, regardless of the region field: **the organiser's prose beats a mis-set dropdown.** Equally, `/^lagos$/` anchored dropped a genuine Lagos event whose region read "Lagos state." with a trailing full stop — match the word, not the whole field.
  - **Eventbrite serves prices already converted, in a currency you did not ask for** — USD, GBP and one NOK figure across 31 Lagos events. This is a trap because **`formatPrice` falls back to `` `₦${ticket_price_min}` `` and never reads the `currency` column**, so a null `price_info` beside `12.51` would render a ₦19,000 ticket as "₦12.51". Two defences: `price_info` always carries the currency code so the ₦ fallback is unreachable, and a number arriving with *no* currency has its numeric columns dropped as well. **No exchange rate is applied anywhere** — converting with a rate we invented is how a made-up number gets a currency symbol in front of it.
  - **Online-only events are skipped** (15 of 49 on the first run) — a webinar is not a thing to go out to. Rows land `is_verified: false` because nobody has spoken to the organiser, and `is_published: true` because a review queue nobody staffs leaves the screen empty; `is_published` remains the one-UPDATE kill switch. Categories are written to **exactly** EventsScreen's filter labels — any other string makes the chip dead on arrival — and `conference|summit|roundtable|awards` had to map to Networking, which cut the Entertainment catch-all from 17 of 36 to 8.
  - **`--retire` makes `status` mean something.** It had been permanently `'upcoming'` on every row since the table was created, which is also why `fetch-lagos-events`'s `status='upcoming'` filter was a no-op.
  - **GitHub cron is right here and was wrong for traffic.** Free-tier throttling made a six-hour-late traffic verdict *wrong*; a late event refresh is merely late, since events are announced weeks ahead. There is also nothing to port — pg_cron would mean rewriting a Node script in Deno to buy punctuality that does not matter.
  - **Still open**: `meetup` needs adding to the `event_source` enum (migration `20261006030000`) before Meetup's 3 events can be written — filing them under `'scraped'` was rejected because `source` renders as a provenance badge, and provenance is this table's main defence after the fabrications. Also unresolved as a product call: a third of the Eventbrite catalogue is church conferences and worship services, which are real Lagos events but not what a nightlife app is for.
- **Events is empty because there are no upcoming events, and that is now what it says (2026-10-05)** — [EventsScreen](apps/consumer-app/screens/EventsScreen.tsx). The `is_published` filter added on 2026-10-06 did not break the screen; it stopped the fabrications from concealing an empty calendar.
  - **The numbers: 57 event rows, 49 published — every one `source='manual'`, and the newest started 2026-06-24, over three months ago.** The only four future-dated rows are the fabricated ones (Felabration, Lagos Fashion Week, Art X Lagos, Detty December) with ticket URLs that 404, all `is_published = false`. So `published AND active AND start_date >= now()` is **0**. Nothing is misfiltered — **the supply is the gap**, and until it is filled this screen is correctly blank.
  - **`fetch-lagos-events` is a tautology with a scraper's name on it.** `fetchLagosEvents()` SELECTs from `public.events`; the handler UPSERTs that same result back into `public.events` with `ignoreDuplicates: true` and answers `source: 'live_scraping'`. **It cannot add an event.** Pull-to-refresh called it behind a "Syncing live events…" label — the last surviving member of the family of fake ingesters deleted in EVENTS-INTEGRATION.md. Client call removed; refresh now just re-reads the table, which is still worth having because a venue owner publishing on the business portal is a real way for rows to appear. **The deployed function is still live and should be deleted.**
  - **The empty state was a false promise in every clause.** It read "Pull down to refresh — events from Eventbrite and Lagos event platforms will appear here automatically": Eventbrite withdrew public event search in 2019, the Lagos-platform ingesters were fiction, and the refresh it instructed called the tautology above. **Telling someone to pull down to fix an empty screen that pulling down cannot fix is the worst version of an empty state.** Now two states, because only one of them is the user's to act on: a category filter that excluded everything says so and points at All Events (same rule as the news chips), and a genuinely empty calendar explains where events come from and does not ask for a gesture.
- **One timestamp may only speak for one source (2026-10-05)** — `trafficHeader()` in [lib/traffic.ts](apps/consumer-app/lib/traffic.ts), used by both [TrafficScreen](apps/consumer-app/screens/TrafficScreen.tsx) and [TrafficAlert](apps/consumer-app/components/TrafficAlert.tsx). The report was "traffic shows 8mins but the areas show 11hours ago", and **both numbers were correct** — which is what made the header wrong.
  - **Both surfaces computed `Math.max(liveAt, newestAt)`** and TrafficAlert's comment stated the intent outright: *"the header shows the age of whichever signal is newest; the dot means at least one of them is current."* That is the least useful summary available. The live corridors refresh every 15 min via pg_cron; **Lagos Traffic Radio stops posting overnight**, so at 03:00 Lagos the newest report was genuinely 11.4 h old while the corridors were 9 minutes old. The header printed "9m ago" under a lit live dot above rows each reading "11h ago".
  - **This is rule 2 of that file failing a second time through a different door.** September removed a header showing the client's last *fetch* over a twenty-hour-old report; a `max()` across two sources tells the same lie with a real timestamp. Added as rule 3 in the file's own header so the next person reaches for it before inventing a third variant.
  - **The header's age now dates whatever the verdict was computed from**, and both are decided in one function so they cannot drift — the verdict already preferred the live corridors while the age beside it did not. Live wins when any corridor carries a severity; a failed reading contributes to neither. The dot uses each source's own standard of late (`LIVE_STALE_MS` 6 h vs `FRESH_WINDOW_MS` 4 h).
  - **Per-block ages were left exactly as they were.** "Right now" states "via Google · 9m ago", every radio row states its own age, and "Reported earlier" carries "Over four hours old — the road may have cleared since." Nothing below the header was lying, and the file's own principle is that severity and age are stated twice, not four ways.
  - **Not changed, worth a decision: `LOOKBACK_MS` is 12 h.** At 3am that reaches back across the whole evening, which is why an 11-hour-old report is on screen at all. Tightening it would empty the radio half overnight and leave only live corridors — which the design says is acceptable ("verified with the radio quiet for 17h: the band still reads correctly from live data alone"). It is a product call, not a bug: the reports are clearly labelled and are the only source that explains *why* a road is bad.
- **Gidi News is a 24-hour feed (2026-10-05)** — [NewsScreen](apps/consumer-app/screens/NewsScreen.tsx) `MAX_AGE_HOURS` 168 → 24. The report was "the news has very stale news"; the scraper was not the problem.
  - **The ingest is healthy — 80–120 rows a day, every day, with 49 stories published inside the last 24 hours.** The window was the whole fault: of the **99** stories a seven-day window surfaced, **23 were from the last 24 hours**. Sorted newest-first, that put roughly five in six rows of the feed in the past, piling the staleness exactly where a scrolling reader lands.
  - **The comment defending the wide window was measurably wrong.** It read "wider window so niche chips (tech/food/sports) have content" — but **nightlife, food & drink and sport had no story in seven days**, so reaching back a week bought those chips nothing and cost every other chip its freshness. **The fix for a thin chip is deriving the chip list from the data, not reaching further back in time**, which is the rule Explore and Discover already follow. Chips now come from what actually loaded, and a refresh that retires the selected chip resets to All — otherwise the screen sits on an empty list with no chip visibly active.
  - **The screen also needed `useFocusEffect`.** It fetched on mount and on an hourly interval, and stays mounted in the navigator, so re-entering News could show a feed loaded an hour ago — stale on its own terms, and far more visible against a 24-hour window. Refetch on focus past 5 minutes, as a *refresh* so the stories stay on screen behind the spinner rather than being blanked by the full-screen loader.
  - **Search is deliberately left unwindowed** ([lib/search.ts](apps/consumer-app/lib/search.ts)): typing a subject should reach the archive, and every result row is dated. The `newsId` deep link was already built for a story outside the feed window — it falls back to a single-row fetch — and that path simply gets used more often now.
  - **`publish_date` is the publisher's timestamp, and the median scrape lag is 6.1 hours**, so a story is usually already several hours old when it lands. One consequence: the **BREAKING rail (< 3 h) is usually empty** — only 7 of 23 rows were scraped within 3 h of publishing, and 0 qualified at the time of the change. Left alone rather than widened, since the rail correctly hides when empty, but a "Breaking" section that almost never fires is worth revisiting as a product call, not a constant.
- **Live traffic readings moved from GitHub cron to pg_cron (2026-10-05)** — migration `20261006010000`, [supabase/functions/live-traffic](supabase/functions/live-traffic/index.ts). The ask was "can we get updates every 5 minutes"; the answer is that cadence was never the number in the cron.
  - **GitHub was delivering a fifth of what it was asked for, and the readings table proves it.** Over 17.6 days: scheduled **12 runs/day**, delivered **4.7**, average gap **5.2 hours**, worst gap **9.1 hours**. Free-tier scheduled workflows are throttled under load, so `'*/5 * * * *'` would have produced the same 5 hours. The workflow's own header had already written down the fix — "move it to pg_cron + an edge function; that is the fix, not a tighter cron" — so this is that, at a real 15-minute interval.
  - **15 minutes, not 5, on purpose.** The app shows a verdict, not a minute count (product call, 2026-09-17), and a 15 km corridor's verdict does not change inside five minutes. 5 min is 8 × 288 = **2,304 Compute Routes calls/day** versus **768** at 15 min, to redraw the same two words. **The signal that actually moves on a five-minute timescale is incidents** — a crash, a closure, a flood — which is the TomTom half, still not started.
  - **`lagos-corridors.js` now lives in `supabase/functions/_shared/`**, because it has three consumers across two runtimes (two Node scripts, one Deno function) and Deno can only import from inside the functions directory once deployed. It was already runtime-agnostic — plain ESM, `fetch` and `Date` only — and **must stay that way**: no `require`, no `process`, no `node:` imports, no Deno globals. Duplicating the list is still the thing to never do, since `route_key` is the UPSERT identity *and* the baseline/readings join key.
  - **The GitHub workflow is kept but unscheduled.** Two jobs on one quota would double-count, but `node scripts/live-traffic-agent.js` with no flags is still the fastest dry-run health check for the API key and quota, and `workflow_dispatch` is the fallback if pg_net or the function is down.
  - **`Number('') === 0`, which made the baseline workflow's monthly schedule a trap.** It interpolates `--limit "${{ inputs.limit }}"` and a `schedule` trigger supplies no inputs, so uncommenting that schedule would have passed an empty string, fetched **nothing**, and reported success. The script now refuses a non-positive limit and the workflow has an explicit `|| '1400'` fallback.
  - **Secrets**: the function needs `GOOGLE_MAPS_API_KEY` and a new arbitrary `TRAFFIC_CRON_SECRET` set via `supabase secrets set`, and the *same* cron secret in Vault under `traffic_cron_secret` — the cron command reads it from Vault at call time so it is never stored in `cron.job.command` in plaintext. Deployed `--no-verify-jwt` because pg_net mints no token; the header check is what gates it, and it is checked before anything billable happens.
  - **Still the gating problem: the baseline is 23 of 1,344 rows, covering 1 of 8 corridors.** Seven corridors render severity and omit the comparison, so "worse than usual" is live on one road. Fifteen-minute readings of "no comparison available" are still no comparison — run the baseline agent with `limit` 1400 before expecting the feature to look finished.
- **The social section has a privacy model now (2026-10-03)** — full shape in [SOCIAL.md](SOCIAL.md), schema in migration `20261003220000`. The trigger for this was "people can see posts from other people even if they aren't friends", and the feed was indeed an unfiltered global pool — but the feed was the symptom.
  - **`social_posts` had one SELECT policy: `USING (true)`, granted to `public`, which includes `anon`.** Every post was readable by anyone holding the publishable key, signed in or not. Three protections were therefore decorative, all for the same reason: **a client-side filter is not a privacy boundary.** `is_hidden` was **not referenced anywhere in the consumer app**, so `moderation_triage`'s auto-hide left posts rendering (a Play UGC exposure on its own); blocking was a `Set` filter applied *after* the rows crossed the wire; and there was no account privacy or post audience at all. All three now live in RLS.
  - **Instagram's model, not Threads'** — and the useful part of Instagram here is the *privacy primitive*, not the feed. Threads is recommendation-first: the ranking is the product, it needs huge content volume, and it de-emphasises the follow graph, which is the opposite of what was wanted. Public by default stays, because **this is a discovery product and a follows-only feed shows a new account a blank screen.**
  - **The data decided this, and it is worth re-reading before any change here: 11 profiles, 9 posts (0 in the last 30 days), 3 follow edges from 1 account, 0 mutual follows.** A friends-only feed would be empty for ten of eleven users. Hence two lanes — **Following** (follows + joined communities + own posts) and **Discover** (the open pool) — with `pickLane()` landing on Discover below 3 Following posts, once, and never over an explicit choice.
  - **A mutual follow is derived, not stored. Do not add a `friendships` table.** `is_mutual(a,b)` is both directions accepted — one index lookup. A symmetric table would need its own request/accept state and two rows kept consistent to answer a question already available. Mutuals earn elevated rights (ranking, the `mutuals` post audience labelled "Friends"), not the base feed.
  - **`follows.status` is set by a `BEFORE INSERT` trigger, never by the client** — otherwise a client posts `{status:'accepted'}` at a private account and walks in. Only the followed account may approve; declining is a `DELETE` (which also fixed the fact that a private account previously had no way to decline, because only the *follower* could delete).
  - **Two triggers silently disagreed with `pending`**: `update_follow_counts` fired on INSERT/DELETE only and ignored status, so a request would have inflated the target's follower count on arrival and approving it would have changed nothing. It now fires on `UPDATE OF status` too and counts accepted only. **Never `COUNT(*)` the `follows` table for a follower total** — three call sites were doing exactly that and now read the cached `profiles.follower_count`.
  - **`post as unknown as EditingPost` was quietly dropping the audience.** The screen's `Post` had no `visibility`, so editing a Friends-only post and saving would widen it to Everyone. Built field-by-field now. Blind casts across a type boundary hide exactly this.
  - **The realtime handler needed refs, not deps.** Its effect depends only on `currentUserId`, so a closure over `lane` freezes it at subscribe time — and adding `lane`/`followingIds` to the deps would tear the channel down on every lane change and every follow. Without the filter, Following quietly reintroduced the strangers it exists to remove.
  - **Still open**: `follows` SELECT is deliberately left permissive (restricting it breaks the People tab's mutual detection, and Instagram also exposes counts for private accounts); **stories/vibes have no audience model at all** and account privacy does not gate them — that is the next hole; community posts are not gated by membership (pre-existing).
- **Posting a video vibe failed on a base64 round-trip (2026-10-03)** — [lib/uploadFile.ts](apps/consumer-app/lib/uploadFile.ts) replaces it with `FileSystem.uploadAsync` streaming straight to the Storage REST endpoint. The old path did `readAsStringAsync(base64)` → `atob` → byte-by-byte `Uint8Array`, holding **three copies of the file in the JS heap at once** — and the middle one is the expensive surprise: `atob` returns a string containing bytes above 0x7F, so Hermes cannot keep it as Latin-1 and stores it as UTF-16 at two bytes per character. Peak heap ≈ 4.3× the file plus a one-iteration-per-byte loop on the JS thread. Survivable for a 2 MB photo, fatal for a 40 MB video. **supabase-js has no streaming upload path**, hence the direct endpoint. Two latent bugs fell out on the way: `` `image/${ext}` `` produced **`image/jpg`**, which is not a real MIME type and is not in the bucket's allowlist (`image/jpeg` is), and `uri.split('.').pop()` returns the **entire string** when there is no dot, so the `|| 'mp4'` fallback could never fire. Size and format are now checked off a `stat` before anything uploads, because the server rejects only *after* the bytes are sent — two minutes of Lagos mobile data for a cryptic error. `CreatePostModal.tsx` still has the same base64 pattern for its single image.
- **The app builds and installs on a physical iPhone again (2026-10-03)**, on a free/personal Apple team. Four unrelated blockers were stacked; each needed a different fix, and the durable ones live in [plugins/withIosBuildPatches.js](apps/consumer-app/plugins/withIosBuildPatches.js) because **`ios/` is gitignored and CNG-regenerated** — `expo prebuild --clean` wipes the Podfile, re-downloads pods and rewrites entitlements, so nothing hand-edited under `ios/` survives. The Podfile's `post_install` hook is the right seam: it runs after Expo has written every file, before Xcode reads them.
  - **`NVPBNA3JJC` is the personal team ("Oluwafemi Moritiwon"). Do not "correct" it.** `security find-identity` shows `Apple Development: femi.moritiwon@gmail.com (AS5ZWZBSJ9)` — **`AS5ZWZBSJ9` is a per-developer identifier inside the certificate's name, not a team ID.** Switching `DEVELOPMENT_TEAM` to it produces `error: No Account for Team "AS5ZWZBSJ9"` and sends you chasing a phantom Xcode sign-in problem. The decisive evidence is the profile Xcode itself generates in `~/Library/Developer/Xcode/UserData/Provisioning Profiles/` (**not** the legacy `~/Library/MobileDevice/Provisioning Profiles/`, which no longer exists on Xcode 26 — checking only the old path makes it look like no profile was ever created): decode it with `security cms -D -i <uuid>.mobileprovision` and read `TeamIdentifier`. `appleTeamId` now lives in `app.json` so prebuild stops depending on whatever Xcode last wrote into the pbxproj.
  - **fmt 11.0.2 does not compile under Apple clang 21 / Xcode 26** — 5 errors in `format-inl.h`, "call to consteval function … is not a constant expression". React Native 0.81.5 vendors it via `third-party-podspecs/fmt.podspec`, so it is not independently pinnable. Two dead ends worth not repeating: **`-DFMT_USE_CONSTEVAL=0` cannot work** (base.h `#define`s it itself with no `#ifndef` guard — the compiler reports "macro redefined" and the build still fails), and **a version-guarded patch also fails** because excluding the `__cpp_consteval` branch falls through to `FMT_CLANG_VERSION >= 1101`, which sets it back to 1. Only an unconditional edit of that branch works. Disables compile-time format-string checking only; runtime is unchanged and nothing here writes fmt format strings — it arrives under RCT-Folly. Remove when RN ships an fmt that handles clang 21.
  - **Personal teams cannot provision Push Notifications at all** ("Personal development teams … do not support the Push Notifications capability"), and `expo-notifications` adds `aps-environment` unconditionally. **Removing it from `app.json`'s `plugins` does nothing** — the package ships an `app.plugin.js` at its root and is applied automatically regardless. A `withEntitlementsPlist` mod also fails: it runs *before* expo-notifications' own mod, so there is nothing to strip yet (verified by instrumenting the mod and watching it see an empty plist). Stripping the finished file in `post_install` works. Costs nothing today — push is unwired (`push_tokens` empty, no FCM V1 credentials) — but **must be reverted, and signing moved to a paid Apple Developer Program team, before push ships**.
  - **Builds expire after 7 days** on a personal team; rebuilding refreshes the profile. After install, iOS needs a one-time **Settings → General → VPN & Device Management → Trust** before the app will launch, otherwise `devicectl … process launch` fails with `FBSOpenApplicationErrorDomain error 3`.
  - **This Bash tool's shell does not load the user's profile**: `node`, `npx` and `gh` are all absent from `PATH`, and the missing locale makes CocoaPods die inside Ruby with `Unicode Normalization not appropriate for ASCII-8BIT`. Prefix native/iOS commands with `PATH="/opt/homebrew/bin:$HOME/.nvm/versions/node/v20.20.0/bin:$PATH" LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`.
  - **CLI `xcodebuild` and Xcode's GUI do not share signing state.** Before the team ID was corrected, the GUI could sign while `xcodebuild` reported `No Account for Team`; the useful diagnostic was that the GUI reached *compilation* (surfacing the fmt errors) while the CLI failed during planning. To isolate "does the code compile" from "can it be signed", build with `CODE_SIGNING_ALLOWED=NO`, or build a single pod target directly (`-project Pods/Pods.xcodeproj -target fmt`) — library targets are not signed.

### September 2026
- **Traffic says "worse than usual", not a minute count (2026-09-18)**: the live rows led with `99 min · normally 63 · +36 · HEAVY`. Three separate faults, only one of them wording.
  - **The baseline was a road that does not exist.** `typical_duration_seconds` held Google's `staticDuration` — the drive with *no traffic*. Apapa-Oshodi has never taken 63 minutes. So the delta was measured against a fiction, every chronically busy corridor read HEAVY at every hour of every day, and the badge stopped discriminating precisely where it mattered. The column is a misnomer and is **kept only for client compatibility** — it now carries a `COMMENT` saying so; `expected_duration_seconds` is the real baseline.
  - **The number answered a question nobody asked.** 99 min is the *end-to-end* corridor drive; almost nobody drives Apapa→Oshodi in full, so someone joining at Cele can do nothing with it. Absolute journey time is now gone from the UI entirely — **Maps and Waze do that better, for the user's actual route.** This is a standalone city view: which roads are bad, and is that news. (Explicit product call, 2026-09-17.)
  - **A real baseline exists on day one.** The Routes API accepts a **future `departureTime`** for DRIVE and returns its historical prediction — verified by probe before building, because the docs' "only past departureTime for TRANSIT" line is easy to misread as forbidding future times (a WebFetch summary did exactly that). Third Mainland, free-flow 16 min throughout: Tue 07:00 = 31 (1.90×), 11:00 = 20, 18:00 = 18, Sun 11:00 = 15. [traffic-baseline-agent.js](scripts/traffic-baseline-agent.js) builds the curve; no waiting weeks for self-collected history.
  - **Day-of-week, not weekday/weekend — the data killed the first design.** Third Mainland at 07:00: **Mon 42 · Tue 31 · Wed 29 · Thu 24 · Fri 22 · Sat 15 · Sun 14.** Monday is nearly double Friday on the same road at the same hour. One weekday bucket has to pick a middle value and would then flag every ordinary Monday commute as "much worse than usual" — the exact false alarm the baseline exists to remove. 384 rows → 1,344. Migration `20260918024621` replaces `20260918024200`'s `day_type`.
  - **Readings are kept now.** The live agent upserted on `route_key`, so every observation was destroyed an hour after it was taken — including all the history needed to rebuild the baseline from what Lagos actually does. `traffic_route_readings` appends (BRIN on `observed_at`, matching the other time-series tables).
  - **Two independent axes, both shown.** `severity` = how congested (vs free-flow); `vs_usual` = whether that is remarkable (vs this hour, this weekday). HEAVY + normal means it's bad and waiting won't help — a different decision from HEAVY + much worse. A missing baseline row omits the comparison rather than guessing.
  - **The Routes API quota is 100/day** (`ComputeRoutesRequestsPerDay`), and the live agent's hourly schedule was **192 calls/day** — it had been exceeding the cap and 429-ing through the back half of every day, masked by GitHub throttling free-tier schedules to 3–6h. Now every 2 hours (96/day). **Raising that quota in the Cloud Console is free and is the real fix**; [traffic-baseline-agent.yml](.github/workflows/traffic-baseline-agent.yml) is manual-only until it is, with the steps in its header. The baseline agent is resumable (`--limit`, skips fresh slots) so it works under any cap.
  - Routes + the Routes API call moved to [scripts/lagos-corridors.js](scripts/lagos-corridors.js): `route_key` is the UPSERT identity *and* the join key for baselines and readings, so two copies of the list could silently orphan one from the other.
  - **Each route measures ONE direction**, which is why Third Mainland peaks in the morning here (it runs *into* the island) and is nearly clear at 18:00. The evening crush is the other way and is not measured.
- **Search actually searches (2026-09-17)**: Home's search bar read "Search venues, areas…" and called `navigate('Explore')` with no params, so it did neither — an unfiltered venue list with the keyboard down, and areas unreachable from it entirely. It now opens [SearchScreen](apps/consumer-app/screens/SearchScreen.tsx), backed by [lib/search.ts](apps/consumer-app/lib/search.ts), querying venues, the 25 Lagos areas, events, Gidi News and people at once. Three rules in that file are load-bearing:
  - **The query is sanitised before it reaches PostgREST.** `.or()` parses a comma-separated filter list, so a comma the user typed splits it and silently changes which columns are searched; `%` and `*` are wildcards inside `ilike`. There is no escape syntax for the list separator, so they are stripped.
  - **Stale responses are discarded, not merged.** Four requests fire per debounced keystroke and reorder freely; a monotonic run id means the answer for "l" cannot land after the answer for "lekki" and replace it.
  - **Which field matched outranks how well it matched**: name 9–12, location 5–8, everything else 1–4. Without the split, every venue whose `location` read "Lekki" scored a perfect 4 and tied with the area *called* Lekki, so searching a place by name led with something other than that place.
  - **Group order is a product judgement, not a ranking one.** Fixed order — venues, areas, events, people, news — with one promotion rule: a group holding something actually *called* what was typed jumps to the front. Pure score ordering put a 19-day-old crime story above every bar in Lekki, because the headline contained the word and the bars only sat in the place. News results are additionally de-duped on the headline itself: `duplicate_of` only collapses what the editor agent has paired and misses cross-outlet reposts, which surfaced one machete story three times.
  - **Every result kind needed its destination taught to accept it.** Explore gained `search`; News gained `newsId` (with a single-row fetch, because search deliberately applies neither the feed's age window nor its relevance floor); Events gained `eventId`, which narrows the list to that one event behind a dismissible banner since the screen has no per-event detail view; Social gained `view` + `peopleSearch`, handed a name rather than duplicating the People tab's follow-state machinery. Groups whose screen has no free-text filter expand in place, so a header count never promises rows the user cannot reach.
  - **A param read directly in an effect that also depends on fetched data will be lost.** NewsScreen's reader silently never opened: the effect depended on `news`, so the feed arriving mid-flight ran the cleanup that cancelled the in-flight single-row fetch, and the re-run found the param already cleared. Copy the param into state first, then resolve it in a second effect. Same shape as EventsScreen's `focusId`.
  - **Maestro matches a selector against the WHOLE text of a node.** `assertVisible: "Briefed by Gidi from"` fails against a node reading "Briefed by Gidi from Legit.ng" — it needs a trailing `.*`. Separately, the accessibilityLabel added to the Home bar *overrides* its visible text, so the flow taps the label, not the words on screen. Both cost a cycle. Flow: [.maestro/search.yaml](apps/consumer-app/.maestro/search.yaml).
- **Traffic is a hybrid now (2026-09-16)**: two signals, side by side, answering different questions. `traffic_reports` (radio posts, Gemini-classified) says **why** a road is bad — but only when someone posts, which in practice is a few times a day, and the 12h window then empties. New `traffic_live_routes` (migration `20260916182436`) says **how much slower than normal, right now**, for eight curated corridors, via the Google **Routes API** (`routingPreference: TRAFFIC_AWARE`; the signal is `duration / staticDuration`). [scripts/live-traffic-agent.js](scripts/live-traffic-agent.js) overwrites the same eight rows on every run — small fixed set updated in place, which is why it is its own table and not more rows in the append-only report log. `.github/workflows/live-traffic-agent.yml` runs hourly at :30 (offset from the other two agents), reads the `GOOGLE_MAPS_API_KEY` repo secret (set 2026-09-16), and will be throttled by GitHub like the others; a late run is a late reading, never a wrong one. The app flags a reading as stale only past 6h — beyond ordinary throttling — and always prints its real age. **None of this runs on GitHub until the branch is merged to `main`**: schedules only fire from the default branch.
  - **Routes are place-name addresses, not coordinates**, and Google's geocoding resolves them. Hand-typed lat/lng is how a route silently measures the wrong road; a bad address fails loudly. All eight resolved first try. `route_key` is the UPSERT identity and must never change; `route_label` is free to reword.
  - **Live severity deliberately has no 'closed'**: a closure and gridlock are the same number to a duration ratio. Only a human-sourced report can say closed, so that stays with `traffic_reports`.
  - **This is additive by design.** The app ran on TomTom before and dropped it in June because a number without a "why" wasn't enough; re-adding a numeric vendor as a *replacement* would have repeated that. Home shows one live row (the worst corridor) above the radio hero so the band stays the size the declutter left it; [TrafficScreen](apps/consumer-app/screens/TrafficScreen.tsx) shows all eight under "Right now", then "Reported" / "Reported earlier". The verdict line summarises the live corridors when present — they are the complete picture; the radio only covers what got posted. `verdict()` now takes anything with a `severity`.
  - Verified on the simulator with the radio quiet for 17h: the band still reads correctly from live data alone, which is the whole point.
- **Venue discovery agent (2026-09-16)**: [scripts/venue-discovery-agent.js](scripts/venue-discovery-agent.js) (Google Places, dry-run by default) finds real venues per area — five of the original eleven areas held **zero** venues and "Explore the area" already read live counts, so it was purely a data gap. Two things it learned the hard way, both worth keeping: (1) **attribute a venue to its area by its own address, not by which query found it** — Lagos neighbourhoods overlap, and the first version filed Vaniti Lagos under five different areas by array order; (2) **Google's type taxonomy is open-ended** (`bar_and_grill`, `lounge_bar`, `fine_dining_restaurant`) so category mapping is ordered substring matching, with `restaurant` checked before `bar` because `barbecue_restaurant` exists. Widened `LAGOS_AREAS` to 25, all mainland except Epe — adding to the island's VI/Ikoyi/Oniru/Lagos Island cluster just produces overlap. Areas are still hand-curated; the agent now prints Google's own `addressComponents` neighbourhood for any venue matching none of our aliases, so the next widening is data-driven. **Places Text Search has a daily quota separate from billing** — three full dry runs exhausted it; a 165-venue run (later 115 after correct attribution) is waiting on reset. Discovered venues are `is_verified: false` with real photos resolved server-side so the API key never ships to a client.
- **Gidi News is read in-app now (2026-09-15)**: tapping a story used to `Linking.openURL` the publisher. [components/NewsReader.tsx](apps/consumer-app/components/NewsReader.tsx) is a page-sheet reader showing a Gidi-written headline and 3–5 sentence brief, credited "Briefed by Gidi from The Punch", with a small "Read the original" link kept deliberately — the credit should be real, not decorative. `news` gained `gidi_headline, brief, gidi_category, relevance, tags, dedupe_key, duplicate_of, curated_at` (migration `20260916002052`). [scripts/gidi-news-editor-agent.js](scripts/gidi-news-editor-agent.js) (Gemini 2.5 Flash, free tier, paced at ~13 RPM) runs after the scraper in `news-agent.yml`: marks cross-source duplicates (the same Wike story arrived from two outlets, one filed under "nightlife"), fetches the article body — **the table only ever held a 150-char snippet** — and writes the brief. The prompt forbids adding any fact the source lacks; a thin body means a shorter brief, never an invented detail. `relevance` is a 0–100 score for a going-out audience; the feed drops anything under 30, which is most of the 228 "general" and 129 "politics" rows a week. Chips use the Gidi taxonomy (`nightlife, food-drink, music, events, culture, city, traffic, business, sport, politics`); the old keyword heuristic is now only a fallback, mapped through `LEGACY_TO_GIDI`. Rows the agent has not reached show the snippet plus "Gidi's brief is on its way".
  - **The Gemini key is dead.** The first editor run returned `403: Your API key was reported as leaked` — Google's scanners found it in the public git history. The traffic and news workflows read the same key from repo secrets and will fail on their next real classification. Needs a new key at aistudio.google.com set in `.env` and repo secrets. The `service_role` key sits in the same history.
- **Traffic rows got visual weight (2026-09-15)**: [TrafficRow](apps/consumer-app/components/TrafficRow.tsx) carries severity three ways that each add something — an icon for the *kind* of problem (a closure is not congestion), a five-segment meter for *how much*, the word for a screen reader — over a faint wash of the same tone, so a stack of heavy routes reads red before it is read. The worst route on Home is a `hero` variant. Rows enter with a one-shot stagger; the only loop is [LiveDot](apps/consumer-app/components/LiveDot.tsx), mounted solely while a report is inside the freshness window. **Rows no longer open the source** — the summaries are already Gemini-written for Gidi, and the prompt now says so explicitly (speak to a driver deciding whether to leave; Lagos names as locals say them; never pad a thin post). Attribution is one line at the foot. The verdict now uses the same word as the row ("1 gridlock", not "1 heavy" above a card reading GRIDLOCK).
- **Maestro and the floating tab bar**: an element whose bounds are on-screen but under the tab bar counts as *visible* to Maestro, so `scrollUntilVisible` stops early and the centre-tap is absorbed by the bar. The tap reports COMPLETED and nothing navigates. Fix is `centerElement: true` on `scrollUntilVisible`, or a plain `scroll` first for the Home tiles. Cost two debug cycles before it was obvious.
- **Migration naming, again**: MCP `apply_migration` records its own version. Three files this session were committed under hand-written timestamps and had to be `git mv`'d to `20260915132655`, `20260915133207`, `20260916002052`. **Run `list_migrations` immediately after applying and name the file from that**, not from the clock.
- **Home declutter (2026-09-15)**: Home was carrying nine bands with three redundancies — search appeared twice (a header icon and a bar forty pixels below it, both navigating to `Explore` with no params), the category grid duplicated the tab bar for Events and Social, and "Explore the area" and Vibe Check were the same feature twice. It is now six: header → greeting → stories → search → area row → **six** category tiles → traffic → trending. Also gone: a gold header dot that pulsed permanently without standing for anything, and an eyebrow hardcoded to "Tonight in Lagos" that read that way at 9am above the words "Tuesday Morning".
  - **Vibe Check moved into [ExploreAreaScreen](apps/consumer-app/screens/ExploreAreaScreen.tsx)** and the component is deleted. The app had held **two disagreeing hardcoded Lagos-area lists**: VibeCheck's ten areas with alias matching and real counts, and ExploreArea's six with bare emoji and Unsplash photos of generic skylines. Both are replaced by [lib/areas.ts](apps/consumer-app/lib/areas.ts). **Neither list contained Oniru**, whose 3 venues were unreachable by area browsing entirely.
  - **`matchArea` returns one area, not many.** The old matcher incremented a counter for *every* area whose alias substring-matched, so one venue could be counted repeatedly — the root cause of the Victoria Island / Lagos Island double count. Matching now scans aliases longest-first and returns a single winner, which makes that bug shape structurally impossible instead of something alias curation has to keep catching.
  - **The ladder stays venue-count based and says so.** Wiring it to `venue_check_ins` is the obvious upgrade but that table holds 5 rows total and 0 in the last 24h — every area would read Chill. The explainer sheet states the basis outright.
- **Traffic rebuilt (2026-09-15)**: was a horizontal rail of ten equal-weight cards ordered newest-first, under a pulsing green dot and an "Updated HH:MM" that was the client's last *fetch* while the report beneath it could be twenty hours old. Now [lib/traffic.ts](apps/consumer-app/lib/traffic.ts) + [TrafficRow](apps/consumer-app/components/TrafficRow.tsx) + a preview on Home + a full [TrafficScreen](apps/consumer-app/screens/TrafficScreen.tsx). **Severity outranks recency**; freshness is measured from `source_published_at` and reports past a 4h window are split into an "Earlier" group rather than mixed in; severity is stated twice (coloured rail + word) instead of four ways; the live dot is lit or absent, never pulsing.
  - **The real limit is data cadence, not design.** `traffic-agent.yml` is named "Every Hour" and scheduled hourly, but GitHub actually fires it every 3–6 hours (free-tier scheduled workflows are throttled under load — every run succeeds, they just don't run on time). So the honest "nothing reported in the last few hours" note shows often. Fixing it means moving the scrape to pg_cron + an edge function, not widening the window.
- **The custom tab bar filtered on a hardcoded name list** ([App.tsx](apps/consumer-app/App.tsx)) — adding the Traffic route put a sixth tab in the bar and squeezed labels until "Explore" wrapped onto two lines, with nothing in the new screen's code to hint why. It now filters on `options.tabBarButton === undefined`, so a route declaring `tabBarButton: () => null` hides itself. **Tab buttons and the Home area row were also missing `accessibilityLabel`** and announced only "button".
- **Light-theme palette collision**: `warning` and `primary` are both `#A16207`, so the Electric and Buzzing ladder steps rendered identically. The ladder now separates by hue family (gold → rose → blue → grey) rather than by neighbouring shades. **Note contrast ratio does not measure this** — it compares luminance, and every amber candidate scored ~1.0 against the gold while looking obviously different.
- **Visual verification loop (2026-09-15)**: the app can now be driven on a simulator and reviewed as pixels rather than inferred from stylesheets. `xcrun simctl io booted screenshot` captures; **Maestro** (`~/.maestro/bin`, needs `JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home`) taps, scrolls and types. Flows live in [apps/consumer-app/.maestro/](apps/consumer-app/.maestro/) with usage notes. **This immediately paid for itself**: it caught two defects invisible in code — the light-theme gold had been overcorrected to `#7A5200`, which rendered brown and clashed with the brand gold still used on dark surfaces (now `#A16207`, 4.6:1 on paper, passes AA body), and `LAGOS_AREAS` gave Lagos Island a bare `'Island'` alias which, against a substring matcher, swallowed every Victoria Island venue and reported both areas as 14.
  - **Disk discipline**: each iOS simulator runtime is ~8 GB and three were installed, which had taken free space down to 9.4 GB. Keep one. `xcrun simctl runtime list -v` shows real sizes; `du` on the mount path double-counts and reports ~16 GB each.
- **Design tokens (2026-09-15)**: [apps/consumer-app/theme/tokens.ts](apps/consumer-app/theme/tokens.ts) is now the single source for type, space, radius, elevation and colour. It replaced 22 distinct font sizes (nine between 9 and 17px), 30 corner radii and 46 hardcoded hex values. **Compose new styles from the tokens; don't invent a number.** `useTheme()` returns `{ colors, t }` where `t` holds the scales; the old palette keys (`cardBackground`, `border`, `textSecondary`) survive as aliases so unmigrated screens keep working. Neutrals are warm, biased toward the gold, rather than the stock Tailwind ramp they were before. **Light-theme gold is `#7A5200`, not the brand `#EAB308`** — the brand gold measures ~1.9:1 on white and fails contrast outright. Home and TrendingVenues are migrated; Explore, Events, Social, Profile, Discover and News are not yet. Category tiles and trending venue cards share `tile.widthFor()` / `tile.height` so the two rows stay the same size. **A dark default was trialled and rolled back** — light is the preferred look for this product; the toggle still offers dark.
- **Audit + fixes (2026-09-15)**: full report artifact `Gidi Connect Teardown` (revised). Consumer-app audit traced every control to its handler and cross-checked each feature against live data. Fourteen findings fixed:
  - **`increment_user_stat` was a real security hole** — `SECURITY DEFINER`, no caller check, arbitrary target user, arbitrary XP, arbitrary column name, reachable by `anon`. Migrations `20260915032851` + `20260915032951` add an `auth.uid()` guard (service_role exempt), allowlist the seven real counters, clamp the award, and revoke EXECUTE **from PUBLIC** — revoking from `anon` alone is a no-op because `anon` inherits the default PUBLIC grant. Verified: an authenticated caller attempting 999999 XP against another account leaves it at zero.
  - **Four fabricated data sources removed**: Discover's three fictional friends (now reads real check-ins by accounts you follow), Explore's `FALLBACK_VENUES` with synthetic ids (the last copy of the bug removed from TrendingVenues in May), VibeCheck's invented area counts, and `communities.member_count` seeded with ~9,800 members against 5 real (migration `20260915033205`; the sync trigger already existed and was correct, the column just started wrong).
  - **Misleading surfaces corrected**: VibeCheck's `LIVE` badge sat over a static venue count that reads no check-ins — badge removed, "N venues active" → "N venues", and the six areas with zero venues no longer render. Discover's twelve experience/collection tiles passed pseudo-categories into a name/location/description search and all dead-ended — removed until venues carry tags (1 of 33 does).
  - **Category lists are now derived from the data** in both Explore and Discover, so `Hotel` (never had a venue) stops appearing and `Event Center` (has one) stops being unreachable.
  - **Dead controls**: Home's header search icon had no handler; Social's bell had an empty handler plus a permanently-lit unread pip (replaced with the real `NotificationsBell`); the guest bell claimed to nudge sign-in and didn't.
- **Correction worth remembering**: badges are **not** unwired. `increment_user_stat` calls `check_and_award_badges` on every increment. Zero badges exist because all six `user_stats` rows are zero — the posts/likes/comments predate the stat wiring. Same shape as `notifications`, whose five triggers are correct but have never fired for the same reason. **Neither is broken; both are untested in production.**
- **Known data-quality gaps**: `venues.price_range` holds two incompatible schemes (21 rows use `₦`/`₦₦`/`₦₦₦`, 12 use `Moderate`/`Premium`/`Ultra Premium`), and the `₦` glyph renders as a struck-through `N` on iOS — visible on the Explore venue cards. One venue has a full street address in `location`, which breaks area matching.
- **Tests + CI (2026-09-14)**: `.github/workflows/ci.yml` runs typecheck → vitest → build for both portals, `tsc` + `expo-doctor` for the consumer app, validates every `apps/*/vercel.json` against Vercel's schema (an unknown key like the `comment` that broke deploys in August now fails the build), and fails if any `.env` is tracked. Regression tests cover the auth contexts (the spinner must always settle: stalled fetch, rejected refresh, missing profile) and `withTimeout`. Run locally with `npm test` in either portal. Root cause of the infinite-spinner incidents: `supabase-js` has no default request timeout, so every auth-context request is wrapped in `withTimeout` (8 s) with a 12 s last-resort guard that clears both spinner flags.
- **Observability (2026-09-14)**: Sentry on all three surfaces, **inert until a DSN is set** — with no DSN there are no network calls, no behaviour change, and CI needs no secrets.
  - **Portals**: `src/lib/sentry.ts` exports `initSentry` (called first thing in `main.tsx`), `identifyUser` (auth contexts tag events with user id + role, never email) and `reportRenderError` (ErrorBoundary ships render crashes and shows a `Reference:` event id the user can quote). `vite.config.ts` stamps `VITE_APP_RELEASE` = `<app>@<short sha>` and `VITE_APP_ENV` = Vercel env at build time. Source maps are emitted (`hidden`) and uploaded only when `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` are all set on the Vercel project.
  - **Consumer app**: `lib/sentry.ts`; `initSentry()` + `withSentryRoot(App)` in `index.ts`; React Navigation breadcrumbs via `navigationIntegration.registerNavigationContainer` in `App.tsx`; `identifyUser` on every auth change; `metro.config.js` uses `getSentryExpoConfig` so bundles carry Debug IDs. **The `@sentry/react-native` Expo config plugin is deliberately NOT in `app.json`**: its Xcode/Gradle upload phases exit non-zero on every build that lacks `SENTRY_AUTH_TOKEN` (see `scripts/sentry-xcode.sh` in the package), which would break EAS and local builds. Add `["@sentry/react-native/expo", { organization, project }]` plus an EAS secret `SENTRY_AUTH_TOKEN` only when native symbolication is wanted.
  - **Uptime**: `.github/workflows/uptime.yml` probes admin, business, www, the apex → www redirect and Supabase every 15 min. Each probe gets 3 attempts 20 s apart before counting as down; a Vercel bot challenge is logged as inconclusive, not downtime (August lesson: aggressive polling triggers it). Failures open one GitHub issue labelled `uptime`, comment on it while the outage lasts and close it on recovery. `workflow_dispatch` with `simulate_failure` exercises the alert path end to end. GitHub disables scheduled workflows after 60 days without a push; any commit re-arms it.

### August 2026
- **Play Store launch sprint (2026-08-10 session)**: live audit found 5 P0 blockers (full report artifact: launch-readiness). Shipped same-session:
  - **Report + block flows (Play UGC policy)**: migration `20260811021308_report_block.sql` adds `post_reports` (reasons spam/harassment/inappropriate/other, statuses pending/reviewed/actioned/dismissed, `UNIQUE NULLS NOT DISTINCT (post_id, comment_id, reporter_id)`) and `blocked_users` (PK blocker/blocked). Consumer UI: ellipsis menu on others' posts → Report/Block; long-press others' comments; block button on the People-tab profile modal. Blocking unfollows (own direction only, RLS) and client-filters feed/comments/People via `blockedIds` Set. `post_reports` is the trigger surface the `moderation_triage` agent has been waiting on (AI_AGENTS_PLAN §5.1).
  - **Landing site** `apps/landing/` — static privacy/terms/delete-account pages + minimal index for apex `gidiconnect.com`; deploy as third Vercel project (root `apps/landing`). Play needs the privacy URL + web deletion page. In-app links now point at `gidiconnect.com` (was unregistered `gidivibeconnect.com`).
  - **Migration history reconciled 67/67**: MCP-applied migrations get auto-generated versions — local files renamed to match remote, 3 July advisor-cleanup migrations recovered from `supabase_migrations.schema_migrations` into the repo. **Convention: after `apply_migration` via MCP, always export a local file named with the remote-recorded version.**
  - **App renamed** "Connect" → "Gidi Connect" (app.json). Profile version row reads `expo-application`. Dead `alert()` branch removed from HomeScreen.
  - **Android testing**: QR scan fails on device (custom-scheme links); use dev client → "Enter URL manually" → `http://<mac-ip>:8081`. Mac has no Android toolchain — all builds via EAS cloud.
- **Still open for launch** (external/dashboard): SMTP config, leaked-password protection + OTP expiry, Postgres security patches, FCM V1 credentials for push (`push_tokens` empty until then), Vercel project + DNS for apex, seed content (8 users/9 posts/4 events), Play Console listing (expect Mature 17+ rating; declare UGC; reviewer test account).

### June 2026
- **Launch-sprint P0 cleanup (2026-06-11 session)**:
  - **TomTom replaced with Lagos Traffic Radio + Gemini Flash** (free tier). `scripts/lagos-traffic-agent.js` scrapes the 96.1FM listing, classifies posts via `gemini-2.5-flash` with `responseSchema` for structured JSON, writes to `traffic_reports` via service role. `.github/workflows/traffic-agent.yml` runs hourly at `:15`. Repo secrets needed: `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. The TomTom client + hardcoded fallback key are gone.
  - **Traffic display model: "latest per route from last 24h"** instead of strict `expires_at > NOW()`. `TrafficAlert.tsx` queries `scraped_at > NOW() - 24h`, dedups client-side by `route_label`, keeps newest. Rationale: source posts often sit unchanged for hours; the 2h TTL gate was emptying the feed prematurely. The agent's `expires_at` writes still happen but no consumer query reads them anymore.
  - **Stories: singleton `StoryCreatorContext`** at app root owns the picker → `StoryEditor` → upload pipeline. Both Home's "My Vibe" tile and Profile's "New Vibe" button funnel through `useStoryCreator().open({ onCreated? })`. `StorySection` got `useFocusEffect` so Profile-created vibes show up on Home immediately. Same singleton pattern as `CreatePostModalContext` (which kills the stacked-modal class of bugs by mounting once).
  - **Image picker**: in-app crop is iOS-only (`Platform.OS === 'ios' && { allowsEditing: true, aspect: [4,3] }`). Android Samsung crop UI ships without a visible confirm button on some phones, stranding users.
  - **News codified**: migration `20260610000000_codify_news_table.sql` codified the `news` table that existed in prod but had no migration (and the news agent scripts + consumer screens both depended on it). Plus `20260610000001_news_advisor_cleanup.sql` drops the duplicate `news_publish_date_idx` index and the pre-existing `USING TRUE` policies that bypassed admin gates.
  - **Home redesign**: removed the inline "LIVE - GIDI News" rail (the Gidi News quick-action card already routes to the News screen — the rail was duplicate surface area). Removed ~370 lines: news fetch + dedup + categorize pipeline, weserv image proxy, all `news-*` styles. Home is now Header → Stories → Categories grid → Traffic → Vibe Check → Trending Venues.
  - **Role-assignment trigger gap closed (P0 #1.8)**: migration `20260611000000_role_assignment_insert_trigger.sql` widens `trg_handle_business_role_assignment` to `AFTER INSERT OR UPDATE OF role` and derives `prev_role` via `TG_OP` so the INSERT path treats it as `NULL → NEW.role`. Includes idempotent backfill for any existing Business Owner/Admin/Super Admin missing their role-specific row (1 Business Owner was caught in prod).
  - **pg_cron codified (P0 #1.9)**: migration `20260611000001_codify_cron_jobs.sql` codifies `refresh-trending-venues` (every 10min) and `cleanup-expired-stories` (daily 03:00 UTC) idempotently. Both jobs were previously only dashboard-set and would have vanished on a project restore.
  - **`venue_analytics` pipeline lit up (P0 #1.10)**: migration `20260611000002_venue_analytics_tracking.sql` adds `UNIQUE(venue_id, date)` and a `track_venue_event(p_venue_id, p_event_type)` `SECURITY DEFINER` RPC that does atomic daily-counter upserts. Client wrapper at [apps/consumer-app/lib/analytics.ts](apps/consumer-app/lib/analytics.ts) fires-and-forgets. Wired into `ExploreScreen.VenueDetailModal` for `profile_views` / `phone_clicks` / `website_clicks` / `direction_clicks`. `offer_views/clicks` and `event_views` columns reserved but unwired (consumer surfaces don't exist yet).
- **Production deployment**: admin and business portals are live on Vercel at `https://admin.gidiconnect.com` and `https://business.gidiconnect.com`. Each is its own Vercel project (root directory `apps/admin-portal` / `apps/business-portal`), auto-deploys on push to `main`. Apex `gidiconnect.com` is registered but not pointed at a landing page yet.
- **Domain + DNS**: `gidiconnect.com` registered through Cloudflare Registrar (cheapest, at-cost). Cloudflare hosts DNS with two CNAME records (`admin` and `business`) pointing at per-project Vercel targets like `XXXX.vercel-dns-017.com`. **Both records must stay "DNS only" (gray cloud)** — proxying through Cloudflare's orange cloud causes redirect loops / 525 errors with Vercel's SSL. Vercel handles SSL certs itself.
- **SPA rewrites**: `apps/admin-portal/vercel.json` and `apps/business-portal/vercel.json` rewrite all paths to `/index.html` so React Router deep links don't 404 on Vercel.
- **Device-adaptable portals**: admin & business sidebars now slide in as a drawer on `< 768px` with a hamburger button in the header, backdrop overlay, and auto-close on route change. Topbars flex — search shrinks instead of overflowing 380px fixed, non-essential pills hide at narrow breakpoints, business user-chip collapses to just the avatar on mobile. Data tables in UserManager, VenueManager, Venues, and Analytics are wrapped in horizontal-scroll containers (`.ap-table-wrap` / `.bp2-table-wrap`). Main-content padding is responsive via `.ap-main` / `.bp2-main`.
- **Supabase redirect URLs**: production subdomain URLs (`https://admin.gidiconnect.com/**`, `https://business.gidiconnect.com/**`) added to Supabase Auth → URL Configuration so sign-in flows work in production. Localhost entries kept for dev.
- **`ui_kits/` consolidation**: three design-reference kits (polished_consumer, polished_business, polished_admin) consolidated into a single `ui_kits/` at the repo root. Removed macOS-collision duplicates (`apps/ui_kits/`, `apps/ui_kits 2/`, `apps/ui_kits 3/`). These are JSX reference designs, not imported by app code.
- **Agent infrastructure shipped**: migration `20260608000000_agent_infra.sql` adds `agent_runs` (append-only audit log, BRIN-indexed on `created_at`), `agent_memory` (per-scope facts, unique on `agent_name + scope_type + scope_id + key`), `agent_proposals` (review queue for irreversible actions), and `feature_flags` (runtime kill switches + cost cap). Also adds `is_hidden`/`hidden_reason`/`hidden_at` columns on `social_posts` for soft-hide. Admin-only RLS reads; service role writes. See [AI_AGENTS_PLAN.md §2](AI_AGENTS_PLAN.md) for the full status block.
- **agent-runner edge function**: single entry point for every Claude-as-admin invocation. Reads kill-switch + cost-cap from `feature_flags` (`agents.master_enabled`, `agents.daily_cost_cap_usd`, per-agent `agents.<name>` flags), opens an `agent_runs` row, loops `messages.create` ↔ tool dispatch with prompt caching on the system prompt + tools, then closes the row with status/cost/duration/transcript. Per-agent tool allowlist enforced at dispatch.
- **Agent runtime conventions**:
  - **Action tiering by reversibility, not by agent.** Reversible writes (e.g. `hide_post`) execute autonomously and mirror into `agent_proposals` with `status='applied'` so admins see everything in one place. Irreversible/high-blast actions (`ban_user`, `delete_post`, role changes) MUST go through the `queue_proposal` tool with `status='pending'`.
  - **Adding an agent**: append a definition to [supabase/functions/_shared/agents.ts](supabase/functions/_shared/agents.ts), seed a `feature_flags` row for `agents.<name>` (off by default), then wire the trigger separately. Tool surface lives in [_shared/tools.ts](supabase/functions/_shared/tools.ts) — each handler self-gates and the runner enforces the agent's allowlist on top.
  - **Model picks** follow AI_AGENTS_PLAN §2.1: Haiku 4.5 for narrow classification, Sonnet 4.6 for single-step tool use, Opus 4.7 for multi-step planning.
  - **Cost ceiling**: `agents.daily_cost_cap_usd` (default `{cap: 5.00}`) is checked via the `agent_cost_last_24h()` SQL helper before every run; 429s when exceeded.
- **First agent: moderation_triage** (staged behind feature flag, OFF by default). Haiku 4.5; auto-hides spam at confidence ≥ 0.9 on accounts ≥ 1 day old, queues everything else for review. Enable: `UPDATE feature_flags SET enabled = TRUE WHERE key = 'agents.moderation_triage';`. Trigger (how new flagged posts invoke the runner) not yet wired — see AI_AGENTS_PLAN §5.1.
- **Open follow-ups** (not yet shipped):
  - Hardcoded localhost cross-portal links: [apps/admin-portal/src/components/layout/AdminLayout.tsx:42](apps/admin-portal/src/components/layout/AdminLayout.tsx#L42) (`http://localhost:3001`) and [apps/business-portal/src/components/layout/DashboardLayout.tsx:45](apps/business-portal/src/components/layout/DashboardLayout.tsx#L45) (`http://localhost:3002`) need to become production URLs or env vars.
  - Apex `gidiconnect.com` has no landing page yet — either redirect to business portal or build a small landing as a third Vercel project.
  - `agent-runner` deploy: `npx supabase secrets set ANTHROPIC_API_KEY=...` then `npx supabase functions deploy agent-runner --no-verify-jwt` (no-verify-jwt so cron/webhooks can invoke it).
  - Admin-portal pages for `agent_runs` (daily digest view) and `agent_proposals` (approve/reject queue) — data flows in now, UI not yet built.
  - Moderation trigger: needs a `post_reports` table (or consumer-app report flow) that fires `agent-runner` with `{agent_name: "moderation_triage", input: {post_id}}` on each new report.

### May 2026
- **Comprehensive audit shipped**: see [AUDIT.md](AUDIT.md). Identified ~60 distinct issues across the three apps (10 P0 launch blockers, 33 P1 painful gaps, 17 P2 polish items). AUDIT.md is the canonical launch-readiness checklist; REMAINING-WORK.md is the older to-do list with a status banner pointing at AUDIT.md.
- **Real account deletion**: new `delete-account` edge function calls `auth.admin.deleteUser` and cleans up storage objects across `avatars`, `social-media`, `stories` buckets. Wired from consumer ProfileScreen and business-portal Settings, replacing the previous "Account Deleted" fake (which only signed the user out). **GDPR / app-store compliance.** Deploy: `npx supabase functions deploy delete-account`.
- **Post counter triggers**: migration `20260511000000_post_counter_triggers.sql` adds DB triggers that keep `social_posts.likes_count` and `comments_count` in sync on every `post_likes` / `comments` insert/delete. One-time backfill repairs prior drift. SocialScreen no longer manually `UPDATE`s these columns from the client.
- **Storage RLS hardening**: migration `20260511000001_storage_rls_hardening.sql` closes the "any authenticated user can upload/delete any photo" gap. New policies: `venue-photos` requires the caller to own the venue identified by the first folder segment (or be an admin); `event-images` requires `organizer_id = auth.uid()`; `avatars` and `social-media` require `(storage.foldername(name))[1] = auth.uid()::text`. Dropped the overlapping permissive policies from `20260309000001` and `20260310000000`.
- **`alert()` → `Alert.alert()`**: ExploreAreaScreen had three venue-card taps using `alert()` (web-only, silently no-ops on native). Replaced + wired venue navigation properly via `route.params.venueId`. NewsScreen `openArticle` fallback fixed too.
- **Discover filter params now propagate**: `ExploreScreen` reads `route.params.category` (matches a known chip when possible; drops to search box for pseudo-categories) and `neighbourhood`; `ExploreAreaScreen` reads `route.params.area` and pre-selects the matching `LAGOS_AREAS` id. Previously Discover tiles opened unfiltered screens.
- **`useFocusEffect` on Home/Explore/Events/Social**: refetch data on focus instead of only on first mount. Pattern: `useFocusEffect(useCallback(() => fetchSomething(), []))`. Auth/session checks stay in one-shot `useEffect` so they don't re-run.
- **TrendingVenues no longer ships fake data**: removed `FALLBACK_VENUES` (synthetic IDs `'1'`..`'6'` that broke tap → modal lookup). Two-stage real-data fallback: promoted venues → top-rated venues → empty state.
- **Documentation triad**: `AUDIT.md` (audit findings + status), `REMAINING-WORK.md` (original to-do list, kept for history), `AI_AGENTS_PLAN.md` (agentic AI roadmap with implementation sketches).

### April 2026
- **Role-specific tables**: `business_profiles` and `admin_profiles` extend `profiles` — auto-created via trigger on role change
- **Scalability overhaul**: Materialized `trending_venues` view (refresh via `refresh_trending_venues()`), `auth_role()`/`is_admin()`/`is_super_admin()` helper functions replacing RLS subqueries, BRIN indexes on time-series tables, follow count cache on `profiles`, server-side pagination on admin portal
- **Pagination**: VenueManager and UserManager now use server-side pagination (25 per page) with search/filter done via Supabase query, not client-side
- **Story cleanup**: `cleanup_expired_stories()` function deletes stories expired >24h ago + orphaned views
- **Analytics dashboard**: Full admin analytics page — user growth (30d area chart), users by role (donut), venues by area (bar), venues by category (pie), top 10 trending venues, top events by RSVPs, business subscription tiers, recent activity feed, MAU tracking
- **Trending venues (consumer)**: Now only shows admin-promoted venues (`is_promoted = true`), not all venues
- **Auth context fix**: Admin portal auth context has safety timeout (5s) and error handling to prevent infinite loading state

### March 2026
- **Ionic icons**: All emoji icons replaced with Ionicons — `newArchEnabled: false` in app.json
- **Trending algorithm**: `trending_venues` materialized view with time-decayed hot score; promoted venues pin to top. Refresh via `SELECT refresh_trending_venues();`
- **Paid promotions**: Businesses pay to be `is_promoted`; admins set badge + days via Admin Portal Venue Manager
- **Admin portal separation**: `apps/admin-portal/` is now a completely separate Vite app on port 3002
- **Business portal**: Business Owner only — admin routes and sidebar section removed
- **Admin RLS fix**: Migration `20260314000001_admin_venue_rls.sql` — admins bypass owner_id filter on venues
- **useVenue hook**: Skips `.eq('owner_id')` filter for Admin/Super Admin roles

### February 2026
- **People tab**: Added to Social screen with follow/unfollow functionality
- **Stories (My Vibe)**: Create, view, expire, filter effects, text/sticker overlays
- **Tab bar padding**: Use `useSafeAreaInsets` for consistent bottom padding

## Common Commands

```bash
# Consumer App
cd apps/consumer-app
npx expo run:ios          # iOS simulator (native build — expo-video requires this)
npx expo run:android      # Android emulator

# Business Portal (venue owners)
cd apps/business-portal
npm run dev               # http://localhost:3001

# Admin Portal (platform admins)
cd apps/admin-portal
npm run dev               # http://localhost:3002

# Database
npx supabase db push      # Apply pending migrations

# News agent (manual)
node scripts/lagos-news-agent.js
```

## Environment Variables

### Consumer App (`apps/consumer-app/config/supabase.ts`)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anonymous key

### Business Portal (`apps/business-portal/.env`)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### Error reporting (all optional — leave unset to disable Sentry)
- Portals: `VITE_SENTRY_DSN` on each Vercel project. Source-map upload additionally needs `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` on the same project. `VITE_APP_RELEASE` / `VITE_APP_ENV` are derived at build time by `vite.config.ts`, never set by hand.
- Consumer app: `EXPO_PUBLIC_SENTRY_DSN` — an EAS environment variable (plain text, every profile) for cloud builds, `apps/consumer-app/.env` locally (see `.env.example`).
- Uptime workflow: optional repo secret `SUPABASE_ANON_KEY` upgrades the Supabase probe from "gateway answers" (401) to "auth service healthy" (200).

## Scalability Notes

- **trending_venues** is a MATERIALIZED VIEW — must be refreshed periodically via `SELECT refresh_trending_venues();` (set up pg_cron — see setup instructions below)
- **RLS role checks** use `auth_role()`, `is_admin()`, `is_super_admin()` — STABLE functions cached per-transaction, no per-row subqueries
- **Follow counts** are cached on `profiles.follower_count` / `profiles.following_count` — kept in sync by `trg_update_follow_counts` trigger. Never do `COUNT(*)` on follows table
- **Time-series tables** (`venue_check_ins`, `story_views`, `event_rsvps`) use BRIN indexes for efficient range scans
- **Admin portal lists** use server-side pagination (PAGE_SIZE = 25) — never fetch all rows client-side
- **Expired stories** cleaned up by `cleanup_expired_stories()` — scheduled via pg_cron daily

### pg_cron Setup (Required)

1. **Enable pg_cron**: Supabase Dashboard → Database → Extensions → search "pg_cron" → Enable
2. **Add scheduled jobs** in SQL Editor:

```sql
-- Refresh trending venues every 10 minutes
SELECT cron.schedule(
  'refresh-trending-venues',
  '*/10 * * * *',
  'SELECT refresh_trending_venues();'
);

-- Clean up expired stories daily at 3 AM UTC
SELECT cron.schedule(
  'cleanup-expired-stories',
  '0 3 * * *',
  'SELECT cleanup_expired_stories();'
);
```

3. **Verify**: `SELECT jobid, schedule, command, jobname FROM cron.job;`

**Useful pg_cron commands:**
```sql
-- Check recent job runs
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Remove a job
SELECT cron.unschedule('refresh-trending-venues');

-- Change frequency (e.g. every 5 min)
SELECT cron.unschedule('refresh-trending-venues');
SELECT cron.schedule('refresh-trending-venues', '*/5 * * * *', 'SELECT refresh_trending_venues();');
```

## Known Issues / TODOs

- [ ] SMTP not configured — password reset emails won't send
- [ ] `get-traffic` Edge Function not deployed — TrafficAlert uses mock data (`TOMTOM_API_KEY` not set)
- [ ] `expo-video` requires native build — cannot use Expo Go QR scanning
- [ ] Stories `social-media` bucket RLS may need review for public read access
