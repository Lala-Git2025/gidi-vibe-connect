# Consumer App V2 — Polished

A polished re-do of the consumer app's primary screens, pushing the brand
direction harder: bolder typography, more gold glow, animated rings, and
richer information density across Home / Social / Profile.

This is a **design proposal** living in the design system project. Nothing
in the real codebase changes until the user signs off.

## What's polished

| Surface | Highlights |
|---|---|
| **AppHeader** | Wordmark renders as a vertical gold-gradient text with a soft drop-shadow; pulsing green "online" dot. |
| **Greeting** | Two-line greeting that splits the daypart in gold ("FRIDAY EVENING") and adds a "What's the vibe tonight?" hook. |
| **Story rail** | 72px rings with rotating conic-gradient (gold for creators, magenta for peers); counter-rotated avatars; verified ⭐ badge has its own glow. |
| **Category grid** | Six jewel-tone gradient tiles with corner shine + spot counts. |
| **Vibe Check** | Breathing gold border, 3-ring pings with blur, magnified VI pulse, vibe word renders as gradient text that breathes. |
| **Trending venues** | Rank number, dramatic rim-light, glass info bar with trend delta. |
| **News rail** | Magazine-style cards with gold category badge, "Breaking" tag for recent items. |
| **Traffic** | Per-card pulsing dot + delay estimate. |
| **Bottom nav** | Floating capsule, gold-filled active pill, glass blur. |
| **Social** | Segmented Feed / Communities / People tabs; composer card with rotating gold avatar; feature posts with author check, location chip, image scrim and engagement row. |
| **Profile** | Full-bleed Lagos rooftop hero, large rotating gold ring avatar (with counter-rotating photo), centered bio, stat row with gold-gradient numbers, three-tab Posts / Stats / Badges switcher. |

## Files

| File | Purpose |
|---|---|
| `index.html` | Entry — iPhone frame + clickable bottom nav |
| `styles.css` | V2 design tokens layered on top of `../../colors_and_type.css` |
| `Icon.jsx` | React-safe wrapper around Lucide icons (prevents DOM reconciliation conflicts) |
| `AppHeader.jsx`, `BottomNav.jsx` | Common chrome |
| `StoryRail.jsx`, `CategoryGrid.jsx`, `VibeCheck.jsx`, `TrendingVenues.jsx`, `NewsRail.jsx`, `TrafficAlert.jsx` | Home rails |
| `HomeScreen.jsx`, `SocialScreen.jsx`, `ProfileScreen.jsx` | Composed screens |
| `ios-frame.jsx` | iPhone device chrome |

## Once approved — applying to the real codebase

These mocks are intentionally **pure-cosmetic** rebuilds — same data shapes,
same screens, same component boundaries as the existing
`apps/consumer-app/screens/` files. After sign-off, the work is:

1. Mirror each polished JSX into the matching React-Native `screens/*.tsx`
   / `components/*.tsx` file (StyleSheet instead of inline style).
2. Add the new keyframes (`gc2Pulse`, `gc2Breathe`, `gc2RingRotate`) using
   `react-native-reanimated` since CSS keyframes don't exist on RN.
3. Update the `ThemeContext` primary stops to introduce
   `#FDE047 → #EAB308 → #A16207` for the gradient.
4. Keep all data fetching, navigation, and Supabase wiring as-is.

No new dependencies, no library swaps, no schema changes.
