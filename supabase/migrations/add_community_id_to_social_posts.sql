-- =====================================================
-- Add community_id to social_posts table
-- This enables posts to be associated with communities
-- =====================================================

-- Add community_id column
ALTER TABLE public.social_posts
ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_social_posts_community_id
ON public.social_posts(community_id);

-- Add comment for documentation
COMMENT ON COLUMN public.social_posts.community_id IS
'References the community where this post was shared. NULL for general posts not associated with any community.';

-- =====================================================
-- Migration complete
-- Social posts can now be associated with communities
-- =====================================================
