-- Add story editor metadata columns
-- overlays  → JSON array of text and sticker overlays rendered on the story
-- filter_effect → named colour-wash effect applied over the media

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS filter_effect TEXT NOT NULL DEFAULT 'none';

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS overlays JSONB NOT NULL DEFAULT '[]'::jsonb;
