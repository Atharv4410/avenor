"use client";

import { useState } from "react";
import { Copy, Eye, MessageCircleMore, Send, XCircle, CheckCircle2, Clock } from "lucide-react";
import type { Customer, Reminder } from "@/lib/types";
import { formatINR, formatDateTime } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ReminderPreviewModal from "./ReminderPreviewModal";
import { cn } from "@/lib/cn";

const STATUS_STYLES: Record<Reminder["status"], string> = {
  draft: "bg-paper text-ink-muted border-line",
  approved: "bg-amber-50 text-amber-600 border-amber-100",
  sent: "bg-brand-50 text-brand-700 border-brand-100",
  skipped: "bg-danger-50 text-danger-600 border-danger-100",
};

function waLink(phone: string, message: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default function ReminderCard({
  reminder,
  customer,
}: {
  reminder: Reminder;
  customer: Customer;
}) {
  const updateReminderMessage = useAppStore((s) => s.updateReminderMessage);
  const toggleReminderSelected = useAppStore((s) => s.toggleReminderSelected);
  const approveReminder = useAppStore((s) => s.approveReminder);
  const skipReminder = useAppStore((s) => s.skipReminder);
  const confirmSend = useAppStore((s) => s.confirmSend);
  const toast = useToast();

  const [showPreview, setShowPreview] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [draftMessage, setDraftMessage] = useState(reminder.message);

  const isActionable = reminder.status === "draft" || reminder.status === "approved";

  function commitMessage() {
    if (draftMessage !== reminder.message) {
      updateReminderMessage(reminder.id, draftMessage);
    }
  }

  function handleConfirmSend() {
    const result = confirmSend(reminder.id);
    setShowSendConfirm(false);
    if (result.ok) {
      toast.show(`Marked Sent (simulated) for ${customer.shopName}.`, "success");
    } else {
      toast.show(result.reason ?? "Could not send this reminder.", "error");
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-400"
            checked={reminder.selected}
            disabled={!isActionable}
            onChange={() => toggleReminderSelected(reminder.id)}
          />
          <div>
            <p className="text-sm font-semibold text-ink">{customer.shopName}</p>
            <p className="text-xs text-ink-muted">{customer.name} &middot; {customer.phone}</p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
            STATUS_STYLES[reminder.status]
          )}
        >
          {reminder.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-muted">
        <span className="font-medium text-danger-600">{formatINR(reminder.amountAtDraft)} outstanding</span>
        <span className="flex items-center gap-1">
          <Clock size={12} /> {reminder.daysOverdueAtDraft} days overdue
        </span>
        {reminder.sentAt && <span>Sent {formatDateTime(reminder.sentAt)}</span>}
      </div>

      <textarea
        className="input mt-3 min-h-[92px] resize-y text-sm"
        value={draftMessage}
        disabled={!isActionable}
        onChange={(e) => setDraftMessage(e.target.value)}
        onBlur={commitMessage}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          className="btn-ghost !px-2.5"
          onClick={() => setShowPreview(true)}
        >
          <Eye size={14} /> Preview
        </button>
        <button
          className="btn-ghost !px-2.5"
          onClick={() => {
            navigator.clipboard?.writeText(draftMessage);
            toast.show("Message copied.", "info");
          }}
        >
          <Copy size={14} /> Copy message
        </button>
        <a
          href={waLink(customer.phone, draftMessage)}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost !px-2.5"
          title="Opens WhatsApp with this message prefilled — demo phone number"
        >
          <MessageCircleMore size={14} /> Open in WhatsApp
        </a>

        <div className="ml-auto flex items-center gap-2">
          {reminder.status === "draft" && (
            <button className="btn-secondary !py-1.5" onClick={() => approveReminder(reminder.id)}>
              <CheckCircle2 size={14} /> Approve
            </button>
          )}
          {isActionable && (
            <button className="btn-ghost !px-2.5 text-danger-600" onClick={() => skipReminder(reminder.id)}>
              <XCircle size={14} /> Skip
            </button>
          )}
          {reminder.status === "approved" && (
            <button className="btn-primary !py-1.5" onClick={() => setShowSendConfirm(true)}>
              <Send size={14} /> Confirm send
            </button>
          )}
        </div>
      </div>

      {showPreview && (
        <ReminderPreviewModal
          reminder={{ ...reminder, message: draftMessage }}
          customer={customer}
          onClose={() => setShowPreview(false)}
        />
      )}

      <ConfirmDialog
        open={showSendConfirm}
        title="Send this reminder?"
        description={
          <>
            This will mark the reminder to <strong>{customer.shopName}</strong> ({formatINR(reminder.amountAtDraft)}) as
            sent. <span className="text-amber-600">Simulated send — demo mode, no real WhatsApp message is delivered.</span>
          </>
        }
        confirmLabel="Confirm send"
        onConfirm={handleConfirmSend}
        onCancel={() => setShowSendConfirm(false)}
      />
    </div>
  );
}
