import type { CustomerStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

const STYLES: Record<CustomerStatus, string> = {
  paid: "bg-brand-50 text-brand-700 border-brand-100",
  pending: "bg-amber-50 text-amber-600 border-amber-100",
  overdue: "bg-danger-50 text-danger-600 border-danger-100",
};

const DOT_STYLES: Record<CustomerStatus, string> = {
  paid: "bg-brand-500",
  pending: "bg-amber-500",
  overdue: "bg-danger-500",
};

const LABELS: Record<CustomerStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  overdue: "Overdue",
};

export default function StatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STYLES[status]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLES[status])} aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
