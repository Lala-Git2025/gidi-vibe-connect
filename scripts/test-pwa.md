# PWA Testing Guide

## Quick Setup

### 1. Build and Test Locally

```bash
# Build the app
npm run build

# Preview the build
npm run preview

# Open browser to http://localhost:4173
```

### 2. Test PWA Installation

#### On Desktop (Chrome/Edge):
1. Open http://localhost:4173
2. Look for install icon in address bar
3. Click to install
4. App should open in standalone window

#### On iOS (Safari):
1. Open the URL in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Name it "GIDI CONNECT"
5. Tap "Add"
6. Find the app icon on home screen

#### On Android (Chrome):
1. Open the URL in Chrome
2. Tap the three dots menu
3. Tap "Add to Home screen"
4. Or wait for the automatic prompt
5. Confirm installation

### 3. Test Offline Mode

#### Desktop:
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. Reload the page
5. Should show offline page or cached content

#### Mobile:
1. Install the PWA
2. Turn on Airplane Mode
3. Open the app
4. Should work with cached content
5. Show offline indicator

### 4. Test Mobile Features

#### Pull-to-Refresh:
- On Explore page, swipe down from top
- Should see refresh indicator
- Content should update

#### Haptic Feedback:
- Tap navigation buttons
- Tap action buttons
- Should feel vibration (on supported devices)

#### Search:
- Go to Explore page
- Type in search box
- Results should filter in real-time

#### Lazy Loading:
- Scroll through venue/event lists
- Images should load as you scroll
- Notice loading placeholders

## Testing Checklist

### PWA Features
- [ ] App installs correctly
- [ ] App icon displays
- [ ] Splash screen shows (if configured)
- [ ] Runs in standalone mode
- [ ] Works offline
- [ ] Service worker updates properly

### Mobile UX
- [ ] Pull-to-refresh works
- [ ] Haptic feedback works
- [ ] Search filters properly
- [ ] Images lazy load
- [ ] Smooth animations
- [ ] Bottom navigation works
- [ ] Safe areas respected (iOS notch)

### Authentication
- [ ] Can sign up with email
- [ ] Can sign in with email
- [ ] Can sign in with Google
- [ ] Can reset password
- [ ] Protected routes redirect to login
- [ ] Session persists across refreshes

### Performance
- [ ] Initial load < 3 seconds
- [ ] Smooth scrolling (60fps)
- [ ] No layout shift on load
- [ ] Images optimized
- [ ] Bundle size reasonable

## Common Issues

### PWA Not Installing
- Make sure you're on HTTPS (or localhost)
- Check manifest.json is served correctly
- Verify icons exist at correct paths
- Check browser console for errors

### Service Worker Not Updating
- Clear all service workers in DevTools
- Hard refresh (Ctrl+Shift+R)
- Check "Update on reload" in DevTools

### Offline Mode Not Working
- Service worker must be registered
- Check Network tab shows SW active
- Verify caching strategy is correct

### Haptics Not Working
- Only works on physical devices
- Not supported in all browsers
- Check device vibration settings

## Remote Testing (ngrok)

```bash
# Install ngrok (one time)
npm install -g ngrok

# Run your app
npm run preview

# In new terminal, create tunnel
ngrok http 4173

# Use the https URL on any device
# Example: https://abc123.ngrok.io
```

## Performance Testing

```bash
# Install Lighthouse CLI
npm install -g @lhci/cli

# Run Lighthouse
lighthouse http://localhost:4173 --view

# Check scores:
# - Performance > 90
# - Accessibility > 90
# - Best Practices > 90
# - SEO > 90
# - PWA: All checks green
```

## Debug Tips

### Check Service Worker:
```
Chrome: chrome://serviceworker-internals/
Firefox: about:debugging#/runtime/this-firefox
```

### Clear All Data:
```
DevTools → Application → Clear Storage → Clear site data
```

### View Console Logs:
```
Mobile Safari: Settings → Safari → Advanced → Web Inspector
Mobile Chrome: chrome://inspect on desktop
```
