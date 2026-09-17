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

### September 2026
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
