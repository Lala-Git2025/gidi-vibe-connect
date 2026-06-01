# Business Portal V2 — Polished

Polished re-do of the Gidi Business web portal — light surface with a
charcoal-and-gold sidebar, bolder typography, and richer data
visualization for venue owners.

This is a **design proposal** living in the design system project. Nothing
in the real codebase changes until the user signs off.

## What's polished

| Surface | Highlights |
|---|---|
| **Sidebar** | Charcoal background with gold-accent active bar; group labels (Workspace / Growth / Account); a glowing "Current plan" card pinned at the bottom. |
| **Top bar** | Centered universal search with ⌘K shortcut; pulsing "What's new" pill; gold-shadowed primary CTA; user chip with avatar. |
| **Dashboard** | Greeting + summary copy that calls out the week's biggest delta; **hero KPI** with gold ambient + gradient number; 3 supporting KPIs with sparklines; weekly views chart with **this-week vs last-week** comparison; active promotions panel; live activity stream. |
| **Venues** | Search + Lagos-area filter chips; rich table with venue thumbnails, **Promoted** badge, Live / Draft / Review pill, vibe state, views / check-ins / RSVPs columns. |
| **Events** | 4 KPI mini-cards (RSVPs this week, sold-out, fill rate, featured slots); filter chips; event cards with hero image, RSVP fill bar (gold→orange when sold out), featured ribbon. |
| **Analytics** | Hero KPI tile + 3 metric tiles; 30-day **AreaChart** with range tabs; top-areas BarChart; subscription-tiers DonutChart; peak-hours heatmap with star marker on peak cell. |

## Files

| File | Purpose |
|---|---|
| `index.html` | Entry — shell + clickthrough |
| `styles.css` | Design tokens layered on `../../colors_and_type.css` |
| `Icon.jsx` | React-safe Lucide wrapper |
| `Charts.jsx` | Self-contained SVG `Sparkline`, `AreaChart`, `BarChart`, `DonutChart` |
| `Sidebar.jsx`, `TopBar.jsx` | Shell chrome |
| `StatCard.jsx` | KPI primitive |
| `Dashboard.jsx`, `VenuesPage.jsx`, `EventsPage.jsx`, `AnalyticsPage.jsx` | Composed pages |

## Mapping to real codebase

These mocks track 1:1 to existing pages so the migration is mechanical:

| Mock | Real file |
|---|---|
| `Dashboard.jsx` | `apps/business-portal/src/pages/Dashboard.tsx` |
| `VenuesPage.jsx` | `apps/business-portal/src/pages/Venues.tsx` |
| `EventsPage.jsx` | `apps/business-portal/src/pages/Events.tsx` |
| `AnalyticsPage.jsx` | `apps/business-portal/src/pages/Analytics.tsx` |
| `Sidebar.jsx` | `apps/business-portal/src/components/layout/Sidebar.tsx` |

Once approved, applying it is mostly:

1. Mirror each polished JSX into the matching `.tsx`.
2. Promote `styles.css` tokens into the portal's Tailwind config and
   `index.css` (already uses `--primary` etc.).
3. Replace the in-portal recharts wiring with the mock's tiny charts, or
   keep recharts and restyle (palette + thinner strokes + gold gradient
   area fill).
4. Keep all `react-query` / Supabase wiring intact.

No new dependencies, no library swaps.
