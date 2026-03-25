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
│   └── business-portal/       # Web portal for venue owners + platform admins
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
- Trending venues with hot-score algorithm + paid promotion slots
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
- Venue manager: promote any venue, set badge label + duration
- Promotions tracker: active vs expired, expiry countdown
- User manager: search, filter by role, inline role changes

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
| News automation | macOS launchd (every 3 hours) |

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
Auto-updates every 3 hours via macOS launchd. Sources: 14 Nigerian outlets including Premium Times, Punch, BellaNaija, Pulse Nigeria, Linda Ikeji, Instablog9ja, and more.

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

Key tables: `profiles`, `venues`, `events`, `posts`, `communities`, `follows`, `stories`, `story_views`, `venue_check_ins`, `event_rsvps`, `venue_reviews`, `business_subscriptions`, `news`

Key views: `trending_venues` (hot-score ranked + promoted venues)

---

## Making a User Admin

Run in Supabase SQL Editor:
```sql
UPDATE profiles SET role = 'Admin' WHERE user_id = '<user-uuid>';
-- or
UPDATE profiles SET role = 'Super Admin' WHERE user_id = '<user-uuid>';
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
- [x] Admin portal — standalone app (port 3002): platform stats, venue promotion manager, user management
- [x] Supabase auth (email/password, guest mode)
- [x] My Vibe (Stories) with editor, filters, overlays
- [x] People tab with follow/unfollow
- [x] Communities (join/leave, 8 seeded + user-created)
- [x] Trending venues with paid promotion support
- [x] Real-time news from 14 Nigerian sources (auto-updated every 3h)
- [x] Traffic severity cards
- [x] Ionicons migration (replaced all emoji icons — iOS 26 fix)
- [x] Admin RLS policies (admins can view/manage all venues)

### Known Issues
- [ ] SMTP not configured — password reset emails won't send
- [ ] `get-traffic` Edge Function not deployed (TrafficAlert uses mock data)
- [ ] `expo-video` requires native build — Expo Go QR not supported

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

**Last Updated**: March 25, 2026 | **Version**: 1.6.0
