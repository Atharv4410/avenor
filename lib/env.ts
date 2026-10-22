/**
 * Centralised, validated access to environment variables. Importing from
 * here instead of `process.env` directly means a missing variable fails
 * loudly and immediately, with a clear message, instead of surfacing as a
 * confusing downstream error (e.g. "fetch failed" from an empty URL).
 *
 * `isConfigured()` helpers let routes report "Not configured" explicitly
 * for optional integrations (Claude, WhatsApp) rather than crashing or,
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
  get url() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get anonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get serviceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
};

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function anthropicApiKey(): string {
  return required("ANTHROPIC_API_KEY");
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
