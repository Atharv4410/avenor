"use client";

import { Upload } from "lucide-react";
import Header from "@/components/layout/Header";
import LedgerTable from "@/components/ledger/LedgerTable";
import { useAppStore } from "@/lib/store";
import { useUIStore } from "@/lib/uiStore";

export default function LedgerPage() {
  const customers = useAppStore((s) => s.customers);
  const transactions = useAppStore((s) => s.transactions);
  const openUploadModal = useUIStore((s) => s.openUploadModal);

  return (
    <>
      <Header title="Ledger" subtitle={`${transactions.length} transactions recorded`} />
      <main className="flex-1 animate-fade-in-up space-y-4 px-4 py-6 sm:px-6">
        <div className="flex justify-end sm:hidden">
          <button onClick={openUploadModal} className="btn-primary">
            <Upload size={16} />
            Upload Ledger
          </button>
        </div>
        <LedgerTable transactions={transactions} customers={customers} />
      </main>
    </>
  );
}
