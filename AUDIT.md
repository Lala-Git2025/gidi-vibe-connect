# Gidi Connect — Comprehensive Audit

**Date:** 2026-05-11 · **Scope:** Consumer mobile app, Business Portal (3001), Admin Portal (3002), Edge Functions, Database, Scripts, External Integrations.

**Method:** Three parallel auditors read every screen / route / function / migration. Findings cross-checked against `REMAINING-WORK.md` and `CLAUDE.md`. File:line references throughout for direct action.

**Legend:** ✅ Working · ⚠️ Mock/Stub · ❌ Broken · ⏳ Not wired · 📋 Missing feature.

---

## 📊 Progress since audit (last updated 2026-06-11)

### P0 — Launch blockers

| # | Item | Status |
|---|---|---|
| 1.1 | Payments (Paystack/Flutterwave) | 🅿️ Backlog — deprioritized for launch sprint |
| 1.2 | Fake "Delete Account" in both apps | ✅ **FIXED** — `delete-account` edge fn + cascade |
| 1.3 | `alert()` instead of `Alert.alert()` | ✅ **FIXED** — ExploreArea + News |
| 1.4 | TomTom API key hardcoded in mobile bundle | ✅ **FIXED** — replaced with Lagos Traffic Radio + Gemini Flash classifier (free tier) |
| 1.5 | Storage RLS gaps | ✅ **FIXED** — migration `20260511000001_storage_rls_hardening.sql` |
| 1.6 | SMTP not configured | ⏳ Pending Supabase dashboard config (external action) |
| 1.7 | Missing DB triggers for counters | ✅ **FIXED** — migration `20260511000000_post_counter_triggers.sql` |
| 1.8 | `trg_handle_business_role_assignment` INSERT gap (see §6) | ✅ **FIXED** — migration `20260611000000_role_assignment_insert_trigger.sql` + backfill |
| 1.9 | pg_cron jobs only in dashboard (see §6) | ✅ **FIXED** — migration `20260611000001_codify_cron_jobs.sql` |
| 1.10 | `venue_analytics` never populated (see §3) | ✅ **FIXED** — `track_venue_event` RPC + consumer wiring on Explore venue modal |
| 1.11 | Verification self-fulfilling badge (see §3) | ⏳ Open (next session) |

**Score: 8 of 11 P0 items shipped.** Remaining 3: payments (backlog), SMTP (you set in dashboard), verification badge (next).

### P1 — Painful gaps (selected items knocked out)

| Item | Status |
|---|---|
| Discover filter params ignored (Consumer §2.2.1) | ✅ **FIXED** — `category` / `area` / `neighbourhood` propagate end-to-end |
| TrendingVenues fallback IDs collide with empty DB (§2.2.2) | ✅ **FIXED** — removed hardcoded fallback; two-stage real-data fallback |
| No `useFocusEffect` on 4 of 8 screens (§2.2.3) | ✅ **FIXED** — Home / Explore / Events / Social now refresh on focus |
| ExploreArea venue taps don't open detail (§2.1) | ✅ **FIXED** — navigates with `venueId` like other screens |

Everything else listed below in §1–§8 remains open.

---

## 🚨 Executive summary

The app **looks** complete — auth, social, posts, comments, follows, venues, events, RSVPs, stories, communities all work end-to-end. But a comprehensive audit surfaces **~50 distinct issues** ranging from cosmetic to launch-blocking. The most important pattern: **multiple features have UI that suggests they work but are stubs underneath** (notifications, account deletion, verification, payments, analytics counters). Shipping in this state risks app-store rejection (privacy/payment policies) and user trust loss.

### Top 7 launch blockers (P0)

1. **No payment integration** — `Upgrade to Premium` alerts "Payment integration coming soon" → revenue path is fake.
2. **"Delete Account" is fake** in consumer app AND business portal — actually just signs the user out. **GDPR & store-policy violation.**
3. **`alert()` instead of `Alert.alert()`** in ExploreArea + News — silently no-ops on native iOS/Android. ExploreArea venue cards are *the* tap targets on that screen.
4. **TomTom API key hardcoded in mobile bundle** ([components/TrafficAlert.tsx:11](apps/consumer-app/components/TrafficAlert.tsx#L11)) — exposed in production binary.
5. **Storage buckets `venue-photos` and `event-images` lack ownership checks** — any authenticated user can upload or delete any venue's photos.
6. **SMTP not configured** — password reset emails do not send.
7. **No DB triggers for `likes_count` / `comments_count` / `views_count`** — client manually syncs these, racy across multi-device usage.

### What's left, summarized

| Area | P0 (launch-blocker) | P1 (painful gap) | P2 (polish) |
|---|---|---|---|
| Consumer app | 4 | 11 | 6 |
| Business portal | 2 | 7 | 4 |
| Admin portal | 0 | 6 | 2 |
| Backend / data | 4 | 9 | 5 |
| **Total** | **10** | **33** | **17** |

Items in `REMAINING-WORK.md` that this audit confirms are **actually fixed**: Mobile post creation UI (#1), ErrorBoundary (#6). Items it lists that this audit confirms are **still broken**: SMTP (#2), `get-traffic` deployment (#3), ExploreArea full venue flow (#4 partly), `fetch-lagos-events` live source (#5). Items **not in** REMAINING-WORK but should be: see P0/P1 lists below.

---

## 1. P0 — Launch blockers

### 1.1 Payments are fake
[apps/business-portal/src/pages/Subscription.tsx:74-81](apps/business-portal/src/pages/Subscription.tsx#L74)

`handleUpgrade` shows `alert('Payment integration coming soon!')`. There is no Stripe / Paystack / Flutterwave anywhere in the codebase. The entire premium-tier gating system on the business portal is decorative: `business_subscriptions.tier` only changes if someone manually updates the row. **REMAINING-WORK.md does not mention this.**

**Fix:** Integrate Paystack (best for Nigeria, supports NGN) or Flutterwave. ~3–5 days, including webhook handling.

### 1.2 "Delete Account" is fake (two places)
- [apps/consumer-app/screens/ProfileScreen.tsx:673-700](apps/consumer-app/screens/ProfileScreen.tsx#L673) — comment literally says `// (actual deletion would need admin API)`; just signs out.
- [apps/business-portal/src/pages/Settings.tsx:78-86](apps/business-portal/src/pages/Settings.tsx#L78) — signs out then alerts user to email support.

Both surfaces tell the user "Account Deleted" without deleting anything. App-store privacy guidelines and GDPR Article 17 require actual deletion.

**Fix:** Build a Supabase Edge Function using `supabase.auth.admin.deleteUser()` + cascading DB cleanup. Wire both surfaces to it. ~1 day.

### 1.3 `alert()` crashes on native
- [apps/consumer-app/screens/ExploreAreaScreen.tsx:231, 262, 298](apps/consumer-app/screens/ExploreAreaScreen.tsx#L231) — every venue card tap.
- [apps/consumer-app/screens/NewsScreen.tsx:246](apps/consumer-app/screens/NewsScreen.tsx#L246) — fallback when URL fails.

`alert()` is `window.alert` (web-only); on React Native it's undefined and either silently no-ops or crashes. **ExploreArea has zero working venue interactions because of this.**

**Fix:** Replace with `Alert.alert(...)` from `react-native`. ~10 minutes. Plus: navigate venues to Explore with `venueId` like other screens do.

### 1.4 TomTom API key in client bundle
[apps/consumer-app/components/TrafficAlert.tsx:11](apps/consumer-app/components/TrafficAlert.tsx#L11)

```
const TOMTOM_API_KEY = 'oPf90mRaSNN4TZkUy8TGCqcOJoMbgsWi';
```

Shipped in every APK/IPA. Anyone can extract it. The fallback was meant to be temporary until `get-traffic` deploys, but it's still here.

**Fix:** Deploy `get-traffic` edge function with `TOMTOM_API_KEY` as a Supabase secret. Remove the client fallback. *Also see §3.3 — TomTom has poor Lagos data; consider switching to Google Maps Distance Matrix at the same time.*

### 1.5 Storage RLS gaps
[supabase/migrations/20260310000000_business_portal_rpcs_and_policies.sql](supabase/migrations/20260310000000_business_portal_rpcs_and_policies.sql)

`venue-photos` and `event-images` buckets allow any authenticated user to INSERT/DELETE — no `owner_id` path check. Also: overlapping policies in [20260309000001](supabase/migrations) shadow the path-restricted policies for `avatars` and `social-media`.

**Fix:** Add path-restricted policies (`auth.uid()::text = (storage.foldername(name))[1]`) on `venue-photos` and `event-images`. Drop the overlapping generic policies on `avatars`/`social-media`. ~1 hour.

### 1.6 SMTP not configured
Documented in REMAINING-WORK #2 and CLAUDE.md. Password reset call succeeds server-side, no email sent. Users locked out of forgotten passwords.

**Fix:** Configure SMTP in Supabase Dashboard → Auth → Email Templates. Use SendGrid / Resend / AWS SES. ~30 min.

### 1.7 Missing DB triggers for denormalized counters
- `social_posts.likes_count` / `comments_count` — synced manually by client after each insert/delete in SocialScreen.
- `stories.views_count`, `events.views_count / saves_count / shares_count`, `communities.post_count`, `news_feed.views_count` — columns exist, no triggers, never updated.

**Fix:** One migration with a counter trigger per pair. Pattern matches existing `trg_update_follow_counts` and `trigger_update_community_member_count`. ~2 hours.

---

## 2. Consumer app (apps/consumer-app)

### 2.1 Per-screen status

| Screen | Status | Critical issues |
|---|---|---|
| HomeScreen | ✅ Mostly | Notifications bell stub; TomTom hardcoded key |
| ExploreScreen | ✅ Strong | All flows wired |
| EventsScreen | ✅ Working | `CATEGORY_ICONS` dead code; `fetch-lagos-events` falsely claims `source: 'live_scraping'` |
| SocialScreen | ✅ Strong | Bell unwired (empty handler); no `useFocusEffect`; counters synced client-side |
| ProfileScreen | ✅ Strong | Delete Account fake; notifications/location toggles fake; bell not interactive |
| NewsScreen | ⚠️ Partial | `alert()` crash bug; auto-refresh works |
| ExploreAreaScreen | ❌ Broken | All venue taps use `alert()` and don't navigate |
| DiscoverScreen | ⚠️ Mostly mock | Friends Activity hardcoded; filter params ignored by target screens |

### 2.2 P1 — painful gaps (consumer)

1. **Discover filter params are ignored** — [DiscoverScreen.tsx:177-239](apps/consumer-app/screens/DiscoverScreen.tsx#L177) passes `category` / `area` params to Explore and ExploreArea, but neither screen reads them. All Discover tiles open unfiltered screens.
2. **TrendingVenues fallback IDs collide with empty DB** — [components/TrendingVenues.tsx](apps/consumer-app/components/TrendingVenues.tsx) renders 6 hardcoded venues with UUIDs `1`–`6`. Tap navigates Explore with `venueId='1'` → no match → modal never opens.
3. **No `useFocusEffect` on 4 of 8 screens** — Home, Explore, Events, Social all use `useEffect([], [])`. Data stale until pull-to-refresh (and Social has no pull-to-refresh on the feed).
4. **Notifications bell is a stub on every screen** — Home shows "Coming Soon" alert; Social has empty onPress; Profile bell isn't even a TouchableOpacity. Decide: build a notifications system, hide the icons, or stub them with a "disabled" visual state.
5. **Bookmark icon on Trending Venues** — render-only, no onPress ([TrendingVenues.tsx:137-139](apps/consumer-app/components/TrendingVenues.tsx#L137)).
6. **Settings notification + location toggles are local state only** — never persisted, not connected to expo-notifications / expo-location ([ProfileScreen.tsx:1163-1179](apps/consumer-app/screens/ProfileScreen.tsx#L1163)).
7. **Privacy Policy and Terms of Service** open `gidivibeconnect.com/privacy` and `/terms` — domain/pages do not exist.
8. **Forgot Password** calls `resetPasswordForEmail` (works) but SMTP not set → no email.
9. **Trending Venues card image fallback** — when DB returns 0 venues, fallback renders Unsplash placeholder photos.
10. **Discover Friends Activity** — hardcoded mock list `Chioma N. / Tunde B. / Aisha M.`, comment says "Replace with actual friends activity query".
11. **App version hardcoded** as `1.0.0` ([ProfileScreen.tsx:1241](apps/consumer-app/screens/ProfileScreen.tsx#L1241)). Should read from `expo-application`.

### 2.3 P2 — polish (consumer)

- `EventsScreen.tsx:53-67` — `CATEGORY_ICONS` emoji map never rendered (dead).
- Bare emoji in `ExploreAreaScreen` (area cards) and `DiscoverScreen` (venue/experience/collection tiles) — violates CLAUDE.md "Ionicons only" convention.
- StoryViewer relies on `expo-video` `require()` in try/catch; falls back to image render in Expo Go. Works in native builds — no immediate action.
- Deep linking missing entirely — no `Linking.addEventListener` / `getInitialURL`. Needed for share-to-app and push deep-link routing (see [REMAINING-WORK.md](REMAINING-WORK.md) Deferred — Deep-Linked Post Sharing section).
- `expo-av` deprecation warnings — migrate to `expo-audio` + `expo-video` before SDK 54.

---

## 3. Business Portal (apps/business-portal, port 3001)

### 3.1 Per-route status

| Route | Status | Critical issues |
|---|---|---|
| /login, /signup | ✅ | No forgot-password link in UI |
| /dashboard | ✅ Mostly | Hardcoded "Active Offers: 0"; analytics widget reads empty table |
| /venues, /venues/new, /venues/:id, /venues/:id/edit | ✅ Strong | "Verified" badge auto-true; no geocoding/coords UI |
| /analytics | ✅ Working | Premium gate works; `track_venue_event` RPC populates `venue_analytics` from consumer venue interactions (June 2026) |
| /events, /events/new, /events/:id | ✅ Working | Date-only inputs, no time-of-day → events stored at 00:00 UTC |
| /offers | ✅ Working | Premium gate works; full CRUD |
| /subscription | ❌ | Payment is `alert('Payment integration coming soon!')` |
| /settings | ⚠️ Mixed | Profile/password real; notifications fake; delete-account fake |

### 3.2 P1 — painful gaps (business portal)

1. **~~`venue_analytics` table is never populated~~** — ✅ **FIXED 2026-06-11.** New `track_venue_event(p_venue_id, p_event_type)` RPC + UNIQUE(venue_id, date) does atomic daily counter upserts (`profile_views` / `phone_clicks` / `website_clicks` / `direction_clicks` + offer/event columns reserved). Wired into `ExploreScreen.VenueDetailModal` so the modal-open hook and the call/website/directions handlers all record. `offer_views/clicks` and `event_views` columns remain unwired pending consumer offer/event detail surfaces.
2. **Verification is self-fulfilling** — [BusinessAuthContext.tsx:104-170](apps/business-portal/src/contexts/BusinessAuthContext.tsx#L104) auto-inserts `verification_requests` with `status='approved', reviewed_by='system'` at signup. `create-venue` edge function sets `is_verified: true`. There is no admin review queue. The "Verified" badge is meaningless.
3. **Plan-limit numbers are inconsistent across UI**: Signup defaults `max_photos_per_venue: 10`; Subscription page says Free=5, Premium=20; Dashboard upgrade banner promises Premium=50. Pick one source of truth.
4. **Settings notification toggles are local state only** — never persisted, no email/push system reads them ([Settings.tsx:27-28, 211-228](apps/business-portal/src/pages/Settings.tsx#L211)).
5. **Header bell in business portal** is decorative (red unread dot, no handler, no notification system) ([Header.tsx:25-28](apps/business-portal/src/components/layout/Header.tsx#L25)).
6. **Event date inputs are date-only** — no time of day → all events stored at 00:00 UTC of selected day ([EventForm.tsx:457-484](apps/business-portal/src/pages/EventForm.tsx#L457)).
7. **VenueForm doesn't expose `opening_hours`, `address`, `latitude`, `longitude`** — type/schema declares them, UI omits them. Geocoding entirely absent.
8. **"Create Event" quick action on Dashboard routes to `/events` (list)** instead of `/events/new` ([Dashboard.tsx:92](apps/business-portal/src/pages/Dashboard.tsx#L92)).
9. **"Upgrade to Premium" in Offers** uses `window.location.href` instead of `<Link>` → full page reload.

### 3.3 P2 — polish (business portal)

- **Orphaned admin pages** in `pages/admin/*` — AdminOverview, AdminVenues, AdminUsers, AdminPromotions are not imported anywhere. CLAUDE.md says they were removed; files remain. Delete to prevent drift.
- "Active Offers: 0" hardcoded on Dashboard ([Dashboard.tsx:69-73](apps/business-portal/src/pages/Dashboard.tsx#L69)).
- "Views: -" hardcoded on each venue card ([Venues.tsx:161](apps/business-portal/src/pages/Venues.tsx#L161)).
- Offers `toggle` and `delete` don't add `.eq('owner_id')` defense-in-depth — relies entirely on RLS.
- No avatar upload UI in Settings — `profile.avatar_url` only writable from consumer app.
- Phone field not normalized at signup.
- No forgot-password link on Login (matches SMTP gap but UI is also missing).

---

## 4. Admin Portal (apps/admin-portal, port 3002)

### 4.1 Per-route status

| Route | Status | Critical issues |
|---|---|---|
| /login | ✅ | No forgot-password link |
| / (Overview) | ✅ | Quick-link `<a href>` causes full reload |
| /analytics | ⚠️ Partial | 1000-row client-side truncation on MAU + top events + categories |
| /venues | ✅ Strong | Promotion label hardcoded "Sponsored" |
| /promotions | ✅ Working | No auto-cleanup for expired; no pagination (fine at current scale) |
| /users | ✅ Working | Admin can demote themselves; no email column; no moderation actions |

### 4.2 P1 — painful gaps (admin portal)

1. **MAU + Top Events + Venues-by-Category aggregations silently truncate at 1000 rows** (Supabase default) — [useAnalytics.ts:94-106, 233, 308-355](apps/admin-portal/src/hooks/useAnalytics.ts#L94). At ~3k+ check-ins/day this will silently under-report. Push aggregation to RPC.
2. **Recent Activity feed claims `review` type but never queries `venue_reviews`** — dead branch in [useAnalytics.ts:58, 359-435](apps/admin-portal/src/hooks/useAnalytics.ts#L58).
3. **Promotion label always hardcoded "Sponsored"** — `promotion_label` column exists, admin can't pick a label like "Featured" or "Spotlight" ([VenueManager.tsx:94](apps/admin-portal/src/pages/VenueManager.tsx#L94)).
4. **No automated expiry cleanup for promotions** — UI flags "Expired (cleanup needed)" but only manual remove. No pg_cron job.
5. **Admin can demote themselves to Consumer** — only Super Admin rows are protected ([UserManager.tsx:75-78](apps/admin-portal/src/pages/UserManager.tsx#L75)). Risk of self-lockout.
6. **User manager missing**: email column display + search, suspend/ban/delete actions, bulk operations.

### 4.3 P2 — polish (admin portal)

- Quick-Link `<a href>` causes full page reload — switch to `<Link>` ([Overview.tsx:71-86](apps/admin-portal/src/pages/Overview.tsx#L71)).
- Area filter hardcodes 6 areas; venues outside them are unreachable via filter.

---

## 5. Backend / data layer

### 5.1 Edge Functions

| Function | Status | Deployed? | Verdict |
|---|---|---|---|
| `get-traffic` | Code complete | ❌ No (CLAUDE.md TODO) | **Deploy + remove client fallback** |
| `create-venue` | ✅ Working | ✅ Yes (called by business portal) | Auto-sets `is_verified:true` — bypasses review |
| `fetch-lagos-events` | ⚠️ Misleading | ✅ Yes (called by consumer) | Falsely reports `source: 'live_scraping'` — it just re-reads from `events` table |
| `fetch-lagos-news` | ⚠️ Orphaned | Unverified | Writes to `news_feed`; consumer reads `news` — **schema mismatch**, dead path |
| `fetch-venues` | ⚠️ Mostly mock | Unverified | Only used by legacy `/src/` Vite app; hardcoded fallback venues |
| `scrape-lagos-venues` | ⚠️ Stub | Unverified | Name implies scraping; returns hardcoded arrays of fake venues |
| `search-places` | ⚠️ Mock | Unverified | Comment says "in production, this would integrate with Google Places API" |

**P1:** Decide for each: deploy real implementation, delete the function, or rename to make the mock nature explicit.

### 5.2 External integrations

| Integration | Status | Notes |
|---|---|---|
| **TomTom** | ⚠️ Poor Lagos coverage | API works but `currentSpeed == freeFlowSpeed` for every Lagos coordinate. Recommend switching to **Google Maps Distance Matrix** — ~$40/mo with smart caching, much better coverage. |
| **Eventbrite** | ⚠️ Token missing | `scripts/sync-eventbrite-events.js` exits with help message until `EVENTBRITE_PRIVATE_TOKEN` is set |
| **Gemini AI** | ⚠️ Unclear usage | Imported in `lagos-news-agent.js`; needs closer audit to confirm it's actually called in the main scraping path |
| **Stripe / Paystack / Flutterwave** | 📋 Not present | See §1.1 |
| **Expo Push** | 📋 Not present | No token registration, no push edge functions |
| **Instagram** | 📋 Not present | `instagram_handle` columns exist; no fetcher |
| **SMTP** | 📋 Not configured | See §1.6 |
| **Sentry / analytics** | 📋 Not present | REMAINING-WORK items 7, 8 |

### 5.3 Database — what's wrong

**Missing triggers** (counter columns are dead):
- `social_posts.likes_count` — no trigger on `post_likes` INSERT/DELETE
- `social_posts.comments_count` — no trigger on `comments` INSERT/DELETE
- `stories.views_count` — no trigger on `story_views`
- `events.views_count` / `saves_count` / `shares_count` — no triggers
- `communities.post_count` — no trigger on community-tagged `social_posts`
- `news_feed.views_count` — no trigger
- ~~`venue_analytics.*` — no instrumentation anywhere~~ ✅ **FIXED 2026-06-11** — `track_venue_event` RPC, see §3.2 item 1.

**Missing pg_cron jobs** ~~(CLAUDE.md documents them but no SQL codifies them):~~ ✅ **FIXED 2026-06-11** — migration `20260611000001_codify_cron_jobs.sql` codifies both jobs idempotently:
- ~~`refresh_trending_venues()` should run every 10 min — **not scheduled in any migration**~~ ✅ Codified.
- ~~`cleanup_expired_stories()` should run daily — **not scheduled in any migration**~~ ✅ Codified.

**Orphaned / duplicate tables:**
- `user_checkins` (dead) vs `venue_check_ins` (live)
- `user_reviews` (dead) vs `venue_reviews` (live)
- `badge_definitions` (dead) vs `badges` (live)
- `news_feed` (written by orphan edge fn) vs `news` (read by consumer app — **has no migration; manually created**)
- `user_activity_log` defined; `log_user_activity()` RPC defined; nothing calls them
- `user_favorites` — defined, no writes anywhere
- `exclusive_offers` — schema present, no app writes
- `verification_requests` — defaults `status='approved'`, no review flow

**~~Trigger gap~~:** ✅ **FIXED 2026-06-11.** Migration `20260611000000_role_assignment_insert_trigger.sql` widens the trigger to `AFTER INSERT OR UPDATE OF role` and the function derives the previous role via `TG_OP` so the INSERT path treats it as a `NULL → NEW.role` transition. Includes a backfill that creates `business_profiles` / `admin_profiles` rows for any existing user the old trigger missed (1 Business Owner was caught in prod).

**Storage RLS:** see §1.5.

### 5.4 Scripts

| Script | Status |
|---|---|
| `scripts/lagos-news-agent.js` | ✅ Active via GitHub Actions hourly cron |
| `scripts/sync-eventbrite-events.js` | ⏳ Inactive — no token |
| `scripts/sync-all-events.js`, `scripts/scrape-nigerian-events.js` | Manual only |
| **`com.gidiconnect.newsagent.plist`** | ❌ Wrong path — points to `/Users/femimoritiwon/gidi-vibe-connect-1/` which doesn't exist on this machine. Local macOS cron is broken. (GitHub Actions still works.) |
| Phase migration scripts, seeders, diagnostics | Manual one-shots |

---

## 6. Prioritized action plan

### Sprint 1 — Pre-launch (1–2 weeks)

Address every P0 from §1:

1. **Replace fake "Delete Account"** with real edge function calling `auth.admin.deleteUser` + DB cleanup. *Estimated: 1 day.*
2. **Replace all `alert()` with `Alert.alert()`** + wire ExploreArea venue taps to Explore screen (`venueId` param). *Estimated: 2 hours.*
3. **Deploy `get-traffic` edge function** with `TOMTOM_API_KEY` as secret, remove client fallback. *Estimated: 1 hour.* **At the same time evaluate switching to Google Maps Distance Matrix** for better Lagos data (§3.3 already discussed). *Estimated: +3 hours.*
4. **Fix storage RLS** on `venue-photos` and `event-images`. Drop overlapping policies on `avatars`/`social-media`. *Estimated: 1 hour.*
5. **Configure SMTP** in Supabase Auth. *Estimated: 30 min.*
6. **Add counter triggers** for `likes_count`, `comments_count`, `views_count`, etc. *Estimated: 2 hours.*
7. **Integrate Paystack** (NGN-native, Lagos-friendly) or Flutterwave for the Business Portal Upgrade button. Webhook for tier changes. *Estimated: 3–5 days.*

### Sprint 2 — Trust & polish (2–3 weeks)

The P1 list (~33 items). Highlights:

- Build a notifications system (consumer + portals) — Expo Push + Edge Function + `notifications` table.
- Wire Discover filter params and ExploreArea venue taps end-to-end.
- ~~Codify pg_cron jobs into migrations (don't rely on dashboard-set crons).~~ ✅ shipped 2026-06-11.
- ~~Fix the `trg_handle_business_role_assignment` INSERT path.~~ ✅ shipped 2026-06-11.
- Clean up the news pipeline: pick `news` or `news_feed`, delete the other; delete `fetch-lagos-news` edge fn or repurpose.
- Decide what to do with the 4 mock edge functions (`scrape-lagos-venues`, `search-places`, `fetch-venues`, `fetch-lagos-events`): real implementations or deletion.
- Add `useFocusEffect` to Home / Explore / Events / Social.
- Fix `com.gidiconnect.newsagent.plist` paths OR delete it (GitHub Actions covers production).
- Resolve plan-limit number inconsistencies; pick one source of truth.
- Build a real verification flow (admin review queue) — or remove the badge entirely.
- Fix Admin self-demotion and add missing user moderation actions.
- Convert MAU + Top Events + categories analytics to RPC (drop 1000-row truncation).
- Add time-of-day to event date inputs; add geocoding to VenueForm.

### Sprint 3 — Polish & deferred (1+ weeks)

P2 items:
- Replace bare emoji with Ionicons (ExploreArea, Discover).
- Delete orphaned admin pages in business-portal.
- Delete dead tables (`user_checkins`, `user_reviews`, `badge_definitions`, `user_activity_log`, etc.).
- Convert `<a href>` to `<Link>` in admin Quick-Links.
- Drop `expo-av` for `expo-audio` / `expo-video`.
- Wire app version to `expo-application`.
- Author Privacy Policy and Terms pages or replace links.
- Add Sentry / crash reporting (REMAINING-WORK #7).
- Add analytics (PostHog / Mixpanel) (REMAINING-WORK #8).

---

## 7. What this audit confirms is **fixed** vs REMAINING-WORK.md

| Item | Status |
|---|---|
| #1 Mobile Post Creation UI | ✅ **FIXED** — CreatePostModal exists, wired into Social FAB + Profile New Post |
| #2 SMTP / Password Reset | ❌ Still broken |
| #3 `get-traffic` Edge Function | ❌ Still undeployed; client has hardcoded fallback key |
| #4 ExploreArea Coming Soon | ⚠️ Partially — UI built, but venue taps still use `alert()` and don't navigate |
| #5 Events Live Source | ❌ `fetch-lagos-events` falsely reports `source: 'live_scraping'` |
| #6 ErrorBoundary | ✅ **FIXED** — wraps app in App.tsx |
| #7 Sentry | ❌ Still not present |
| #8 Analytics (PostHog/Mixpanel) | ❌ Still not present |
| #13/#14 Privacy/Terms | ❌ Still dead links |

---

## 8. Items REMAINING-WORK.md doesn't list (this audit found)

- All 7 P0 launch-blockers in §1.
- Discover screen filter params are ignored.
- TrendingVenues fallback IDs collide with empty DB.
- No `useFocusEffect` on 4 of 8 consumer screens.
- Notification bells stubbed on every screen.
- Settings notification + location toggles are fake.
- ~~Trigger gap on `trg_handle_business_role_assignment` (INSERT vs UPDATE).~~ ✅ shipped 2026-06-11.
- 4 mock edge functions (`scrape-lagos-venues`, `search-places`, `fetch-venues`, `fetch-lagos-events`).
- News pipeline schema split (`news` vs `news_feed`).
- Missing counter triggers on `likes_count` / `comments_count` / `views_count` / etc.
- ~~pg_cron jobs not codified into migrations.~~ ✅ shipped 2026-06-11.
- `com.gidiconnect.newsagent.plist` points to wrong path.
- Verification badge is self-fulfilling.
- ~~venue_analytics never populated.~~ ✅ shipped 2026-06-11.
- Analytics 1000-row truncation.
- Recent Activity feed `review` type is dead code.
- Plan-limit numbers inconsistent across UI.
- Promotion label hardcoded; admin self-demotion possible.
- Event date inputs lack time-of-day.
- Orphaned admin pages in business-portal.
- `venue-photos` / `event-images` storage RLS gaps; overlapping policies on `avatars` / `social-media`.

---

*This audit is a snapshot of the codebase at 2026-05-11. Status of edge function deployments and Supabase dashboard configuration could not be verified from code alone — items marked "Unverified" require checking the Supabase dashboard directly.*
