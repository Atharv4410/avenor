import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "@/lib/env";
import type { Database } from "./types";

/** Server Supabase client for Server Components, Route Handlers, and Server
 * Actions — reads the user's session from cookies and enforces RLS as that
 * user. This is the client every authenticated API route should use. */
export function createServerSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Called from a Server Component with no mutable cookie jar —
          // middleware.ts refreshes the session instead; safe to ignore.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // See note above.
        }
      },
    },
  });
}

/** Returns the signed-in user's id, or null. Use this at the top of every
 * protected route handler before touching any business data. */
export async function requireUserId(): Promise<string> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user.id;
}
