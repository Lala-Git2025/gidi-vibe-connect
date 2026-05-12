-- =============================================================================
-- Storage RLS hardening — close ownership gaps on uploads/deletes.
--
-- Findings from the 2026-05-11 audit (AUDIT.md §1.5):
--
--   1. `venue-photos` INSERT/DELETE policies only checked auth.role() =
--      'authenticated' — any signed-in user could upload to / delete any
--      venue's folder, even one they don't own.
--
--   2. `event-images` INSERT had the same gap. Its UPDATE/DELETE policies
--      checked `auth.uid()::text = (storage.foldername(name))[1]` — but the
--      first folder segment is the *event* UUID, not the user UUID, so the
--      check never matched and owners couldn't update/delete either.
--
--   3. The 20260309000001 migration created "Avatars authenticated upload"
--      and "Social media authenticated upload" policies with no path check.
--      They shadow the original path-restricted policies — any auth user
--      could upload to any user's folder.
--
-- This migration drops the offending policies and replaces them with
-- properly scoped ones. Pattern:
--
--   - User-folder buckets (avatars, social-media, stories): the first folder
--     segment must equal auth.uid().
--
--   - Entity-folder buckets (venue-photos, event-images): the first folder
--     segment is a UUID of the entity (venue / event), and we verify the
--     caller owns that entity via a subquery into the relevant table.
--
--   - Admins (is_admin()) bypass ownership checks on entity buckets so
--     they can moderate.
--
-- Read access on all four buckets remains public (these are publicly
-- visible photos linked from the venue / event / profile / post).
-- =============================================================================

-- ─── Drop the offending permissive / mis-scoped policies ─────────────────────

DROP POLICY IF EXISTS "Venue photos authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Venue photos authenticated delete" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own event images"     ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own event images"     ON storage.objects;

DROP POLICY IF EXISTS "Avatars authenticated upload"      ON storage.objects;
DROP POLICY IF EXISTS "Avatars authenticated update"      ON storage.objects;

DROP POLICY IF EXISTS "Social media authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Social media authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Social media authenticated delete" ON storage.objects;

-- ─── venue-photos: owner of the venue OR admin ───────────────────────────────
-- Path scheme: {venueId}/{timestamp}.{ext}

CREATE POLICY "venue_photos_insert_owner_or_admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'venue-photos'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.venues v
        WHERE v.id::text = (storage.foldername(name))[1]
          AND v.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "venue_photos_update_owner_or_admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'venue-photos'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.venues v
        WHERE v.id::text = (storage.foldername(name))[1]
          AND v.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "venue_photos_delete_owner_or_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'venue-photos'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.venues v
        WHERE v.id::text = (storage.foldername(name))[1]
          AND v.owner_id = auth.uid()
      )
    )
  );

-- ─── event-images: organizer of the event OR admin ───────────────────────────
-- Path scheme: {eventId}/{timestamp}.{ext}

CREATE POLICY "event_images_insert_organizer_or_admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-images'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id::text = (storage.foldername(name))[1]
          AND e.organizer_id = auth.uid()
      )
    )
  );

CREATE POLICY "event_images_update_organizer_or_admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id::text = (storage.foldername(name))[1]
          AND e.organizer_id = auth.uid()
      )
    )
  );

CREATE POLICY "event_images_delete_organizer_or_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id::text = (storage.foldername(name))[1]
          AND e.organizer_id = auth.uid()
      )
    )
  );

-- ─── avatars: user's own folder ──────────────────────────────────────────────
-- Path scheme: {userId}/{filename}

CREATE POLICY "avatars_insert_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_update_own_folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete_own_folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── social-media: user's own folder ─────────────────────────────────────────
-- Path scheme: {userId}/{filename}

CREATE POLICY "social_media_insert_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'social-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "social_media_update_own_folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'social-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "social_media_delete_own_folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'social-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Verification ────────────────────────────────────────────────────────────
-- Public read on all four buckets is left intact (existing policies handle it).
-- The delete-account edge function uses the service-role key, which bypasses
-- RLS, so account deletion still cleans up storage.
