/**
 * Centralised, validated access to environment variables. Importing from
 * here instead of `process.env` directly means a missing variable fails
 * loudly and immediately, with a clear message, instead of surfacing as a
 * confusing downstream error (e.g. "fetch failed" from an empty URL).
 *
 * `isConfigured()` helpers let routes report "Not configured" explicitly
 * for optional integrations (Gemini, WhatsApp) rather than crashing or,
 * worse, silently pretending to work.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`
    );
  }
  return value;
}

export const supabaseEnv = {
  // `NEXT_PUBLIC_*` vars must be referenced as static `process.env.X`
  // property access, not `process.env[name]` — Next.js's webpack config
  // inlines them into the browser bundle via static analysis at build time,
  // and dynamic bracket access defeats that, silently resolving to
  // `undefined` in any client component (there is no real `process.env` in
  // the browser). These two are used from lib/supabase/client.ts, which runs
  // in the browser, so they must stay written out like this.
  get url() {
    const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!value) {
      throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL. See .env.example.");
    }
    return value;
  },
  get anonKey() {
    const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!value) {
      throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. See .env.example.");
    }
    return value;
  },
  // Server-only — dynamic access is fine here since this is never bundled
  // for the browser (only imported from lib/supabase/admin.ts, which is
  // guarded by `import "server-only"`).
  get serviceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
};

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function geminiApiKey(): string {
  return required("GEMINI_API_KEY");
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  );
}

export const whatsAppEnv = {
  get accessToken() {
    return required("WHATSAPP_ACCESS_TOKEN");
  },
  get phoneNumberId() {
    return required("WHATSAPP_PHONE_NUMBER_ID");
  },
  get businessAccountId() {
    return process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? "";
  },
  get webhookVerifyToken() {
    return required("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
  },
  get appSecret() {
    return process.env.WHATSAPP_APP_SECRET ?? "";
  },
};
