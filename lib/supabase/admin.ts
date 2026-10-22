import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Service-role client — bypasses Row Level Security entirely. This must
 * NEVER be imported by any file that could end up in a client bundle; the
 * `server-only` import above makes Next.js throw a build error if that ever
 * happens.
 *
 * Legitimate uses, and only these:
 *  - The WhatsApp webhook handler (Meta calls us with no Supabase session).
 *  - Writing `reminder_delivery_attempts` rows from the send route (the
 *    outbound call to Meta's API has nothing to do with the caller's RLS
 *    context, but we still verify the caller's business membership with the
 *    *user-scoped* client before ever reaching this).
 */
export function createAdminClient() {
  return createClient<Database>(supabaseEnv.url, supabaseEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
