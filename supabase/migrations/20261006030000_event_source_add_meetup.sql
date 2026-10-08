-- Add 'meetup' to the event_source enum.
--
-- scripts/lagos-events-agent.js reads schema.org Event JSON-LD from Eventbrite's
-- public city pages and Meetup's Lagos find page. 'eventbrite' already exists in
-- the enum; 'meetup' does not.
--
-- The alternative was filing Meetup events under the existing 'scraped' value,
-- and that is worse than it looks: EventsScreen renders `source` as a provenance
-- badge on every card, so the user would read "Scraped" where the honest answer
-- is "Meetup". Provenance is the main defence this table has against the
-- fabricated rows it carried until 2026-10-06 — a badge that names the real
-- platform is checkable, and one that says "scraped" is not.
--
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block on older
-- PostgreSQL, and `supabase db push` wraps each migration in one. Postgres 12+
-- permits it as long as the new value is not used in the same transaction, which
-- it is not here, so this is safe on Supabase (PG 15+).

ALTER TYPE public.event_source ADD VALUE IF NOT EXISTS 'meetup';
