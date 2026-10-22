import type { Transaction, Customer } from "@/lib/types";
import { formatINR, formatDate, transactionTypeLabel } from "@/lib/utils";
import { WALK_IN_CUSTOMER_ID } from "@/lib/seedData";
import { cn } from "@/lib/cn";

const TYPE_STYLES: Record<Transaction["type"], string> = {
  cash_sale: "bg-brand-50 text-brand-700",
  credit_sale: "bg-amber-50 text-amber-600",
  payment_received: "bg-brand-50 text-brand-700",
};

export default function RecentTransactionsTable({
  transactions,
  customers,
}: {
  transactions: Transaction[];
  customers: Customer[];
}) {
  const sorted = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const nameFor = (id: string) =>
    id === WALK_IN_CUSTOMER_ID
      ? "Walk-in Customer"
      : customers.find((c) => c.id === id)?.shopName ?? "Unknown customer";

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-ink">Recent transactions</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Customer</th>
              <th className="py-2 pr-3">Description</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.map((t) => (
              <tr key={t.id}>
                <td className="py-2.5 pr-3 text-ink-muted">{formatDate(t.date)}</td>
                <td className="py-2.5 pr-3 font-medium text-ink">{nameFor(t.customerId)}</td>
                <td className="py-2.5 pr-3 text-ink-muted">{t.description}</td>
                <td className="py-2.5 pr-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      TYPE_STYLES[t.type]
                    )}
                  >
                    {transactionTypeLabel(t.type)}
                  </span>
                </td>
                <td className="py-2.5 text-right font-medium text-ink">{formatINR(t.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
