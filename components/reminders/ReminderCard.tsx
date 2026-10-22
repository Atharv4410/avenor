"use client";

import { useState } from "react";
import { Copy, Eye, MessageCircleMore, Send, XCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import type { CustomerDto, ReminderDto } from "@/lib/apiClient";
import { formatPaiseAsINR } from "@/lib/accounting/money";
import { formatDateTime } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ReminderPreviewModal from "./ReminderPreviewModal";
import { cn } from "@/lib/cn";

const STATUS_STYLES: Record<ReminderDto["status"], string> = {
  draft: "bg-paper text-ink-muted border-line",
  approved: "bg-amber-50 text-amber-600 border-amber-100",
  sent: "bg-brand-50 text-brand-700 border-brand-100",
  failed: "bg-danger-50 text-danger-600 border-danger-100",
  skipped: "bg-danger-50 text-danger-600 border-danger-100",
};

function waLink(phone: string, message: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default function ReminderCard({
  reminder,
  customer,
  selected,
  onToggleSelected,
}: {
  reminder: ReminderDto;
  customer: CustomerDto;
  selected: boolean;
  onToggleSelected: () => void;
}) {
  const editReminder = useAppStore((s) => s.editReminder);
  const approveReminder = useAppStore((s) => s.approveReminder);
  const skipReminder = useAppStore((s) => s.skipReminder);
  const sendReminder = useAppStore((s) => s.sendReminder);
  const configStatus = useAppStore((s) => s.configStatus);
  const toast = useToast();

  const [showPreview, setShowPreview] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [draftMessage, setDraftMessage] = useState(reminder.message);
  const [busy, setBusy] = useState(false);

  const isActionable = reminder.status === "draft" || reminder.status === "approved";
  const isDemoSend = !configStatus?.whatsApp;

  async function commitMessage() {
    if (draftMessage !== reminder.message) {
      try {
        await editReminder(reminder.id, draftMessage);
      } catch (err) {
        toast.show(err instanceof Error ? err.message : "Could not save edit.", "error");
      }
    }
  }

  async function handleApprove() {
    setBusy(true);
    try {
      await approveReminder(reminder.id);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not approve.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSkip() {
    setBusy(true);
    try {
      await skipReminder(reminder.id);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not skip.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmSend() {
    setBusy(true);
    const result = await sendReminder(reminder.id);
    setShowSendConfirm(false);
    setBusy(false);
    if (result.ok) {
      toast.show(
        isDemoSend
          ? `Marked Sent (simulated — demo mode) for ${customer.shopName}.`
          : `Sent via WhatsApp to ${customer.shopName}.`,
        "success"
      );
    } else {
      toast.show(result.reason, "error");
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-400"
            checked={selected}
            disabled={!isActionable}
            onChange={onToggleSelected}
          />
          <div>
            <p className="text-sm font-semibold text-ink">{customer.shopName}</p>
            <p className="text-xs text-ink-muted">{customer.name} &middot; {customer.phone || "no phone on file"}</p>
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
        <span className="font-medium text-danger-600">
          {formatPaiseAsINR(reminder.amount_paise_at_draft)} outstanding
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} /> {reminder.days_overdue_at_draft} days overdue
        </span>
        {reminder.status === "sent" && <span>Sent {formatDateTime(reminder.updated_at)}</span>}
      </div>

      <textarea
        className="input mt-3 min-h-[92px] resize-y text-sm"
        value={draftMessage}
        disabled={!isActionable}
        onChange={(e) => setDraftMessage(e.target.value)}
        onBlur={commitMessage}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn-ghost !px-2.5" onClick={() => setShowPreview(true)}>
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
          title="Opens WhatsApp with this message prefilled"
        >
          <MessageCircleMore size={14} /> Open in WhatsApp
        </a>

        <div className="ml-auto flex items-center gap-2">
          {reminder.status === "draft" && (
            <button className="btn-secondary !py-1.5" onClick={handleApprove} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
              Approve
            </button>
          )}
          {isActionable && (
            <button className="btn-ghost !px-2.5 text-danger-600" onClick={handleSkip} disabled={busy}>
              <XCircle size={14} /> Skip
            </button>
          )}
          {reminder.status === "approved" && (
            <button className="btn-primary !py-1.5" onClick={() => setShowSendConfirm(true)} disabled={busy}>
              <Send size={14} /> Confirm send
            </button>
          )}
        </div>
      </div>

      {showPreview && (
        <ReminderPreviewModal
          message={draftMessage}
          amountPaise={reminder.amount_paise_at_draft}
          customer={customer}
          onClose={() => setShowPreview(false)}
        />
      )}

      <ConfirmDialog
        open={showSendConfirm}
        title="Send this reminder?"
        description={
          <>
            This will send the reminder to <strong>{customer.shopName}</strong> (
            {formatPaiseAsINR(reminder.amount_paise_at_draft)}).{" "}
            {isDemoSend ? (
              <span className="text-amber-600">
                WhatsApp is not configured on this deployment — this will be a simulated send only.
              </span>
            ) : (
              <span className="text-ink-muted">
                This sends a real WhatsApp message via the configured Business Platform.
              </span>
            )}
          </>
        }
        confirmLabel="Confirm send"
        onConfirm={handleConfirmSend}
        onCancel={() => setShowSendConfirm(false)}
      />
    </div>
  );
}
