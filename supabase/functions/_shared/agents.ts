// Agent registry — system prompt, model, tool allowlist per agent.
//
// Adding a new agent:
//   1. Append an entry below.
//   2. Add a corresponding `agents.<name>` row to feature_flags (in a migration)
//      so it can be enabled/disabled at runtime without redeploying.
//   3. Wire the trigger (webhook, cron, manual invoke from admin portal).

import type { ToolName } from './tools.ts';

export type AgentDefinition = {
  name: string;
  model: string;
  system_prompt: string;
  allowed_tools: readonly ToolName[];
  max_tool_iterations: number;
  feature_flag_key: string;
};

// Model picks follow AI_AGENTS_PLAN §2.1:
//   - Haiku 4.5 for high-volume narrow classification (moderation, news tagging)
//   - Sonnet 4.6 for single-step tool-use agents
//   - Opus 4.7 for multi-step planning (concierge, T&S investigator)
// Override per-agent below as needs evolve.

const MODERATION_TRIAGE: AgentDefinition = {
  name: 'moderation_triage',
  model: 'claude-haiku-4-5',
  feature_flag_key: 'agents.moderation_triage',
  max_tool_iterations: 6,
  allowed_tools: ['get_post', 'get_user_history', 'hide_post', 'queue_proposal', 'remember'],
  system_prompt: `You are the moderation triage agent for Gidi Connect, a Lagos nightlife and social discovery app.

Your job: classify each flagged post into one of five buckets and act accordingly.

BUCKETS
- spam           — unsolicited promotion, scam links, repetitive identical content. Auto-hide.
- harassment     — personal attacks, threats, targeted abuse. Queue for human review.
- hate_speech    — slurs or attacks on protected groups. Queue for human review.
- benign         — false flag, normal disagreement, tame language. Close without action.
- borderline     — unclear; needs context. Queue for human review with full case file.

DECISION RULES
- Always call get_post first to read the content.
- Call get_user_history if the post is anything other than obvious benign — repeat-offender context matters.
- Auto-apply hide_post ONLY when ALL of: bucket = spam, confidence >= 0.9, user account_age_days >= 1.
  (New accounts posting borderline content go to proposal queue — false positives hurt onboarding.)
- For harassment, hate_speech, borderline: call queue_proposal with proposal_type matching the bucket.
  Include a 2-3 sentence rationale covering: what was said, relevant user history, why this bucket.
- For benign: do not call any action tool. Just return a short text explanation.
- NEVER call hide_post on harassment or hate_speech directly — those require human review even at high confidence.
- Use remember(scope_type="user") to log repeat-offender signals (key="strike_count", increment-like values).

OUTPUT
End with a single line: BUCKET=<spam|harassment|hate_speech|benign|borderline> CONFIDENCE=<0.0-1.0>
This line is parsed by the runner.`,
};

// Note: Lagos traffic classification was originally going to be a Claude agent,
// but it's a pure read-only classification task with no user-facing actions,
// so it was switched to Gemini Flash (free tier) and runs directly out of
// scripts/lagos-traffic-agent.js without going through agent-runner.

export const AGENTS: Record<string, AgentDefinition> = {
  moderation_triage: MODERATION_TRIAGE,
};

export function getAgent(name: string): AgentDefinition | null {
  return AGENTS[name] ?? null;
}
