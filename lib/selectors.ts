import type { CustomerDto, TransactionDto } from "./apiClient";

function isSameCalendarDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

export function getTodayTotals(transactions: TransactionDto[], referenceNow: string) {
  const today = transactions.filter(
    (t) => !t.voided_at && isSameCalendarDay(t.occurred_on, referenceNow)
  );
  const cashSalesPaise = today
    .filter((t) => t.type === "cash_sale")
    .reduce((sum, t) => sum + t.amount_paise, 0);
  const creditSalesPaise = today
    .filter((t) => t.type === "credit_sale")
    .reduce((sum, t) => sum + t.amount_paise, 0);
  const paymentsReceivedPaise = today
    .filter((t) => t.type === "payment_received")
    .reduce((sum, t) => sum + t.amount_paise, 0);
  return {
    totalSalesPaise: cashSalesPaise + creditSalesPaise,
    cashSalesPaise,
    creditSalesPaise,
    paymentsReceivedPaise,
  };
}

export function getPortfolioTotals(customers: CustomerDto[]) {
  const totalOutstandingPaise = customers.reduce((sum, c) => sum + c.outstandingPaise, 0);
  const overdueOutstandingPaise = customers
    .filter((c) => c.status === "overdue")
    .reduce((sum, c) => sum + c.overdueAmountPaise, 0);
  const customersWithOutstanding = customers.filter((c) => c.outstandingPaise > 0).length;
  const overdueCustomers = customers
    .filter((c) => c.status === "overdue")
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  return { totalOutstandingPaise, overdueOutstandingPaise, customersWithOutstanding, overdueCustomers };
}
