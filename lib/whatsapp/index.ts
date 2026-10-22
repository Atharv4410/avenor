import "server-only";
import { isWhatsAppConfigured } from "@/lib/env";
import { WhatsAppCloudApiProvider } from "./cloudApiProvider";
import { WhatsAppDemoProvider } from "./demoProvider";
import type { WhatsAppProvider } from "./provider";

export function getWhatsAppProvider(): WhatsAppProvider {
  return isWhatsAppConfigured() ? new WhatsAppCloudApiProvider() : new WhatsAppDemoProvider();
}

export { isWhatsAppConfigured };
export type { WhatsAppProvider, SendMessageParams, SendMessageResult } from "./provider";
