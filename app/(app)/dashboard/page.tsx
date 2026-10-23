"use client";

import Link from "next/link";
import { Wallet, Landmark, AlertCircle, HandCoins, Users2, ArrowRight, BellRing } from "lucide-react";
import Header from "@/components/layout/Header";
import KpiCard from "@/components/ui/KpiCard";
import CashCreditChart from "@/components/dashboard/CashCreditChart";
import OverdueCustomersSection from "@/components/dashboard/OverdueCustomersSection";
import RecentTransactionsTable from "@/components/dashboard/RecentTransactionsTable";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { useAppStore } from "@/lib/store";
import { getTodayTotals, getPortfolioTotals } from "@/lib/selectors";
import { formatPaiseAsINR } from "@/lib/accounting/money";

export default function OverviewPage() {
  const customers = useAppStore((s) => s.customers);
  const transactions = useAppStore((s) => s.transactions);
  const activity = useAppStore((s) => s.activity);
  const reminders = useAppStore((s) => s.reminders);

  const now = new Date().toISOString();
  const today = getTodayTotals(transactions, now);
  const portfolio = getPortfolioTotals(customers);
  const pendingReminders = reminders.filter((r) => r.status === "draft" || r.status === "approved");

  return (
    <>
      <Header title="Overview" subtitle="Today's business at a glance" />
      <main className="flex-1 animate-fade-in-up space-y-6 px-4 py-6 sm:px-6">
        {pendingReminders.length > 0 && (
          <div className="card flex flex-col gap-3 border-accent-100 bg-accent-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent-600 p-2 text-white shadow-sm">
                <BellRing size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">
                  {pendingReminders.length} payment reminder{pendingReminders.length === 1 ? "" : "s"} ready to review
                </p>
                <p className="text-xs text-ink-muted">
                  AI-drafted messages for overdue customers are waiting for your approval.
                </p>
              </div>
            </div>
            <Link href="/reminders" className="btn-primary shrink-0">
              Review reminders
              <ArrowRight size={15} />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard
            label="Today's sales"
            value={formatPaiseAsINR(today.totalSalesPaise)}
            sub={`Cash ${formatPaiseAsINR(today.cashSalesPaise)} · Credit ${formatPaiseAsINR(today.creditSalesPaise)}`}
            icon={Wallet}
            tone="brand"
          />
          <KpiCard
            label="Payments received today"
            value={formatPaiseAsINR(today.paymentsReceivedPaise)}
            icon={HandCoins}
            tone="brand"
          />
          <KpiCard
            label="Total outstanding"
            value={formatPaiseAsINR(portfolio.totalOutstandingPaise)}
            sub={`${portfolio.customersWithOutstanding} customers`}
            icon={Landmark}
            tone="amber"
          />
          <KpiCard
            label="Overdue outstanding"
            value={formatPaiseAsINR(portfolio.overdueOutstandingPaise)}
            sub={`${portfolio.overdueCustomers.length} customers overdue`}
            icon={AlertCircle}
            tone="danger"
          />
          <KpiCard
            label="Customers with balance"
            value={String(portfolio.customersWithOutstanding)}
            icon={Users2}
            tone="neutral"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <OverdueCustomersSection customers={portfolio.overdueCustomers} />
            <RecentTransactionsTable transactions={transactions} customers={customers} />
          </div>
          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-ink">Cash vs. credit sales today</h2>
              <div className="mt-4">
                <CashCreditChart cashPaise={today.cashSalesPaise} creditPaise={today.creditSalesPaise} />
              </div>
            </div>
            <ActivityFeed entries={activity} />
          </div>
        </div>
      </main>
    </>
  );
}
