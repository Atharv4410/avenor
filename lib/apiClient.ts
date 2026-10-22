"use client";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export const api = {
  business: {
    get: () => request<{ business: { id: string; name: string; city: string } }>("/api/business"),
  },
  customers: {
    list: () => request<{ customers: CustomerDto[] }>("/api/customers"),
    create: (input: { name: string; shopName: string; phone: string }) =>
      request<{ customer: any }>("/api/customers", { method: "POST", body: JSON.stringify(input) }),
    recordPayment: (
      customerId: string,
      input: { amountRupees: number; occurredOn: string; paymentMethod?: string; referenceNumber?: string; clientRequestId: string }
    ) =>
      request<{ transactionId: string }>(`/api/customers/${customerId}/payments`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
  transactions: {
    list: () => request<{ transactions: TransactionDto[] }>("/api/transactions"),
    void: (id: string, reason: string) =>
      request<{ ok: true }>(`/api/transactions/${id}/void`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
  },
  ledger: {
    upload: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return fetch("/api/ledger/upload", { method: "POST", body: form }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error ?? "Upload failed.");
        return body as { ledgerDocument: { id: string }; deduplicated: boolean };
      });
    },
    extract: (ledgerDocumentId: string) =>
      request<ExtractResponse>("/api/ledger/extract", {
        method: "POST",
        body: JSON.stringify({ ledgerDocumentId }),
      }),
    confirm: (input: {
      ledgerDocumentId: string | null;
      batchId: string;
      rows: ConfirmRowInput[];
    }) =>
      request<{ insertedCount: number; duplicateCount: number }>("/api/ledger/confirm", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
  reminders: {
    list: () => request<{ reminders: ReminderDto[] }>("/api/reminders"),
    draft: (customerId: string) =>
      request<{ reminder: ReminderDto; source: "gemini" | "template_fallback" }>("/api/reminders", {
        method: "POST",
        body: JSON.stringify({ customerId }),
      }),
    edit: (id: string, message: string) =>
      request<{ reminder: ReminderDto }>(`/api/reminders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "edit", message }),
      }),
    approve: (id: string) =>
      request<{ reminder: ReminderDto }>(`/api/reminders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "approve" }),
      }),
    skip: (id: string) =>
      request<{ reminder: ReminderDto }>(`/api/reminders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "skip" }),
      }),
    send: (id: string, clientNonce: string) =>
      request<{ attempt: any; deduplicated: boolean }>(`/api/reminders/${id}/send`, {
        method: "POST",
        body: JSON.stringify({ clientNonce }),
      }),
    bulkApprove: (reminderIds: string[]) =>
      request<{ approved: ReminderDto[] }>("/api/reminders/bulk-approve", {
        method: "POST",
        body: JSON.stringify({ reminderIds }),
      }),
    bulkSend: (reminderIds: string[], clientNonce: string) =>
      request<{ results: { reminderId: string; ok: boolean; reason?: string }[] }>(
        "/api/reminders/bulk-send",
        { method: "POST", body: JSON.stringify({ reminderIds, clientNonce }) }
      ),
  },
  activity: {
    list: () => request<{ activity: ActivityDto[] }>("/api/activity"),
  },
  configStatus: () =>
    request<{ aiExtraction: boolean; aiReminders: boolean; whatsApp: boolean }>(
      "/api/config-status"
    ),
};

export interface CustomerDto {
  id: string;
  name: string;
  shopName: string;
  phone: string;
  isWalkIn: boolean;
  flaggedForReview: boolean;
  paymentTermsDays: number | null;
  totalCreditPaise: number;
  totalPaymentsPaise: number;
  outstandingPaise: number;
  overdueAmountPaise: number;
  daysOverdue: number;
  lastTransactionDate: string | null;
  lastPaymentDate: string | null;
  status: "paid" | "pending" | "overdue";
}

export interface TransactionDto {
  id: string;
  business_id: string;
  customer_id: string;
  ledger_document_id: string | null;
  type: "cash_sale" | "credit_sale" | "payment_received";
  amount_paise: number;
  description: string;
  occurred_on: string;
  due_date: string | null;
  reference_number: string | null;
  payment_method: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
}

export interface ReminderDto {
  id: string;
  business_id: string;
  customer_id: string;
  reminder_cycle_key: string;
  message: string;
  amount_paise_at_draft: number;
  days_overdue_at_draft: number;
  status: "draft" | "approved" | "sent" | "failed" | "skipped";
  created_at: string;
  updated_at: string;
}

export interface ActivityDto {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
}

export interface ExtractRowDto {
  customerNameRaw: string;
  transactionType: "cash_sale" | "credit_sale" | "payment_received";
  occurredOn: string | null;
  description: string;
  amountRupees: number | null;
  referenceNumber?: string | null;
  needsReview: boolean;
  reviewNote: string | null;
  match:
    | { kind: "exact" | "single"; customerId: string }
    | { kind: "ambiguous"; candidateIds: string[] }
    | { kind: "none" };
}

export interface ExtractResponse {
  configured: boolean;
  message?: string;
  model?: string;
  pageNote?: string | null;
  rows?: ExtractRowDto[];
}

export interface ConfirmRowInput {
  customerId: string | null;
  newCustomerName?: string | null;
  type: "cash_sale" | "credit_sale" | "payment_received";
  amountRupees: number;
  description: string;
  occurredOn: string;
  referenceNumber?: string | null;
}
