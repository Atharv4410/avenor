import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import type { CustomerDto } from "@/lib/apiClient";
import { formatPaiseAsINR } from "@/lib/accounting/money";
import EmptyState from "@/components/ui/EmptyState";

export default function OverdueCustomersSection({ customers }: { customers: CustomerDto[] }) {
  const top = customers.slice(0, 6);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Overdue customers</h2>
          <p className="text-xs text-ink-muted">Sorted by days overdue</p>
        </div>
        <Link
          href="/reminders"
          className="inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-700"
        >
          Review reminders
          <ArrowRight size={13} />
        </Link>
      </div>

      {top.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={AlertCircle} title="No overdue customers" description="Everyone is within the payment window." />
        </div>
      ) : (
        <div className="mt-4 divide-y divide-line">
          {top.map((c) => (
            <div
              key={c.id}
              className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-paper/60"
            >
              <div className="min-w-0">
                <Link
                  href={`/customers?customer=${c.id}`}
                  className="truncate text-sm font-medium text-ink hover:text-accent-700"
                >
                  {c.shopName}
                </Link>
                <p className="truncate text-xs text-ink-muted">{c.name}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-danger-600">
                  {formatPaiseAsINR(c.overdueAmountPaise)}
                </p>
                <p className="text-xs text-ink-faint">{c.daysOverdue} days overdue</p>
              </div>
              <Link
                href={`/reminders?customer=${c.id}`}
                className="btn-ghost shrink-0 !px-2.5 !py-1 text-xs"
              >
                Remind
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
