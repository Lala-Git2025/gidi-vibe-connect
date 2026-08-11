-- =====================================================
-- Close the INSERT-trigger gap on role-assignment.
--
-- Problem: handle_new_user() inserts into public.profiles with the role
-- pulled from auth.raw_user_meta_data. trg_handle_business_role_assignment
-- was AFTER UPDATE OF role only, so a Business Owner signup completed
-- without ever creating a business_profiles row. The user could log into
-- the business portal but every owned-record lookup returned nothing.
--
-- Fix: widen the trigger to AFTER INSERT OR UPDATE OF role, and teach the
-- function to treat the INSERT case as a transition from NULL → NEW.role.
-- Then backfill any Business Owner / Admin / Super Admin who is already
-- missing their role-specific row.
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_business_role_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_role TEXT;
BEGIN
  -- OLD is unavailable on INSERT — fold it to NULL.
  prev_role := CASE WHEN TG_OP = 'UPDATE' THEN OLD.role::TEXT ELSE NULL END;

  IF NEW.role = 'Business Owner'
     AND (prev_role IS NULL OR prev_role <> 'Business Owner') THEN
    INSERT INTO public.business_profiles (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  IF NEW.role IN ('Admin', 'Super Admin')
     AND (prev_role IS NULL OR prev_role NOT IN ('Admin', 'Super Admin')) THEN
    INSERT INTO public.admin_profiles (
      user_id,
      can_manage_users,
      can_manage_venues,
      can_manage_promotions,
      can_manage_content
    )
    VALUES (
      NEW.user_id,
      NEW.role = 'Super Admin',
      true,
      true,
      true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_business_role_assignment ON public.profiles;
CREATE TRIGGER trg_handle_business_role_assignment
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_business_role_assignment();

-- ── Backfill anyone the old trigger missed ───────────────────────────────────

INSERT INTO public.business_profiles (user_id)
SELECT p.user_id
FROM public.profiles p
LEFT JOIN public.business_profiles bp ON bp.user_id = p.user_id
WHERE p.role = 'Business Owner'
  AND bp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.admin_profiles (
  user_id,
  can_manage_users,
  can_manage_venues,
  can_manage_promotions,
  can_manage_content
)
SELECT
  p.user_id,
  p.role = 'Super Admin',
  true,
  true,
  true
FROM public.profiles p
LEFT JOIN public.admin_profiles ap ON ap.user_id = p.user_id
WHERE p.role IN ('Admin', 'Super Admin')
  AND ap.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
