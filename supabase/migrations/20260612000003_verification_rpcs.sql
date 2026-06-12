-- =====================================================
-- Verification approval pipeline.
--
-- Pre-fix problem: BusinessAuthContext.signUp auto-inserted a
-- verification_requests row with status='approved', reviewed_by='system' —
-- the "Verified" badge meant nothing. The client-side fix removes that
-- insert at signup; this migration adds the server-side primitives so an
-- admin can actually approve/reject and the badge becomes meaningful.
--
-- Trust model:
--   - verification_requests.status defaults to 'pending' (already true).
--   - approve_verification(req_id) and reject_verification(req_id, reason)
--     are SECURITY DEFINER RPCs that bypass RLS to write the right rows,
--     but self-gate by checking is_admin() / is_super_admin() on the
--     caller. Non-admins get a clean exception.
--   - approve_verification also flips business_profiles.is_verified = true
--     for the request's user. Reject leaves is_verified alone (could be a
--     re-submission of a previously approved owner).
-- =====================================================

CREATE OR REPLACE FUNCTION public.approve_verification(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT (public.is_admin() OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Only admins can approve verification requests';
  END IF;

  UPDATE public.verification_requests
     SET status      = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = NOW(),
         updated_at  = NOW()
   WHERE id = p_request_id
     AND status = 'pending'
   RETURNING user_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Request % not found or not pending', p_request_id;
  END IF;

  UPDATE public.business_profiles
     SET is_verified = TRUE,
         verified_at = NOW(),
         updated_at  = NOW()
   WHERE user_id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_verification(p_request_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Only admins can reject verification requests';
  END IF;

  UPDATE public.verification_requests
     SET status           = 'rejected',
         reviewed_by      = auth.uid(),
         reviewed_at      = NOW(),
         rejection_reason = p_reason,
         updated_at       = NOW()
   WHERE id = p_request_id
     AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request % not found or not pending', p_request_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_verification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_verification(UUID, TEXT) TO authenticated;
