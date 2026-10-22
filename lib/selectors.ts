import type { Customer, Transaction } from "./types";
import { getAllCustomerStats, isSameCalendarDay } from "./utils";

export function getTodayTotals(transactions: Transaction[], referenceNow: string) {
  const today = transactions.filter((t) => isSameCalendarDay(t.date, referenceNow));
  const cashSales = today
    .filter((t) => t.type === "cash_sale")
    .reduce((sum, t) => sum + t.amount, 0);
  const creditSales = today
    .filter((t) => t.type === "credit_sale")
    .reduce((sum, t) => sum + t.amount, 0);
  const paymentsReceived = today
    .filter((t) => t.type === "payment_received")
    .reduce((sum, t) => sum + t.amount, 0);
  return {
    totalSales: cashSales + creditSales,
    cashSales,
    creditSales,
    paymentsReceived,
  };
}

export function getPortfolioTotals(
  customers: Customer[],
  transactions: Transaction[],
  referenceNow: string
) {
  const stats = getAllCustomerStats(customers, transactions, referenceNow);
  const totalOutstanding = stats.reduce((sum, s) => sum + s.outstanding, 0);
  const overdueOutstanding = stats
    .filter((s) => s.status === "overdue")
    .reduce((sum, s) => sum + s.outstanding, 0);
  const customersWithOutstanding = stats.filter((s) => s.outstanding > 0).length;
  const overdueCustomers = stats
    .filter((s) => s.status === "overdue")
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  return { stats, totalOutstanding, overdueOutstanding, customersWithOutstanding, overdueCustomers };
}
