-- Add media_type column to stories table to support both images and videos
ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image'
CHECK (media_type IN ('image', 'video'));

-- Create index on media_type for filtering
CREATE INDEX IF NOT EXISTS stories_media_type_idx ON public.stories(media_type);

-- Add comment
COMMENT ON COLUMN public.stories.media_type IS 'Type of media: image or video';
