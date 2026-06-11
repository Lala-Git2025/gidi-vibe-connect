// agent-runner — single entry point for every Claude-as-admin invocation.
//
// Request body:
//   { agent_name: string, input: object, triggered_by?: "cron"|"webhook"|"admin"|"user" }
//
// Required Supabase secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
//
// Flow:
//   1. Check global kill switch + per-agent enable flag
//   2. Check 24h cost cap
//   3. Insert agent_runs row (status=running)
//   4. Loop: messages.create → execute tools → feed results back → repeat
//   5. Update agent_runs row with final status, cost, duration, transcript

import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';
import { getAgent } from '../_shared/agents.ts';
import {
  adminClient,
  executeTool,
  getToolDefinitions,
  type ToolName,
} from '../_shared/tools.ts';
import { calcCostUsd } from '../_shared/cost.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type FlagRow = { enabled: boolean; value: Record<string, unknown> };

async function readFlag(supabase: ReturnType<typeof adminClient>, key: string): Promise<FlagRow | null> {
  const { data } = await supabase
    .from('feature_flags')
    .select('enabled, value')
    .eq('key', key)
    .maybeSingle();
  return (data as FlagRow | null) ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { agent_name?: string; input?: unknown; triggered_by?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const agentName = body.agent_name;
  const input = (body.input ?? {}) as Record<string, unknown>;
  const triggeredBy = body.triggered_by ?? 'webhook';

  if (!agentName) return json({ error: 'agent_name is required' }, 400);

  const agent = getAgent(agentName);
  if (!agent) return json({ error: `Unknown agent: ${agentName}` }, 404);

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500);

  let supabase;
  try {
    supabase = adminClient();
  } catch (err) {
    return json({ error: String(err) }, 500);
  }

  // ── 1. Kill switches ───────────────────────────────────────────────────
  const master = await readFlag(supabase, 'agents.master_enabled');
  if (!master?.enabled) {
    return json({ error: 'Agents disabled (agents.master_enabled=false)' }, 503);
  }
  const agentFlag = await readFlag(supabase, agent.feature_flag_key);
  if (!agentFlag?.enabled) {
    return json({ error: `Agent disabled (${agent.feature_flag_key}=false)` }, 503);
  }

  // ── 2. 24h cost cap ────────────────────────────────────────────────────
  const costFlag = await readFlag(supabase, 'agents.daily_cost_cap_usd');
  if (costFlag?.enabled) {
    const cap = Number((costFlag.value as { cap?: number }).cap ?? 5);
    const { data: costData } = await supabase.rpc('agent_cost_last_24h');
    const spent = Number(costData ?? 0);
    if (spent >= cap) {
      return json({ error: `Daily cost cap reached: $${spent.toFixed(2)} of $${cap.toFixed(2)}` }, 429);
    }
  }

  // ── 3. Open agent_runs row ─────────────────────────────────────────────
  const startedAt = Date.now();
  const { data: runRow, error: insErr } = await supabase
    .from('agent_runs')
    .insert({
      agent_name: agent.name,
      triggered_by: triggeredBy,
      input,
      status: 'running',
    })
    .select('id')
    .single();
  if (insErr || !runRow) return json({ error: `Could not open run row: ${insErr?.message}` }, 500);
  const runId: string = runRow.id;

  // ── 4. Claude loop ─────────────────────────────────────────────────────
  const client = new Anthropic({ apiKey: anthropicKey });
  const tools = getToolDefinitions(agent.allowed_tools);

  // deno-lint-ignore no-explicit-any
  const messages: any[] = [{ role: 'user', content: JSON.stringify(input) }];
  // deno-lint-ignore no-explicit-any
  const toolCallLog: any[] = [];
  let totalCost = 0;
  let finalOutput: unknown = null;
  let status: 'succeeded' | 'failed' = 'succeeded';
  let errorMsg: string | null = null;

  try {
    for (let iter = 0; iter < agent.max_tool_iterations; iter++) {
      const resp = await client.messages.create({
        model: agent.model,
        max_tokens: 4096,
        // Cache the static system prompt + tool definitions.
        system: [
          {
            type: 'text',
            text: agent.system_prompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: tools as unknown as Anthropic.Tool[],
        messages,
      });

      totalCost += calcCostUsd(agent.model, resp.usage);

      if (resp.stop_reason === 'end_turn' || resp.stop_reason === 'max_tokens') {
        finalOutput = resp.content;
        break;
      }

      if (resp.stop_reason === 'tool_use') {
        // Append assistant turn verbatim (preserves tool_use blocks).
        messages.push({ role: 'assistant', content: resp.content });

        const toolUses = resp.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
        );
        const toolResults = [];
        for (const tu of toolUses) {
          const result = await executeTool(
            tu.name,
            tu.input as Record<string, unknown>,
            { runId, agentName: agent.name, supabase },
            agent.allowed_tools as readonly ToolName[],
          );
          toolCallLog.push({ name: tu.name, input: tu.input, result });
          toolResults.push({
            type: 'tool_result' as const,
            tool_use_id: tu.id,
            content: JSON.stringify(result),
            is_error: !result.ok,
          });
        }
        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      // Unknown stop reason — bail.
      errorMsg = `Unexpected stop_reason: ${resp.stop_reason}`;
      status = 'failed';
      finalOutput = resp.content;
      break;
    }

    if (status === 'succeeded' && finalOutput === null) {
      errorMsg = `Hit max_tool_iterations (${agent.max_tool_iterations}) without end_turn`;
      status = 'failed';
    }
  } catch (err) {
    status = 'failed';
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  // ── 5. Close the run row ───────────────────────────────────────────────
  await supabase
    .from('agent_runs')
    .update({
      status,
      output: finalOutput,
      tool_calls: toolCallLog,
      error: errorMsg,
      cost_usd: totalCost,
      duration_ms: Date.now() - startedAt,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId);

  return json({
    run_id: runId,
    status,
    error: errorMsg,
    cost_usd: totalCost,
    iterations: toolCallLog.length,
    output: finalOutput,
  });
});
