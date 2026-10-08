# The Social Section

How posts, follows and privacy fit together in Gidi Connect. Written for anyone
changing the Social tab, the follow graph, or any RLS policy that touches them.

Last substantive change: **2026-10-03** — migration
`20261003220000_social_visibility_private_accounts_follow_requests`.

---

## 1. Surfaces

| Surface | File | Holds |
|---|---|---|
| Social tab | [SocialScreen.tsx](apps/consumer-app/screens/SocialScreen.tsx) | Feed (two lanes), Communities, People |
| Data layer | [lib/social.ts](apps/consumer-app/lib/social.ts) | Feed queries, follow graph, privacy |
| Composer | [CreatePostModal.tsx](apps/consumer-app/components/CreatePostModal.tsx) | Post body, community, **audience** |
| Vibes (stories) | [StoryCreatorContext.tsx](apps/consumer-app/contexts/StoryCreatorContext.tsx) | 24h media, **separate model — see §9** |
| Notifications | [NotificationsBell.tsx](apps/consumer-app/components/NotificationsBell.tsx) | Follow, request, approval, likes, comments |
| Privacy toggle | [ProfileScreen.tsx](apps/consumer-app/screens/ProfileScreen.tsx) | Account → Private Account |

---

## 2. The model in one paragraph

**Public by default, private by choice.** This is a discovery product: someone
who signed up five minutes ago has no graph, and a follows-only feed would show
them an empty screen. So the open pool stays, and privacy is an opt-in at two
levels — the account (`profiles.is_private`) and the individual post
(`social_posts.visibility`). Following is asymmetric, Instagram-style. A
*mutual* follow is this product's "friend", and it is **derived, not stored**.

This is deliberately **not** the Threads model. Threads' feed is
recommendation-first — the ranking *is* the product, and it needs enormous
content volume to feel alive while actively de-emphasising the follow graph.
With single-digit post counts there is nothing to rank, and the graph is the
thing we are trying to make matter.

---

## 3. Schema

```
profiles.is_private        boolean  NOT NULL DEFAULT false
follows.status             text     NOT NULL DEFAULT 'accepted'   -- 'pending' | 'accepted'
social_posts.visibility    text     NOT NULL DEFAULT 'public'     -- 'public' | 'followers' | 'mutuals'
```

Plus, already present and now actually load-bearing:

```
social_posts.is_hidden     boolean  NOT NULL DEFAULT false        -- moderation
blocked_users (blocker_id, blocked_id) PRIMARY KEY
```

Indexes added for the audience checks:

```
idx_follows_following_follower_status  (following_id, follower_id, status)
idx_follows_pending_target             (following_id, created_at DESC) WHERE status = 'pending'
```

### `follows.status` is set by the database, never the client

A `BEFORE INSERT` trigger (`trg_set_follow_status`) overwrites whatever arrives
with the value derived from the target's privacy. Without it a client could
`POST {status: 'accepted'}` against a private account and walk straight in.
Only the **followed** account may move it to `accepted`, enforced by the
`follows_update_target_approves` policy. Declining is a `DELETE`.

---

## 4. Where visibility is enforced

**In RLS. Not in the client.** This is the single most important thing in this
document, because it was not true before 2026-10-03.

`social_posts` previously had one SELECT policy — `USING (true)`, granted to
`public`, which includes `anon`. Every post was readable by anyone holding the
publishable key, signed in or not. Three protections were therefore decorative:

- **`is_hidden` was not referenced anywhere in the consumer app.** The
  `moderation_triage` agent's auto-hide left posts rendering in every client.
- **Blocking was a client-side filter** — rows crossed the wire and were then
  dropped from a `Set` in JS.
- **There was no account privacy or post audience at all.**

A client-side filter is not a privacy boundary. It decides what an honest
client chooses to draw, and nothing more.

### The decision function

One definition, used by every policy, so the rule cannot drift per table:

```sql
can_view_post(author, visibility) :=
  guest (auth.uid() IS NULL) → visibility = 'public' AND author is not private
  author = auth.uid()        → true
  blocked either direction   → false
  visibility = 'mutuals'     → is_mutual(author, viewer)
  visibility = 'followers'   → follows_accepted(author, viewer)
  visibility = 'public'      → author is not private OR follows_accepted(author, viewer)
```

Note the last line: **`public` is still gated by the account.** A private
account has no public posts — only posts its accepted followers can see.

### Policy coverage

| Table | SELECT | Writes |
|---|---|---|
| `social_posts` | `is_admin()` OR (not hidden *or* own) AND `can_view_post` | own only |
| `comments` | visible post AND not blocked either way | own, **and only on a visible post** |
| `post_likes` | visible post | own, **and only on a visible post** |

Writes follow reads: you cannot comment on or like a post you cannot see.

Helpers are `STABLE SECURITY DEFINER` with a pinned `search_path`, matching
`auth_role()` / `is_admin()`. `SECURITY DEFINER` matters for more than
convenience — a plain subquery inside a policy is itself subject to the
referenced table's RLS, which is how policy recursion starts.

**Admins bypass** via `is_admin()`, and deliberately see hidden posts so the
moderation queue has something to review. **The author keeps seeing their own
hidden post** — `hidden_reason` exists to explain it, and silently vanishing it
reads as data loss.

**Service-role callers bypass RLS entirely**, so the edge functions in
[_shared/tools.ts](supabase/functions/_shared/tools.ts) are unaffected.

---

## 5. The two feeds

| Lane | Contents |
|---|---|
| **Following** | Accounts you follow (accepted) + communities you joined + your own posts |
| **Discover** | The open Lagos pool |

This replaced New / Top / Hot, which were Reddit-shaped sorts over a single
global pool. Following someone changed nothing about what you saw, so the
gesture had no reward — which is most of why the graph never grew.

Source ids for Following come from one RPC, `following_feed_sources()`, rather
than two client queries whose results are discarded after building an `.in()`.

### Cold start

`pickLane(count)` returns `discover` below `FOLLOWING_LANE_MIN` (3) posts. On
first load the screen fetches Following, and if it is thin, switches to
Discover — **once**, and never against an explicit choice (`laneLocked`). An
empty Following lane also explains what it holds and offers a route to
Discover, so it reads as "follow some people" rather than "the app is broken".

### Ranking

Recency, with mutuals winning ties inside the same day. Deliberately **not** an
engagement score: with single-digit likes across the whole table, ranking on
engagement ranks on noise. Revisit when there is traffic to learn from.

### Realtime

The channel subscribes once per session (its effect depends only on
`currentUserId`), so `lane` and `followingIds` are read through **refs** inside
the handler — a closure would freeze them at subscribe time, and adding them to
the deps would tear the channel down on every lane change and every follow.
New posts are filtered by lane before being prepended. **Known gap:** a post in
a community you joined, by someone you don't follow, waits for the next fetch —
the realtime payload carries no membership context to test against.

---

## 6. Connections

### Follow states

`none` → `pending` → `accepted`, or `none` → `accepted` for a public target.

Three states, not a boolean. The button reads **Follow / Requested /
Following**, and `Requested` is not `Following` — the request is with the other
person. The old `is_following: boolean` could not help lying about this.

The composer cannot predict the outcome, because the trigger decides it. So
`followUser()` reads the row back and the UI corrects itself if the optimistic
guess was wrong.

### Mutuals are derived

```sql
is_mutual(a, b) := follows_accepted(a, b) AND follows_accepted(b, a)
```

**There is no `friendships` table, and there should not be one.** A symmetric
table would need its own request/accept state machine and two rows kept
consistent, to answer a question that is already one index lookup away.

Mutuals earn *elevated* rights rather than gating the base feed:

- They outrank one-way follows in the Following lane.
- They are the audience for a `mutuals` post (labelled **Friends** in the UI).
- They are what "N friends are out tonight" would mean — the surface where this
  app's graph pays off, because nightlife is colocated in a way a generic social
  graph is not. **Not built yet.**

### Counts

`profiles.follower_count` / `following_count` are cached and maintained by
`trg_update_follow_counts`, which now:

- fires on `INSERT OR UPDATE OF status OR DELETE` (it previously ignored
  `UPDATE`, so approving a request would not have registered);
- counts **accepted only** (it previously ignored `status`, so a pending request
  would have inflated the target's follower count on arrival).

**Never `COUNT(*)` the `follows` table for a follower total** — it includes
pending requests. Three call sites were doing this and now read the cached
columns instead.

---

## 7. Notifications

`notifications_type_check` now admits `follow_request` and `follow_accepted`
alongside `like`, `comment`, `reply`, `follow` and `mention`.

`notify_follow()` branches:

- INSERT, `pending` → `follow_request` to the target ("asked to follow you")
- INSERT, `accepted` → `follow` to the target ("started following you")
- UPDATE `pending`→`accepted` → `follow_accepted` to the **requester**, with the
  approving account as actor

In the client, `NotifType` plus three `Record<NotifType, …>` maps mean **adding
a type fails the build until it has a verb, an icon and a colour.** That is
intentional: an unmapped type renders as a blank row with an undefined tint.

---

## 8. Current data reality

As of 2026-10-03, and the reason several decisions above lean the way they do:

| | |
|---|---|
| profiles | 11 |
| social_posts | 9 (**0 in the last 30 days**) |
| distinct post authors | 3 |
| follow edges | **3**, from **1** account |
| mutual follows | **0** |
| communities / memberships | 8 / 5 |
| likes / comments | 1 / 1 |
| blocks | 0 |

Read §5's cold-start rule and §5's ranking note with these numbers in mind. A
follows-only feed here is a blank screen for ten of eleven accounts.

**Bootstrapping is the open problem.** A People directory alone clearly does not
do it — 3 edges is the evidence. For this product the connection engine should
be co-presence: who else checked into this venue, who's going to this event,
plus the communities that already exist. That is also thin today
(`venue_check_ins` holds 5 rows), so it needs the same honesty about cold start.

---

## 9. Deliberately not done

- **`follows` SELECT is still permissive** (`USING (true)`, minus nothing).
  A private account's *follower list* is therefore readable even though its
  posts are not. Restricting it would break the People tab's mutual detection,
  and the sensitive surface is post content. Instagram likewise shows counts
  for private accounts and hides only the lists. Worth tightening; not urgent.
- **Going private does not retroactively demote existing followers** to
  pending. They were accepted under the terms that applied at the time, and
  silently revoking them is a worse surprise than the setting itself.
- **Vibes / stories have no audience model.** The `stories` bucket is public
  and `stories` rows are readable by any authenticated user whose
  `expires_at > NOW()`. Account privacy does **not** currently gate them. If
  private accounts matter, this is the next hole to close.
- **Community posts are not gated by membership.** `community_id` does not
  participate in `can_view_post`; a non-member can read a community's posts.
  Pre-existing, and left unchanged rather than altered silently.
- **No declined-request state.** Declining deletes the row, which answers "may
  they ask again?" with "yes, and you won't be told".
- **No ranking beyond recency + mutuals.** See §5.

---

## 10. Extending this

1. **Any new table hanging off a post gets a policy using `can_view_post_id()`.**
   Do not re-derive the rule; there is one definition for a reason.
2. **Any new audience value** needs: the `CHECK` constraint widened, a branch in
   `can_view_post`, and an entry in `VISIBILITY_CHOICES` in the composer.
3. **Any new notification type** needs the `CHECK` widened and all three client
   maps filled — the build will tell you.
4. **Test with a second account.** Every bug in this area is invisible from the
   author's own session, because the author can always see their own posts.
