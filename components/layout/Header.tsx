"use client";

import { useRouter } from "next/navigation";
import { Menu, Upload, Store, LogOut } from "lucide-react";
import { useUIStore } from "@/lib/uiStore";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);
  const openUploadModal = useUIStore((s) => s.openUploadModal);
  const business = useAppStore((s) => s.business);
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="rounded-lg p-1.5 text-ink-muted hover:bg-white lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-ink sm:text-xl">{title}</h1>
          {subtitle && <p className="text-xs text-ink-muted sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {business && (
          <div className="hidden items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-muted sm:flex">
            <Store size={14} />
            {business.name}, {business.city}
          </div>
        )}
        <button onClick={openUploadModal} className="btn-primary hidden sm:inline-flex">
          <Upload size={15} />
          Upload Ledger
        </button>
        <button
          onClick={handleSignOut}
          className="btn-ghost !px-2.5"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
