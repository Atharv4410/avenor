export interface SendMessageParams {
  toPhoneE164: string;
  message: string;
}

export interface SendMessageResult {
  ok: boolean;
  providerMessageId?: string;
  errorDetail?: string;
}

export type WhatsAppProviderName = "whatsapp_cloud_api" | "demo";

export interface WhatsAppProvider {
  readonly name: WhatsAppProviderName;
  /**
   * Sends a message. Returning `ok: true` means the Cloud API *accepted* the
   * request for delivery — it is NOT proof of delivery. Actual delivery,
   * read, and failure statuses only arrive later via the webhook handler
   * (app/api/webhooks/whatsapp/route.ts), which is the only source of truth
   * for whether a message was actually delivered.
   */
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>;
}
