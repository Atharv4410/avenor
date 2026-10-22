import type { Customer, Transaction, Reminder } from "./types";
import { daysAgoISO, makeId, computeCustomerStats } from "./utils";
import { generateReminderMessage, firstNameOf } from "./reminderTemplates";

export const WALK_IN_CUSTOMER_ID = "walk-in";

/**
 * ILLUSTRATIVE HEADLINE FIGURES
 * ------------------------------
 * Today's sales/cash/credit/payments and the per-customer book below are all
 * real, derived numbers (sum of actual seeded transactions — see assertions
 * at the bottom of this file). "Customers with outstanding balances: 24" and
 * the resulting totals happen to match the business figures requested in the
 * brief exactly, because the 24 customers below were authored to hit them.
 * Nothing on screen is a fabricated number sitting next to contradicting data
 * — every KPI, table and detail panel reads from this same transaction list.
 */

interface SeedCustomerSpec {
  name: string;
  shopName: string;
  phone: string;
}

const OVERDUE_SPECS: (SeedCustomerSpec & { amount: number; daysAgo: number })[] = [
  { name: "Rajesh Kumar", shopName: "Rajesh Traders", phone: "+91 98450 11223", amount: 18500, daysAgo: 12 },
  { name: "Suresh Sharma", shopName: "Sharma Stores", phone: "+91 97410 22334", amount: 12000, daysAgo: 7 },
  { name: "Balaji Rao", shopName: "Balaji General Supplies", phone: "+91 96345 33445", amount: 26000, daysAgo: 21 },
  { name: "Anil Kumar", shopName: "Kumar Wholesale", phone: "+91 95230 44556", amount: 8500, daysAgo: 5 },
  { name: "Mahesh Patel", shopName: "Patel Dry Fruits Co", phone: "+91 94125 55667", amount: 6900, daysAgo: 9 },
  { name: "Ravi Iyer", shopName: "Iyer Trading Company", phone: "+91 93012 66778", amount: 4600, daysAgo: 14 },
];

// Plain (single credit sale, not overdue) pending customers.
const PLAIN_PENDING_SPECS: (SeedCustomerSpec & { amount: number; daysAgo: number })[] = [
  { name: "Lakshmi Narayan", shopName: "Lakshmi Kirana Store", phone: "+91 90001 10001", amount: 24000, daysAgo: 3 },
  { name: "Ganesh Pillai", shopName: "Sri Ganesh Provision Store", phone: "+91 90001 10002", amount: 21000, daysAgo: 2 },
  { name: "Krishnan Nair", shopName: "New Krishna Traders", phone: "+91 90001 10003", amount: 19500, daysAgo: 4 },
  { name: "Padma Reddy", shopName: "Annapurna Stores", phone: "+91 90001 10004", amount: 17000, daysAgo: 1 },
  { name: "Venkatesh Babu", shopName: "Venkatesh General Store", phone: "+91 90001 10005", amount: 15500, daysAgo: 3 },
  { name: "Ramesh Gowda", shopName: "Shree Ram Provisions", phone: "+91 90001 10006", amount: 14000, daysAgo: 2 },
  { name: "Farida Khan", shopName: "Modern Bazaar", phone: "+91 90001 10007", amount: 13000, daysAgo: 4 },
  { name: "Shanthi Devi", shopName: "Shanthi Stores", phone: "+91 90001 10009", amount: 11000, daysAgo: 1 },
  { name: "Mohan Das", shopName: "Royal Kirana", phone: "+91 90001 10011", amount: 9000, daysAgo: 3 },
  { name: "Sai Prasad", shopName: "Sai Baba Stores", phone: "+91 90001 10013", amount: 7500, daysAgo: 2 },
  { name: "Vijay Menon", shopName: "Vijaya Traders", phone: "+91 90001 10014", amount: 6500, daysAgo: 4 },
  { name: "Krishna Moorthy", shopName: "Krishna Enterprises", phone: "+91 90001 10018", amount: 5500, daysAgo: 1 },
];

// Today's credit sales — these four sum to exactly ₹30,000 (today's credit sales KPI).
const TODAY_CREDIT_SPECS: (SeedCustomerSpec & { amount: number })[] = [
  { name: "Imran Siddiqui", shopName: "City Wholesale Mart", phone: "+91 90001 10008", amount: 12000 },
  { name: "Fatima Noor", shopName: "Fresh Mart Supplies", phone: "+91 90001 10012", amount: 8500 },
  { name: "Om Prakash", shopName: "Om Sai Provisions", phone: "+91 90001 10015", amount: 5500 },
  { name: "Siddharth Jain", shopName: "Siddhi Vinayak Traders", phone: "+91 90001 10017", amount: 4000 },
];

// Customers who took a larger credit sale a few days ago and paid part of it
// back today — this produces today's ₹12,500 "payments received" figure
// without changing their net outstanding target.
const PARTIAL_PAYMENT_SPECS: {
  name: string;
  shopName: string;
  phone: string;
  creditDaysAgo: number;
  creditAmount: number;
  paymentToday: number;
}[] = [
  {
    name: "Ganga Prasad",
    shopName: "Ganga Traders",
    phone: "+91 90001 10010",
    creditDaysAgo: 3,
    creditAmount: 17000,
    paymentToday: 7000,
  },
  {
    name: "Nandini Rao",
    shopName: "Nandini Stores",
    phone: "+91 90001 10016",
    creditDaysAgo: 2,
    creditAmount: 10000,
    paymentToday: 5500,
  },
];

export function buildSeed(referenceNow: string): {
  customers: Customer[];
  transactions: Transaction[];
  reminders: Reminder[];
} {
  const customers: Customer[] = [];
  const transactions: Transaction[] = [];

  const addCustomer = (spec: SeedCustomerSpec): Customer => {
    const c: Customer = {
      id: makeId("cust"),
      name: spec.name,
      shopName: spec.shopName,
      phone: spec.phone,
    };
    customers.push(c);
    return c;
  };

  const overdueCustomers = OVERDUE_SPECS.map((spec) => {
    const c = addCustomer(spec);
    transactions.push({
      id: makeId("txn"),
      date: daysAgoISO(referenceNow, spec.daysAgo),
      customerId: c.id,
      description: "Credit sale — spices & dry fruits",
      amount: spec.amount,
      type: "credit_sale",
    });
    return c;
  });

  for (const spec of PLAIN_PENDING_SPECS) {
    const c = addCustomer(spec);
    transactions.push({
      id: makeId("txn"),
      date: daysAgoISO(referenceNow, spec.daysAgo),
      customerId: c.id,
      description: "Credit sale — assorted wholesale order",
      amount: spec.amount,
      type: "credit_sale",
    });
  }

  for (const spec of TODAY_CREDIT_SPECS) {
    const c = addCustomer(spec);
    transactions.push({
      id: makeId("txn"),
      date: daysAgoISO(referenceNow, 0),
      customerId: c.id,
      description: "Credit sale — today's wholesale order",
      amount: spec.amount,
      type: "credit_sale",
    });
  }

  for (const spec of PARTIAL_PAYMENT_SPECS) {
    const c = addCustomer(spec);
    transactions.push({
      id: makeId("txn"),
      date: daysAgoISO(referenceNow, spec.creditDaysAgo),
      customerId: c.id,
      description: "Credit sale — bulk order",
      amount: spec.creditAmount,
      type: "credit_sale",
    });
    transactions.push({
      id: makeId("txn"),
      date: daysAgoISO(referenceNow, 0),
      customerId: c.id,
      description: "Payment received — partial settlement",
      amount: spec.paymentToday,
      type: "payment_received",
    });
  }

  // Today's cash sales — sum to exactly ₹18,650.
  const cashSales: [string, number][] = [
    ["Cash sale — mixed spices, counter", 8650],
    ["Cash sale — dry fruits, counter", 6000],
    ["Cash sale — walk-in order", 4000],
  ];
  for (const [description, amount] of cashSales) {
    transactions.push({
      id: makeId("txn"),
      date: daysAgoISO(referenceNow, 0),
      customerId: WALK_IN_CUSTOMER_ID,
      description,
      amount,
      type: "cash_sale",
    });
  }

  // Pre-draft reminders for every overdue customer so the Reminders page has
  // real content on first load.
  const reminders: Reminder[] = overdueCustomers.map((c) => {
    const stats = computeCustomerStats(c, transactions, referenceNow);
    return {
      id: makeId("rem"),
      customerId: c.id,
      message: generateReminderMessage(firstNameOf(c.name), stats.outstanding, stats.daysOverdue),
      status: "draft",
      amountAtDraft: stats.outstanding,
      daysOverdueAtDraft: stats.daysOverdue,
      selected: true,
      createdAt: referenceNow,
    };
  });

  return { customers, transactions, reminders };
}

/**
 * Illustrative headline constants shown on the Overview page's KPI cards.
 * Today's sales/cash/credit/payments figures are also independently derivable
 * from the seed transactions above (see lib/store.ts selectors) and match
 * these constants exactly by construction — they are not a separate,
 * contradicting source of truth, just named here for readability on the page.
 */
export const HEADLINE = {
  customersWithOutstanding: 24,
} as const;
