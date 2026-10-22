export type TransactionType = "cash_sale" | "credit_sale" | "payment_received";

export interface Customer {
  id: string;
  name: string;
  shopName: string;
  phone: string;
}

export interface Transaction {
  id: string;
  date: string; // ISO date string
  customerId: string; // "walk-in" for untracked cash sales
  description: string;
  amount: number;
  type: TransactionType;
}

export type ReminderStatus = "draft" | "approved" | "sent" | "skipped";

export interface Reminder {
  id: string;
  customerId: string;
  message: string;
  status: ReminderStatus;
  amountAtDraft: number;
  daysOverdueAtDraft: number;
  selected: boolean;
  createdAt: string;
  sentAt?: string;
}

export type ActivityType =
  | "ledger_added"
  | "balance_updated"
  | "reminder_drafted"
  | "reminder_edited"
  | "reminder_approved"
  | "reminder_sent"
  | "reminder_skipped";

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
}

export type CustomerStatus = "paid" | "pending" | "overdue";

export interface CustomerWithStats extends Customer {
  outstanding: number;
  totalCreditGiven: number;
  totalPaymentsReceived: number;
  lastTransactionDate: string | null;
  daysOverdue: number;
  status: CustomerStatus;
}

export type DraftMatchState = "matched" | "new" | "ambiguous";

export interface NewTransactionDraft {
  rowId: string;
  customerName: string;
  customerId: string | null; // set when matched to an existing customer
  matchState: DraftMatchState;
  candidateIds: string[]; // populated when matchState === "ambiguous"
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
}
