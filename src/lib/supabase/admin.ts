import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses Row Level Security entirely.
 *
 * SERVER-ONLY. This must never be imported from a Client Component or any
 * file that ships to the browser: `SUPABASE_SERVICE_ROLE_KEY` has no
 * `NEXT_PUBLIC_` prefix, so Next.js never bundles it into client code, but
 * importing this module from the wrong place would still be a mistake to
 * avoid. It exists for exactly one reason: the background reminder job
 * (`/api/cron/send-reminders`) is not a logged-in user's own request — it
 * has to read every user's shifts, activities, and notification settings
 * in one pass to figure out whose reminders are due right now. That is
 * legitimate only because the route itself is locked behind `CRON_SECRET`
 * (see that route for the check) and only ever reads/writes the specific
 * rows the reminder logic needs.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "The reminder background job needs the Secret key (Project Settings " +
        "→ API Keys → Secret key) set as SUPABASE_SERVICE_ROLE_KEY — server-side only."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
