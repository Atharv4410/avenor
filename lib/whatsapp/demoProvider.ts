import { randomUUID } from "crypto";
import type { WhatsAppProvider, SendMessageParams, SendMessageResult } from "./provider";

/**
 * Demo/dev provider — used only when the real Cloud API credentials are not
 * configured. Never claims delivery; it immediately marks the attempt
 * "sent" in the local sense of "handed to the demo provider", and the
 * reminder_delivery_attempts.provider column is recorded as "demo" so the UI
 * and database both distinguish this from a real send permanently (it is
 * never silently re-labelled as a real delivery later).
 */
export class WhatsAppDemoProvider implements WhatsAppProvider {
  readonly name = "demo" as const;

  async sendMessage(_params: SendMessageParams): Promise<SendMessageResult> {
    return { ok: true, providerMessageId: `demo_${randomUUID()}` };
  }
}
