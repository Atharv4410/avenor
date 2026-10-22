import type { ActivityEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import {
  BookPlus,
  Calculator,
  PenSquare,
  CheckCircle2,
  Send,
  XCircle,
  Sparkles,
} from "lucide-react";

const ICONS: Record<ActivityEntry["type"], typeof BookPlus> = {
  ledger_added: BookPlus,
  balance_updated: Calculator,
  reminder_drafted: Sparkles,
  reminder_edited: PenSquare,
  reminder_approved: CheckCircle2,
  reminder_sent: Send,
  reminder_skipped: XCircle,
};

export default function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  const recent = entries.slice(0, 8);
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-ink">Activity</h2>
      <ul className="mt-3 space-y-3.5">
        {recent.map((e) => {
          const Icon = ICONS[e.type];
          return (
            <li key={e.id} className="flex items-start gap-2.5">
              <div className="mt-0.5 rounded-full bg-paper p-1.5 text-ink-muted">
                <Icon size={13} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-ink">{e.description}</p>
                <p className="text-[11px] text-ink-faint">{formatDateTime(e.timestamp)}</p>
              </div>
            </li>
          );
        })}
        {recent.length === 0 && <p className="text-xs text-ink-faint">No activity yet.</p>}
      </ul>
    </div>
  );
}
