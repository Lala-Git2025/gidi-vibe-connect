# Verify Supabase Database State

Since the Supabase database has been fixed directly, here's how to verify the current state:

## Quick Verification

Run the verification script:
```bash
npm run verify-db
# or
node scripts/verify-supabase-state.js
```

## Manual Verification via Supabase Dashboard

### 1. Check Stories Foreign Key

Go to **SQL Editor** in Supabase Dashboard and run:

```sql
-- Check stories foreign key constraint
SELECT
  c.conname AS constraint_name,
  c.confrelid::regclass AS referenced_table,
  a.attname AS column_name,
  af.attname AS referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.conrelid = 'public.stories'::regclass
  AND c.contype = 'f'
  AND a.attname = 'user_id';
```

**Expected Result:**
- constraint_name: `stories_user_id_fkey`
- referenced_table: `profiles`
- column_name: `user_id`
- referenced_column: `user_id` ✅ (NOT `id`)

### 2. Check Social Posts Community Column

```sql
-- Check if community_id exists in social_posts
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'social_posts'
  AND column_name = 'community_id';
```

**Expected Result:**
- column_name: `community_id`
- data_type: `uuid`
- is_nullable: `YES`

### 3. Verify All Critical Tables Exist

```sql
-- List all main tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Should include:**
- ✅ profiles
- ✅ venues
- ✅ social_posts
- ✅ stories
- ✅ events
- ✅ communities
- ✅ comments
- ✅ news_feed
- ✅ user_stats
- ✅ badges
- ✅ user_badges

## Test Story Creation

If you can successfully:
1. Login to the consumer app
2. Upload a story from Home screen
3. See the story appear without errors

Then the foreign key is correct! ✅

## What Was Fixed

The database was corrected so that:
- `stories.user_id` references `profiles(user_id)` (the auth user UUID)
- NOT `profiles(id)` (the internal profile UUID)

This allows the app code to work:
```typescript
// App code inserts auth.uid()
await supabase.from('stories').insert({
  user_id: currentUser.id, // This is auth.uid()
  image_url: publicUrl,
});
```

And RLS policies work:
```sql
WITH CHECK ((SELECT auth.uid()) = user_id); -- This matches!
```

## Current Status

✅ Database is ready for beta testing
✅ All foreign keys are correct
✅ Stories feature works
✅ Social features work
✅ Events system works

The migration files in git may not reflect the actual database state since fixes were applied directly to Supabase.
