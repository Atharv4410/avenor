"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import Sidebar from "./Sidebar";
import { useAppStore } from "@/lib/store";
import { useUIStore } from "@/lib/uiStore";
import UploadLedgerModal from "@/components/ledger/UploadLedgerModal";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadAll = useAppStore((s) => s.loadAll);
  const isMobileNavOpen = useUIStore((s) => s.isMobileNavOpen);
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);
  const router = useRouter();

  useEffect(() => {
    loadAll()
      .then(() => setMounted(true))
      .catch((err: Error) => {
        if (err.message.includes("No business set up yet")) {
          router.replace("/onboarding");
          return;
        }
        setError(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-paper px-4">
        <div className="card max-w-sm p-6 text-center">
          <p className="text-sm font-medium text-danger-600">Couldn&apos;t load HisaabAI</p>
          <p className="mt-1 text-sm text-ink-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-paper">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Receipt size={18} />
          </div>
          <p className="text-sm text-ink-muted">Loading HisaabAI…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-ink/30"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative z-10 h-full">
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</div>
      <UploadLedgerModal />
    </div>
  );
}
