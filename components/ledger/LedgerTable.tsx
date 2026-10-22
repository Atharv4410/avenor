"use client";

import { useMemo, useState } from "react";
import { Search, BookText, Undo2 } from "lucide-react";
import { api, type TransactionDto, type CustomerDto } from "@/lib/apiClient";
import { formatPaiseAsINR } from "@/lib/accounting/money";
import { formatDate, transactionTypeLabel } from "@/lib/utils";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

const TYPE_FILTERS: { value: TransactionDto["type"] | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "cash_sale", label: "Cash Sale" },
  { value: "credit_sale", label: "Credit Sale" },
  { value: "payment_received", label: "Payment Received" },
];

export default function LedgerTable({
  transactions,
  customers,
}: {
  transactions: TransactionDto[];
  customers: CustomerDto[];
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TransactionDto["type"] | "all">("all");
  const [voidTarget, setVoidTarget] = useState<TransactionDto | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const refreshTransactions = useAppStore((s) => s.refreshTransactions);
  const refreshCustomers = useAppStore((s) => s.refreshCustomers);
  const refreshActivity = useAppStore((s) => s.refreshActivity);
  const toast = useToast();

  const customerMap = useMemo(() => {
    const m = new Map<string, CustomerDto>();
    for (const c of customers) m.set(c.id, c);
    return m;
  }, [customers]);

  const nameFor = (id: string) => customerMap.get(id)?.shopName ?? "Unknown";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions
      .filter((t) => (type === "all" ? true : t.type === type))
      .filter(
        (t) =>
          !q ||
          nameFor(t.customer_id).toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, query, type, customerMap]);

  async function handleVoidConfirm() {
    if (!voidTarget || !voidReason.trim()) return;
    try {
      await api.transactions.void(voidTarget.id, voidReason.trim());
      await Promise.all([refreshTransactions(), refreshCustomers(), refreshActivity()]);
      toast.show("Transaction voided.", "success");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not void transaction.", "error");
    } finally {
      setVoidTarget(null);
      setVoidReason("");
    }
  }

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={15} />
          <input
            className="input pl-9"
            placeholder="Search customer or description"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setType(f.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                type === f.value
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-line bg-white text-ink-muted hover:bg-paper"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={BookText} title="No transactions found" description="Try a different search or filter." />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3 text-right">Amount</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((t) => (
                <tr key={t.id} className={t.voided_at ? "opacity-50" : undefined}>
                  <td className="py-2.5 pr-3 text-ink-muted">{formatDate(t.occurred_on)}</td>
                  <td className="py-2.5 pr-3 font-medium text-ink">{nameFor(t.customer_id)}</td>
                  <td className="py-2.5 pr-3 text-ink-muted">
                    {t.description}
                    {t.voided_at && (
                      <span className="ml-2 rounded-full bg-danger-50 px-2 py-0.5 text-[11px] font-medium text-danger-600">
                        Voided: {t.void_reason}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-ink-muted">{transactionTypeLabel(t.type)}</td>
                  <td className="py-2.5 pr-3 text-right font-medium text-ink">
                    {formatPaiseAsINR(t.amount_paise)}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    {!t.voided_at && (
                      <button
                        onClick={() => setVoidTarget(t)}
                        className="btn-ghost !px-2 !py-1 text-xs text-danger-600"
                        title="Void this transaction"
                      >
                        <Undo2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={voidTarget !== null}
        title="Void this transaction?"
        tone="danger"
        description={
          <div className="space-y-2">
            <p>
              This keeps the original entry for audit purposes but removes it from balance
              calculations. This cannot be undone.
            </p>
            <input
              autoFocus
              className="input"
              placeholder="Reason (required)"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </div>
        }
        confirmLabel="Void transaction"
        onConfirm={handleVoidConfirm}
        onCancel={() => {
          setVoidTarget(null);
          setVoidReason("");
        }}
      />
    </div>
  );
}
