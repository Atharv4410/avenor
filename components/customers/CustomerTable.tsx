"use client";

import { Search, Phone } from "lucide-react";
import { useMemo, useState } from "react";
import type { CustomerDto } from "@/lib/apiClient";
import type { CustomerStatus } from "@/lib/types";
import { formatPaiseAsINR } from "@/lib/accounting/money";
import { formatDate } from "@/lib/utils";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { Users } from "lucide-react";
import { cn } from "@/lib/cn";

const FILTERS: { value: CustomerStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
];

export default function CustomerTable({
  customers,
  onSelect,
}: {
  customers: CustomerDto[];
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers
      .filter((c) => (status === "all" ? true : c.status === status))
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.shopName.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
      )
      .sort((a, b) => b.outstandingPaise - a.outstandingPaise);
  }, [customers, query, status]);

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={15} />
          <input
            className="input pl-9"
            placeholder="Search name, shop, or phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                status === f.value
                  ? "border-accent-200 bg-accent-50 text-accent-700"
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
          <EmptyState icon={Users} title="No customers found" description="Try a different search or filter." />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3 text-right">Outstanding</th>
                  <th className="py-2 pr-3">Last transaction</th>
                  <th className="py-2 pr-3">Days overdue</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelect(c.id)}
                    className="cursor-pointer transition-colors hover:bg-paper/70"
                  >
                    <td className="py-3 pr-3">
                      <p className="font-medium text-ink">{c.shopName}</p>
                      <p className="text-xs text-ink-muted">{c.name}</p>
                    </td>
                    <td className="py-3 pr-3 text-ink-muted">{c.phone || "—"}</td>
                    <td className="py-3 pr-3 text-right font-medium text-ink">
                      {formatPaiseAsINR(c.outstandingPaise)}
                    </td>
                    <td className="py-3 pr-3 text-ink-muted">
                      {c.lastTransactionDate ? formatDate(c.lastTransactionDate) : "—"}
                    </td>
                    <td className="py-3 pr-3 text-ink-muted">
                      {c.daysOverdue > 0 ? `${c.daysOverdue} days` : "—"}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-4 space-y-3 md:hidden">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className="block w-full rounded-lg border border-line bg-white p-3 text-left transition-colors hover:border-ink-faint/40 hover:bg-paper/60"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{c.shopName}</p>
                    <p className="text-xs text-ink-muted">{c.name}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-ink-faint">
                    <Phone size={11} /> {c.phone || "—"}
                  </span>
                  <span className="font-semibold text-ink">{formatPaiseAsINR(c.outstandingPaise)}</span>
                </div>
                {c.daysOverdue > 0 && (
                  <p className="mt-1 text-xs text-danger-600">{c.daysOverdue} days overdue</p>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
