"use client";

import { X, MessageCircle } from "lucide-react";
import { formatPaiseAsINR } from "@/lib/accounting/money";
import type { CustomerDto, ReminderDto } from "@/lib/apiClient";

export default function ReminderPreviewModal({
  message,
  amountPaise,
  customer,
  onClose,
}: {
  message: string;
  amountPaise: number;
  customer: CustomerDto;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/30 px-4 animate-fade-in">
      <div className="card w-full max-w-sm animate-scale-in p-6 shadow-pop">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">Preview reminder</h3>
            <p className="text-xs text-ink-muted">
              {customer.shopName} &middot; {formatPaiseAsINR(amountPaise)}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-faint transition-colors hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-brand-600 px-4 py-3 text-sm text-white">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-brand-100">
            <MessageCircle size={12} />
            WhatsApp preview
          </div>
          <p className="whitespace-pre-wrap leading-relaxed">{message}</p>
        </div>

        <div className="mt-4 flex justify-end">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
