import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Every protected route calls this first. It independently re-verifies the
 * caller is signed in AND a member of the business they're acting on —
 * never trust a business id passed in a request body alone, even though RLS
 * would also reject it; failing fast here gives a clean 401/403 instead of a
 * raw Postgres error leaking to the client. */
export async function requireAuthedBusiness() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Not signed in.");

  const businessId = await getCurrentBusinessId();
  if (!businessId) throw new ApiError(409, "No business set up yet.");

  return { supabase, userId: user.id, businessId };
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  // Never leak raw Postgres/Anthropic/WhatsApp error internals (could include
  // connection strings, keys in error context, etc.) to the client.
  console.error(error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
