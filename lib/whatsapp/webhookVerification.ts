import { createHmac, timingSafeEqual } from "crypto";
import { whatsAppEnv } from "@/lib/env";

/** Meta's webhook subscription handshake: GET with hub.mode/hub.verify_token/
 * hub.challenge — respond with the challenge only if the token matches. */
export function verifySubscriptionChallenge(params: {
  mode: string | null;
  verifyToken: string | null;
  challenge: string | null;
}): string | null {
  if (params.mode === "subscribe" && params.verifyToken === whatsAppEnv.webhookVerifyToken) {
    return params.challenge;
  }
  return null;
}

/** Verifies Meta's X-Hub-Signature-256 header (HMAC-SHA256 of the raw request
 * body, keyed by the app secret) so an attacker can't forge delivery-status
 * webhooks. Must be checked against the *raw* request body, before any JSON
 * parsing, since re-serializing JSON can change byte-for-byte content. */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const appSecret = whatsAppEnv.appSecret;
  if (!appSecret) {
    // No app secret configured — refuse rather than silently accepting
    // unverified webhooks once the integration claims to be "configured".
    return false;
  }

  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const expectedHeader = `sha256=${expected}`;

  const a = Buffer.from(expectedHeader);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
