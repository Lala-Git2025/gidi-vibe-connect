# CLAUDE.md - Project Context for Claude Code

This file contains persistent context, decisions, and conventions for the Gidi Vibe Connect project. Claude Code will automatically read this file to understand the project.

## Project Overview

**Gidi Vibe Connect** is a mobile app for discovering Lagos nightlife, events, venues, and social connections. Built with React Native (Expo) and Supabase backend.

### Tech Stack
- **Frontend:** React Native with Expo (SDK 52)
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State Management:** React Context (ThemeContext)
- **Navigation:** React Navigation (Bottom Tabs)
- **Fonts:** Orbitron (brand font)

## Project Structure

```
gidi-vibe-connect/
├── apps/
│   ├── consumer-app/          # Main mobile app
│   │   ├── screens/           # App screens (Home, Explore, Events, Social, Profile)
│   │   ├── contexts/          # React contexts (ThemeContext)
│   │   ├── config/            # Supabase client config
│   │   └── App.tsx            # Root component with navigation
│   └── business-portal/       # Web portal for venue owners (planned)
├── supabase/
│   ├── migrations/            # Database migrations
│   └── functions/             # Edge functions
└── packages/                  # Shared packages (if any)
```

## Key Screens

| Screen | File | Purpose |
|--------|------|---------|
| Home | `HomeScreen.tsx` | Landing page with featured content |
| Explore | `ExploreScreen.tsx` | Search and discover venues |
| Events | `EventsScreen.tsx` | Browse and RSVP to events |
| Social | `SocialScreen.tsx` | Community posts, People tab, Stories |
| Profile | `ProfileScreen.tsx` | User profile, auth, settings |

## Database Schema (Supabase)

### Core Tables
- **profiles** - User profiles (user_id, full_name, bio, avatar_url, username, role)
- **venues** - Nightlife venues
- **events** - Events at venues
- **posts** - Social feed posts
- **communities** - User communities/groups
- **follows** - User follow relationships
- **stories** - User stories (My Vibe feature)

### Storage Buckets
- **avatars** - Profile pictures
- **social-media** - Post images and story media

## Authentication

- Supabase Auth with email/password
- Guest mode supported (limited features)
- Profile auto-created via `handle_new_user` trigger
- Password reset via email (requires SMTP setup)

## Theming

Uses `ThemeContext` for dark/light mode support:
```tsx
const { colors, activeTheme } = useTheme();
```

Always use `colors.xxx` from theme context, never hardcode colors.

## Conventions & Patterns

### Code Style
- TypeScript for all new code
- Functional components with hooks
- Use `useFocusEffect` for data refresh on screen focus
- Use `useSafeAreaInsets` for proper padding (not Platform.OS checks)

### Emoji Icons
- Tab bar uses emoji icons with `fontFamily: ''` fix for Android
- Example: `<Text style={{ fontSize: 26, fontFamily: '' }}>🏠</Text>`

### Error Handling
- Use try/catch with console.log for non-critical errors
- Use Alert.alert for user-facing errors
- Graceful fallbacks (e.g., PostImage component hides on load failure)

### Profile Data
- Always fetch profile data from `profiles` table, not just auth metadata
- Sync auth metadata to profiles on first load if empty

## Recent Decisions

### Feb 2026
- **Profile names:** Fetch from DB profiles table, fallback to auth metadata, then email prefix
- **Tab bar padding:** Use `useSafeAreaInsets` for consistent bottom padding
- **People tab:** Added to Social screen with follow/unfollow functionality
- **Stories:** My Vibe feature implemented for sharing moments

## Common Commands

```bash
# Start the app
cd apps/consumer-app && npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Apply Supabase migrations
supabase db push

# Generate Supabase types
supabase gen types typescript --local > types/supabase.ts
```

## Environment Variables

Required in `apps/consumer-app/config/supabase.ts`:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

## Known Issues / TODOs

- [ ] SMTP not configured - password reset emails won't send
- [ ] Stories upload needs social-media bucket with proper RLS
- [ ] Business portal is scaffolded but not fully implemented

## Tips for Claude

1. **Always read files before editing** - understand existing patterns
2. **Use ThemeContext colors** - never hardcode color values
3. **Check ProfileScreen for auth patterns** - it handles sign in/up/guest mode
4. **Database changes need migrations** - create in `supabase/migrations/`
5. **Test on both iOS and Android** - some fixes are platform-specific
