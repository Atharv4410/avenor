"use client";

import { useMemo, useState } from "react";
import { Search, BookText } from "lucide-react";
import type { Transaction, CustomerWithStats, TransactionType } from "@/lib/types";
import { formatINR, formatDate, transactionTypeLabel } from "@/lib/utils";
import { WALK_IN_CUSTOMER_ID } from "@/lib/seedData";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

const TYPE_FILTERS: { value: TransactionType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "cash_sale", label: "Cash Sale" },
  { value: "credit_sale", label: "Credit Sale" },
  { value: "payment_received", label: "Payment Received" },
];

export default function LedgerTable({
  transactions,
  customerStats,
}: {
  transactions: Transaction[];
  customerStats: CustomerWithStats[];
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TransactionType | "all">("all");

  const customerMap = useMemo(() => {
    const m = new Map<string, CustomerWithStats>();
    for (const c of customerStats) m.set(c.id, c);
    return m;
  }, [customerStats]);

  const nameFor = (id: string) =>
    id === WALK_IN_CUSTOMER_ID ? "Walk-in Customer" : customerMap.get(id)?.shopName ?? "Unknown";

  function rowStatus(t: Transaction) {
    if (t.type === "cash_sale" || t.type === "payment_received") return "paid" as const;
    const c = customerMap.get(t.customerId);
    return c?.status ?? "pending";
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions
      .filter((t) => (type === "all" ? true : t.type === type))
      .filter(
        (t) =>
          !q ||
          nameFor(t.customerId).toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, query, type, customerMap]);

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
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3 text-right">Amount</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="py-2.5 pr-3 text-ink-muted">{formatDate(t.date)}</td>
                  <td className="py-2.5 pr-3 font-medium text-ink">{nameFor(t.customerId)}</td>
                  <td className="py-2.5 pr-3 text-ink-muted">{t.description}</td>
                  <td className="py-2.5 pr-3 text-ink-muted">{transactionTypeLabel(t.type)}</td>
                  <td className="py-2.5 pr-3 text-right font-medium text-ink">
                    {formatINR(t.amount)}
                  </td>
                  <td className="py-2.5 pr-3">
                    <StatusBadge status={rowStatus(t)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
