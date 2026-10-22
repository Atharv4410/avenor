"use client";

import { X, Phone, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CustomerWithStats, Transaction } from "@/lib/types";
import { formatINR, formatDate, transactionTypeLabel } from "@/lib/utils";
import StatusBadge from "@/components/ui/StatusBadge";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";

export default function CustomerDetailPanel({
  customer,
  transactions,
  onClose,
}: {
  customer: CustomerWithStats;
  transactions: Transaction[];
  onClose: () => void;
}) {
  const draftReminder = useAppStore((s) => s.draftReminder);
  const toast = useToast();
  const router = useRouter();

  const own = transactions
    .filter((t) => t.customerId === customer.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const outstandingTxns = own.filter((t) => t.type === "credit_sale");

  function handleDraftReminder() {
    const result = draftReminder(customer.id);
    if (!result.ok) {
      toast.show(result.reason ?? "Could not draft a reminder.", "error");
      return;
    }
    toast.show("Reminder drafted — opening Reminders.", "success");
    router.push(`/reminders?customer=${customer.id}`);
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-ink/30">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-card shadow-pop">
        <div className="flex items-start justify-between border-b border-line px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-ink">{customer.shopName}</h2>
            <p className="text-sm text-ink-muted">{customer.name}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-faint">
              <Phone size={12} />
              {customer.phone}
            </div>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="flex items-center justify-between">
            <StatusBadge status={customer.status} />
            {customer.status === "overdue" && (
              <span className="text-xs font-medium text-danger-600">
                {customer.daysOverdue} days overdue
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3">
              <p className="text-[11px] text-ink-faint">Outstanding</p>
              <p className="mt-1 text-sm font-semibold text-ink">{formatINR(customer.outstanding)}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-ink-faint">Total credit given</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {formatINR(customer.totalCreditGiven)}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-ink-faint">Total payments</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {formatINR(customer.totalPaymentsReceived)}
              </p>
            </div>
          </div>

          <button
            onClick={handleDraftReminder}
            disabled={customer.outstanding <= 0}
            className="btn-primary w-full"
          >
            <Sparkles size={16} />
            Draft reminder
          </button>
          {customer.outstanding <= 0 && (
            <p className="-mt-3 text-xs text-ink-faint">
              No outstanding balance — nothing to remind about.
            </p>
          )}

          <div>
            <h3 className="text-sm font-semibold text-ink">Outstanding transactions</h3>
            {outstandingTxns.length === 0 ? (
              <p className="mt-2 text-xs text-ink-faint">None — fully settled.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {outstandingTxns.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="text-ink">{t.description}</p>
                      <p className="text-ink-faint">{formatDate(t.date)}</p>
                    </div>
                    <span className="font-medium text-ink">{formatINR(t.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Transaction history</h3>
            <ul className="mt-2 space-y-2">
              {own.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-xs"
                >
                  <div>
                    <p className="text-ink">{t.description}</p>
                    <p className="text-ink-faint">
                      {formatDate(t.date)} &middot; {transactionTypeLabel(t.type)}
                    </p>
                  </div>
                  <span
                    className={
                      t.type === "payment_received" ? "font-medium text-brand-600" : "font-medium text-ink"
                    }
                  >
                    {t.type === "payment_received" ? "-" : "+"}
                    {formatINR(t.amount)}
                  </span>
                </li>
              ))}
              {own.length === 0 && <p className="text-xs text-ink-faint">No transactions yet.</p>}
            </ul>
          </div>

          <Link href="/ledger" className="text-xs font-medium text-brand-600 hover:text-brand-700">
            View full ledger &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
