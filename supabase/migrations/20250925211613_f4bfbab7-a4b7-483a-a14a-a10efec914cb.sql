-- Add missing columns to news_feed table for external content
ALTER TABLE public.news_feed 
ADD COLUMN IF NOT EXISTS external_url text,
ADD COLUMN IF NOT EXISTS source text;