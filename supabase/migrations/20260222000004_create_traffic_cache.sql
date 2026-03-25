-- =====================================================
-- Traffic Cache Table
-- Single-row table used by the get-traffic edge function
-- to cache TomTom API responses server-side.
-- All users share this cache → TomTom gets at most
-- 12 requests per 5-minute window regardless of DAU.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.traffic_cache (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  data        JSONB        NOT NULL DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Enforce single-row invariant
  CONSTRAINT traffic_cache_single_row CHECK (id = 1)
);

-- Insert the placeholder row on first migration
INSERT INTO public.traffic_cache (id, data, updated_at)
VALUES (1, '[]'::jsonb, '1970-01-01T00:00:00Z'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- RLS: allow anyone (including anon) to read,
-- only service role (edge function) can write.
ALTER TABLE public.traffic_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "traffic_cache_read" ON public.traffic_cache;
CREATE POLICY "traffic_cache_read"
  ON public.traffic_cache
  FOR SELECT
  USING (true);

-- The edge function uses the service-role key so it bypasses RLS,
-- but we still lock down INSERT/UPDATE for regular keys.
DROP POLICY IF EXISTS "traffic_cache_service_write" ON public.traffic_cache;
CREATE POLICY "traffic_cache_service_write"
  ON public.traffic_cache
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
