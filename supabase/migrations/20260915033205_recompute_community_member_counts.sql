-- communities.member_count was seeded with invented figures (2156, 1678,
-- 1543, 1234, 987, 892, 756, 543 — about 9,800 members in total) against 5
-- real memberships. The consumer app renders that column directly, so every
-- user saw a fabricated community size.
--
-- trigger_update_community_member_count already keeps the column correct on
-- every join and leave, so the column only ever drifted because it started
-- wrong. This is the one-time correction; the trigger holds it from here.

UPDATE public.communities c
SET member_count = COALESCE((
  SELECT COUNT(*) FROM public.community_members m WHERE m.community_id = c.id
), 0)
WHERE c.member_count IS DISTINCT FROM COALESCE((
  SELECT COUNT(*) FROM public.community_members m WHERE m.community_id = c.id
), 0);
