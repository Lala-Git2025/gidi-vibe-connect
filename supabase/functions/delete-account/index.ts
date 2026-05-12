// delete-account — permanently delete a user's account.
//
// - Verifies the caller's JWT.
// - Best-effort cleanup of storage objects in the user's folder
//   across the `avatars`, `social-media`, and `stories` buckets.
// - Calls `auth.admin.deleteUser` — this cascades through DB rows that
//   reference auth.users via ON DELETE CASCADE FKs (profiles → all
//   downstream tables: posts, comments, likes, follows, check_ins,
//   reviews, RSVPs, stories, story_views, community_members,
//   business_profiles, admin_profiles, user_stats, etc.).
//
// Required Supabase secrets:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// Invoked from:
//   - apps/consumer-app/screens/ProfileScreen.tsx (handleDeleteAccount)
//   - apps/business-portal/src/pages/Settings.tsx (handleDeleteAccount)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STORAGE_BUCKETS = ['avatars', 'social-media', 'stories'];

async function deleteUserStorage(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ deleted: number; errors: string[] }> {
  let deletedCount = 0;
  const errors: string[] = [];

  for (const bucket of STORAGE_BUCKETS) {
    try {
      // List all objects in the user's folder
      const { data: files, error: listErr } = await supabaseAdmin.storage
        .from(bucket)
        .list(userId, { limit: 1000 });

      if (listErr) {
        errors.push(`${bucket}: list failed — ${listErr.message}`);
        continue;
      }
      if (!files || files.length === 0) continue;

      const paths = files.map((f) => `${userId}/${f.name}`);
      const { error: delErr } = await supabaseAdmin.storage.from(bucket).remove(paths);
      if (delErr) {
        errors.push(`${bucket}: remove failed — ${delErr.message}`);
      } else {
        deletedCount += paths.length;
      }
    } catch (err) {
      errors.push(`${bucket}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { deleted: deletedCount, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ── 1. Verify caller's JWT ─────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Storage cleanup (best-effort, non-fatal) ────────────────────
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const storageResult = await deleteUserStorage(supabaseAdmin, user.id);

    // ── 3. Delete the auth user — triggers DB cascade ──────────────────
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      return new Response(
        JSON.stringify({
          error: 'Failed to delete account',
          detail: deleteErr.message,
          storage: storageResult,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: user.id,
        storage_files_deleted: storageResult.deleted,
        storage_errors: storageResult.errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('delete-account error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
