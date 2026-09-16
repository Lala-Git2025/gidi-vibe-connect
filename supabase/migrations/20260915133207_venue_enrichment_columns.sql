-- Columns to support replacing seeded venue data with real Google Places data.
--
-- Why this is a replacement and not a top-up: the seeded rows carry phone
-- numbers like '+234 818 555 0000' and '+234 908 000 0000', ratings clustered
-- implausibly between 4.2 and 4.7, and a price_range column holding two
-- incompatible schemes at once (21 rows '₦'-style, 12 rows 'Moderate'-style).
-- Every latitude and longitude is NULL, so nothing location-aware is possible.

ALTER TABLE public.venues
  -- Stable Google Places identifier. Makes re-enrichment idempotent: a second
  -- run updates the same place rather than re-matching by name and risking a
  -- different result.
  ADD COLUMN IF NOT EXISTS google_place_id TEXT,

  -- How many people rated it. A bare "4.3" is worth very little; "4.3 from 287
  -- ratings" is real social proof, and it partly covers the fact that the app
  -- itself has no native reviews yet.
  ADD COLUMN IF NOT EXISTS ratings_total INTEGER,

  -- Canonical price, 0-4, matching Google's scale. price_range stays as the
  -- human-readable string the UI already renders in six places, but it is now
  -- derived from this rather than being the source of truth.
  ADD COLUMN IF NOT EXISTS price_level SMALLINT,

  -- Null means never enriched. Distinguishes "we looked and found nothing"
  -- from "we have not looked", which matters when deciding what to re-run.
  ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;

ALTER TABLE public.venues
  DROP CONSTRAINT IF EXISTS venues_price_level_range;
ALTER TABLE public.venues
  ADD CONSTRAINT venues_price_level_range
  CHECK (price_level IS NULL OR price_level BETWEEN 0 AND 4);

-- Partial unique index: two venue rows must not claim the same Google place,
-- which would mean we matched a duplicate. NULLs are excluded so unenriched
-- rows do not collide with each other.
CREATE UNIQUE INDEX IF NOT EXISTS venues_google_place_id_key
  ON public.venues (google_place_id)
  WHERE google_place_id IS NOT NULL;

COMMENT ON COLUMN public.venues.price_range IS
  'Display string derived from price_level. Do not write directly — set price_level and let the enrichment agent regenerate this, or the two schemes drift apart again.';
