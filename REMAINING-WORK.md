# Remaining Work to 100% Production Ready

**Current Status**: 88-92% Ready
**Target**: 100% Production Ready

> **🔎 For a comprehensive launch-readiness inventory** (every screen, every edge function, every external integration with file:line references and P0/P1/P2 priorities) see [AUDIT.md](AUDIT.md). This document tracks the original to-do list; AUDIT.md captures the much larger surface area found in the 2026-05-11 comprehensive audit.

---

## ✅ Recently Fixed (May 2026 session)

- ✅ **#1 Mobile Post Creation UI** — `CreatePostModal` shipped and integrated into Social FAB + Profile New Post button.
- ✅ **#4 ExploreAreaScreen** — venue cards now navigate to the Explore detail modal via `venueId` (no more `alert()`-and-stub). Trending + new + selected-area lists all work.
- ✅ **#6 Error Boundaries** — `ErrorBoundary` component wraps the app root in `App.tsx`.
- ✅ **`alert()` → `Alert.alert()`** in `ExploreAreaScreen` (3 places) and `NewsScreen` (1 place) — these would have crashed silently on native.
- ✅ **Account deletion** — real `delete-account` edge function calling `auth.admin.deleteUser` + storage cleanup; wired from consumer Profile and business-portal Settings. Replaces the previous "Account Deleted" fake.
- ✅ **Storage RLS hardening** — `venue-photos` / `event-images` / `avatars` / `social-media` now enforce ownership on INSERT/UPDATE/DELETE. Closed a "any authenticated user can upload/delete any photo" hole.
- ✅ **Post counter triggers** — `social_posts.likes_count` and `comments_count` are now kept in sync by DB triggers on `post_likes` / `comments`. One-time backfill repairs prior drift. Manual client-side sync removed.
- ✅ **Stale data after navigation** — Home / Explore / Events / Social now use `useFocusEffect` so feeds refresh whenever you return to the screen.
- ✅ **Discover screen filters** — `category`, `neighbourhood`, and `area` params now propagate to Explore / ExploreArea, pre-selecting the right chip on arrival.
- ✅ **TrendingVenues fallback** — removed hardcoded fake venues (IDs `'1'`..`'6'` that broke tap navigation). Now falls back to top-rated real venues, then empty state.

See [AUDIT.md §6](AUDIT.md) for the prioritized list of what remains.

---

## 🔴 Critical Items (Must Fix - 5% of remaining work)

### 1. Mobile Post Creation UI — ✅ FIXED (May 2026)
**Resolved by**: [apps/consumer-app/components/CreatePostModal.tsx](apps/consumer-app/components/CreatePostModal.tsx)
**Wired into**: Social FAB ([SocialScreen.tsx](apps/consumer-app/screens/SocialScreen.tsx)) + Profile "New Post" button ([ProfileScreen.tsx](apps/consumer-app/screens/ProfileScreen.tsx))
**Status**: Image picker + Supabase upload (`social-media` bucket via XHR ArrayBuffer) + XP via `increment_user_stat` RPC. Edit mode supported.

---

### 2. Password Reset Email Configuration
**Location**: Supabase Dashboard → Authentication → Email Templates
**Issue**: Email sending not configured
**Impact**: Users can't reset forgotten passwords
**Effort**: 30 minutes
**Steps**:
- [ ] Configure SMTP in Supabase or use Supabase email service
- [ ] Customize password reset email template
- [ ] Test reset flow end-to-end
- [ ] Add branded email templates

**Why Critical**: Users will get locked out without password reset

---

## 🟡 High Priority (Should Fix - 5% of remaining work)

### 3. Story Progress Bar Animation
**File**: [apps/consumer-app/components/StoryViewer.tsx](apps/consumer-app/components/StoryViewer.tsx)
**Issue**: Duplicate progress bars rendering
**Impact**: Visual clutter in story viewer
**Effort**: 1-2 hours
**Fix**: Ensure only one progress bar per story segment

---

### 4. ExploreAreaScreen Implementation — ✅ Mostly FIXED (May 2026)
**File**: [apps/consumer-app/screens/ExploreAreaScreen.tsx](apps/consumer-app/screens/ExploreAreaScreen.tsx)
**Resolved**:
- [x] Area cards + selection wired to filter venues by area
- [x] Trending Now + New & Hot horizontal scrolls render real venues
- [x] Venue cards navigate to Explore detail modal via `venueId` (was a broken `alert()` previously)
- [x] Receives `route.params.area` from DiscoverScreen and pre-selects that area
**Still missing**:
- [ ] Map integration
- [ ] Bare emoji on area cards should become Ionicons (CLAUDE.md convention)
- [ ] Area-specific events list

---

### 5. Event Category Filtering (Backend)
**File**: [supabase/functions/fetch-lagos-events/index.ts](supabase/functions/fetch-lagos-events/index.ts)
**Issue**: Category parameter not fully utilized in live scraping
**Impact**: Users can't effectively filter events by category
**Effort**: 2-3 hours
**Fix**: Implement proper category filtering in the Edge Function

---

### 6. Error Boundaries — ✅ FIXED
**Resolved by**: [apps/consumer-app/components/ErrorBoundary.tsx](apps/consumer-app/components/ErrorBoundary.tsx) wrapped around the root in [App.tsx](apps/consumer-app/App.tsx). Dev shows full stack; prod hides it. **Remaining**: wire Sentry/Bugsnag (see item #7).

---

## 🟢 Medium Priority (Nice to Have - 3% of remaining work)

### 7. Analytics & Monitoring
**Tools**: Google Analytics, Mixpanel, or PostHog
**Impact**: No visibility into user behavior or app performance
**Effort**: 4-6 hours
**Setup**:
- [ ] Choose analytics platform
- [ ] Integrate SDK
- [ ] Track key events (signups, posts, story views)
- [ ] Set up conversion funnels
- [ ] Monitor performance metrics

---

### 8. Crash Reporting
**Tools**: Sentry, Bugsnag, or Firebase Crashlytics
**Impact**: Crashes happen silently without reporting
**Effort**: 2-3 hours
**Setup**:
- [ ] Integrate crash reporting SDK
- [ ] Configure error grouping
- [ ] Set up alerts for critical errors
- [ ] Add breadcrumbs for debugging

---

### 9. Seed Data for Social Features
**Script**: Available in plan at `~/.claude/plans/enchanted-gliding-kite.md`
**Impact**: App feels empty for new users
**Effort**: 2-3 hours
**Implementation**:
- [ ] Create 5 sample user profiles
- [ ] Generate 12-15 realistic social posts
- [ ] Add to communities
- [ ] Include Lagos-themed content
- [ ] Add placeholder images

**Run**: `node scripts/seed-social-data.js` (after creating)

---

### 10. User Feedback Mechanism
**Location**: Profile screen or settings
**Impact**: No way to collect user feedback
**Effort**: 2-3 hours
**Implementation**:
- [ ] Add feedback form
- [ ] Store in `feedback` table
- [ ] Email notifications for new feedback
- [ ] In-app bug reporting
- [ ] Feature request system

---

## 📱 App Store Preparation (2% of remaining work)

### 11. iOS App Store Assets
**Required**:
- [ ] App icon (1024x1024px)
- [ ] Screenshots (6.5", 5.5" displays)
- [ ] App preview video (optional)
- [ ] Description and keywords
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Age rating questionnaire
- [ ] App Store Connect setup

**Effort**: 4-6 hours

---

### 12. Google Play Store Assets
**Required**:
- [ ] Feature graphic (1024x500px)
- [ ] Screenshots (phone & tablet)
- [ ] App icon (512x512px)
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Privacy policy
- [ ] Content rating
- [ ] Google Play Console setup

**Effort**: 4-6 hours

---

## 📄 Legal & Compliance (1% of remaining work)

### 13. Privacy Policy
**Required by**: App Store, Google Play, GDPR
**Effort**: 2-3 hours (using generator + customization)
**Include**:
- [ ] Data collection practices
- [ ] How user data is used
- [ ] Third-party services (Supabase, analytics)
- [ ] User rights (access, deletion)
- [ ] Contact information

---

### 14. Terms of Service
**Required by**: App Store, Google Play
**Effort**: 2-3 hours
**Include**:
- [ ] User responsibilities
- [ ] Content guidelines
- [ ] Account termination policies
- [ ] Liability limitations
- [ ] Dispute resolution

---

## 🧪 Testing & QA (2% of remaining work)

### 15. Comprehensive Testing Checklist
**Platforms**: iOS, Android, Web
**Effort**: 8-12 hours

#### Authentication Flow
- [ ] Sign up with email/password
- [ ] Login/logout
- [ ] Password reset (after email config)
- [ ] Session persistence
- [ ] Auto-logout on token expiry

#### Core Features
- [ ] Profile creation and editing
- [ ] Avatar upload
- [ ] Username uniqueness
- [ ] Story creation (photo upload)
- [ ] Story viewing (24hr expiry)
- [ ] Event browsing and filtering
- [ ] Venue search and details
- [ ] Social feed loading
- [ ] Community browsing
- [ ] Post creation (after mobile UI added)
- [ ] Badge system and XP tracking

#### Performance
- [ ] App loads in <3 seconds
- [ ] Images load progressively
- [ ] Smooth scrolling
- [ ] No memory leaks
- [ ] Offline functionality (cached data)

#### Devices
- [ ] iPhone (latest 2 models)
- [ ] Android (Samsung, Pixel)
- [ ] iPad/tablet
- [ ] Desktop web (Chrome, Safari, Firefox)
- [ ] Mobile web (responsive)

---

### 16. Performance Optimization
**Effort**: 4-6 hours
**Optimizations**:
- [ ] Image lazy loading
- [ ] Infinite scroll pagination
- [ ] Cache API responses
- [ ] Optimize bundle size
- [ ] Reduce initial load time
- [ ] Enable compression
- [ ] Optimize database queries

---

## 🚀 Production Infrastructure (1% of remaining work)

### 17. Environment Configuration
**Effort**: 1-2 hours
- [ ] Production Supabase project
- [ ] Environment variables secured
- [ ] API rate limiting configured
- [ ] CDN for static assets
- [ ] Database backups automated

---

### 18. Monitoring & Alerts
**Effort**: 2-3 hours
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Database performance monitoring
- [ ] API endpoint monitoring
- [ ] Error rate alerts
- [ ] User growth tracking

---

## 📊 Summary Breakdown

| Category | Items | Estimated Effort | Priority |
|----------|-------|------------------|----------|
| Critical Must-Fix | 2 | 5-7 hours | 🔴 High |
| High Priority | 4 | 15-20 hours | 🟡 Medium |
| Medium Priority | 4 | 10-15 hours | 🟢 Low |
| App Store Prep | 2 | 8-12 hours | 📱 Required |
| Legal & Compliance | 2 | 4-6 hours | 📄 Required |
| Testing & QA | 2 | 12-18 hours | 🧪 Essential |
| Infrastructure | 2 | 3-5 hours | 🚀 Important |

**Total Estimated Effort**: 57-83 hours

---

## 🎯 Recommended Launch Path

### Path 1: Immediate Beta Launch (Current State)
**Time**: 0 days
- Accept 85-90% readiness
- Document known limitations
- Invite limited beta testers (10-20)
- Iterate based on feedback

**Pros**: Fast to market, real user feedback
**Cons**: Some features incomplete, potential user frustration

---

### Path 2: Polished Beta Launch (1 Week)
**Time**: 5-7 days
- Fix critical items (mobile posts, password reset)
- Complete high priority items
- Add error boundaries
- Basic testing on devices

**Recommended for**: Most balanced approach
**Result**: ~95% ready, much better user experience

---

### Path 3: Production-Ready Launch (2-3 Weeks)
**Time**: 15-20 days
- Complete all critical + high priority
- Full testing across devices
- App store assets ready
- Analytics & monitoring
- Legal docs in place

**Recommended for**: Professional public launch
**Result**: 100% ready, app store approved

---

## 🏃 Quick Wins (Can Do Today)

These items have high impact with low effort:

1. **Password Reset Email** (30 mins) - Configure in Supabase Dashboard
2. **Story Progress Fix** (1-2 hours) - Simple UI bug fix
3. **Error Boundaries** (3-4 hours) - Catch crashes gracefully
4. **Seed Social Data** (2-3 hours) - Make app feel alive

**Total**: 6-10 hours to jump to ~92-93% ready! 🚀

---

## 💡 My Recommendation

For your **first beta launch**, I recommend:

1. **This Week (Critical Path)**:
   - Fix mobile post creation (6 hours)
   - Configure password reset (30 mins)
   - Fix story progress bar (1-2 hours)
   - Add error boundaries (3-4 hours)
   - **Total**: ~10-13 hours → **95% ready**

2. **Next Week (Polish)**:
   - Comprehensive device testing (8 hours)
   - Seed social data (2 hours)
   - Add analytics (4 hours)
   - **Total**: ~14 hours → **98% ready**

3. **Week 3 (Launch Prep)**:
   - App store assets (8-12 hours)
   - Legal docs (4-6 hours)
   - Final testing (4 hours)
   - **Total**: ~16-22 hours → **100% ready for stores**

**Grand Total**: ~40-49 hours spread over 3 weeks

You'll have a production-ready app in the app stores! 🎉

---

## 📝 Priority Order (If Time Limited)

If you can only do a few things, do them in this order:

1. ✅ Mobile post creation (essential feature)
2. ✅ Password reset email (user retention)
3. ✅ Error boundaries (stability)
4. ✅ Story progress fix (polish)
5. ✅ Testing on real devices (quality)
6. ✅ Seed social data (first impressions)
7. ✅ Analytics (understand users)
8. ✅ Crash reporting (catch bugs)
9. ✅ App store assets (required for launch)
10. ✅ Legal docs (required for launch)

---

*Focus on items 1-5 to reach 95%+ readiness for a strong beta launch!*

---

## Deferred — Deep-Linked Post Sharing

**Current state (May 2026)**: Share button on social posts uses `expo-sharing` to share the image attachment, falling back to text-only via the platform `Share` API for posts with no media. This works but has two limitations:

1. **Image-only posts lose the caption.** Native file shares don't include accompanying text — receiving apps see only the image.
2. **No back-link to Gidi Connect.** A friend who receives the share has no way to open the post in the app.

**Goal**: When a user shares a post, the recipient sees a rich preview (cover image + author + first line of caption) and one tap opens that post inside the Gidi Connect app — or, on devices without the app, a web fallback.

### What needs to be built

1. **Public post page (web)**
   - Route: `https://gidiconnect.app/post/:id` (or wherever the marketing site lives).
   - Server-rendered with Open Graph + Twitter Card meta tags so iMessage/WhatsApp/Twitter render a real preview.
   - Renders post content, author, image, "Open in app" deep link.
   - Reuses existing Supabase data; needs a small Next.js or Vite SSR app, or a Supabase Edge Function emitting HTML.

2. **Universal Links (iOS) / App Links (Android)**
   - Configure `apple-app-site-association` and `assetlinks.json` files served from `gidiconnect.app/.well-known/`.
   - Update [apps/consumer-app/app.json](apps/consumer-app/app.json) with `associatedDomains` (iOS) and `intentFilters` (Android).
   - Tapping a `gidiconnect.app/post/:id` link opens the app directly to that post — no browser bounce.

3. **In-app deep link handler**
   - `Linking.addEventListener('url', ...)` in `App.tsx` parses the path and navigates: `Linking → Social tab → open post by ID`.
   - Cold-start path: read the initial URL via `Linking.getInitialURL()`.
   - Add a `usePostById(id)` query in case the post isn't in the loaded feed yet.

4. **Update `handleShare` in [apps/consumer-app/screens/SocialScreen.tsx](apps/consumer-app/screens/SocialScreen.tsx)**
   - Replace the current "image attachment" flow with a single message:
     ```
     "<post content>"
     — <author> on Gidi Connect
     https://gidiconnect.app/post/<id>
     ```
   - The link does the heavy lifting — receiving app fetches the OG preview itself.
   - Remove the cache-download + `expo-sharing` path (or keep it as a "Save image" action under a long-press).

### Effort

- Public post page: ~1 day (Vite/Next.js mini-app or Edge Function)
- Universal/App Links config + verification: ~0.5 day
- In-app handler + tests: ~0.5 day
- Migration of share flow + caption preservation: ~0.5 day

**Total: 2.5–3 days.**

### Open questions

- **Where does the web app live?** New Vite app in `apps/web-public/`? Or extend `apps/business-portal`? Recommend a separate, minimal SSR app — different SEO/perf needs.
- **Auth on shared post pages**: should non-logged-in viewers see full post + comments, or only a teaser? Recommend: full post visible publicly (drives discovery), engagement (like/comment) gated to logged-in users.
- **Stories shares** — same mechanism, but stories expire. Decide: render a "this story has ended" page after 24h, or 404? Recommend the former.

### Dependencies

- Domain `gidiconnect.app` registered + DNS pointing somewhere we control.
- App Store / Play Store team IDs for App Links verification.
- A hosting target for the public web app (Vercel free tier is fine).

### Why this is the better long-term solution

The current flow shares pixels. The deep-link flow shares **the post** — recoverable, openable, attributable, and analytic. It also unlocks: web previews on Twitter/LinkedIn, embeddable post URLs, and a path to a future SEO-driven discovery surface.
