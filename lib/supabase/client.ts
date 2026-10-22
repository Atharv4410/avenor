"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";
import type { Database } from "./types";

/** Browser Supabase client — uses the anon key; every query is still subject
 * to RLS as the signed-in user. Never import the service-role client here. */
export function createClient() {
  return createBrowserClient<Database>(supabaseEnv.url, supabaseEnv.anonKey);
}
