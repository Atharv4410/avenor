import { NextResponse } from "next/server";
import { isGeminiConfigured } from "@/lib/env";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

/**
 * Lets the UI show an honest "Not configured" badge for optional
 * integrations instead of silently behaving differently, or worse, claiming
 * something is live when it isn't.
 */
export async function GET() {
  return NextResponse.json({
    aiExtraction: isGeminiConfigured(),
    aiReminders: isGeminiConfigured(),
    whatsApp: isWhatsAppConfigured(),
  });
}
