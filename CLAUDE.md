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
│           ├── pages/         # Dashboard, Venues, Events, Analytics, admin/*
│           ├── hooks/         # useVenues.ts, useEvents.ts
│           ├── contexts/      # BusinessAuthContext
│           └── components/    # DashboardLayout, Sidebar, Header
├── supabase/
│   ├── migrations/            # All DB migrations (timestamped)
│   └── functions/             # Edge functions (create-venue, get-traffic)
└── scripts/
    └── lagos-news-agent.js    # Auto news scraper (macOS launchd, every 3h)
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
| `/venues` | Venue Manager | All venues — search, promote/remove |
| `/promotions` | Promotions Manager | Active/expired tracking, expiry countdown |
| `/users` | User Manager | Search, filter by role, inline role change |

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
- **business_subscriptions** - `user_id, tier, max_venues, max_events_per_month, etc.`
- **news** - `title, content, image_url, publish_date, source_url`

### Views
- **trending_venues** — Time-decayed hot score. Promoted venues score 999999. Score formula: `(checkins_24h × 10 + checkins_7d × 3 + live_rating × 20) / (hours_since_last_activity + 2)^1.5`

### Storage Buckets
- **avatars** - Profile pictures
- **social-media** - Post images and story media
- **venue-photos** - Business portal venue photos
- **event-images** - Event banners

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

### March 2026
- **Ionic icons**: All emoji icons replaced with Ionicons — `newArchEnabled: false` in app.json
- **Trending algorithm**: `trending_venues` Postgres view with time-decayed hot score; promoted venues pin to top
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

## Known Issues / TODOs

- [ ] SMTP not configured — password reset emails won't send
- [ ] `get-traffic` Edge Function not deployed — TrafficAlert uses mock data (`TOMTOM_API_KEY` not set)
- [ ] `expo-video` requires native build — cannot use Expo Go QR scanning
- [ ] Stories `social-media` bucket RLS may need review for public read access
