# Admin Portal V2 — Polished

Polished re-do of the platform admin command center. Charcoal sidebar with
**orange primary** (admin-specific), gold accents preserved for "Lagos"
brand elements (promoted badges, hot scores), purple for super-admin role.

This is a **design proposal** living in the design system project. Nothing
in the real codebase changes until the user signs off.

## What's polished

| Surface | Highlights |
|---|---|
| **Sidebar** | Deep charcoal, orange active bar, grouped nav (Platform / Curation / Community / System), count chips on every route (142 venues, 12.4k users, 3 reports w/ red alert), pinned super-admin chip at the bottom. |
| **Top bar** | Universal search ⌘K; bright **PRODUCTION** env pill with pulsing dot; reports counter that says "3 reports · NEW"; orange primary CTA. |
| **Overview** | 5-card KPI strip (Total users, MAU, Venues, Promoted, ₦4.8M revenue) — first one is a **hot card** with orange ambient and gradient number; 30-day user-growth AreaChart; Users-by-role donut; Top venues bar chart; **Open reports** panel with severity icons; **Audit log** stream. |
| **Venue Manager** | 4-card stats strip; Lagos-area filter chips; rich table with hot score (PINNED for promoted), rating, 24h check-ins, promo badge, expiry countdown. Pagination footer for 142 venues. |
| **User Manager** | Role filter chips with counts (incl. red **Flagged** chip); table with role-coded pills (purple Super Admin / orange Admin / gold Business / blue Creator / green User), flagged users get red border + pulsing dot. Pagination footer for 12,400 users. |

## Files

| File | Purpose |
|---|---|
| `index.html` | Entry — shell + clickthrough |
| `styles.css` | Admin tokens on `../../colors_and_type.css` |
| `Icon.jsx` | Shared Lucide wrapper |
| `Charts.jsx` | Reused chart primitives |
| `Sidebar.jsx`, `TopBar.jsx` | Shell chrome |
| `Overview.jsx` | Composed dashboard |
| `VenueManagerPage.jsx`, `UserManagerPage.jsx` | Main admin curation surfaces |

## Mapping to real codebase

| Mock | Real file |
|---|---|
| `Overview.jsx` | `apps/admin-portal/src/pages/Overview.tsx` |
| `VenueManagerPage.jsx` | `apps/admin-portal/src/pages/VenueManager.tsx` |
| `UserManagerPage.jsx` | `apps/admin-portal/src/pages/UserManager.tsx` |
| `Sidebar.jsx` | `apps/admin-portal/src/components/layout/Sidebar.tsx` |

## Brand notes

The admin portal **doesn't lead** with Lagos Gold — that's the consumer
brand. Admin gets **Lagos Orange** (`#F97316`) as its primary, which keeps
it visually distinct from both the consumer app and business portal at a
glance. Gold is preserved for **Promoted** badges and Business-tier
indicators, since those map to consumer-facing brand. Purple is used only
for Super Admin to signal the highest tier of power.
