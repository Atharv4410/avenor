import type { Metadata } from "next";
import "./globals.css";
import ToastProvider from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Avenor — Know your numbers. Move your business.",
  description:
    "AI-powered bookkeeping and payment follow-up assistant for small Indian wholesale businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
