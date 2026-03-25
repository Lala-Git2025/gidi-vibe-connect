# Gidi Connect — Complete Feature Documentation

Full documentation of all features, screens, components, and updates across the **consumer app** (React Native) and **business portal** (React web).

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Consumer App — Navigation](#consumer-app--navigation)
3. [Consumer App — Screens](#consumer-app--screens)
4. [Consumer App — Components](#consumer-app--components)
5. [Consumer App — Features](#consumer-app--features)
6. [Business Portal](#business-portal)
7. [Admin Portal](#admin-portal)
8. [Database Schema](#database-schema)
9. [Design System](#design-system)
10. [Configuration & Commands](#configuration--commands)
11. [Recent Updates](#recent-updates)
12. [Known Issues](#known-issues)
13. [File Structure](#file-structure)

---

## Tech Stack

### Consumer App
| Concern | Technology |
|---|---|
| Platform | React Native (Expo SDK 54) |
| Navigation | React Navigation v7 (Bottom Tabs) |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Language | TypeScript |
| State | React Context (ThemeContext) |
| Video | expo-video ~3.0 |
| Icons | @expo/vector-icons (Ionicons) |
| Font | Orbitron via @expo-google-fonts |
| Build | Expo Dev Client (native build required for expo-video) |

### Business Portal
| Concern | Technology |
|---|---|
| Framework | React + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Data | @tanstack/react-query + Supabase |
| Icons | lucide-react |
| Language | TypeScript |
| Router | React Router v6 |

---

## Consumer App — Navigation

### Tab Bar
- **Implementation**: Custom React Navigation bottom tab bar
- **Visible Tabs**: 5 (Home, Explore, Events, Social, Profile)
- **Hidden Screens**: News, ExploreArea, Discover (navigated to programmatically)
- **Icons**: Ionicons from `@expo/vector-icons` — replaces all previous emoji icons
- **Safe area**: `useSafeAreaInsets` for bottom padding (no hardcoded Platform.OS checks)

### Tab Configuration
| Tab | Icon | Screen |
|---|---|---|
| Home | `home` | HomeScreen |
| Explore | `search` | ExploreScreen |
| Events | `calendar` | EventsScreen |
| Social | `chatbubble` | SocialScreen |
| Profile | `person` | ProfileScreen |

---

## Consumer App — Screens

### 1. HomeScreen.tsx
**File**: `apps/consumer-app/screens/HomeScreen.tsx`

#### Features
- **Header**: "GIDI" brand text + green live dot + Ionicons notification bell
- **Time-Based Greeting**: Dynamic "MONDAY MORNING" / "TUESDAY EVENING" etc.
- **Search Bar**: Navigates to Explore screen on tap
- **Explore the Area Card**: Featured banner → ExploreArea screen
- **Categories Grid**: 8 categories in 2-column grid using Ionicons — Bars, Restaurants, GIDI News, Nightlife, DayLife, Events, Social, See More
- **Stories Section**: `<StorySection />` — horizontal scrolling My Vibe stories
- **Live News Section**: Latest 3 articles from DB, horizontal scroll, real images + time-ago. Only rendered when `liveNews.length > 0`
- **Traffic Update**: `<TrafficAlert />` — real-time Lagos traffic severity cards
- **Vibe Check**: `<VibeCheck />` — area atmosphere metrics (crowd, music, price, wait)
- **Trending Venues**: `<TrendingVenues />` — hot score ranked venues with promoted slots

---

### 2. NewsScreen.tsx
**File**: `apps/consumer-app/screens/NewsScreen.tsx`

#### Features
- Back button + Ionicons newspaper icon + "GIDI NEWS" title
- "LIVE" badge + "Latest news in Lagos" subtitle
- Vertical scrolling news feed (up to 20 articles)
- Real images, category badges, time-ago, "Read More" links
- Pull-to-refresh
- Ionicons empty-state icon

#### Database
- Table: `news`, ordered by `publish_date` desc, limit 20

---

### 3. ExploreScreen.tsx
**File**: `apps/consumer-app/screens/ExploreScreen.tsx`

#### Features
- Search bar with Ionicons search icon and clear button
- Horizontal scrolling category filter pills with Ionicons (bar-chart, restaurant, moon, sunny, calendar, chatbubble, ellipsis)
- Neighbourhood filter pills (Victoria Island, Lekki, Ikoyi, etc.) with Ionicons location icon
- Venues grid: name, location, star rating (Ionicons `star`), category badge, open/closed status
- Venue detail modal: address, phone, website, Instagram — all using Ionicons action icons
- Empty state with Ionicons `search` icon

---

### 4. ExploreAreaScreen.tsx
**File**: `apps/consumer-app/screens/ExploreAreaScreen.tsx`

#### Features
- Grid of Lagos areas: Victoria Island, Lekki, Ikeja, Yaba, Maryland, Ikoyi, Ajah, Surulere
- Each card: area name, venue count, Ionicons icon
- Star ratings rendered with Ionicons `star` (replaces ★ character)

---

### 5. EventsScreen.tsx
**File**: `apps/consumer-app/screens/EventsScreen.tsx`

#### Features
- Horizontal date selector (next 7 days)
- Events list: image, title, venue, Ionicons meta icons (calendar, time, location)
- "Featured" badge (replaces "⭐ Featured")
- Pull-to-refresh, RSVP button
- Empty state with Ionicons `calendar` icon
- Fallback category icons using Ionicons

---

### 6. SocialScreen.tsx
**File**: `apps/consumer-app/screens/SocialScreen.tsx`

#### Tabs
- **Feed** — social posts
- **Communities** — browse/join/leave Lagos communities
- **People** — discover/follow other users

#### Feed Tab
- Vertical scrolling posts: avatar, name, content, images
- Ionicons action icons: `thumbs-up`, `chatbubble`, `share`
- Ionicons camera icon for "Add Story" button
- Post creation modal: text (500 char), location, community, image picker
- Image upload → Supabase `social-media` bucket
- Posts stored in `posts` table

#### Communities Tab
- 8 seeded core communities + user-created communities
- Emoji icons use `COMMUNITY_ICON_MAP` (Unicode escape sequences — bypasses DB encoding)
- Join/Leave: optimistic UI with revert-on-failure
- `member_count` updated by DB trigger
- Community creation: name, description, emoji picker (6 categories), color picker (10 colors)
- Modal labels use Ionicons (`create`, `location`, `people`, `image`)

#### People Tab
- All users: avatar, name, bio
- Follow/Unfollow state from `follows` table

---

### 7. ProfileScreen.tsx
**File**: `apps/consumer-app/screens/ProfileScreen.tsx`

#### Auth Modes
- Sign In, Sign Up, Forgot Password, Guest Mode
- All auth mode icons use Ionicons (mail, lock-closed, person, etc.)

#### Profile (authenticated)
- Avatar from `avatars` bucket
- Full name, username, bio from `profiles` table
- Stats: posts, followers, following
- Edit Profile, Share Profile
- Settings menu uses Ionicons throughout: notifications, person, camera, key, log-out, trophy, trash

---

### 8. DiscoverScreen.tsx
**File**: `apps/consumer-app/screens/DiscoverScreen.tsx`

#### Features
- Activity feed with Ionicons activity icons (getActivityIcon returns Ionicons names)
- Back button uses Ionicons `arrow-back`
- Grid/collection views

---

## Consumer App — Components

### 1. StorySection.tsx
**File**: `apps/consumer-app/components/StorySection.tsx`

- Horizontal scrolling story circles
- "My Vibe" camera button to add story
- Story viewing via `<StoryViewer />`
- Upload to `social-media` Supabase bucket
- Opens `<StoryEditor />` for creation

---

### 2. StoryViewer.tsx
**File**: `apps/consumer-app/components/StoryViewer.tsx`

#### Features
- Full-screen modal story display (`StatusBar hidden`)
- Animated progress bar per story (5s for images, video-length for video)
- Left/right tap zones to navigate prev/next
- `expo-video` player for video stories (`VideoView` component)
- `playToEnd` listener → auto-advance on video finish
- Filter colour-wash overlay from `FILTER_OVERLAY_MAP`
- Text and sticker overlays positioned from relative x/y coordinates
- Sticker text uses `fontFamily: ''` to ensure emoji renders correctly
- Close button: Ionicons `close` icon

#### Video handling
- Detects video by `media_type === 'video'` or URL extension (mp4, mov, avi, etc.)
- Falls back gracefully if expo-video native module not ready

---

### 3. StoryEditor.tsx
**File**: `apps/consumer-app/components/StoryEditor.tsx`

#### Features
- Image/video media picker
- Filter selection with colour preview
- Text overlay tool: color picker, size, bold, background bubble
- Sticker picker: emoji grid with `fontFamily: ''` for correct rendering
- Drag-to-position overlays (relative x/y stored 0–1)
- Navigation buttons use Ionicons `close`: "Back", "Next", "Post Story"
- Uploads media + overlay metadata to Supabase

---

### 4. TrafficAlert.tsx
**File**: `apps/consumer-app/components/TrafficAlert.tsx`

- Horizontal scrollable severity cards: Low / Medium / High / Severe
- `getSeverityIcon` returns Ionicons names (replaces `getSeverityEmoji`)
- "Live Traffic Updates" title (no emoji prefix)
- ThemeContext colors throughout

---

### 5. VibeCheck.tsx
**File**: `apps/consumer-app/components/VibeCheck.tsx`

- Area-level vibe metrics: crowd, music, price, wait time
- `getVibeFilters` returns Ionicons names (replaces emoji filter icons)
- Filter chips use Ionicons icons
- Empty state uses Ionicons `search`
- Vibe status strings: "Electric", "Buzzing", "Chill" (no trailing emoji)
- Single `filteredAreas` computed variable (was being called 3× per render)

---

### 6. TrendingVenues.tsx
**File**: `apps/consumer-app/components/TrendingVenues.tsx`

#### Features
- Large cards (280×320px) with background image + gradient overlay
- Vibe status badge: Electric (≥4.5), Buzzing (≥4.0), Vibing (≥3.5), Chill (<3.5)
- **Sponsored badge**: amber/primary color badge for promoted venues — shows `promotion_label` (e.g. "Sponsored", "Featured")
- Real visitor count: "42 here today" from `checkins_24h` (replaces random numbers)
- "Be the first!" shown when no check-ins in last 24h
- Ionicons: `bookmark-outline`, `location-outline`
- Deduplicates by name before rendering

#### Data Source
- Queries `trending_venues` Postgres view (not `venues` table directly)
- View returns venues ranked by **time-decayed hot score** (see Database section)
- Promoted venues always rank first (score = 999999)
- Fallback: 6 hardcoded sample Lagos venues if DB query fails

---

### 7. ErrorBoundary.tsx
**File**: `apps/consumer-app/components/ErrorBoundary.tsx`

- Wraps entire app
- Ionicons `warning` icon (64px, amber) — replaces ⚠️ emoji
- "Try Again" and "Reload App" recovery buttons

---

## Consumer App — Features

### Authentication
- Email/password sign in and sign up
- Forgot password via `resetPasswordForEmail`
- Guest mode
- Profile auto-created by `handle_new_user` DB trigger
- Session via `supabase.auth.getSession()` (local, fast)
- Auth state refreshed on screen focus via `useFocusEffect`

### News System
**Auto-updates every 3 hours** via macOS launchd.

Sources (14 total): Linda Ikeji Blog, Instablog9ja, 36ng, Information Nigeria (×2), Premium Times, Punch, BellaNaija (×2), Pulse Nigeria (×2), NotJustOk, Legit.ng (×2)

Quality controls:
- Articles must have a publish date
- Only last 60 days accepted; future dates rejected
- Duplicate prevention: URL tracked in-run + DB check

Logs: `logs/news-agent.log`, `logs/news-agent-error.log`

### Trending Venues (Hot Score Algorithm)
Venues are ranked by a **time-decayed composite score**:

```
score = (checkins_24h × 10) + (checkins_7d × 3) + (live_rating × 20)
        ÷ (hours_since_last_activity + 2)^1.5
```

- Promoted venues are pinned to the top (score = 999,999) while `promoted_until` is in the future
- Computed live via the `trending_venues` Postgres view
- No cron job needed; view recalculates on every query

### Stories (My Vibe)
- Users post short-lived media moments (images or video)
- Stored in `stories` table with `expires_at` timestamp
- Media in `social-media` Supabase bucket
- `filter_effect`, `overlays` (JSON) columns for editor-applied effects
- `story_views` table tracks who has seen each story

### Communities
8 seeded core Lagos communities:

| Community | Icon | Color |
|---|---|---|
| Nightlife Lagos | 🌙 | #4338CA |
| Restaurant Reviews | 🍽️ | #EA580C |
| Events & Concerts | 🎵 | #7C3AED |
| Island Vibes | 🏝️ | #0891B2 |
| Mainland Connect | 🏙️ | #059669 |
| Foodies United | 🍕 | #D97706 |
| Party People | 🎉 | #DB2777 |
| Culture & Arts | 🎨 | #DC2626 |

- Join/leave with optimistic UI + revert-on-failure
- Member count via DB trigger
- User-created communities supported

### People / Follow System
- Browse all users from `profiles`
- Follow/unfollow → `follows` table
- Follower/following counts on profile

### Activity Tracking
Three tables power gamification stats:

| Table | Tracks | Unique constraint |
|---|---|---|
| `venue_check_ins` | Venue foot traffic | One per user per venue |
| `event_rsvps` | Event attendance | One per user per event |
| `venue_reviews` | Venue ratings | One per user per venue |

---

## Business Portal

**URL**: React web app (Vite + Tailwind), port 3001
**Access**: Business Owner role only

### Pages

| Page | Route | Purpose |
|---|---|---|
| Dashboard | `/dashboard` | Business stats overview — venues, views, events, offers |
| Venues | `/venues` | List of owned venues |
| New Venue | `/venues/new` | Create venue (calls Edge Function `create-venue`) |
| Venue Details | `/venues/:id` | Photos, info, contact, amenities, tags, **admin promotion panel** |
| Edit Venue | `/venues/:id/edit` | Edit venue form |
| Analytics | `/analytics` | View counts, traffic (Premium) |
| Events | `/events` | List of owned events |
| New Event | `/events/new` | Create event |
| Event Details | `/events/:id` | Event info + image management |
| Offers | `/offers` | Promotions/offers (Premium) |
| Subscription | `/subscription` | Free / Premium / Enterprise plans |
| Settings | `/settings` | Account settings |

### Venue Creation
- Calls Supabase Edge Function `create-venue`
- Fields: name, description, location, category (text — flexible), contact phone/email/website/instagram, opening_hours, price_range, amenities (array), tags (array)
- Admin-created venues bypass subscription limits

### Subscription Tiers
| Feature | Free | Premium | Enterprise |
|---|---|---|---|
| Venues | 1 | 3 | Unlimited |
| Photos/venue | 10 | 50 | Unlimited |
| Events/month | 5 | 20 | Unlimited |
| Analytics | No | Yes | Yes |
| Offers | No | Yes | Yes |
| Menu mgmt | No | Yes | Yes |
| Priority listing | No | Yes | Yes |

### Venue Promotion
Managed via the Admin Portal Venue Manager (`/venues` in the admin portal):
- Search any venue, enter duration in days, click Promote
- Sets `is_promoted = true`, `promoted_until`, `promotion_label = 'Sponsored'` on the venue
- Venue immediately appears at the top of Trending in the consumer app

---

## Admin Portal

**URL**: Separate Vite app running on port 3002 (dev) / admin.gidiconnect.com (prod)
**Access**: Admin and Super Admin roles only. Completely separate from the business portal.

### Pages

| Page | Route | Purpose |
|---|---|---|
| Overview | `/` | Platform-wide stats: total users, venues, active promotions, new signups (7d) |
| Venue Manager | `/venues` | All venues across platform — search, per-row promote/remove, days input |
| Promotions Manager | `/promotions` | Active vs expired promotion tracking, expiry countdown, cleanup |
| User Manager | `/users` | Search users, filter by role, inline role assignment |

### Admin Overview Stats
- Total users (from `profiles`)
- Total venues
- Active promotions (is_promoted = true AND promoted_until > now)
- New users in last 7 days

### Venue Manager
- Lists every venue (not just owned)
- Search by name or location
- Per-row: days input + Promote button → sets is_promoted + promoted_until
- Active promotions show "Sponsored · Xd left" badge
- One-click Remove button to deactivate promotion

### Promotions Manager
- Summary: active count, expired count, next expiry
- Active promotions list with name, label, expiry date, days remaining
- Expired promotions list (still `is_promoted = true`, needs cleanup) with Remove button

### User Management
- Lists up to 200 users ordered by join date
- Search by full name or username
- Filter by role (Consumer, Business Owner, Content Creator, Admin, Super Admin)
- Inline role change via dropdown
- Super Admin rows are read-only (cannot be demoted)
- Shield icon displayed for Admin/Super Admin users

### Making a User Admin
Run in Supabase SQL Editor:
```sql
UPDATE profiles SET role = 'Admin' WHERE user_id = '<user-uuid>';
```

---

## Database Schema

### Core Tables

| Table | Key Columns | Purpose |
|---|---|---|
| `profiles` | user_id, full_name, username, bio, avatar_url, role | User accounts |
| `venues` | name, location, category (TEXT), rating, is_promoted, promoted_until, promotion_label, amenities[], tags[], instagram_handle | Venue listings |
| `events` | title, venue_name, date, organizer_id, is_published, source | Events |
| `news` | title, content, image_url, publish_date, source_url | News articles |
| `posts` | content, user_id, community_id, image_url | Social posts |
| `communities` | name, description, icon, color, member_count | Community groups |
| `community_members` | community_id, user_id | Join records |
| `follows` | follower_id, following_id | Follow relationships |
| `stories` | user_id, image_url, media_type, filter_effect, overlays, expires_at | My Vibe stories |
| `story_views` | story_id, viewer_id | Story view tracking |
| `venue_check_ins` | user_id, venue_id, checked_in_at | Foot traffic |
| `event_rsvps` | user_id, event_id, status | Event attendance |
| `venue_reviews` | user_id, venue_id, rating, comment | Venue ratings |
| `business_subscriptions` | user_id, tier, max_venues, max_photos_per_venue, etc. | Business plans |
| `verification_requests` | user_id, business_name, status | Business verification |

### Views

| View | Purpose |
|---|---|
| `trending_venues` | Hot-score ranked venues. Promoted venues score 999999. Joins venue_check_ins + venue_reviews to compute live signal. |

### Storage Buckets
| Bucket | Contents |
|---|---|
| `avatars` | Profile pictures |
| `social-media` | Post images, story media |
| `event-images` | Event banner images |

### Key DB Triggers
- `handle_new_user` — auto-creates profile row on auth signup
- `trigger_update_community_member_count` — maintains `member_count` on community_members insert/delete

### Key RPCs / Edge Functions
- `create-venue` — Edge Function for business portal venue creation (bypasses anon RLS)
- `check_event_creation_limit(user_id)` — returns boolean; enforces monthly event quota per tier

---

## Design System

### ThemeContext
All components use:
```tsx
const { colors, activeTheme } = useTheme();
```
Never hardcode color values.

### Color Tokens
```typescript
colors.background      // Screen background
colors.cardBackground  // Card/surface background
colors.border          // Borders and dividers
colors.text            // Primary text
colors.textSecondary   // Muted/secondary text
colors.primary         // Golden yellow (#EAB308)
```

### Typography
- Brand font: **Orbitron** (via `@expo-google-fonts/orbitron`) — headers only
- System font: all body text
- Emoji: rendered by system font with NO `fontFamily` override (except sticker overlay in StoryViewer/StoryEditor which uses `fontFamily: ''` intentionally)

### Icons
- **All UI icons**: Ionicons from `@expo/vector-icons`
- **Community icons**: Unicode emoji via `COMMUNITY_ICON_MAP` (not DB-stored emoji strings)
- No bare emoji characters in any UI element except community icon map and sticker picker

### Spacing
```
Container padding:   16px
Card padding:        10–16px
Section gap:         32px
```

---

## Configuration & Commands

### Consumer App
```bash
# Start (requires native build for expo-video)
cd apps/consumer-app
npx expo run:ios          # iOS simulator
npx expo run:android      # Android emulator

# Dev server only (no QR for Expo Go — expo-video requires dev client)
npx expo start
```

### Business Portal
```bash
cd apps/business-portal
npm run dev               # Start dev server
npm run build             # Production build
```

### Database
```bash
# Apply all pending migrations
npx supabase db push

# Generate TypeScript types
supabase gen types typescript --local > types/supabase.ts
```

### News Agent
```bash
# Run manually
node scripts/lagos-news-agent.js

# Auto-runs every 3 hours via macOS launchd
# Config: ~/Library/LaunchAgents/com.gidiconnect.newsagent.plist
# Logs:   logs/news-agent.log
```

---

## Recent Updates

### March 25, 2026 — Admin Portal Separation + Venue RLS Fix

#### Admin Portal Separated into Standalone App
- `apps/admin-portal/` created as a completely independent Vite app on **port 3002**
- Auth context: `AdminAuthContext` — no signup, no subscription, no verification
- Role gate: `AdminLayout` — only Admin/Super Admin; all others see Access Denied with link to business portal
- Pages: Overview, Venue Manager, Promotions Manager, User Manager (flat routes, no `/admin/` prefix)
- Business portal cleanup:
  - Removed `/admin/*` routes from App.tsx
  - Removed admin sidebar section from Sidebar.tsx
  - Removed admin promotion panel from VenueDetails.tsx
  - `DashboardLayout` now allows Business Owner role only (not Admin/Super Admin)

---

### March 25, 2026 — Admin Venue RLS Fix

#### Problem
Admin users clicking "Manage Venue" on the Admin Venues page were stuck in an infinite loading loop. Root cause: Supabase RLS policies only allowed `SELECT` and `UPDATE` on venues where `owner_id = auth.uid()`, silently filtering out all rows for admin users. The `useVenue` hook also had a hardcoded `.eq('owner_id', user?.id)` filter that blocked admins from loading any venue they didn't own.

#### Fix
- **Migration**: `20260314000001_admin_venue_rls.sql`
  - Dropped old restrictive `"Business owners can update/view own venues"` policies
  - Added `"Owners and admins can view venues"` — owners see own; admins see all
  - Added `"Owners and admins can update venues"` — owners update own; admins update any
- **`useVenues.ts` (`useVenue` hook)**: Now reads `profile` from `useBusinessAuth()`; skips `.eq('owner_id')` filter when `isAdmin = true`

---

### March 14, 2026 — Trending Venues Algorithm + Admin Portal

#### Trending Venues Overhaul
- **Migration**: `20260314000000_trending_venues.sql`
  - Added `is_promoted BOOLEAN`, `promoted_until TIMESTAMPTZ`, `promotion_label TEXT` to `venues`
  - Created `trending_venues` Postgres view with time-decayed hot score formula
- **TrendingVenues.tsx**: Now queries view; real check-in counts; Sponsored badge for promoted venues
- **VenueDetails.tsx (business portal)**: Admin-only promotion panel (set badge label + days)

#### Admin Portal (new)
- 4 new pages: AdminOverview, AdminVenues, AdminPromotions, AdminUsers
- Sidebar admin section auto-shown for Admin/Super Admin roles
- DashboardLayout updated to allow Admin/Super Admin access (was Business Owner only)
- Role change from Admin UI writes directly to `profiles.role`

---

### March 13, 2026 — Business Portal Schema Fixes

- **Migration**: `20260313000000_add_amenities_and_tags_to_venues.sql`
  - Added `amenities TEXT[]`, `tags TEXT[]`, `instagram_handle TEXT` to venues
  - Fixed "Could not find 'amenities' column" Edge Function error
- **Migration**: `20260313000001_change_venue_category_to_text.sql`
  - Changed `category` from `venue_category` enum → `TEXT`
  - Fixed mismatch between portal form values and DB enum

---

### March 10–12, 2026 — iOS 26 Emoji Rendering Fix

**Root cause**: React Native 0.81.5 + `newArchEnabled: true` + iOS 26 beta caused all emoji to render as `[?]` boxes.

**Fix**:
- `app.json`: Set `newArchEnabled: false`; removed `runtimeVersion` and `updates` (was generating `exp+` QR codes incompatible with Expo Go)
- Replaced every emoji icon in the app with Ionicons (`@expo/vector-icons`)

**Files changed** (15+ files):

| File | Change |
|---|---|
| `App.tsx` | All 5 tab icons → Ionicons |
| `HomeScreen.tsx` | Notification bell, search, map, arrow, section titles, news icon → Ionicons |
| `ExploreScreen.tsx` | Category/neighbourhood arrays, search, location, star, action buttons → Ionicons |
| `EventsScreen.tsx` | Meta icons, fallback icons, empty state → Ionicons; stripped "⭐" from "Featured" |
| `SocialScreen.tsx` | Bell, camera, action icons, modal labels, empty states → Ionicons |
| `ProfileScreen.tsx` | All settings/menu icons → Ionicons |
| `NewsScreen.tsx` | Header, empty state → Ionicons |
| `ExploreAreaScreen.tsx` | Star rating → Ionicons; fixed duplicate import crash |
| `DiscoverScreen.tsx` | Activity icons, back button → Ionicons |
| `TrafficAlert.tsx` | Severity icons → Ionicons; stripped 🚦 from title |
| `VibeCheck.tsx` | Filter icons, empty state → Ionicons; stripped emoji from vibe status strings |
| `TrendingVenues.tsx` | Bookmark, location → Ionicons; stripped emoji from vibe status strings |
| `ErrorBoundary.tsx` | ⚠️ → Ionicons `warning` |
| `StoryEditor.tsx` | ✕ buttons → Ionicons; stripped emoji from "Next →", "Post Story 🚀", "← Back" |
| `StoryViewer.tsx` | ✕ close → Ionicons; sticker overlay text gets `fontFamily: ''` |

**Sticker/emoji exception**: Sticker overlays in StoryViewer and the sticker picker grid in StoryEditor retain `fontFamily: ''` — these are intentional user-placed emoji, not UI icons.

---

### March 9, 2026 — Communities Overhaul + Business Portal

#### Communities Bug Fixes
- Fixed `fetchCommunities()` — now queries `community_members` to set correct `is_joined` per user (was always `false`)
- Rewrote `handleJoinCommunity` with optimistic update + revert-on-failure
- Removed dead `fetchFollowing` function
- Added `COMMUNITY_ICON_MAP` with Unicode escape sequences — icons no longer depend on DB encoding
- **Migration**: `20260309000000_seed_core_communities.sql` — seeds 8 core Lagos communities

#### Business Portal Launch
- Venue creation via Edge Function `create-venue`
- Event management (create, publish, edit, delete)
- Photo upload/delete per venue
- Subscription tiers (Free, Premium, Enterprise)
- Analytics page (Premium)
- Business verification flow

---

### February 2026 — Stories, People Tab, Auth

- My Vibe (Stories) feature: create, view, expire, filter effects, text/sticker overlays
- People tab added to SocialScreen with follow/unfollow
- Profile data: `profiles` table → auth metadata → email prefix (layered fallback)
- Tab bar padding via `useSafeAreaInsets`
- `StoryEditor.tsx` created
- **Migrations**: stories table, story_views, story editor columns, activity tables, traffic cache

---

### January 2026 — News System, UI Polish

- Real news scraping from 14 Nigerian sources
- Date validation: mandatory, max 60 days, no future dates
- Duplicate prevention: URL-based in-run + DB check
- Auto-update every 3 hours via macOS launchd
- Custom tab bar (replaced default React Navigation tab bar)
- `ErrorBoundary` wrapping full app
- Story progress bar duplicate fixed

---

## Known Issues

- [ ] SMTP not configured — password reset emails won't send (see `SUPABASE-EMAIL-SETUP.md`)
- [ ] `get-traffic` Supabase Edge Function not deployed — `TOMTOM_API_KEY` not set; TrafficAlert uses mock data
- [ ] `expo-video` requires native build — cannot use Expo Go QR scanning; must use `npx expo run:ios`
- [ ] `@expo/ngrok` not installed — tunnel mode unavailable for cross-network testing

---

## File Structure

```
gidi-vibe-connect/
├── apps/
│   ├── consumer-app/
│   │   ├── App.tsx                        # Root navigation + custom tab bar
│   │   ├── app.json                       # Expo config (newArchEnabled: false, expo-video plugin)
│   │   ├── index.ts
│   │   ├── config/
│   │   │   └── supabase.ts
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── NewsScreen.tsx
│   │   │   ├── ExploreScreen.tsx
│   │   │   ├── ExploreAreaScreen.tsx
│   │   │   ├── EventsScreen.tsx
│   │   │   ├── SocialScreen.tsx
│   │   │   ├── ProfileScreen.tsx
│   │   │   └── DiscoverScreen.tsx
│   │   └── components/
│   │       ├── StorySection.tsx
│   │       ├── StoryViewer.tsx
│   │       ├── StoryEditor.tsx
│   │       ├── TrafficAlert.tsx
│   │       ├── VibeCheck.tsx
│   │       ├── TrendingVenues.tsx         # Queries trending_venues view
│   │       └── ErrorBoundary.tsx
│   │
│   ├── business-portal/               # Venue owners only (port 3001)
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── contexts/
│   │       │   └── BusinessAuthContext.tsx
│   │       ├── hooks/
│   │       │   ├── useVenues.ts
│   │       │   └── useEvents.ts
│   │       ├── components/
│   │       │   └── layout/
│   │       │       ├── DashboardLayout.tsx  # Business Owner only
│   │       │       ├── Sidebar.tsx
│   │       │       └── Header.tsx
│   │       └── pages/
│   │           ├── Dashboard.tsx
│   │           ├── Venues.tsx
│   │           ├── VenueForm.tsx
│   │           ├── VenueDetails.tsx
│   │           ├── Analytics.tsx
│   │           ├── Events.tsx
│   │           ├── EventForm.tsx
│   │           ├── EventDetails.tsx
│   │           ├── Offers.tsx
│   │           ├── Subscription.tsx
│   │           └── Settings.tsx
│   │
│   └── admin-portal/                  # Platform admins only (port 3002)
│       └── src/
│           ├── App.tsx
│           ├── contexts/
│           │   └── AdminAuthContext.tsx   # Admin-only auth (no signup)
│           ├── components/
│           │   └── layout/
│           │       ├── AdminLayout.tsx    # Admin/Super Admin gate
│           │       ├── AdminSidebar.tsx   # Role badge in footer
│           │       └── AdminHeader.tsx
│           └── pages/
│               ├── Login.tsx
│               ├── Overview.tsx           # Platform stats
│               ├── VenueManager.tsx       # All venues + promote/remove
│               ├── PromotionsManager.tsx  # Active/expired tracking
│               └── UserManager.tsx        # User search + role management
│
└── supabase/
    ├── functions/
    │   ├── create-venue/                  # Edge Function: venue creation
    │   └── get-traffic/                   # Edge Function: Lagos traffic (not deployed)
    └── migrations/
        ├── 20260222000004_create_traffic_cache.sql
        ├── 20260222000005_create_activity_tables.sql
        ├── 20260309000000_seed_core_communities.sql
        ├── 20260310000000_business_portal_rpcs_and_policies.sql
        ├── 20260313000000_add_amenities_and_tags_to_venues.sql
        ├── 20260313000001_change_venue_category_to_text.sql
        ├── 20260314000000_trending_venues.sql    # Hot score view + promotion columns
        └── 20260314000001_admin_venue_rls.sql    # Admin bypass RLS for venues
```

---

**Last Updated**: March 25, 2026
**Version**: 1.6.0
**Status**: Active development — beta-ready
