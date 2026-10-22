import type { ActivityDto } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/utils";
import {
  BookPlus,
  Calculator,
  PenSquare,
  CheckCircle2,
  Send,
  XCircle,
  Sparkles,
  UserPlus,
  AlertTriangle,
  Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  ledger_added: BookPlus,
  balance_updated: Calculator,
  customer_added: UserPlus,
  business_created: Building2,
  payment_recorded: Calculator,
  transaction_voided: AlertTriangle,
  ledger_confirmed: BookPlus,
  reminder_drafted: Sparkles,
  reminder_edited: PenSquare,
  reminder_approved: CheckCircle2,
  reminder_sent: Send,
  reminder_send_failed: AlertTriangle,
  reminder_skipped: XCircle,
};

export default function ActivityFeed({ entries }: { entries: ActivityDto[] }) {
  const recent = entries.slice(0, 8);
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-ink">Activity</h2>
      <ul className="mt-3 space-y-3.5">
        {recent.map((e) => {
          const Icon = ICONS[e.event_type] ?? Calculator;
          return (
            <li key={e.id} className="flex items-start gap-2.5">
              <div className="mt-0.5 rounded-full bg-paper p-1.5 text-ink-muted">
                <Icon size={13} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-ink">{e.description}</p>
                <p className="text-[11px] text-ink-faint">{formatDateTime(e.created_at)}</p>
              </div>
            </li>
          );
        })}
        {recent.length === 0 && <p className="text-xs text-ink-faint">No activity yet.</p>}
      </ul>
    </div>
  );
}
