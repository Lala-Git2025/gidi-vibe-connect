# Gidi Connect — Lagos Lifestyle & Social Discovery Platform

Your ultimate guide to experiencing Lagos nightlife, events, dining, and social connections.

---

## Project Overview

Gidi Connect is a multi-platform application (mobile + web) that helps users discover, explore, and connect with Lagos's vibrant lifestyle scene. The ecosystem consists of a React Native consumer app and a React web business portal, both backed by Supabase.

---

## Project Structure

```
gidi-vibe-connect/
├── apps/
│   ├── consumer-app/          # React Native mobile app (iOS/Android)
│   ├── business-portal/       # Web portal for venue owners (port 3001)
│   └── admin-portal/          # Web portal for platform admins (port 3002)
├── supabase/
│   ├── migrations/            # Timestamped Postgres migrations
│   └── functions/             # Supabase Edge Functions
├── scripts/
│   └── lagos-news-agent.js    # Automated Lagos news scraper
└── .github/workflows/         # CI/CD (news agent workflow)
```

---

## Applications

### 1. Consumer Mobile App
**Location**: `apps/consumer-app/`
**Platform**: iOS & Android
**Technology**: React Native + Expo SDK 54

**Screens**: Home, Explore, Events, Social, Profile, News, ExploreArea, Discover

**Features**:
- Home feed: stories, trending venues, live news, traffic, vibe check
- Venue discovery by category and area
- Events calendar & RSVP
- Social: feed, communities, People tab, follow/unfollow
- My Vibe (Stories): image/video stories with filters, text overlays, stickers
- Real-time Lagos traffic severity cards
- Area vibe metrics (crowd, music, price, wait)
- Trending venues showing admin-promoted venues only (curated by platform admins)
- User auth: sign in, sign up, guest mode, forgot password

📖 **[Complete Feature Documentation](CONSUMER-APP-FEATURES.md)**

---

### 2. Business Portal
**Location**: `apps/business-portal/`
**Platform**: Web (React + Vite, port 3001)
**Technology**: React 18 + TypeScript + Tailwind CSS + shadcn/ui + React Query

**Roles**: Business Owner only

**Features**:
- Venue management: create, edit, photos, amenities, tags
- Event management: create, publish, image upload
- Analytics dashboard (Premium)
- Offers & promotions page (Premium)
- Subscription management (Free / Premium / Enterprise)
- Account settings + business verification flow

---

### 3. Admin Portal
**Location**: `apps/admin-portal/`
**Platform**: Web (React + Vite, port 3002)
**Technology**: React 18 + TypeScript + Tailwind CSS + React Query

**Roles**: Admin and Super Admin only

**Features**:
- Platform overview stats (users, venues, active promotions, new signups 7d)
- **Analytics dashboard**: 8 stat cards (incl. MAU), user growth chart (30d area), users by role (donut), venues by area (horizontal bar), venues by category (pie), top 10 trending venues, top events by RSVPs (bar), business subscription tiers (donut), recent activity feed
- **Venue manager**: promote any venue, set badge label + duration, location filter pills (6 Lagos areas with counts), server-side search, server-side pagination (25/page)
- **Promotions tracker**: active vs expired, expiry countdown
- **User manager**: search, filter by role, inline role changes, server-side pagination (25/page)

---

## Tech Stack

### Consumer App
| Concern | Technology |
|---|---|
| Platform | React Native (Expo SDK 54) |
| Navigation | React Navigation v7 (custom bottom tabs) |
| Icons | Ionicons (`@expo/vector-icons`) |
| Font | Orbitron (`@expo-google-fonts/orbitron`) |
| Video | expo-video ~3.0 |
| Backend | Supabase |
| Language | TypeScript |
| State | React Context (ThemeContext) |

### Business Portal
| Concern | Technology |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Data | @tanstack/react-query + Supabase |
| Icons | lucide-react |
| Router | React Router v6 |
| Language | TypeScript |

### Backend
| Concern | Technology |
|---|---|
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (avatars, social-media, venue-photos, event-images) |
| Edge Functions | create-venue, get-traffic |
| News automation | GitHub Actions (every hour) + macOS launchd (every 3h) |

---

## Key Features

### Trending Venues Algorithm
Venues are ranked by a time-decayed composite hot score:
```
score = (checkins_24h × 10 + checkins_7d × 3 + live_rating × 20)
        ÷ (hours_since_last_activity + 2)^1.5
```
Paid/promoted venues are pinned to the top (score = 999,999). Computed via the `trending_venues` Postgres view — no cron needed.

### News System
Auto-updates every hour via GitHub Actions (every 3h via macOS launchd). Sources: 14 Nigerian outlets including Premium Times, Punch, BellaNaija, Pulse Nigeria, Linda Ikeji, Instablog9ja, and more.

### Stories (My Vibe)
Short-lived user moments: image or video, filter effects, text overlays, sticker picker. Stored with `expires_at`; viewed via full-screen animated viewer with progress bar.

### Communities
8 seeded Lagos communities + user-created ones. Join/leave with optimistic UI. Member count via DB trigger.

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- iOS: macOS + Xcode
- Android: Android Studio

### Consumer App
```bash
cd apps/consumer-app
npm install
npx expo run:ios       # iOS simulator (native build required for expo-video)
npx expo run:android   # Android emulator
```

### Business Portal
```bash
cd apps/business-portal
npm install
cp .env.example .env   # Fill in Supabase credentials
npm run dev            # http://localhost:3001
```

### Admin Portal
```bash
cd apps/admin-portal
npm install
cp .env.example .env   # Same Supabase credentials as business portal
npm run dev            # http://localhost:3002
```

### Database
```bash
npx supabase db push   # Apply all pending migrations
```

### Environment Variables

**Consumer app** (`apps/consumer-app/config/supabase.ts`):
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

**Business portal** (`apps/business-portal/.env`):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_APP_NAME=Gidi Business Portal
VITE_CONSUMER_APP_URL=http://localhost:8080
```

---

## Database Schema

See [CONSUMER-APP-FEATURES.md](CONSUMER-APP-FEATURES.md#database-schema) for the full schema.

Key tables: `profiles`, `venues`, `events`, `posts`, `communities`, `follows`, `stories`, `story_views`, `venue_check_ins`, `event_rsvps`, `venue_reviews`, `business_subscriptions`, `business_profiles`, `admin_profiles`, `news`

Key views: `trending_venues` (materialized view — hot-score ranked + promoted venues)

---

## Image Upload Guidelines (Venue Photos)

| Property | Value |
|---|---|
| **Minimum resolution** | 1200 × 800 px (3:2 aspect ratio) |
| **Recommended** | 1600 × 1067 px |
| **Max file size** | 5 MB |
| **Formats** | JPEG, PNG, WebP |

Consumer app venue cards display at 280×320 px. The 3:2 aspect ratio ensures good cropping for both horizontal and vertical layouts. Images should be at least 1200 px wide for sharp high-DPI rendering.

---

## Making a User Admin

Run in Supabase SQL Editor:
```sql
UPDATE profiles SET role = 'Admin' WHERE user_id = '<user-uuid>';
-- or
UPDATE profiles SET role = 'Super Admin' WHERE user_id = '<user-uuid>';
```

---

## Scalability & Performance

The database is designed to handle millions of users, businesses, and hundreds of admins efficiently.

### Architecture Decisions
- **Materialized view** for `trending_venues` — precomputed scores refreshed every 10 min, not calculated per request
- **`auth_role()` / `is_admin()` / `is_super_admin()`** — STABLE helper functions replace per-row RLS subqueries, cached per-transaction
- **Follow count cache** — `follower_count` / `following_count` columns on `profiles`, auto-synced via trigger (avoids `COUNT(*)` on follows table)
- **BRIN indexes** on time-series tables (`venue_check_ins`, `story_views`, `event_rsvps`) for efficient range scans with minimal index size
- **Server-side pagination** on admin portal (25 per page) with server-side search and filtering
- **Role-specific extension tables** — `business_profiles` and `admin_profiles` extend the base `profiles` table, auto-created on role assignment via trigger
- **Full-text search** indexes (GIN) on events and venues for fast keyword search

### pg_cron Setup (Required after deployment)

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

3. **Verify jobs**: `SELECT jobid, schedule, command, jobname FROM cron.job;`
4. **Check run history**: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

### Manage pg_cron Jobs
```sql
-- Remove a job
SELECT cron.unschedule('refresh-trending-venues');

-- Change frequency (e.g. every 5 min instead of 10)
SELECT cron.unschedule('refresh-trending-venues');
SELECT cron.schedule('refresh-trending-venues', '*/5 * * * *', 'SELECT refresh_trending_venues();');
```

---

## Documentation

- **[CONSUMER-APP-FEATURES.md](CONSUMER-APP-FEATURES.md)** — Complete feature documentation (all screens, components, schema, updates)
- **[CLAUDE.md](CLAUDE.md)** — Project conventions and context for AI-assisted development
- **[NEWS-AUTO-UPDATE.md](NEWS-AUTO-UPDATE.md)** — News scraper & automation setup
- **[NATIVE-DEPLOYMENT.md](NATIVE-DEPLOYMENT.md)** — iOS & Android deployment guide
- **[SUPABASE-EMAIL-SETUP.md](SUPABASE-EMAIL-SETUP.md)** — SMTP / email configuration

---

## Current Status

### Completed
- [x] Consumer mobile app — all screens and features
- [x] Business portal — venue, event, analytics, subscription management
- [x] Admin portal — standalone app (port 3002): platform stats, analytics dashboard, venue promotion manager, user management
- [x] Supabase auth (email/password, guest mode)
- [x] My Vibe (Stories) with editor, filters, overlays
- [x] People tab with follow/unfollow
- [x] Communities (join/leave, 8 seeded + user-created)
- [x] Trending venues — curated by admins (only promoted venues shown in consumer app)
- [x] Real-time news from 14 Nigerian sources (auto-updated every hour)
- [x] Traffic severity cards
- [x] Ionicons migration (replaced all emoji icons — iOS 26 fix)
- [x] Admin RLS policies (admins can view/manage all venues, analytics data)
- [x] Role-specific tables (`business_profiles`, `admin_profiles`) with auto-creation triggers
- [x] Scalability overhaul: materialized views, auth helper functions, BRIN indexes, follow count cache, server-side pagination
- [x] pg_cron scheduled jobs for trending refresh and story cleanup
- [x] Admin analytics dashboard with charts (user growth, role breakdown, venue stats, event engagement, subscription tiers, activity feed)
- [x] Admin venue manager with location filter pills and server-side area filtering
- [x] Light/dark mode fix — trending venue cards use fixed white text over dark overlays
- [x] Venue deduplication (by id + case-insensitive name)
- [x] Auth context hardening — safety timeout + error handling to prevent infinite loading

### Known Issues
- [ ] SMTP not configured — password reset emails won't send
- [ ] `get-traffic` Edge Function not deployed (TrafficAlert uses mock data)
- [ ] `expo-video` requires native build — Expo Go QR not supported
- [ ] No client-side image resolution validation on venue photo uploads (recommended: 1200×800 minimum)

---

## Deployment

### Business Portal
```bash
cd apps/business-portal
npm run build
# Deploy dist/ to Vercel / Netlify
# DNS: CNAME business → <hosting-provider>.app
# Access at: business.gidiconnect.com
```

---

**Built for Lagos | Powered by React Native, React, and Supabase**

**Last Updated**: April 3, 2026 | **Version**: 1.8.0
