-- Add color column to communities table for icon background color
ALTER TABLE public.communities
ADD COLUMN IF NOT EXISTS color text DEFAULT '#7C3AED';

-- Update existing seeded communities with distinct brand-appropriate colors
UPDATE public.communities SET color = '#1D4ED8' WHERE name = 'Nightlife Lagos';
UPDATE public.communities SET color = '#DC2626' WHERE name = 'Restaurant Reviews';
UPDATE public.communities SET color = '#7C3AED' WHERE name = 'Events & Concerts';
UPDATE public.communities SET color = '#0891B2' WHERE name = 'Island Vibes';
UPDATE public.communities SET color = '#059669' WHERE name = 'Mainland Connect';
UPDATE public.communities SET color = '#EA580C' WHERE name = 'Foodies United';
UPDATE public.communities SET color = '#DB2777' WHERE name = 'Party People';
UPDATE public.communities SET color = '#4338CA' WHERE name = 'Culture & Arts';
