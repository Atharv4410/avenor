import type { CustomerStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

const STYLES: Record<CustomerStatus, string> = {
  paid: "bg-brand-50 text-brand-700 border-brand-100",
  pending: "bg-amber-50 text-amber-600 border-amber-100",
  overdue: "bg-danger-50 text-danger-600 border-danger-100",
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
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STYLES[status]
      )}
    >
      {LABELS[status]}
    </span>
  );
}
