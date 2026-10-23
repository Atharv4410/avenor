import type { TransactionType } from "./types";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function transactionTypeLabel(type: TransactionType): string {
  switch (type) {
    case "cash_sale":
      return "Cash Sale";
    case "credit_sale":
      return "Credit Sale (Udhaar)";
    case "payment_received":
      return "Payment Received";
  }
}

/** Deep-links into WhatsApp with the message pre-filled, for a manual
 * copy/paste-style send straight from the owner's own WhatsApp number. */
export function waLink(phone: string, message: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
