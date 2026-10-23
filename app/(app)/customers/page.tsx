"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import CustomerTable from "@/components/customers/CustomerTable";
import CustomerDetailPanel from "@/components/customers/CustomerDetailPanel";
import { useAppStore } from "@/lib/store";

function CustomersContent() {
  const customers = useAppStore((s) => s.customers);
  const transactions = useAppStore((s) => s.transactions);
  const searchParams = useSearchParams();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = searchParams.get("customer");
    if (fromQuery) setSelectedId(fromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = customers.find((c) => c.id === selectedId) ?? null;

  return (
    <>
      <Header title="Customers" subtitle={`${customers.length} customers on file`} />
      <main className="flex-1 animate-fade-in-up px-4 py-6 sm:px-6">
        <CustomerTable customers={customers} onSelect={setSelectedId} />
      </main>
      {selected && (
        <CustomerDetailPanel
          customer={selected}
          transactions={transactions}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={null}>
      <CustomersContent />
    </Suspense>
  );
}
