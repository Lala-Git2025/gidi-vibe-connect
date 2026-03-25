# Gidi Admin Portal

Standalone admin dashboard for platform administrators. Completely separate from the business portal.

**URL**: http://localhost:3002 (dev)
**Target**: admin.gidiconnect.com (production)

---

## Access

**Admin Portal only** — restricted to `Admin` and `Super Admin` roles.

Business owners attempting to log in are shown an Access Denied screen with a link to the Business Portal.

To elevate a user to Admin, run in Supabase SQL Editor:
```sql
UPDATE profiles SET role = 'Admin' WHERE user_id = '<uuid>';
-- or for full platform access:
UPDATE profiles SET role = 'Super Admin' WHERE user_id = '<uuid>';
```

---

## Setup

1. **Install dependencies:**
   ```bash
   cd apps/admin-portal
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Update `.env` with Supabase credentials** (same project as business portal):
   ```
   VITE_SUPABASE_URL=https://xvtjcpwkrsoyrhhptdmc.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

---

## Pages

| Route | Page | Purpose |
|---|---|---|
| `/login` | Login | Admin sign-in (no self-registration) |
| `/` | Overview | Platform stats: users, venues, active promotions, new signups |
| `/venues` | Venue Manager | All venues — search, promote/remove, set badge + days |
| `/promotions` | Promotions Manager | Active vs expired promotion tracking, expiry countdown |
| `/users` | User Manager | Search users, filter by role, inline role assignment |

---

## Features

- [x] Admin-only login (no signup link)
- [x] Platform overview stats
- [x] Venue manager — promote any venue, set badge label + duration
- [x] Promotions tracker — active/expired buckets, one-click remove
- [x] User manager — search, filter, inline role changes (Super Admin rows locked)
- [x] Role badge in sidebar (amber for Admin, red for Super Admin)
- [x] Access Denied screen with Business Portal link for non-admins

---

## Tech Stack

- **React 18** + TypeScript
- **Vite** (port 3002)
- **Tailwind CSS**
- **React Router v6**
- **@tanstack/react-query**
- **lucide-react**
- **Supabase** (same project as business portal + consumer app)

---

## Project Structure

```
apps/admin-portal/
└── src/
    ├── App.tsx                       # Flat routes: /, /venues, /promotions, /users
    ├── main.tsx
    ├── index.css                     # Tailwind + CSS custom properties (orange primary)
    ├── lib/
    │   ├── supabase.ts
    │   └── utils.ts
    ├── contexts/
    │   └── AdminAuthContext.tsx      # Admin-only auth (no signUp, no subscription)
    ├── components/
    │   ├── layout/
    │   │   ├── AdminLayout.tsx       # Role gate: Admin/Super Admin only
    │   │   ├── AdminSidebar.tsx      # Nav + role badge
    │   │   └── AdminHeader.tsx
    │   └── ui/
    │       ├── button.tsx
    │       ├── card.tsx
    │       └── input.tsx
    └── pages/
        ├── Login.tsx
        ├── Overview.tsx
        ├── VenueManager.tsx
        ├── PromotionsManager.tsx
        └── UserManager.tsx
```

---

## Deployment

```bash
npm run build
# Deploy dist/ to Vercel or Netlify
# DNS: CNAME admin → <deployment-url>
# Access at: admin.gidiconnect.com
```

---

**Last Updated**: March 25, 2026
