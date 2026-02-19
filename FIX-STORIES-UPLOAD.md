# Fix My Vibe Stories Upload Issue

## Problem
Error 23503: Foreign key constraint violation when uploading stories. This occurs because the `stories` table references the wrong column in the `profiles` table.

## Root Cause
- The `stories.user_id` column has a foreign key constraint pointing to `profiles(id)`
- It should point to `profiles(user_id)` instead
- When you sign up, your profile is created with `user_id = auth.users.id`
- But the FK constraint is checking against the wrong column

## Solution Steps

### Step 1: Fix the Database Schema (CRITICAL)

1. Open your Supabase Dashboard: https://app.supabase.com
2. Navigate to: **SQL Editor**
3. Click **"New Query"**
4. Copy and paste the contents of `scripts/fix-stories-schema.sql`
5. Click **"Run"** or press `Cmd/Ctrl + Enter`

**What this does:**
- Drops the incorrect foreign key constraint
- Creates the correct one referencing `profiles(user_id)`
- Adds the `media_type` column for video support
- Creates an index for performance
- Shows you the updated constraints for verification

### Step 2: Verify Your Profile Exists (OPTIONAL)

Run this diagnostic script to check if you have a profile:

```bash
node scripts/diagnose-stories-issue.js
```

**What this does:**
- Checks if the `media_type` column exists
- Lists all authenticated users
- Verifies each user has a profile entry
- Creates missing profiles automatically
- Shows the FK constraint configuration

### Step 3: Test Story Upload

1. Open the consumer app
2. Sign in via the **Profile** tab if not already signed in
3. Go to the **Home** screen
4. Click **"My Vibe"** (the + button in stories)
5. Grant photo library permissions when prompted
6. Select an image or video (up to 60 seconds)
7. Wait for upload confirmation

### Step 4: Verify Video Support Works

1. Try uploading a video (MP4, MOV, etc.)
2. The app should auto-detect it as a video
3. When viewing the story, the video should play automatically
4. You can tap left/right to navigate between stories

## Files Modified

### Database:
- `scripts/fix-stories-schema.sql` - Complete schema fix
- `supabase/migrations/20260201000000_add_media_type_to_stories.sql` - Migration for media_type

### App Code:
- `apps/consumer-app/components/StorySection.tsx` - Video upload support
- `apps/consumer-app/components/StoryViewer.tsx` - Video playback

### Diagnostics:
- `scripts/diagnose-stories-issue.js` - Profile and schema checker

## Expected Results

### After SQL Fix:
✅ Foreign key constraint references `profiles(user_id)` correctly
✅ `media_type` column exists with default value 'image'
✅ Can upload both images and videos
✅ Stories expire after 24 hours automatically

### After Testing:
✅ "My Vibe" button opens camera roll
✅ Can select images and videos
✅ Upload completes without errors
✅ Story appears in the stories carousel
✅ Videos play automatically in story viewer
✅ Can navigate between stories with taps/swipes

## Troubleshooting

### Still Getting FK Error After SQL?
1. Make sure you ran the **complete** SQL script from `fix-stories-schema.sql`
2. Run the diagnostic script: `node scripts/diagnose-stories-issue.js`
3. Check if your user has a profile entry in the `profiles` table
4. Verify the constraint was updated by running:
   ```sql
   SELECT * FROM information_schema.table_constraints
   WHERE table_name = 'stories' AND constraint_type = 'FOREIGN KEY';
   ```

### Video Not Playing?
1. Ensure `expo-av` is installed: `npm install expo-av`
2. Check console for video loading errors
3. Verify the video URL is accessible
4. Try with different video formats (MP4 is most compatible)

### "Auth session missing" Error?
1. Go to **Profile** tab
2. Sign in with email/password
3. Wait for auth session to establish
4. Return to Home and try creating story again

### Permission Denied on Mac?
1. System Preferences → Security & Privacy → Privacy
2. Select "Files and Folders" or "Photos"
3. Enable access for your terminal/simulator
4. Restart the app and try again

## What Changed?

### Authentication Fix:
- Changed from `getUser()` to `getSession()` in 3 places
- More reliable session checking
- Better error messages

### Video Support:
- Added `media_type` column to database
- Updated Story interface to include media_type
- Image picker now accepts videos with 60s max duration
- Auto-detection of video vs image based on file extension
- Video playback in StoryViewer with expo-av
- Progress bar works for both images and videos

### Database Schema:
- Fixed FK constraint to reference correct column
- Added index for media_type filtering
- Added CHECK constraint for valid media types

## Next Steps

After fixing:
1. Test uploading a photo story
2. Test uploading a video story (reel)
3. Test viewing stories from other users
4. Verify story expiration after 24 hours
5. Test on both iOS simulator and physical device

## Need Help?

If you're still experiencing issues:
1. Check the console logs in your app
2. Review the Supabase logs in the Dashboard
3. Run the diagnostic script for detailed analysis
4. Verify all migration files have been applied
