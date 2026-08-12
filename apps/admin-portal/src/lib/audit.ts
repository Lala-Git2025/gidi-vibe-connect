import { supabase } from './supabase';

/**
 * Append an entry to admin_audit_log. Fire-and-forget: an audit write must
 * never block or fail the admin action that triggered it, so failures are
 * logged to the console and swallowed.
 *
 * `action` should match a key in Overview's AUDIT_STYLE map so the activity
 * feed renders the right icon (promote / unpromote / ban / approve / reject /
 * role_change); unknown actions still record, they just get a neutral icon.
 */
export async function logAdminAction(
  action: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details ?? {},
    });
  } catch (err) {
    console.log('[audit] failed to record action:', err);
  }
}
