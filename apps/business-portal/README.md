# Gidi Business Portal

Web dashboard for venue owners and platform admins to manage venues, events, promotions, and users.

**URL**: http://localhost:3001 (dev)
**Target**: business.gidiconnect.com (production)

> Platform administrators should use the **Admin Portal** at http://localhost:3002 instead.

---

## Setup

1. **Install dependencies:**
   ```bash
   cd apps/business-portal
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Update `.env` with your Supabase credentials:**
   ```
   VITE_SUPABASE_URL=https://xvtjcpwkrsoyrhhptdmc.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
   VITE_APP_NAME=Gidi Business Portal
   VITE_CONSUMER_APP_URL=http://localhost:8080
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

---

## Access Roles

| Role | Business Portal | Admin Portal |
|---|---|---|
| Consumer | No | No |
| Content Creator | No | No |
| Business Owner | Yes | No |
| Admin | No → use Admin Portal | Yes (port 3002) |
| Super Admin | No → use Admin Portal | Yes (port 3002) |

To elevate a user to Admin, run in Supabase SQL Editor:
```sql
UPDATE profiles SET role = 'Admin' WHERE user_id = '<uuid>';
```

---

## Features

### Business Owner Features
- [x] Login / Signup (email + password)
- [x] Dashboard overview (venues, views, events, offers stats)
- [x] Venue management (create, edit, delete, photo upload)
- [x] Event management (create, publish, edit, image upload)
- [x] Analytics dashboard (Premium tier)
- [x] Offers & promotions page (Premium tier)
- [x] Subscription management (Free / Premium / Enterprise)
- [x] Account settings
- [x] Business verification flow
- [x] Admin promotion panel on Venue Details (Admin only)

### Admin Features
- [x] Platform overview stats (total users, venues, active promotions, new signups 7d)
- [x] Venue manager — search all venues, promote/remove promotions, set badge label + days
- [x] Promotions tracker — active vs expired, expiry countdown, one-click remove
- [x] User management — search/filter users, inline role assignment (Super Admin rows locked)

---

## Subscription Tiers

| Feature | Free | Premium | Enterprise |
|---|---|---|---|
| Venues | 1 | 3 | Unlimited |
| Photos/venue | 10 | 50 | Unlimited |
| Events/month | 5 | 20 | Unlimited |
| Analytics | No | Yes | Yes |
| Offers | No | Yes | Yes |
| Priority listing | No | Yes | Yes |

---

## Routes

| Route | Page | Role |
|---|---|---|
| `/` | Redirect to `/dashboard` | — |
| `/login` | Login | Public |
| `/signup` | Signup | Public |
| `/dashboard` | Overview stats | Business Owner+ |
| `/venues` | Venue list | Business Owner+ |
| `/venues/new` | Create venue | Business Owner+ |
| `/venues/:id` | Venue details + promotion panel | Business Owner+ |
| `/venues/:id/edit` | Edit venue | Business Owner+ |
| `/analytics` | Analytics | Business Owner+ |
| `/events` | Events list | Business Owner+ |
| `/events/new` | Create event | Business Owner+ |
| `/events/:id` | Event details | Business Owner+ |
| `/offers` | Offers | Business Owner+ |
| `/subscription` | Plans | Business Owner+ |
| `/settings` | Account settings | Business Owner+ |
| `/admin` | Admin overview | Admin, Super Admin |
| `/admin/venues` | All venues manager | Admin, Super Admin |
| `/admin/promotions` | Promotions tracker | Admin, Super Admin |
| `/admin/users` | User management | Admin, Super Admin |

---

## Database Migrations (applied)

| Migration | Purpose |
|---|---|
| `20260310000000_business_portal_rpcs_and_policies.sql` | Storage bucket, business_subscriptions, RLS |
| `20260313000000_add_amenities_and_tags_to_venues.sql` | amenities[], tags[], instagram_handle on venues |
| `20260313000001_change_venue_category_to_text.sql` | category enum → TEXT |
| `20260314000000_trending_venues.sql` | is_promoted, promoted_until, promotion_label, trending_venues view |
| `20260314000001_admin_venue_rls.sql` | Admin bypass RLS — admins can SELECT/UPDATE all venues |

---

## Project Structure

```
apps/business-portal/
└── src/
    ├── App.tsx                    # Routes (incl. /admin/*)
    ├── contexts/
    │   └── BusinessAuthContext.tsx  # Auth, profile, subscription
    ├── hooks/
    │   ├── useVenues.ts           # Venue CRUD; admin skips owner_id filter
    │   └── useEvents.ts
    ├── lib/
    │   └── supabase.ts
    ├── components/
    │   └── layout/
    │       ├── DashboardLayout.tsx  # Role guard (Business Owner, Admin, Super Admin)
    │       ├── Sidebar.tsx          # Nav + admin section for admin roles
    │       └── Header.tsx
    └── pages/
        ├── Dashboard.tsx
        ├── Venues.tsx
        ├── VenueForm.tsx
        ├── VenueDetails.tsx       # + Admin promotion panel (amber card)
        ├── Analytics.tsx
        ├── Events.tsx
        ├── EventDetails.tsx
        ├── Offers.tsx
        ├── Subscription.tsx
        ├── Settings.tsx
        └── admin/
            ├── AdminOverview.tsx
            ├── AdminVenues.tsx
            ├── AdminPromotions.tsx
            └── AdminUsers.tsx
```

---

## Tech Stack

- **React 18** + TypeScript
- **Vite** (build tool)
- **Tailwind CSS** + **shadcn/ui**
- **React Router v6**
- **@tanstack/react-query** (data fetching)
- **lucide-react** (icons)
- **Supabase** (backend)
- **Recharts** (analytics charts)

---

## Deployment

```bash
npm run build
# Deploy dist/ to Vercel or Netlify
# DNS: CNAME business → <deployment-url>
# Access at: business.gidiconnect.com
```

---

**Last Updated**: March 25, 2026
