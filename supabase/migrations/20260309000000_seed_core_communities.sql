-- =====================================================
-- Seed / restore core Lagos communities
-- Safe to run multiple times: ON CONFLICT updates
-- color and is_active without changing anything else.
-- =====================================================

INSERT INTO public.communities (name, description, icon, color, is_public, is_active, member_count)
VALUES
  ('Nightlife Lagos',    'Discover the best nightlife spots, clubs, and late-night experiences in Lagos', '🌙', '#4338CA', true, true, 0),
  ('Restaurant Reviews', 'Share and discover amazing restaurants, cafes, and food experiences',            '🍽️', '#EA580C', true, true, 0),
  ('Events & Concerts',  'Stay updated on upcoming events, concerts, and entertainment in Lagos',          '🎵', '#7C3AED', true, true, 0),
  ('Island Vibes',       'Everything happening on Lagos Island - VI, Ikoyi, Lekki, and beyond',           '🏝️', '#0891B2', true, true, 0),
  ('Mainland Connect',   'Connect with people and places on the mainland - Ikeja, Yaba, Surulere, and more', '🏙️', '#059669', true, true, 0),
  ('Foodies United',     'For food lovers exploring Lagos culinary scene',                                 '🍕', '#D97706', true, true, 0),
  ('Party People',       'Where the party animals hang out',                                               '🎉', '#DB2777', true, true, 0),
  ('Culture & Arts',     'Art galleries, museums, cultural events, and exhibitions',                       '🎨', '#DC2626', true, true, 0)
ON CONFLICT (name) DO UPDATE SET
  color     = EXCLUDED.color,
  is_active = true;
