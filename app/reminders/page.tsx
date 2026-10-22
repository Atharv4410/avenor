"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCheck, Send, BellRing } from "lucide-react";
import Header from "@/components/layout/Header";
import ReminderCard from "@/components/reminders/ReminderCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { ReminderStatus } from "@/lib/types";

type Filter = "needs_action" | "sent" | "skipped" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "needs_action", label: "Needs action" },
  { value: "sent", label: "Sent" },
  { value: "skipped", label: "Skipped" },
  { value: "all", label: "All" },
];

function statusMatchesFilter(status: ReminderStatus, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "needs_action") return status === "draft" || status === "approved";
  return status === filter;
}

function RemindersContent() {
  const reminders = useAppStore((s) => s.reminders);
  const customers = useAppStore((s) => s.customers);
  const approveSelected = useAppStore((s) => s.approveSelected);
  const confirmSendSelected = useAppStore((s) => s.confirmSendSelected);
  const toast = useToast();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("customer");

  const [filter, setFilter] = useState<Filter>("needs_action");
  const [showBulkSendConfirm, setShowBulkSendConfirm] = useState(false);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const visible = reminders
    .filter((r) => statusMatchesFilter(r.status, filter))
    .sort((a, b) => {
      if (highlightId) {
        if (a.customerId === highlightId) return -1;
        if (b.customerId === highlightId) return 1;
      }
      return b.daysOverdueAtDraft - a.daysOverdueAtDraft;
    });

  const selectedApproved = reminders.filter((r) => r.selected && r.status === "approved");
  const selectedDraft = reminders.filter((r) => r.selected && r.status === "draft");

  function handleApproveSelected() {
    if (selectedDraft.length === 0) {
      toast.show("No draft reminders selected.", "info");
      return;
    }
    approveSelected();
    toast.show(`${selectedDraft.length} reminder(s) approved.`, "success");
  }

  function handleBulkSendConfirmed() {
    const { sent, blocked } = confirmSendSelected();
    setShowBulkSendConfirm(false);
    if (sent > 0) toast.show(`${sent} reminder(s) sent (simulated).`, "success");
    if (blocked > 0) toast.show(`${blocked} reminder(s) blocked by a guardrail.`, "error");
    if (sent === 0 && blocked === 0) toast.show("No approved reminders selected.", "info");
  }

  return (
    <>
      <Header title="Reminders" subtitle="Review AI-drafted payment follow-ups before sending" />
      <main className="flex-1 space-y-4 px-4 py-6 sm:px-6">
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filter === f.value
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-line bg-white text-ink-muted hover:bg-paper"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={handleApproveSelected}>
              <CheckCheck size={15} />
              Approve selected
            </button>
            <button className="btn-primary" onClick={() => setShowBulkSendConfirm(true)}>
              <Send size={15} />
              Send selected
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
              const c = customerMap.get(r.customerId);
              if (!c) return null;
              return <ReminderCard key={r.id} reminder={r} customer={c} />;
            })}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={showBulkSendConfirm}
        title={`Send ${selectedApproved.length} reminder(s)?`}
        description={
          <>
            This marks every selected, approved reminder as sent.{" "}
            <span className="text-amber-600">
              Simulated send — demo mode, no real WhatsApp messages are delivered.
            </span>
          </>
        }
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
