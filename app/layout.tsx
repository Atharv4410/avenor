import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import ToastProvider from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "HisaabAI — Ledger & Payment Follow-ups",
  description:
    "AI-powered bookkeeping and payment follow-up assistant for small Indian wholesale businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
