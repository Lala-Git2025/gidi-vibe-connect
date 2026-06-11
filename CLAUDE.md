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

### June 2026
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
