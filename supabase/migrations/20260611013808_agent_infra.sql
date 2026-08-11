-- Agent infrastructure: audit log, memory, proposal queue, kill-switch flags.
-- Foundation for "Claude as admin" — every autonomous action records to agent_runs,
-- irreversible actions queue to agent_proposals, and feature_flags is the runtime kill switch.

-- ── feature_flags ──────────────────────────────────────────────────────────
-- Runtime config / kill switches read by the agent runner on every invocation.
CREATE TABLE IF NOT EXISTS feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  value       JSONB   NOT NULL DEFAULT '{}'::JSONB,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Global master switch + per-agent enables + cost ceilings.
INSERT INTO feature_flags (key, enabled, value, description) VALUES
  ('agents.master_enabled',         TRUE,  '{}'::JSONB,
    'Global kill switch. When FALSE, agent-runner rejects all invocations.'),
  ('agents.daily_cost_cap_usd',     TRUE,  '{"cap": 5.00}'::JSONB,
    'Sum of cost_usd across all agent_runs in the last 24h. Runner refuses new runs above this.'),
  ('agents.moderation_triage',      FALSE, '{}'::JSONB,
    'Enable the moderation-triage agent. Off by default — flip on after manual smoke test.')
ON CONFLICT (key) DO NOTHING;

-- ── agent_runs ─────────────────────────────────────────────────────────────
-- Every agent invocation. Append-only audit trail; never delete rows.
CREATE TABLE IF NOT EXISTS agent_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name    TEXT NOT NULL,
  triggered_by  TEXT NOT NULL CHECK (triggered_by IN ('user', 'cron', 'webhook', 'admin', 'agent')),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  input         JSONB NOT NULL,
  output        JSONB,
  tool_calls    JSONB,
  status        TEXT NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running', 'succeeded', 'failed', 'cancelled', 'rejected')),
  error         TEXT,
  cost_usd      NUMERIC(10, 6) DEFAULT 0,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS agent_runs_agent_created_idx
  ON agent_runs (agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_runs_user_created_idx
  ON agent_runs (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS agent_runs_status_created_idx
  ON agent_runs (status, created_at DESC);
-- BRIN on created_at for cheap time-range scans (daily-cost rollups, nightly digests).
CREATE INDEX IF NOT EXISTS agent_runs_created_brin_idx
  ON agent_runs USING BRIN (created_at);

-- ── agent_memory ───────────────────────────────────────────────────────────
-- Long-lived per-scope state ("what the agent learned about user X / venue Y").
CREATE TABLE IF NOT EXISTS agent_memory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name  TEXT NOT NULL,
  scope_type  TEXT NOT NULL CHECK (scope_type IN ('user', 'venue', 'event', 'post', 'global')),
  scope_id    TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       JSONB NOT NULL,
  expires_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_name, scope_type, scope_id, key)
);

CREATE INDEX IF NOT EXISTS agent_memory_scope_idx
  ON agent_memory (agent_name, scope_type, scope_id);
CREATE INDEX IF NOT EXISTS agent_memory_expires_idx
  ON agent_memory (expires_at) WHERE expires_at IS NOT NULL;

-- ── agent_proposals ────────────────────────────────────────────────────────
-- Pending actions awaiting approval. Used for irreversible / high-blast-radius operations
-- (account deletion, role change, money movement) even in "autonomous" mode.
CREATE TABLE IF NOT EXISTS agent_proposals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
  agent_name    TEXT NOT NULL,
  proposal_type TEXT NOT NULL,
  target        JSONB NOT NULL,
  payload       JSONB NOT NULL,
  rationale     TEXT NOT NULL,
  confidence    NUMERIC(3, 2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'expired')),
  reviewed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  applied_at    TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_proposals_pending_idx
  ON agent_proposals (created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS agent_proposals_agent_idx
  ON agent_proposals (agent_name, created_at DESC);

-- ── Daily-cost rollup helper ──────────────────────────────────────────────
-- Used by the runner's cost-cap gate. STABLE so it caches within a transaction.
CREATE OR REPLACE FUNCTION agent_cost_last_24h()
RETURNS NUMERIC
LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(SUM(cost_usd), 0)::NUMERIC
  FROM agent_runs
  WHERE created_at >= NOW() - INTERVAL '24 hours';
$$;

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Service role (used by edge functions) bypasses RLS automatically.
-- Authenticated reads are admin-only — these are audit tables, not user-facing.

ALTER TABLE feature_flags    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory     ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_proposals  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read feature_flags"
  ON feature_flags FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Admins read agent_runs"
  ON agent_runs FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Admins read agent_memory"
  ON agent_memory FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Admins read agent_proposals"
  ON agent_proposals FOR SELECT TO authenticated USING (is_admin());

-- Admins can approve/reject proposals from the portal.
CREATE POLICY "Admins update agent_proposals"
  ON agent_proposals FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ── social_posts moderation columns ────────────────────────────────────────
-- Soft-hide support for the moderation-triage agent's hide_post tool.
ALTER TABLE social_posts
  ADD COLUMN IF NOT EXISTS is_hidden     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hidden_reason TEXT,
  ADD COLUMN IF NOT EXISTS hidden_at     TIMESTAMPTZ;

-- Hide rows from the public feed without breaking existing policies.
CREATE INDEX IF NOT EXISTS social_posts_hidden_idx
  ON social_posts (created_at DESC) WHERE is_hidden = FALSE;
