"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCheck, Send, BellRing, MessageCircleMore } from "lucide-react";
import Header from "@/components/layout/Header";
import ReminderCard from "@/components/reminders/ReminderCard";
import ReplyCard from "@/components/reminders/ReplyCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { ReminderDto } from "@/lib/apiClient";

type Filter = "needs_action" | "sent" | "skipped" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "needs_action", label: "Needs action" },
  { value: "sent", label: "Sent" },
  { value: "skipped", label: "Skipped" },
  { value: "all", label: "All" },
];

function statusMatchesFilter(status: ReminderDto["status"], filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "needs_action") return status === "draft" || status === "approved";
  if (filter === "sent") return status === "sent" || status === "failed";
  return status === filter;
}

function RemindersContent() {
  const reminders = useAppStore((s) => s.reminders);
  const customerReplies = useAppStore((s) => s.customerReplies);
  const customers = useAppStore((s) => s.customers);
  const approveSelected = useAppStore((s) => s.approveSelected);
  const sendSelected = useAppStore((s) => s.sendSelected);
  const toast = useToast();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("customer");

  const [filter, setFilter] = useState<Filter>("needs_action");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkSendConfirm, setShowBulkSendConfirm] = useState(false);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const visibleReplies = customerReplies
    .filter((r) => r.status !== "skipped")
    .sort((a, b) => new Date(b.inbound_received_at).getTime() - new Date(a.inbound_received_at).getTime());

  const visible = reminders
    .filter((r) => statusMatchesFilter(r.status, filter))
    .sort((a, b) => {
      if (highlightId) {
        if (a.customer_id === highlightId) return -1;
        if (b.customer_id === highlightId) return 1;
      }
      return b.days_overdue_at_draft - a.days_overdue_at_draft;
    });

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedDraftCount = reminders.filter((r) => selectedIds.has(r.id) && r.status === "draft").length;
  const selectedApprovedCount = reminders.filter(
    (r) => selectedIds.has(r.id) && r.status === "approved"
  ).length;

  async function handleApproveSelected() {
    const ids = reminders.filter((r) => selectedIds.has(r.id) && r.status === "draft").map((r) => r.id);
    if (ids.length === 0) {
      toast.show("No draft reminders selected.", "info");
      return;
    }
    try {
      await approveSelected(ids);
      toast.show(`${ids.length} reminder(s) approved.`, "success");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not approve.", "error");
    }
  }

  async function handleBulkSendConfirmed() {
    const ids = reminders.filter((r) => selectedIds.has(r.id) && r.status === "approved").map((r) => r.id);
    setShowBulkSendConfirm(false);
    if (ids.length === 0) {
      toast.show("No approved reminders selected.", "info");
      return;
    }
    const { sent, blocked } = await sendSelected(ids);
    if (sent > 0) toast.show(`${sent} reminder(s) sent.`, "success");
    if (blocked > 0) toast.show(`${blocked} reminder(s) blocked by a guardrail.`, "error");
  }

  return (
    <>
      <Header title="Reminders" subtitle="Review AI-drafted payment follow-ups before sending" />
      <main className="flex-1 animate-fade-in-up space-y-4 px-4 py-6 sm:px-6">
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filter === f.value
                    ? "border-accent-200 bg-accent-50 text-accent-700"
                    : "border-line bg-white text-ink-muted hover:bg-paper"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={handleApproveSelected} disabled={selectedDraftCount === 0}>
              <CheckCheck size={15} />
              Approve selected ({selectedDraftCount})
            </button>
            <button
              className="btn-primary"
              onClick={() => setShowBulkSendConfirm(true)}
              disabled={selectedApprovedCount === 0}
            >
              <Send size={15} />
              Send selected ({selectedApprovedCount})
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={BellRing}
            title="Nothing here"
            description="No reminders match this filter right now."
          />
        ) : (
          <div className="space-y-4">
            {visible.map((r) => {
              const c = customerMap.get(r.customer_id);
              if (!c) return null;
              return (
                <ReminderCard
                  key={r.id}
                  reminder={r}
                  customer={c}
                  selected={selectedIds.has(r.id)}
                  onToggleSelected={() => toggleSelected(r.id)}
                />
              );
            })}
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-ink">Customer replies</h2>
          <p className="text-xs text-ink-muted">
            AI-drafted replies to incoming WhatsApp messages, waiting for your review
          </p>
          <div className="mt-3">
            {visibleReplies.length === 0 ? (
              <EmptyState
                icon={MessageCircleMore}
                title="No replies waiting"
                description="Customer WhatsApp messages and their AI-drafted replies will show up here."
              />
            ) : (
              <div className="space-y-4">
                {visibleReplies.map((r) => {
                  const c = customerMap.get(r.customer_id);
                  if (!c) return null;
                  return <ReplyCard key={r.id} reply={r} customer={c} />;
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={showBulkSendConfirm}
        title={`Send ${selectedApprovedCount} reminder(s)?`}
        description="This sends every selected, approved reminder through the configured provider (real WhatsApp if configured, otherwise a simulated demo send)."
        confirmLabel="Confirm send"
        onConfirm={handleBulkSendConfirmed}
        onCancel={() => setShowBulkSendConfirm(false)}
      />
    </>
  );
}

export default function RemindersPage() {
  return (
    <Suspense fallback={null}>
      <RemindersContent />
    </Suspense>
  );
}
