-- Recovered from remote history (applied 2026-07-09 via MCP, never exported).
-- venue-photos storage policies: first path segment is the venue id, so the
-- ownership check must join venues on id/owner_id (not compare to auth.uid()).

ALTER POLICY venue_photos_insert_owner_or_admin ON storage.objects
  WITH CHECK (
    bucket_id = 'venue-photos'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM public.venues v
        WHERE (v.id)::text = (storage.foldername(objects.name))[1]
          AND v.owner_id = auth.uid()
      )
    )
  );

ALTER POLICY venue_photos_update_owner_or_admin ON storage.objects
  USING (
    bucket_id = 'venue-photos'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM public.venues v
        WHERE (v.id)::text = (storage.foldername(objects.name))[1]
          AND v.owner_id = auth.uid()
      )
    )
  );

ALTER POLICY venue_photos_delete_owner_or_admin ON storage.objects
  USING (
    bucket_id = 'venue-photos'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM public.venues v
        WHERE (v.id)::text = (storage.foldername(objects.name))[1]
          AND v.owner_id = auth.uid()
      )
    )
  );
