-- Business portal: venue offers, and notifications for venue owners.
--
-- ── venue_offers ────────────────────────────────────────────────────────────
--
-- apps/business-portal/src/pages/Offers.tsx has queried `venue_offers` since it
-- was written and the table has never existed, so every one of its four calls
-- failed and the page was dead on arrival behind a Premium badge. The columns
-- below are the ones that page already reads and writes.
--
-- `venue_analytics` already carries `offer_views` and `offer_clicks`, and
-- `track_venue_event` already allowlists both, so the measurement half of this
-- feature was built and waiting for the table.
--
-- ── The subscription gate is enforced here, not in the client ───────────────
--
-- Offers are a Premium feature and the portal checks `can_create_offers`
-- before showing the form. That check is a UI affordance, not a boundary — a
-- free-tier owner holding the publishable key can POST straight to PostgREST.
-- The INSERT policy therefore requires the entitlement too.
--
-- UPDATE and DELETE deliberately do NOT require it. An owner who downgrades
-- must still be able to deactivate or remove offers they already created;
-- gating those behind the entitlement would strand live offers on a venue with
-- no way to take them down.
--
-- Note for whoever tests this: all three Business Owners are currently on Free
-- and none has `can_create_offers`, so nobody can create an offer until a tier
-- is raised. That is the gate working, not a bug.
--
-- ── business_notifications ──────────────────────────────────────────────────
--
-- The portal header had a bell with a permanently-lit red dot and no handler,
-- and a "What's new" button with a pulsing pip — both implying unread items
-- that did not exist. This gives the bell something real to count.
--
-- Rows are written only by the SECURITY DEFINER triggers below. There is no
-- INSERT policy for end users, so nobody can forge a notification into someone
-- else's bell.

-- ── helpers ─────────────────────────────────────────────────────────────────

-- STABLE SECURITY DEFINER so a policy on venue_offers can ask "do I own this
-- venue" without being re-filtered by the venues policies it would otherwise
-- recurse through.
CREATE OR REPLACE FUNCTION public.owns_venue(p_venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = p_venue_id AND v.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_create_offers()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_subscriptions s
    WHERE s.user_id = auth.uid()
      AND s.can_create_offers
      AND COALESCE(s.status, 'active') <> 'cancelled'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.owns_venue(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_create_offers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_venue(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_create_offers() TO authenticated, service_role;

-- ── venue_offers ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.venue_offers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id       uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  title          text NOT NULL,
  description    text,
  discount_type  text NOT NULL DEFAULT 'percentage',
  discount_value text,
  valid_from     date NOT NULL DEFAULT CURRENT_DATE,
  valid_until    date,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT venue_offers_title_len  CHECK (length(btrim(title)) BETWEEN 1 AND 120),
  CONSTRAINT venue_offers_type       CHECK (discount_type IN ('percentage','fixed','free_item','other')),
  -- An offer that expires before it starts is never visible to anyone, so it
  -- is a data-entry mistake rather than a state worth storing.
  CONSTRAINT venue_offers_window     CHECK (valid_until IS NULL OR valid_until >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_venue_offers_venue ON public.venue_offers (venue_id, created_at DESC);

-- The consumer app's read path: live offers for one venue. Partial, because
-- expired and deactivated rows are the majority over time and never served.
CREATE INDEX IF NOT EXISTS idx_venue_offers_live
  ON public.venue_offers (venue_id, valid_until)
  WHERE is_active;

CREATE OR REPLACE FUNCTION public.touch_venue_offers_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_venue_offers_updated_at ON public.venue_offers;
CREATE TRIGGER trg_venue_offers_updated_at
  BEFORE UPDATE ON public.venue_offers
  FOR EACH ROW EXECUTE FUNCTION public.touch_venue_offers_updated_at();

ALTER TABLE public.venue_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS venue_offers_select_live   ON public.venue_offers;
DROP POLICY IF EXISTS venue_offers_select_owner  ON public.venue_offers;
DROP POLICY IF EXISTS venue_offers_select_admin  ON public.venue_offers;
DROP POLICY IF EXISTS venue_offers_insert_owner  ON public.venue_offers;
DROP POLICY IF EXISTS venue_offers_update_owner  ON public.venue_offers;
DROP POLICY IF EXISTS venue_offers_delete_owner  ON public.venue_offers;

-- What the consumer app sees: live offers only. An offer that is switched off,
-- not yet started or expired is invisible to everyone except its owner.
CREATE POLICY venue_offers_select_live ON public.venue_offers
  FOR SELECT TO anon, authenticated
  USING (
    is_active
    AND valid_from <= CURRENT_DATE
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  );

CREATE POLICY venue_offers_select_owner ON public.venue_offers
  FOR SELECT TO authenticated
  USING (public.owns_venue(venue_id));

CREATE POLICY venue_offers_select_admin ON public.venue_offers
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY venue_offers_insert_owner ON public.venue_offers
  FOR INSERT TO authenticated
  WITH CHECK (public.owns_venue(venue_id) AND public.can_create_offers());

-- No entitlement check: a downgraded owner must still be able to switch an
-- existing offer off.
CREATE POLICY venue_offers_update_owner ON public.venue_offers
  FOR UPDATE TO authenticated
  USING (public.owns_venue(venue_id))
  WITH CHECK (public.owns_venue(venue_id));

CREATE POLICY venue_offers_delete_owner ON public.venue_offers
  FOR DELETE TO authenticated
  USING (public.owns_venue(venue_id));

-- ── business_notifications ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.business_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text NOT NULL,
  title      text NOT NULL,
  body       text,
  venue_id   uuid REFERENCES public.venues(id) ON DELETE CASCADE,
  event_id   uuid REFERENCES public.events(id) ON DELETE CASCADE,
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT business_notifications_type CHECK (type IN (
    'review', 'rsvp', 'check_in', 'verification_approved', 'verification_rejected'
  ))
);

CREATE INDEX IF NOT EXISTS idx_business_notifications_user
  ON public.business_notifications (user_id, created_at DESC);

-- The bell asks one question on every page load: how many unread. Partial, so
-- that index stays small no matter how much history accumulates.
CREATE INDEX IF NOT EXISTS idx_business_notifications_unread
  ON public.business_notifications (user_id, created_at DESC)
  WHERE NOT is_read;

ALTER TABLE public.business_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_notifications_select_own ON public.business_notifications;
DROP POLICY IF EXISTS business_notifications_update_own ON public.business_notifications;
DROP POLICY IF EXISTS business_notifications_delete_own ON public.business_notifications;

CREATE POLICY business_notifications_select_own ON public.business_notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Marking read. There is deliberately no INSERT policy: every row comes from
-- the SECURITY DEFINER triggers below, so a client cannot forge one.
CREATE POLICY business_notifications_update_own ON public.business_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY business_notifications_delete_own ON public.business_notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── triggers that fill it ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_owner_of_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_owner uuid;
  v_name  text;
BEGIN
  SELECT owner_id, name INTO v_owner, v_name FROM public.venues WHERE id = NEW.venue_id;
  -- No owner, or the owner reviewing their own venue: nothing worth saying.
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN RETURN NEW; END IF;

  INSERT INTO public.business_notifications (user_id, type, title, body, venue_id)
  VALUES (
    v_owner, 'review',
    format('New %s-star review', NEW.rating),
    format('%s was reviewed%s', COALESCE(v_name, 'Your venue'),
           CASE WHEN NULLIF(btrim(COALESCE(NEW.comment, '')), '') IS NULL
                THEN '' ELSE ': ' || left(btrim(NEW.comment), 140) END),
    NEW.venue_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_owner_of_review ON public.venue_reviews;
CREATE TRIGGER trg_notify_owner_of_review
  AFTER INSERT ON public.venue_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_owner_of_review();

CREATE OR REPLACE FUNCTION public.notify_owner_of_rsvp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_owner uuid;
  v_title text;
BEGIN
  SELECT organizer_id, title INTO v_owner, v_title FROM public.events WHERE id = NEW.event_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN RETURN NEW; END IF;

  -- Only a real yes. 'interested' and 'not_going' are not news.
  IF COALESCE(NEW.status, 'going') NOT IN ('going', 'attending') THEN RETURN NEW; END IF;

  INSERT INTO public.business_notifications (user_id, type, title, body, event_id)
  VALUES (v_owner, 'rsvp', 'New RSVP',
          format('Someone is going to %s', COALESCE(v_title, 'your event')), NEW.event_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_owner_of_rsvp ON public.event_rsvps;
CREATE TRIGGER trg_notify_owner_of_rsvp
  AFTER INSERT ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.notify_owner_of_rsvp();

-- Check-ins are the highest-volume event here and the lowest signal per row,
-- so this collapses to one notification per venue per day rather than one per
-- visitor. Without that, a busy Friday would bury every review and RSVP.
CREATE OR REPLACE FUNCTION public.notify_owner_of_check_in()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_owner uuid;
  v_name  text;
BEGIN
  SELECT owner_id, name INTO v_owner, v_name FROM public.venues WHERE id = NEW.venue_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.business_notifications n
    WHERE n.user_id = v_owner
      AND n.type = 'check_in'
      AND n.venue_id = NEW.venue_id
      AND n.created_at >= date_trunc('day', now())
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.business_notifications (user_id, type, title, body, venue_id)
  VALUES (v_owner, 'check_in', 'Someone checked in',
          format('First check-in today at %s', COALESCE(v_name, 'your venue')), NEW.venue_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_owner_of_check_in ON public.venue_check_ins;
CREATE TRIGGER trg_notify_owner_of_check_in
  AFTER INSERT ON public.venue_check_ins
  FOR EACH ROW EXECUTE FUNCTION public.notify_owner_of_check_in();

CREATE OR REPLACE FUNCTION public.notify_verification_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'approved' THEN
    INSERT INTO public.business_notifications (user_id, type, title, body)
    VALUES (NEW.user_id, 'verification_approved', 'Your business is verified',
            'Your venues now carry the verified badge.');
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.business_notifications (user_id, type, title, body)
    VALUES (NEW.user_id, 'verification_rejected', 'Verification needs attention',
            COALESCE(NULLIF(btrim(COALESCE(NEW.rejection_reason, '')), ''),
                     'Your verification request was not approved.'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_verification_decision ON public.verification_requests;
CREATE TRIGGER trg_notify_verification_decision
  AFTER UPDATE OF status ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_verification_decision();

COMMENT ON TABLE public.venue_offers IS
  'Venue deals shown in the consumer app. Creating one requires the Premium can_create_offers entitlement (enforced in RLS); editing and deleting do not, so a downgraded owner can still take an offer down.';
COMMENT ON TABLE public.business_notifications IS
  'Business-owner notifications. Written only by SECURITY DEFINER triggers — there is no INSERT policy, so a client cannot forge one into another owner''s bell.';
