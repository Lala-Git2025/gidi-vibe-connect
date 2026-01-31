# Clear Expo Cache and Restart

If you're seeing stale data or "Anonymous User" after code changes:

## Method 1: Clear Metro Bundler Cache
```bash
cd apps/consumer-app
expo start -c
```

## Method 2: Full Clean Restart
```bash
cd apps/consumer-app
rm -rf node_modules/.cache
rm -rf .expo
expo start -c
```

## Method 3: Reload in Expo Go
1. Shake your device or press Cmd+D (iOS) / Cmd+M (Android) in simulator
2. Tap "Reload"
3. Or close Expo Go completely and reopen

## What to Check in Console

After restarting, look for these logs in the Expo console:

```
✅ Fetched posts count: 15
📝 First post data: { ... }
👤 First post profile: { full_name: "Femi Moritiwon", avatar_url: null }
🏘️ First post community: { name: "Restaurant Reviews", icon: "🍽️" }
```

If you see `profiles: null` or `profiles: undefined`, the query has an issue.
If you see the correct profile data but still see "Anonymous User" on screen, it's a rendering issue.
