-- =====================================================
-- Expo Push token registry.
--
-- Per-device tokens so the send-push edge function can fan a notification
-- row out to every device the recipient has signed into. One row per
-- (user_id, expo_token) pair so re-registering the same device on the
-- same account is idempotent.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_token TEXT NOT NULL,
  platform   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, expo_token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- A user can read / register / revoke only their own tokens.
CREATE POLICY "Users read own push_tokens"
  ON public.push_tokens FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users register own push_tokens"
  ON public.push_tokens FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own push_tokens"
  ON public.push_tokens FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
