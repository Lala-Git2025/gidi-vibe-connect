-- Change venues.category from enum to TEXT for flexibility
-- The business portal form uses values like 'Nightclub', 'Cafe', 'Event Space'
-- that don't match the original enum ('Club', 'Other', 'Event Center')
ALTER TABLE public.venues
  ALTER COLUMN category TYPE TEXT;
