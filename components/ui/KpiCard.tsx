import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "brand" | "amber" | "danger";

const TONE_STYLES: Record<Tone, string> = {
  neutral: "bg-paper text-ink-muted",
  brand: "bg-brand-50 text-brand-600",
  amber: "bg-amber-50 text-amber-600",
  danger: "bg-danger-50 text-danger-600",
};

export default function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className="card p-5 transition-shadow duration-200 hover:shadow-pop">
      <div className="flex items-start justify-between">
        <p className="text-sm text-ink-muted">{label}</p>
        <div className={cn("rounded-lg p-1.5 transition-transform duration-200", TONE_STYLES[tone])}>
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-faint">{sub}</p>}
    </div>
  );
}
