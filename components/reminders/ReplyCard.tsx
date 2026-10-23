"use client";

import { useState } from "react";
import { Copy, MessageCircleMore, CheckCircle2, Send, XCircle, Sparkles, Loader2 } from "lucide-react";
import type { CustomerDto, CustomerReplyDto } from "@/lib/apiClient";
import { formatDateTime, waLink } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";

const STATUS_STYLES: Record<CustomerReplyDto["status"], string> = {
  draft: "bg-paper text-ink-muted border-line",
  approved: "bg-amber-50 text-amber-600 border-amber-100",
  sent: "bg-brand-50 text-brand-700 border-brand-100",
  failed: "bg-danger-50 text-danger-600 border-danger-100",
  skipped: "bg-danger-50 text-danger-600 border-danger-100",
};

export default function ReplyCard({
  reply,
  customer,
}: {
  reply: CustomerReplyDto;
  customer: CustomerDto;
}) {
  const editCustomerReply = useAppStore((s) => s.editCustomerReply);
  const approveCustomerReply = useAppStore((s) => s.approveCustomerReply);
  const skipCustomerReply = useAppStore((s) => s.skipCustomerReply);
  const sendCustomerReply = useAppStore((s) => s.sendCustomerReply);
  const toast = useToast();

  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [draftMessage, setDraftMessage] = useState(reply.draft_reply);
  const [busy, setBusy] = useState(false);

  const isActionable = reply.status === "draft" || reply.status === "approved";

  async function commitMessage() {
    if (draftMessage !== reply.draft_reply) {
      try {
        await editCustomerReply(reply.id, draftMessage);
      } catch (err) {
        toast.show(err instanceof Error ? err.message : "Could not save edit.", "error");
      }
    }
  }

  async function handleApprove() {
    setBusy(true);
    try {
      await approveCustomerReply(reply.id);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not approve.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSkip() {
    setBusy(true);
    try {
      await skipCustomerReply(reply.id);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not skip.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmSend() {
    setBusy(true);
    const result = await sendCustomerReply(reply.id);
    setShowSendConfirm(false);
    setBusy(false);
    if (result.ok) {
      toast.show(`Reply sent to ${customer.shopName}.`, "success");
    } else {
      toast.show(result.reason, "error");
    }
  }

  return (
    <div className="card animate-fade-in-up p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{customer.shopName}</p>
          <p className="text-xs text-ink-muted">
            {customer.name} &middot; {formatDateTime(reply.inbound_received_at)}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
            STATUS_STYLES[reply.status]
          )}
        >
          {reply.status}
        </span>
      </div>

      <div className="mt-3 rounded-lg bg-paper px-3 py-2 text-sm text-ink-muted">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          Their message
        </p>
        <p className="whitespace-pre-wrap">{reply.inbound_text}</p>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-faint">
        <Sparkles size={11} />
        {reply.drafted_by === "ai" ? "AI-drafted reply" : "Template reply (AI not configured)"}
      </div>

      <textarea
        className="input mt-2 min-h-[80px] resize-y text-sm"
        value={draftMessage}
        disabled={!isActionable}
        onChange={(e) => setDraftMessage(e.target.value)}
        onBlur={commitMessage}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
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
          {reply.status === "draft" && (
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
          {reply.status === "approved" && (
            <button className="btn-primary !py-1.5" onClick={() => setShowSendConfirm(true)} disabled={busy}>
              <Send size={14} /> Confirm send
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showSendConfirm}
        title="Send this reply?"
        description={
          <>
            This will send the reply to <strong>{customer.shopName}</strong> over WhatsApp.
          </>
        }
        confirmLabel="Confirm send"
        onConfirm={handleConfirmSend}
        onCancel={() => setShowSendConfirm(false)}
      />
    </div>
  );
}
