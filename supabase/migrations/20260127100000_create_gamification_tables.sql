-- Create user_stats table to track user activity
CREATE TABLE IF NOT EXISTS public.user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  venues_visited integer DEFAULT 0,
  events_attended integer DEFAULT 0,
  reviews_written integer DEFAULT 0,
  photos_uploaded integer DEFAULT 0,
  posts_created integer DEFAULT 0,
  likes_given integer DEFAULT 0,
  comments_made integer DEFAULT 0,
  xp integer DEFAULT 0,
  level integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create badges definition table
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  icon text NOT NULL, -- emoji or icon name
  category text NOT NULL, -- 'explorer', 'social', 'reviewer', 'photographer', 'event'
  requirement_type text NOT NULL, -- 'venues_visited', 'events_attended', 'reviews_written', etc.
  requirement_value integer NOT NULL, -- number required to earn badge
  xp_reward integer DEFAULT 50, -- XP earned when badge is unlocked
  created_at timestamptz DEFAULT now()
);

-- Create user_badges junction table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id uuid REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_category ON public.badges(category);

-- Enable RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Anyone can view badges" ON public.badges;
DROP POLICY IF EXISTS "Users can view their own badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can insert their own badges" ON public.user_badges;

-- RLS Policies for user_stats
CREATE POLICY "Users can view their own stats"
ON public.user_stats FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
ON public.user_stats FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
ON public.user_stats FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for badges (public read)
CREATE POLICY "Anyone can view badges"
ON public.badges FOR SELECT
TO public
USING (true);

-- RLS Policies for user_badges
CREATE POLICY "Users can view their own badges"
ON public.user_badges FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges"
ON public.user_badges FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Insert default badges
INSERT INTO public.badges (name, description, icon, category, requirement_type, requirement_value, xp_reward) VALUES
-- Explorer badges
('First Steps', 'Visit your first venue', '🚶', 'explorer', 'venues_visited', 1, 25),
('Explorer', 'Visit 5 different venues', '🧭', 'explorer', 'venues_visited', 5, 50),
('Adventurer', 'Visit 10 different venues', '🗺️', 'explorer', 'venues_visited', 10, 100),
('Trailblazer', 'Visit 25 different venues', '⛰️', 'explorer', 'venues_visited', 25, 200),
('Legend', 'Visit 50 different venues', '🏆', 'explorer', 'venues_visited', 50, 500),

-- Event badges
('Party Starter', 'Attend your first event', '🎉', 'event', 'events_attended', 1, 25),
('Event Goer', 'Attend 5 events', '🎫', 'event', 'events_attended', 5, 50),
('Social Butterfly', 'Attend 15 events', '🦋', 'event', 'events_attended', 15, 150),
('Event Master', 'Attend 30 events', '👑', 'event', 'events_attended', 30, 300),

-- Reviewer badges
('First Review', 'Write your first review', '📝', 'reviewer', 'reviews_written', 1, 25),
('Critic', 'Write 5 reviews', '✍️', 'reviewer', 'reviews_written', 5, 50),
('Reviewer Pro', 'Write 15 reviews', '⭐', 'reviewer', 'reviews_written', 15, 150),
('Top Reviewer', 'Write 30 reviews', '🌟', 'reviewer', 'reviews_written', 30, 300),

-- Photographer badges
('Shutterbug', 'Upload your first photo', '📷', 'photographer', 'photos_uploaded', 1, 25),
('Photographer', 'Upload 10 photos', '📸', 'photographer', 'photos_uploaded', 10, 75),
('Lens Master', 'Upload 25 photos', '🎞️', 'photographer', 'photos_uploaded', 25, 150),
('Visual Artist', 'Upload 50 photos', '🖼️', 'photographer', 'photos_uploaded', 50, 300),

-- Social badges
('Social Starter', 'Create your first post', '💬', 'social', 'posts_created', 1, 25),
('Chatterbox', 'Create 10 posts', '🗣️', 'social', 'posts_created', 10, 75),
('Influencer', 'Create 25 posts', '📢', 'social', 'posts_created', 25, 150),
('Community Star', 'Create 50 posts', '⭐', 'social', 'posts_created', 50, 300)

ON CONFLICT (name) DO NOTHING;

-- Function to create user_stats on profile creation
CREATE OR REPLACE FUNCTION public.create_user_stats()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create stats for new users
DROP TRIGGER IF EXISTS on_auth_user_created_stats ON auth.users;
CREATE TRIGGER on_auth_user_created_stats
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_stats();

-- Function to calculate level from XP
-- Level thresholds: 1=0, 2=100, 3=250, 4=500, 5=850, 6=1300, etc.
CREATE OR REPLACE FUNCTION public.calculate_level(xp_amount integer)
RETURNS integer AS $$
DECLARE
  level integer := 1;
  xp_needed integer := 100;
BEGIN
  WHILE xp_amount >= xp_needed LOOP
    level := level + 1;
    xp_needed := xp_needed + (level * 75); -- Each level requires more XP
  END LOOP;
  RETURN level;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get XP required for next level
CREATE OR REPLACE FUNCTION public.get_xp_for_next_level(current_level integer)
RETURNS integer AS $$
DECLARE
  xp_needed integer := 100;
  i integer := 1;
BEGIN
  WHILE i < current_level LOOP
    i := i + 1;
    xp_needed := xp_needed + (i * 75);
  END LOOP;
  RETURN xp_needed;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS TABLE(badge_name text, badge_icon text, xp_earned integer) AS $$
DECLARE
  user_stats_record record;
  badge_record record;
  stat_value integer;
BEGIN
  -- Get user stats
  SELECT * INTO user_stats_record FROM public.user_stats WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check each badge
  FOR badge_record IN SELECT * FROM public.badges LOOP
    -- Get the relevant stat value
    CASE badge_record.requirement_type
      WHEN 'venues_visited' THEN stat_value := user_stats_record.venues_visited;
      WHEN 'events_attended' THEN stat_value := user_stats_record.events_attended;
      WHEN 'reviews_written' THEN stat_value := user_stats_record.reviews_written;
      WHEN 'photos_uploaded' THEN stat_value := user_stats_record.photos_uploaded;
      WHEN 'posts_created' THEN stat_value := user_stats_record.posts_created;
      ELSE stat_value := 0;
    END CASE;

    -- Check if user qualifies and doesn't already have the badge
    IF stat_value >= badge_record.requirement_value THEN
      -- Try to insert the badge (will fail silently if already exists due to UNIQUE constraint)
      INSERT INTO public.user_badges (user_id, badge_id)
      VALUES (p_user_id, badge_record.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;

      -- If we inserted a new badge, return it
      IF FOUND THEN
        badge_name := badge_record.name;
        badge_icon := badge_record.icon;
        xp_earned := badge_record.xp_reward;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment a user stat and award XP
CREATE OR REPLACE FUNCTION public.increment_user_stat(
  p_user_id uuid,
  p_stat_name text,
  p_xp_amount integer DEFAULT 10
)
RETURNS void AS $$
DECLARE
  new_xp integer;
  new_level integer;
BEGIN
  -- Update the specific stat and XP
  EXECUTE format(
    'UPDATE public.user_stats SET %I = %I + 1, xp = xp + $1, updated_at = now() WHERE user_id = $2',
    p_stat_name, p_stat_name
  ) USING p_xp_amount, p_user_id;

  -- Get new XP and calculate level
  SELECT xp INTO new_xp FROM public.user_stats WHERE user_id = p_user_id;
  new_level := public.calculate_level(new_xp);

  -- Update level if changed
  UPDATE public.user_stats
  SET level = new_level
  WHERE user_id = p_user_id AND level != new_level;

  -- Check and award any new badges
  PERFORM public.check_and_award_badges(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
