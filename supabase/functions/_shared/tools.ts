// Tool registry — every action an agent can take.
//
// Two parts per tool:
//   1. `definition`  — JSON Schema sent to Claude (the tool surface)
//   2. `handler`     — what actually runs server-side when Claude calls it
//
// Each handler enforces its own permission gate. Never give the agent a service-role
// key without one. Reversible/low-blast actions execute directly; irreversible ones
// (account deletion, role changes, money) MUST go through `queue_proposal`.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type ToolDefinition = {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type ToolContext = {
  runId: string;
  agentName: string;
  supabase: SupabaseClient;
};

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

type Handler = (input: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;

// ── Tool definitions (the JSON Claude sees) ──────────────────────────────

const TOOL_DEFINITIONS = {
  get_post: {
    name: 'get_post',
    description:
      'Fetch a social post by ID, including author info and counters. Returns null if not found.',
    input_schema: {
      type: 'object',
      properties: {
        post_id: { type: 'string', description: 'UUID of the post' },
      },
      required: ['post_id'],
    },
  },

  get_user_history: {
    name: 'get_user_history',
    description:
      'Recent activity for a user: post count, comment count, prior moderation actions, account age in days. Use to assess whether a flagged user is a repeat offender or first-time.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'UUID of the user' },
      },
      required: ['user_id'],
    },
  },

  hide_post: {
    name: 'hide_post',
    description:
      'Soft-hide a post (sets is_hidden=true). REVERSIBLE — admin can unhide. Use for clear-cut spam / ToS violations with confidence >= 0.9.',
    input_schema: {
      type: 'object',
      properties: {
        post_id: { type: 'string' },
        reason: {
          type: 'string',
          description: 'One-sentence reason. Stored on the post and shown to admins.',
        },
      },
      required: ['post_id', 'reason'],
    },
  },

  queue_proposal: {
    name: 'queue_proposal',
    description:
      'Queue an irreversible or high-blast-radius action for human approval. Use when confidence < 0.9 OR the action is destructive (ban user, delete account, change role). Returns the proposal_id.',
    input_schema: {
      type: 'object',
      properties: {
        proposal_type: {
          type: 'string',
          description: 'Action category, e.g. "ban_user", "delete_post", "hide_stories"',
        },
        target: {
          type: 'object',
          description: 'What the action targets, e.g. {table: "profiles", id: "<uuid>"}',
        },
        payload: {
          type: 'object',
          description: 'Action-specific data, e.g. {ban_duration_days: 7}',
        },
        rationale: {
          type: 'string',
          description: 'Plain-English why. This is what a human will read to decide.',
        },
        confidence: {
          type: 'number',
          description: '0..1 confidence score for the recommendation',
        },
      },
      required: ['proposal_type', 'target', 'payload', 'rationale'],
    },
  },

  remember: {
    name: 'remember',
    description:
      'Persist a fact about a user/venue/post for future agent runs. Scope determines where it surfaces next time.',
    input_schema: {
      type: 'object',
      properties: {
        scope_type: { type: 'string', enum: ['user', 'venue', 'event', 'post', 'global'] },
        scope_id: { type: 'string' },
        key: { type: 'string', description: 'Short slug, e.g. "warning_count" or "writing_style"' },
        value: {} as unknown,
        ttl_days: { type: 'number', description: 'Optional expiry in days' },
      },
      required: ['scope_type', 'scope_id', 'key', 'value'],
    },
  },

} satisfies Record<string, ToolDefinition>;

export type ToolName = keyof typeof TOOL_DEFINITIONS;

// ── Handlers (what actually executes) ────────────────────────────────────

const HANDLERS: Record<ToolName, Handler> = {
  get_post: async (input, { supabase }) => {
    const postId = String(input.post_id);
    const { data, error } = await supabase
      .from('social_posts')
      .select('id, user_id, content, media_urls, is_hidden, likes_count, comments_count, created_at, profiles:user_id(full_name, username, role)')
      .eq('id', postId)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  },

  get_user_history: async (input, { supabase }) => {
    const userId = String(input.user_id);
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('user_id, full_name, username, role, created_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (profErr) return { ok: false, error: profErr.message };
    if (!profile) return { ok: true, data: null };

    const [{ count: postCount }, { count: commentCount }, { data: priorActions }] = await Promise.all([
      supabase.from('social_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('comments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase
        .from('agent_proposals')
        .select('proposal_type, status, created_at')
        .eq('target->>id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const ageDays = Math.floor(
      (Date.now() - new Date(profile.created_at).getTime()) / 86400000,
    );
    return {
      ok: true,
      data: {
        profile,
        post_count: postCount ?? 0,
        comment_count: commentCount ?? 0,
        account_age_days: ageDays,
        prior_moderation_actions: priorActions ?? [],
      },
    };
  },

  hide_post: async (input, { supabase, runId, agentName }) => {
    const postId = String(input.post_id);
    const reason = String(input.reason);
    const { error } = await supabase
      .from('social_posts')
      .update({ is_hidden: true, hidden_reason: reason, hidden_at: new Date().toISOString() })
      .eq('id', postId);
    if (error) return { ok: false, error: error.message };
    // Mirror the action into proposals (status='applied') so admins see it in one place.
    await supabase.from('agent_proposals').insert({
      run_id: runId,
      agent_name: agentName,
      proposal_type: 'hide_post',
      target: { table: 'social_posts', id: postId },
      payload: { reason },
      rationale: reason,
      status: 'applied',
      applied_at: new Date().toISOString(),
    });
    return { ok: true, data: { post_id: postId, hidden: true } };
  },

  queue_proposal: async (input, { supabase, runId, agentName }) => {
    const { data, error } = await supabase
      .from('agent_proposals')
      .insert({
        run_id: runId,
        agent_name: agentName,
        proposal_type: String(input.proposal_type),
        target: input.target ?? {},
        payload: input.payload ?? {},
        rationale: String(input.rationale ?? ''),
        confidence: typeof input.confidence === 'number' ? input.confidence : null,
        status: 'pending',
      })
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { proposal_id: data.id, queued: true } };
  },

  remember: async (input, { supabase, agentName }) => {
    const ttlDays = typeof input.ttl_days === 'number' ? input.ttl_days : null;
    const expiresAt = ttlDays ? new Date(Date.now() + ttlDays * 86400000).toISOString() : null;
    const { error } = await supabase
      .from('agent_memory')
      .upsert(
        {
          agent_name: agentName,
          scope_type: String(input.scope_type),
          scope_id: String(input.scope_id),
          key: String(input.key),
          value: input.value as unknown,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'agent_name,scope_type,scope_id,key' },
      );
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { stored: true } };
  },
};

// ── Public API ───────────────────────────────────────────────────────────

export function getToolDefinitions(allowed: readonly ToolName[]): ToolDefinition[] {
  return allowed.map((name) => TOOL_DEFINITIONS[name]);
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
  allowed: readonly ToolName[],
): Promise<ToolResult> {
  if (!allowed.includes(name as ToolName)) {
    return { ok: false, error: `Tool "${name}" not in this agent's allowlist` };
  }
  const handler = HANDLERS[name as ToolName];
  if (!handler) return { ok: false, error: `Unknown tool: ${name}` };
  try {
    return await handler(input, ctx);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}
