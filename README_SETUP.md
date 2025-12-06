# GIDI CONNECT - Setup & Deployment Guide

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📱 Mobile App Features

### ✅ Completed Features
- PWA Infrastructure (offline support, installable)
- Pull-to-Refresh on mobile
- Haptic Feedback (iOS & Android)
- Lazy Loading Images
- Real-time Search
- Modern Animations
- Authentication System (Email & Google)
- Error Tracking
- Analytics Ready
- Code Splitting & Optimization

## 🔧 Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase Configuration

#### Enable Authentication:
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Email provider
3. Enable Google OAuth (optional):
   - Add Google Client ID & Secret
   - Set redirect URL: `https://yourdomain.com/auth/callback`

#### Set Up Database:
Your app uses the following tables:
- `venues` - Venue information
- `events` - Event listings
- `profiles` - User profiles (auto-created by Supabase Auth)

### 3. Generate App Icons

Open `scripts/generate-icons.html` in your browser:

```bash
# From project root
open scripts/generate-icons.html
```

1. Click "Download icon-192.png"
2. Click "Download icon-512.png"
3. Save both files to `/public/` folder

### 4. Test Locally

```bash
# Build the app
npm run build

# Test PWA features
npm run preview

# Open http://localhost:4173 in browser
```

## 📱 Mobile Testing

### Using ngrok (Recommended):

```bash
# Install ngrok
npm install -g ngrok

# Run preview
npm run preview

# In new terminal, start tunnel
ngrok http 4173

# Use the https URL on your phone
```

### Testing Checklist:

See `scripts/test-pwa.md` for detailed testing instructions.

Quick checklist:
- [ ] App installs on home screen
- [ ] Works offline
- [ ] Pull-to-refresh works
- [ ] Search filters correctly
- [ ] Authentication works
- [ ] Images lazy load
- [ ] Haptic feedback works

## 🚢 Deployment

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts
# Set environment variables in Vercel dashboard
```

### Option 2: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Set environment variables in Netlify dashboard
```

### Option 3: Traditional Hosting

```bash
# Build the app
npm run build

# Upload the /dist folder to your hosting provider
```

## 📊 Analytics & Monitoring

### PostHog (Optional):
```bash
npm install posthog-js

# Add to main.tsx or App.tsx:
import posthog from 'posthog-js';

posthog.init('YOUR_API_KEY', {
  api_host: 'https://app.posthog.com',
});
```

### Sentry (Optional):
```bash
npm install @sentry/react

# Add to App.tsx:
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

## 🎯 Performance Optimization

### Before Production:

1. **Run Lighthouse Audit:**
```bash
npx lighthouse http://localhost:4173 --view
```

Target scores:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90
- PWA: All green checks

2. **Analyze Bundle Size:**
```bash
npx vite-bundle-visualizer
```

3. **Test on Real Devices:**
- iOS Safari (iPhone)
- Android Chrome
- Check all gestures work
- Verify offline mode
- Test authentication flow

## 🔒 Security

### Before Production:
- [ ] Add rate limiting to API endpoints
- [ ] Enable RLS (Row Level Security) in Supabase
- [ ] Add CAPTCHA to signup/login
- [ ] Configure CORS properly
- [ ] Review environment variables
- [ ] Enable 2FA for admin accounts

## 📝 File Structure

```
gidi-vibe-connect/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   ├── offline.html           # Offline fallback
│   ├── icon-192.png          # App icon (generate this)
│   └── icon-512.png          # App icon (generate this)
├── src/
│   ├── components/           # Reusable components
│   ├── contexts/             # React contexts
│   ├── hooks/                # Custom hooks
│   ├── pages/                # Route pages
│   ├── utils/                # Utilities
│   └── lib/                  # Libraries
├── scripts/
│   ├── generate-icons.html   # Icon generator
│   └── test-pwa.md          # Testing guide
└── README_SETUP.md          # This file
```

## 🆘 Troubleshooting

### PWA Not Installing:
- Ensure HTTPS or localhost
- Check manifest.json served correctly
- Verify icons exist
- Check browser console

### Authentication Not Working:
- Verify Supabase URL & key
- Check auth providers enabled
- Verify redirect URLs match

### Images Not Loading:
- Check image paths
- Verify lazy loading working
- Check network tab

### Performance Issues:
- Run Lighthouse audit
- Check bundle size
- Enable code splitting
- Optimize images

## 📚 Additional Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Supabase Docs](https://supabase.com/docs)
- [Vite Docs](https://vitejs.dev/)
- [React Router Docs](https://reactrouter.com/)

## 🎉 You're Ready!

Your mobile app is now fully optimized for iOS and Android with:
- ✅ PWA capabilities
- ✅ Modern mobile UX
- ✅ Authentication
- ✅ Offline support
- ✅ Performance optimization

For detailed mobile testing instructions, see `scripts/test-pwa.md`

For the complete mobile optimization guide, see `MOBILE_OPTIMIZATION_GUIDE.md`
