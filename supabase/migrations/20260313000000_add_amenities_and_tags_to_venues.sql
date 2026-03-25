-- Add missing columns to venues table that the business portal uses
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS amenities TEXT[],
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
