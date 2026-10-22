import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * MVP assumption: one business per signed-in owner. The schema
 * (business_members) already supports a user belonging to several
 * businesses or a business having several members — multi-business
 * switching and staff roles are explicitly out of scope for this MVP, not a
 * schema limitation, so this can be extended later without a migration.
 */
export async function getCurrentBusinessId(): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.business_id ?? null;
}

/** Throws if the user has no business yet — route handlers should catch this
 * and return 409/redirect-to-onboarding rather than a raw 500. */
export async function requireCurrentBusinessId(): Promise<string> {
  const id = await getCurrentBusinessId();
  if (!id) throw new Error("NO_BUSINESS");
  return id;
}
