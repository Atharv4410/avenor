"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, BookText, BellRing, Upload, Receipt, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useUIStore } from "@/lib/uiStore";
import { useAppStore } from "@/lib/store";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/ledger", label: "Ledger", icon: BookText },
  { href: "/reminders", label: "Reminders", icon: BellRing },
];

export default function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const openUploadModal = useUIStore((s) => s.openUploadModal);
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);

  return (
    <div className="flex h-full w-64 flex-col border-r border-line bg-card">
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Receipt size={16} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-ink">HisaabAI</span>
        </div>
        {mobile && (
          <button
            onClick={() => setMobileNavOpen(false)}
            className="text-ink-faint hover:text-ink"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="px-3">
        <button
          onClick={() => {
            openUploadModal();
            if (mobile) setMobileNavOpen(false);
          }}
          className="btn-primary w-full"
        >
          <Upload size={16} />
          Upload Ledger
        </button>
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => mobile && setMobileNavOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-muted hover:bg-paper hover:text-ink"
              )}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line px-5 py-4">
        <IntegrationStatusLine />
      </div>
    </div>
  );
}

function IntegrationStatusLine() {
  const configStatus = useAppStore((s) => s.configStatus);
  if (!configStatus) return null;

  const parts = [
    configStatus.aiExtraction ? "AI extraction: live" : "AI extraction: manual entry",
    configStatus.whatsApp ? "WhatsApp: live" : "WhatsApp: demo mode",
  ];

  return <p className="text-xs text-ink-faint">{parts.join(" · ")}</p>;
}
