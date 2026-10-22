import "server-only";
import { whatsAppEnv } from "@/lib/env";
import type { WhatsAppProvider, SendMessageParams, SendMessageResult } from "./provider";

const GRAPH_API_VERSION = "v20.0";

/**
 * Meta WhatsApp Business Platform Cloud API — official HTTP integration,
 * no browser automation or unofficial clients.
 *
 * Messaging-policy note: Meta only allows free-form "session" text messages
 * within 24 hours of the customer last messaging the business. A payment
 * reminder is business-initiated, so outside that window it MUST be sent as
 * an approved message *template*. If WHATSAPP_REMINDER_TEMPLATE_NAME is
 * configured, this provider sends the template with the reminder text as its
 * one body parameter; otherwise it sends a plain text/session message, which
 * will only succeed if the 24h customer-service window happens to be open —
 * configure a template for reliable sends. This constraint is enforced by
 * Meta's platform, not by this code; see SETUP.md.
 */
export class WhatsAppCloudApiProvider implements WhatsAppProvider {
  readonly name = "whatsapp_cloud_api" as const;

  async sendMessage({ toPhoneE164, message }: SendMessageParams): Promise<SendMessageResult> {
    const templateName = process.env.WHATSAPP_REMINDER_TEMPLATE_NAME;
    const templateLanguage = process.env.WHATSAPP_REMINDER_TEMPLATE_LANGUAGE || "en";

    const body = templateName
      ? {
          messaging_product: "whatsapp",
          to: toPhoneE164,
          type: "template",
          template: {
            name: templateName,
            language: { code: templateLanguage },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: message }],
              },
            ],
          },
        }
      : {
          messaging_product: "whatsapp",
          to: toPhoneE164,
          type: "text",
          text: { body: message },
        };

    try {
      const response = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${whatsAppEnv.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${whatsAppEnv.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        const errorDetail =
          json?.error?.message ?? `WhatsApp API returned HTTP ${response.status}`;
        return { ok: false, errorDetail };
      }

      const providerMessageId: string | undefined = json?.messages?.[0]?.id;
      if (!providerMessageId) {
        return { ok: false, errorDetail: "No message id returned by WhatsApp API." };
      }

      return { ok: true, providerMessageId };
    } catch (err) {
      return {
        ok: false,
        errorDetail: err instanceof Error ? err.message : "Unknown network error calling WhatsApp API.",
      };
    }
  }
}
