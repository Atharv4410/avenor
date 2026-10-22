"use client";

import { useState } from "react";
import { X, Phone, Sparkles, HandCoins, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CustomerDto, TransactionDto } from "@/lib/apiClient";
import { formatPaiseAsINR } from "@/lib/accounting/money";
import { formatDate, transactionTypeLabel } from "@/lib/utils";
import StatusBadge from "@/components/ui/StatusBadge";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";

export default function CustomerDetailPanel({
  customer,
  transactions,
  onClose,
}: {
  customer: CustomerDto;
  transactions: TransactionDto[];
  onClose: () => void;
}) {
  const draftReminder = useAppStore((s) => s.draftReminder);
  const recordPayment = useAppStore((s) => s.recordPayment);
  const toast = useToast();
  const router = useRouter();

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const own = transactions
    .filter((t) => t.customer_id === customer.id && !t.voided_at)
    .sort((a, b) => new Date(b.occurred_on).getTime() - new Date(a.occurred_on).getTime());
  const outstandingTxns = own.filter((t) => t.type === "credit_sale");

  async function handleDraftReminder() {
    const result = await draftReminder(customer.id);
    if (!result.ok) {
      toast.show(result.reason, "error");
      return;
    }
    toast.show("Reminder drafted — opening Reminders.", "success");
    router.push(`/reminders?customer=${customer.id}`);
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    const amountRupees = Number(amount);
    if (!amountRupees || amountRupees <= 0) {
      toast.show("Enter a valid payment amount.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await recordPayment(customer.id, {
        amountRupees,
        occurredOn,
        paymentMethod,
        referenceNumber: referenceNumber || undefined,
      });
      toast.show("Payment recorded — balance updated.", "success");
      setShowPaymentForm(false);
      setAmount("");
      setReferenceNumber("");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not record payment.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-ink/30">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-card shadow-pop">
        <div className="flex items-start justify-between border-b border-line px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-ink">{customer.shopName}</h2>
            <p className="text-sm text-ink-muted">{customer.name}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-faint">
              <Phone size={12} />
              {customer.phone || "No phone on file"}
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
                {customer.daysOverdue} days overdue · {formatPaiseAsINR(customer.overdueAmountPaise)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3">
              <p className="text-[11px] text-ink-faint">Outstanding</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {formatPaiseAsINR(customer.outstandingPaise)}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-ink-faint">Total credit given</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {formatPaiseAsINR(customer.totalCreditPaise)}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-ink-faint">Total payments</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {formatPaiseAsINR(customer.totalPaymentsPaise)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDraftReminder}
              disabled={customer.outstandingPaise <= 0}
              className="btn-primary"
            >
              <Sparkles size={16} />
              Draft reminder
            </button>
            <button onClick={() => setShowPaymentForm((v) => !v)} className="btn-secondary">
              <HandCoins size={16} />
              Record payment
            </button>
          </div>
          {customer.outstandingPaise <= 0 && (
            <p className="-mt-3 text-xs text-ink-faint">
              No outstanding balance — nothing to remind about.
            </p>
          )}

          {showPaymentForm && (
            <form onSubmit={handleRecordPayment} className="card space-y-3 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink-muted">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    className="input mt-1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-muted">Date</label>
                  <input
                    type="date"
                    required
                    className="input mt-1"
                    value={occurredOn}
                    onChange={(e) => setOccurredOn(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink-muted">Method</label>
                  <select
                    className="input mt-1"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-muted">Reference (optional)</label>
                  <input
                    className="input mt-1"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting && <Loader2 className="animate-spin" size={16} />}
                Save payment
              </button>
            </form>
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
                      <p className="text-ink-faint">{formatDate(t.occurred_on)}</p>
                    </div>
                    <span className="font-medium text-ink">{formatPaiseAsINR(t.amount_paise)}</span>
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
                      {formatDate(t.occurred_on)} &middot; {transactionTypeLabel(t.type)}
                    </p>
                  </div>
                  <span
                    className={
                      t.type === "payment_received" ? "font-medium text-brand-600" : "font-medium text-ink"
                    }
                  >
                    {t.type === "payment_received" ? "-" : "+"}
                    {formatPaiseAsINR(t.amount_paise)}
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
