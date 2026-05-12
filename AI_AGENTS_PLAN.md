# Gidi Connect — Agentic AI Plan

This document captures every proposed agentic AI use case across the consumer app, business portal, and admin portal, plus the shared infrastructure that makes them feasible. Each agent has a goal, trigger, tools, sketch, effort estimate, and risks.

**Document owner:** Femi · **Last updated:** 2026-05-01 · **Status:** Proposal — not yet scheduled

---

## 1. Why agents, not just an AI chatbox

A traditional LLM chatbox answers one question at a time. An **agent** plans a goal, calls tools (DB queries, APIs, edge functions), observes the result, and iterates until done — taking *actions* on the user's behalf. For a Lagos discovery + commerce app, that's the unlock:

- A consumer doesn't want to "search for a venue" — they want their night booked.
- A venue owner doesn't want a dashboard — they want their venue performing.
- A platform admin doesn't want metrics — they want the platform healthy.

Agents close that gap by turning intent into outcomes.

---

## 2. Architecture foundations

Build these *once*. Every agent below assumes they exist.

### 2.1 Model selection

| Use case | Model | Why |
|---|---|---|
| Default agent loop, single-step tools | `claude-sonnet-4-6` | Best $/quality, fast, strong tool use |
| Multi-step planning (concierge, T&S triage) | `claude-opus-4-7` | Better reasoning across many tool calls |
| High-volume classification (mod, news tagging) | `claude-haiku-4-5-20251001` | Cheap, fast, good enough for narrow tasks |

Always enable **prompt caching** on the system prompt + tool definitions — the tool catalog rarely changes, so cached tokens are 90% cheaper. Use `cache_control: { type: 'ephemeral' }` on the tools block and the static portion of the system prompt.

### 2.2 Where agents run

Three runtimes, picked per use case:

1. **Supabase Edge Functions (Deno)** — stateless, request-scoped, scales to zero. Default for any agent that finishes in < 60s. Cheapest.
2. **Node.js service** (Render/Railway/Fly) — stateful, long-running. Use when an agent needs to keep working between user sessions (e.g. Promotion Strategist running a 7-day A/B test) or holds in-memory subscriptions.
3. **In-app, on-device** — Anthropic SDK called directly from the React Native client. Use *only* for low-stakes UX agents (e.g. caption generator). Never for anything that touches money, moderation, or other users' data.

### 2.3 Persistence — three new tables

Add a migration: `supabase/migrations/2026XXXX_agent_infra.sql`

```sql
-- Every agent invocation, for audit + replay + debugging
CREATE TABLE agent_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name      TEXT NOT NULL,           -- 'night_concierge' | 'promo_strategist' | ...
  triggered_by    TEXT NOT NULL,           -- 'user' | 'cron' | 'webhook' | 'admin'
  user_id         UUID REFERENCES auth.users(id),
  input           JSONB NOT NULL,
  output          JSONB,
  tool_calls      JSONB,                   -- full transcript of tool calls + results
  status          TEXT NOT NULL DEFAULT 'running',  -- running | succeeded | failed | cancelled
  error           TEXT,
  cost_usd        NUMERIC(10, 6),          -- token cost from Anthropic response
  duration_ms     INT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX agent_runs_agent_created_idx ON agent_runs(agent_name, created_at DESC);
CREATE INDEX agent_runs_user_idx ON agent_runs(user_id, created_at DESC);

-- Long-lived agent memory (what the agent learned about a user/venue/event)
CREATE TABLE agent_memory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name      TEXT NOT NULL,
  scope_type      TEXT NOT NULL,           -- 'user' | 'venue' | 'event' | 'global'
  scope_id        TEXT NOT NULL,           -- the relevant ID
  key             TEXT NOT NULL,           -- e.g. 'taste_profile' | 'last_promo_eval'
  value           JSONB NOT NULL,
  expires_at      TIMESTAMPTZ,             -- null = never expires
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_name, scope_type, scope_id, key)
);

-- Pending actions awaiting human approval
CREATE TABLE agent_proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
  agent_name      TEXT NOT NULL,
  proposal_type   TEXT NOT NULL,           -- 'edit_venue' | 'send_dm' | 'create_promo' | ...
  target          JSONB NOT NULL,          -- {table, id} or external resource
  payload         JSONB NOT NULL,          -- what the agent wants to do
  rationale       TEXT NOT NULL,           -- why, in plain English
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | applied
  reviewed_by     UUID REFERENCES auth.users(id),
  reviewed_at     TIMESTAMPTZ,
  applied_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.4 The tool layer

A typed registry of every action an agent can take. One TypeScript file shared by all edge functions.

```typescript
// supabase/functions/_shared/tools.ts
export const TOOLS = {
  search_venues: {
    description: "Search venues by area, category, price tier, and rating. Returns up to 20 venues.",
    input_schema: {
      type: "object",
      properties: {
        area: { type: "string" },
        category: { type: "string" },
        min_rating: { type: "number" },
        is_open_now: { type: "boolean" },
      },
    },
  },
  get_trending_venues: { /* ... */ },
  get_traffic: { /* ... */ },
  get_user_history: { /* ... */ },
  get_news: { /* ... */ },
  rsvp_event: { /* ... */ },
  send_dm: { /* ... */ },
  create_proposal: { /* ... */ },  // for human-in-the-loop actions
  update_venue: { /* ... */ },
  flag_for_review: { /* ... */ },
} as const;

export async function executeTool(
  name: string,
  input: any,
  context: { userId?: string; runId: string; supabase: SupabaseClient }
) { /* dispatch to handlers */ }
```

Each tool handler enforces RLS-equivalent permissions itself — *never* hand the agent a service-role key without a permission gate.

### 2.5 The runner (one edge function for all agents)

```typescript
// supabase/functions/agent-runner/index.ts
import Anthropic from "npm:@anthropic-ai/sdk";
import { TOOLS, executeTool } from "../_shared/tools.ts";
import { AGENTS } from "../_shared/agents.ts";  // system prompt per agent

Deno.serve(async (req) => {
  const { agent_name, input, user_id } = await req.json();
  const agent = AGENTS[agent_name];

  const supabase = createClient(/* ... */);
  const run = await supabase.from("agent_runs").insert({
    agent_name, triggered_by: user_id ? "user" : "cron",
    user_id, input, status: "running",
  }).select().single();

  const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
  const messages = [{ role: "user", content: JSON.stringify(input) }];
  const tools = agent.allowed_tools.map(name => ({ name, ...TOOLS[name] }));

  let toolCalls = [];
  while (true) {
    const resp = await client.messages.create({
      model: agent.model,
      max_tokens: 4096,
      system: [
        { type: "text", text: agent.system_prompt, cache_control: { type: "ephemeral" } },
      ],
      tools,
      messages,
    });

    if (resp.stop_reason === "end_turn") {
      // done
      await supabase.from("agent_runs").update({
        status: "succeeded",
        output: resp.content,
        tool_calls: toolCalls,
        cost_usd: calcCost(resp.usage, agent.model),
      }).eq("id", run.data.id);
      return Response.json({ run_id: run.data.id, output: resp.content });
    }

    if (resp.stop_reason === "tool_use") {
      const toolUse = resp.content.find(c => c.type === "tool_use");
      const result = await executeTool(toolUse.name, toolUse.input, { runId: run.data.id, userId: user_id, supabase });
      toolCalls.push({ name: toolUse.name, input: toolUse.input, result });
      messages.push({ role: "assistant", content: resp.content });
      messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result) }] });
    }
  }
});
```

### 2.6 Safety rails (mandatory)

- **Tool allowlist per agent.** A consumer agent never sees `update_venue`. A moderation agent never sees `send_dm`.
- **Human-in-the-loop by default.** Any action with side effects (sending a message, charging money, editing a venue) goes through `agent_proposals`. The agent's tool returns *"Proposal queued"* — a human (or auto-approver after a confidence check) flips it to applied.
- **Per-user rate limits** on `/agent-runner` — Supabase Edge Function quotas + a `agent_runs` count check.
- **Cost ceilings.** Reject the run if the user's last 24h `cost_usd` sum > tier limit (free tier: $0.05/day, paid: $5/day).
- **Audit everything.** `agent_runs.tool_calls` is the source of truth. Never log to console only.

---

## 3. Consumer app agents

### 3.1 Night-Out Concierge

**Goal:** Turn "I want a chill rooftop in Lekki tonight under ₦10k entry, then somewhere to dance" into a confirmed plan with venues, timings, and traffic-aware routing.

**Trigger:** User taps a "✨ Plan my night" button on Home, or types into a free-form input.

**Runtime:** Edge function (synchronous, < 30s).

**Inputs:**
- Free-form prompt
- User's location (passed from app)
- User profile + check-in history (`profiles`, `venue_check_ins`)
- Time of day

**Tools:** `search_venues`, `get_trending_venues`, `get_traffic`, `get_events_near`, `get_user_history`, `get_followed_users_check_ins` (social proof)

**Output:** A `Plan` object — ordered list of stops with times, expected travel duration, and a one-line "why each was picked." Rendered as a swipable carousel; user taps "Lock in" to RSVP/check in.

**Sketch:**

```typescript
// supabase/functions/_shared/agents.ts
export const AGENTS = {
  night_concierge: {
    model: "claude-opus-4-7",
    allowed_tools: ["search_venues", "get_trending_venues", "get_traffic",
                    "get_events_near", "get_user_history"],
    system_prompt: `You are a Lagos night-out planner. Given a user's vibe,
    location, time, and budget, build a 1-3 stop plan. Use trending data to
    avoid empty venues, traffic data to space stops realistically, and the
    user's check-in history to match their taste. Return JSON: {
      summary: string,
      stops: [{ venue_id, name, eta_arrival, why }],
      total_budget_estimate_naira: number
    }. Do not invent venues — only use ones returned by tools.`,
  },
  // ...
};
```

**Effort:** L (3 weeks) — needs `get_traffic` edge function deployed (currently mocked) and a polished UI.

**Risks:** Traffic API limits (TomTom). Mitigation: cache routes 5min.

---

### 3.2 Proactive Vibe Pinger

**Goal:** Push a notification when something nearby is *unusually* good for this user *right now*.

**Trigger:** Background cron every 15 min during peak hours (Thu-Sun 6pm-2am Lagos time). Skips users with notifications off.

**Runtime:** Node.js service (long-lived; subscribes to `venue_check_ins` realtime).

**Inputs:** User's followed venues, recent check-in deltas, weather, news headlines, user's location (last seen).

**Tools:** `get_check_in_deltas`, `get_news`, `send_push_notification`, `create_proposal` (notification needs cost gate).

**Output:** Push notification — *"🔥 Cocoon hit a 4-week high in check-ins right now. Live band starting in 20m. 12 min from you."*

**Sketch:**

```typescript
// node-service/agents/vibe-pinger.ts
async function tickForUser(userId: string) {
  const memory = await getMemory("vibe_pinger", "user", userId, "last_pinged");
  if (memory && Date.now() - memory.value.ts < 4 * 60 * 60 * 1000) return; // max 1 ping / 4h

  const result = await runAgent("vibe_pinger", { user_id: userId });
  if (result.should_ping) {
    await sendPush(userId, result.message);
    await setMemory("vibe_pinger", "user", userId, "last_pinged", { ts: Date.now() });
  }
}
```

**Effort:** L (4 weeks) — push notification infra (Expo Push), Node service deploy, careful tuning to avoid notification fatigue.

**Risks:** Notification fatigue. Mitigation: hard cap 1 ping / 4h, opt-out, A/B test message styles.

---

### 3.3 Group Planner

**Goal:** A WhatsApp-style "let's go out tonight?" thread becomes a confirmed plan everyone agreed to.

**Trigger:** User creates a "Group Night" with 2-6 friends. Each adds prefs (budget, vibe, area). Agent runs once when last person submits.

**Runtime:** Edge function.

**Inputs:** Each member's prefs + their `profiles` and `venue_check_ins`.

**Tools:** `search_venues`, `get_traffic` (multi-origin — find a venue minimizing total travel time), `get_trending_venues`.

**Output:** 2-3 venue options ranked by "fit score" with a short rationale. Group votes via reactions, then agent auto-RSVPs everyone.

**Sketch:** Reuses concierge tools; the system prompt tells it to optimize for *median* fit across the group, not max for any one person.

**Effort:** M (2 weeks) — concierge needs to ship first.

**Risks:** Multi-origin travel-time API costs. Mitigation: cluster origins by area first, query once per cluster.

---

### 3.4 Auto-Storyteller

**Goal:** "Make a story from tonight" → publish a polished Story with caption and stickers.

**Trigger:** User taps a button after a check-in. Or runs automatically next morning if user opted in.

**Runtime:** In-app (Anthropic SDK direct) for caption gen; edge function for safe rendering.

**Inputs:** Tonight's `venue_check_ins` for this user, photos in their camera roll from that time window (with permission), location names.

**Tools:** `generate_caption`, `pick_sticker`, `compose_story` (uses existing `stories` table).

**Output:** A drafted story preview the user reviews before publish. *"Closed out the weekend at So Fresh Lekki 🌅 — the avocado toast deserved its own story."*

**Sketch:** Sonnet 4.6, single LLM call per photo, no agent loop needed (this is closer to "AI feature" than full agent — but it composes well with Concierge).

**Effort:** S (1 week).

**Risks:** Privacy. Mitigation: never auto-publish; always preview.

---

### 3.5 Trip Itinerary Agent

**Goal:** A diaspora visitor or tourist gets a 3-day Lagos plan.

**Trigger:** User picks "I'm visiting Lagos" onboarding flow, sets dates and interests.

**Runtime:** Edge function. Long-running (~60s) — give it a loader UI.

**Inputs:** Dates, interests (food/nightlife/culture/business), budget, group size.

**Tools:** Same as Concierge + `get_events_in_range`, `get_news` (to surface "this Saturday is Lagos Fashion Week"), `add_to_calendar`.

**Output:** Day-by-day plan, RSVPs to free events, calendar export.

**Effort:** M (2 weeks) — extends Concierge.

**Risks:** Stale data for events far in future. Mitigation: regenerate plan each morning of the trip.

---

## 4. Business portal agents

### 4.1 Listing Optimizer

**Goal:** Make every venue page convert better — descriptions, tags, photo order, name.

**Trigger:** Cron weekly per venue. Or owner clicks "Optimize my listing."

**Runtime:** Edge function.

**Inputs:** Venue row (`venues` table), recent reviews, top 5 competitor listings in same area+category, the venue's traffic vs. category median.

**Tools:** `get_venue`, `get_competitors`, `score_photo` (could call a vision model), `propose_edits`.

**Output:** A `agent_proposals` row of type `edit_venue` with diff. Owner sees it on their dashboard with "Apply" button.

**Sketch:**

```typescript
// agent system prompt
`You're a venue listing copywriter for Gidi Connect. You optimize for two
things: search relevance (tags, category) and click-through (description hook,
photo order). Read the venue's current listing, competitor listings, and the
last 30 days of reviews. Propose a diff that improves clarity, fixes any
factual errors mentioned in reviews, and uses Lagos-native terms. Output
proposed_edits with rationale per field.`
```

**Effort:** M (2 weeks).

**Risks:** Owner pushback if AI rewrites their voice. Mitigation: always proposal-gated, never auto-apply.

---

### 4.2 Promotion Strategist

**Goal:** Tell a venue owner *exactly* when, what, and how much to promote — based on their data, not generic advice.

**Trigger:** Cron weekly (Sunday night, briefing for the coming week). Or owner clicks "Should I promote?"

**Runtime:** Node.js service (some plans run multi-day A/B tests; needs persistent state).

**Inputs:** Venue's `venue_check_ins` time series (90 days), `event_rsvps`, `trending_venues` history, weather forecast, Lagos events calendar (from `news`), competitor activity.

**Tools:** `get_check_in_timeseries`, `get_competitor_promotions`, `get_weather_forecast`, `get_events_in_lagos`, `propose_promotion`.

**Output:** Briefing email/in-portal card:
> *"Promote Thu Apr 18, 5pm-11pm at ₦4,500 for ₦35k. Your Thu evenings are 40% below your Fri baseline; a similar promo last month lifted check-ins 2.3x. Lagos Fashion Week ends Thu — high spillover potential."*

**Sketch:**

```typescript
{
  agent_name: "promo_strategist",
  model: "claude-opus-4-7",
  loop: "weekly_per_venue",
  output_format: "agent_proposal",
  proposal_type: "create_promo",
}
```

**Effort:** L (4 weeks). The biggest revenue lever for the platform — businesses pay for promotion, this agent drives usage.

**Risks:** Bad recommendation = lost owner trust. Mitigation: show the data behind every recommendation; require min 30-day history before agent activates.

---

### 4.3 Review & DM Responder

**Goal:** Draft a response to every new review and Instagram DM in the venue's voice; owner approves.

**Trigger:** New row in `venue_reviews`. Or new DM via Instagram Graph API webhook (using stored `instagram_handle`).

**Runtime:** Edge function.

**Inputs:** New review/DM, last 20 reviews+responses for tone, venue profile, business owner's prior approved responses (to learn voice).

**Tools:** `get_venue_reviews`, `get_owner_voice_samples`, `propose_response`.

**Output:** `agent_proposals` of type `send_response`. One-tap "Approve" or "Edit & approve" on portal.

**Effort:** M (2 weeks for reviews; +2 weeks if Instagram DMs).

**Risks:** Tone mismatch. Mitigation: bootstrap with 5 owner-written examples; agent can ask owner for clarifications via portal inbox.

---

### 4.4 Event Lifecycle Agent

**Goal:** Owner says "I want a Sunday brunch series for 8 weeks." Agent handles the rest.

**Trigger:** Owner submits event series brief.

**Runtime:** Node.js service (multi-week durable workflow).

**Inputs:** Series brief, venue capacity, owner's past event performance.

**Tools:** `create_events` (8 rows), `schedule_promotion_bursts`, `send_rsvp_reminders` (T-24h, T-2h), `request_review` (T+1d), `summarize_event_outcome` (T+3d).

**Output:** A continuously-running plan, surfaced as a Gantt-like view in the portal. Owner can pause/edit any step.

**Effort:** L (4 weeks).

**Risks:** Long-running state — needs robust retries, idempotency. Mitigation: built on a real workflow engine (Inngest or Temporal lite).

---

### 4.5 Demand Forecaster

**Goal:** "Friday will be your busiest night this month — staff up." 5-7 days advance warning.

**Trigger:** Daily cron, 6am.

**Runtime:** Edge function (it just queries + summarizes).

**Inputs:** 90-day check-in history, RSVP counts for upcoming events, competitor schedule, weather forecast, Lagos events.

**Tools:** Read-only over time-series + external APIs.

**Output:** Per-day "expected fill" estimate (low/med/high/peak) + rationale. Lives on the venue's dashboard.

**Effort:** M (3 weeks). Use a simple statistical baseline (median of same day-of-week, last 8 weeks) and let the LLM *adjust* for events/weather/news rather than forecast from scratch.

**Risks:** Overconfidence. Mitigation: always show a confidence band, never a single number.

---

## 5. Admin portal agents

### 5.1 Moderation Triage

**Goal:** Auto-resolve tier-1 reports (spam, obvious ToS); package tier-2 with context for human review.

**Trigger:** New report submitted by a user. Or new post/story flagged by automated content classifier.

**Runtime:** Edge function.

**Inputs:** Reported content, reporter history, target user history, prior moderation decisions on similar content.

**Tools:** `get_content`, `get_user_history`, `classify_content`, `apply_moderation_action` (proposal-gated for tier-2; auto-applied for tier-1 with high confidence).

**Output:** Moderation action OR a tier-2 case file with: reported content, user histories, prior decisions on similar content, recommended action, confidence score.

**Sketch:**

```typescript
// system prompt
`Classify this report into: spam (auto-remove), harassment (escalate),
hate_speech (escalate), benign (close), borderline (escalate). For escalations,
write a 3-paragraph case file: what happened, relevant history, recommended
action with confidence 0-1. Auto-apply only if confidence >= 0.92 AND the
action is non-permanent (post hide, not user ban).`
```

**Effort:** M (3 weeks). Highest-value admin agent — moderation cost grows linearly with users.

**Risks:** False positives → user trust loss. Mitigation: high confidence threshold, full audit log, easy appeal flow.

---

### 5.2 Anomaly Watcher

**Goal:** Detect bot signups, fake reviews, fake check-ins, follower farms — *before* they pollute the platform.

**Trigger:** Continuous (every 10 min). Implemented as Node.js service watching realtime streams.

**Runtime:** Node.js service.

**Inputs:** Last 10 min of `profiles` (signups), `venue_reviews`, `follows`, `venue_check_ins`. Compares to 30-day baselines.

**Tools:** `query_recent_activity`, `get_user_signal` (IP, device, signup time-of-day), `flag_for_review`, `freeze_account` (proposal-gated).

**Output:** Filed `agent_proposals` with evidence + recommended action.

**Sketch:** Two-stage — a cheap statistical detector flags candidates (signup spike, review burst on same venue), then Sonnet investigates each candidate with full context.

**Effort:** L (4 weeks).

**Risks:** False positives freezing real users. Mitigation: freeze action is reversible + auto-expires in 24h unless human confirms.

---

### 5.3 News Agent v2

**Goal:** Promote `scripts/lagos-news-agent.js` (already exists) into a proper agent that classifies, dedupes, summarizes, and drafts editorial framing.

**Trigger:** Same hourly cron the script already runs on.

**Runtime:** Node.js (extend the existing script).

**Inputs:** Scraped articles.

**Tools:** `dedupe_against_recent_news`, `classify_category`, `summarize`, `score_relevance_to_lagos`, `propose_publish` (auto-publishes if score > 0.85).

**Output:** A polished `news` row with summary, category, relevance score, "why Lagosians care" framing.

**Effort:** S (1 week) — script exists; this is upgrades on top.

**Risks:** Wrong category tagging. Mitigation: low-confidence articles go to admin queue.

---

### 5.4 Onboarding Agent

**Goal:** New venue owner finishes setup with a complete, listable venue — no admin intervention needed.

**Trigger:** New row in `business_profiles`.

**Runtime:** Edge function, runs each time owner saves a draft.

**Inputs:** Current venue draft, what's missing, owner's other channels (Instagram handle).

**Tools:** `validate_address` (Google Maps), `fetch_instagram_photos`, `extract_amenities_from_description`, `score_photo_quality`, `request_missing_info` (sends DM to owner).

**Output:** Either greenlight to publish OR a checklist DM to the owner with what's missing and why it matters.

**Effort:** M (2 weeks).

**Risks:** Bad addresses validated as good. Mitigation: cross-check with Instagram handle's location.

---

### 5.5 Trust & Safety Investigator

**Goal:** Given a serious user report, gather evidence and write the case file a human admin would.

**Trigger:** Tier-2 escalation from Moderation Triage. Or admin clicks "Investigate" on a profile.

**Runtime:** Edge function.

**Inputs:** Target user, reporter, alleged violation.

**Tools:** Wide read access — `get_user_full_history`, `get_user_devices`, `get_related_accounts` (same IP/device), `search_user_content`.

**Output:** Markdown case file: timeline, content, related accounts, prior violations, recommended action, confidence. Pasted into admin's review screen.

**Effort:** M (3 weeks).

**Risks:** Privacy / data minimization. Mitigation: investigations only on verified reports; tool access scoped to the report subject; full audit log.

---

## 6. Cross-cutting agents

### 6.1 Personalized Promotion Pipeline

**Goal:** When admin promotes a venue, generate a *different* pitch for each consumer — increases conversion vs. one-size promotion.

**Trigger:** Admin sets `is_promoted = true` on a venue.

**Runtime:** Node.js service (batch job — runs once per promoted venue).

**Inputs:** Venue, target consumer cohort (matched by area + check-in history).

**Tools:** `get_target_users`, `personalize_pitch`, `send_push_notification` (rate-limited per user).

**Output:** Up to N personalized push notifications. *"You went to So Fresh 3 weeks ago — their new sister venue Cocoon opens tonight, ₦2k off if you check in by 10pm."*

**Effort:** M (2 weeks). Builds on Vibe Pinger infra.

**Risks:** Spammy. Mitigation: max 1 promo push / user / 48h, hard opt-out.

---

### 6.2 Event Lifecycle Agent (consumer side)

**Goal:** When a venue creates an event (Section 4.4), the *consumer-facing* part of that lifecycle — promotion to right communities, RSVP nudges, post-event review — runs as agent-driven push.

**Trigger:** Linked to 4.4.

**Runtime:** Same Node service.

**Inputs:** Event row, target communities (auto-matched from event tags), RSVP'd users.

**Tools:** `post_to_community`, `send_event_reminder`, `request_review`.

**Output:** Promotion posts in matched `communities`, scheduled reminders, post-event review prompts.

**Effort:** M (2 weeks, on top of 4.4).

**Risks:** Spamming communities. Mitigation: rate limit per community per week.

---

### 6.3 Marketplace Matchmaker

**Goal:** Real-time matching of consumer searches to venue capacity. *"6 people, rooftop, tonight"* → instant outreach to venues that have capacity.

**Trigger:** Consumer search with intent flagged as "tonight."

**Runtime:** Edge function (sub-5s).

**Inputs:** Search criteria, list of candidate venues.

**Tools:** `search_venues`, `notify_venue_of_inquiry` (sends owner a portal notification + DM), `wait_for_response` (with 60s timeout).

**Output:** Live results — venues that confirmed availability shown above the rest with a "✓ Available" badge.

**Effort:** L (4 weeks). Highest UX win but hardest to ship — depends on owner responsiveness.

**Risks:** Owners ignore notifications → empty experience. Mitigation: launch with venues that opted into "fast response" tier; show response-rate as venue stat.

---

## 7. Phased rollout

### Phase 1 — Foundations + first wins (weeks 1-4)

Build:
- Section 2 infra: tables, runner, tool layer, audit logging
- **News Agent v2** (5.3) — easiest win, you already have the scraper
- **Auto-Storyteller** (3.4) — single-call AI feature; ships a "wow" moment
- **Listing Optimizer** (4.1) — proposal-gated, low-risk, instant business value

Why these first: each ships independent value, exercises a different runtime (cron / on-demand / weekly batch), and forces the infra to be built right.

### Phase 2 — Core revenue + safety (weeks 5-12)

Build:
- **Promotion Strategist** (4.2) — biggest revenue lever
- **Moderation Triage** (5.1) — biggest cost-saver as platform grows
- **Night-Out Concierge** (3.1) — flagship consumer feature

### Phase 3 — Scale-out (weeks 13-20+)

Build everything else, prioritized by Phase 1+2 learnings.

---

## 8. Cost estimate

Rough monthly cost at three platform sizes, using prompt caching:

| Agent | Per-call cost | Calls/month @ 10k DAU | Calls/month @ 100k DAU |
|---|---|---|---|
| News Agent v2 | $0.005 | 720 (hourly) | 720 |
| Concierge | $0.04 | 30k (3/user/mo) | 300k |
| Vibe Pinger | $0.01 | 50k | 500k |
| Promo Strategist | $0.10 | 4k (weekly/venue) | 40k |
| Moderation | $0.008 | 5k | 50k |
| **Monthly total (rough)** | — | **~$1,800** | **~$18,000** |

Anthropic API spend at 100k DAU is ~18% of typical revenue at that scale (assuming $1/MAU). Acceptable. Opus 4.7 is reserved for Concierge + Promo + T&S — everything else uses Sonnet 4.6 or Haiku 4.5.

---

## 9. Open decisions

1. **Where does the Node service live?** Render / Railway / Fly / Supabase Cloud Functions when they launch. Recommend Railway for start (cheap, simple).
2. **Workflow engine for long-lived agents (4.4, 6.2)?** Inngest (managed, generous free tier) vs. Temporal (powerful, ops-heavy). Recommend Inngest for Phase 2.
3. **Voice/tone calibration per business** — do owners write 5 example responses on signup, or does the agent learn from their first 10 approvals? Recommend the latter (less friction).
4. **Free vs. paid agents** — which agents are gated to paid tiers? Recommend: Concierge free, Promo Strategist paid (flagship feature), Listing Optimizer free for first 30 days then paid.

---

## 10. Appendix — Anthropic SDK boilerplate

The exact pattern every agent edge function should follow. Save as `supabase/functions/_shared/runAgent.ts`.

```typescript
import Anthropic from "npm:@anthropic-ai/sdk@latest";

export async function runAgent(opts: {
  agentName: string;
  userPrompt: string;
  systemPrompt: string;
  tools: Anthropic.Tool[];
  model: "claude-sonnet-4-6" | "claude-opus-4-7" | "claude-haiku-4-5-20251001";
  maxIterations?: number;
  context: { userId?: string; runId: string; supabase: any; toolHandler: ToolHandler };
}): Promise<{ output: any; toolCalls: any[] }> {
  const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: opts.userPrompt }];
  const toolCalls: any[] = [];
  const maxIter = opts.maxIterations ?? 10;

  for (let i = 0; i < maxIter; i++) {
    const resp = await client.messages.create({
      model: opts.model,
      max_tokens: 4096,
      system: [
        { type: "text", text: opts.systemPrompt, cache_control: { type: "ephemeral" } },
      ],
      tools: opts.tools,
      messages,
    });

    if (resp.stop_reason === "end_turn") {
      return { output: resp.content, toolCalls };
    }

    if (resp.stop_reason !== "tool_use") {
      throw new Error(`Unexpected stop_reason: ${resp.stop_reason}`);
    }

    const toolUseBlocks = resp.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    messages.push({ role: "assistant", content: resp.content });

    const results = await Promise.all(
      toolUseBlocks.map(async (tu) => {
        const result = await opts.context.toolHandler(tu.name, tu.input, opts.context);
        toolCalls.push({ name: tu.name, input: tu.input, result });
        return { type: "tool_result" as const, tool_use_id: tu.id, content: JSON.stringify(result) };
      })
    );

    messages.push({ role: "user", content: results });
  }

  throw new Error(`Agent ${opts.agentName} exceeded max iterations`);
}
```

That's the only "framework" you need. Every agent file is then ~50 lines: define system prompt, pick tools, call `runAgent`.
