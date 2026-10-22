"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Customer,
  Transaction,
  Reminder,
  ActivityEntry,
  ActivityType,
  TransactionType,
} from "./types";
import { buildSeed, WALK_IN_CUSTOMER_ID } from "./seedData";
import {
  makeId,
  computeCustomerStats,
  hasRecentPayment,
  formatINR,
} from "./utils";
import { generateReminderMessage, firstNameOf } from "./reminderTemplates";

interface ConfirmedTxnInput {
  customerId: string | null; // null = create a new customer from customerName
  customerName?: string;
  description: string;
  amount: number;
  type: TransactionType;
}

interface SendResult {
  ok: boolean;
  reason?: string;
}

interface AppState {
  referenceNow: string;
  customers: Customer[];
  transactions: Transaction[];
  reminders: Reminder[];
  activity: ActivityEntry[];
  seeded: boolean;

  ensureSeeded: () => void;
  addActivity: (type: ActivityType, description: string) => void;
  addConfirmedTransactions: (drafts: ConfirmedTxnInput[]) => void;
  draftReminder: (customerId: string) => { ok: boolean; reminderId?: string; reason?: string };
  updateReminderMessage: (id: string, message: string) => void;
  toggleReminderSelected: (id: string, selected?: boolean) => void;
  approveReminder: (id: string) => void;
  approveSelected: () => void;
  skipReminder: (id: string) => void;
  confirmSend: (id: string) => SendResult;
  confirmSendSelected: () => { sent: number; blocked: number };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      referenceNow: new Date().toISOString(),
      customers: [],
      transactions: [],
      reminders: [],
      activity: [],
      seeded: false,

      ensureSeeded: () => {
        if (get().seeded) return;
        const referenceNow = new Date().toISOString();
        const { customers, transactions, reminders } = buildSeed(referenceNow);
        set({
          referenceNow,
          customers,
          transactions,
          reminders,
          seeded: true,
          activity: [
            {
              id: makeId("act"),
              type: "ledger_added",
              description: "Demo ledger book loaded (24 customers, opening balances set).",
              timestamp: new Date().toISOString(),
            },
          ],
        });
      },

      addActivity: (type, description) => {
        set((s) => ({
          activity: [
            { id: makeId("act"), type, description, timestamp: new Date().toISOString() },
            ...s.activity,
          ],
        }));
      },

      addConfirmedTransactions: (drafts) => {
        const { referenceNow } = get();
        const newCustomers: Customer[] = [];
        const newTxns: Transaction[] = drafts.map((d) => {
          let customerId = d.customerId;
          if (!customerId) {
            const created: Customer = {
              id: makeId("cust"),
              name: d.customerName?.trim() || "Unnamed customer",
              shopName: d.customerName?.trim() || "Unnamed customer",
              phone: "Not on file",
            };
            newCustomers.push(created);
            customerId = created.id;
          }
          return {
            id: makeId("txn"),
            date: referenceNow,
            customerId,
            description: d.description,
            amount: d.amount,
            type: d.type,
          };
        });
        set((s) => ({
          customers: [...s.customers, ...newCustomers],
          transactions: [...s.transactions, ...newTxns],
        }));
        if (newCustomers.length > 0) {
          get().addActivity(
            "ledger_added",
            `${newCustomers.length} new customer${newCustomers.length === 1 ? "" : "s"} added from the ledger upload.`
          );
        }
        get().addActivity(
          "ledger_added",
          `${newTxns.length} transaction${newTxns.length === 1 ? "" : "s"} added from an uploaded ledger.`
        );
        get().addActivity(
          "balance_updated",
          "Customer balances and dashboard totals recalculated."
        );
      },

      draftReminder: (customerId) => {
        const { customers, transactions, reminders, referenceNow } = get();
        const customer = customers.find((c) => c.id === customerId);
        if (!customer) return { ok: false, reason: "Customer not found." };

        const stats = computeCustomerStats(customer, transactions, referenceNow);
        if (stats.outstanding <= 0) {
          return { ok: false, reason: "This customer has no outstanding balance." };
        }

        const existing = reminders.find(
          (r) => r.customerId === customerId && r.status !== "skipped" && r.status !== "sent"
        );
        if (existing) {
          return { ok: true, reminderId: existing.id };
        }

        const reminder: Reminder = {
          id: makeId("rem"),
          customerId,
          message: generateReminderMessage(firstNameOf(customer.name), stats.outstanding, stats.daysOverdue),
          status: "draft",
          amountAtDraft: stats.outstanding,
          daysOverdueAtDraft: stats.daysOverdue,
          selected: true,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ reminders: [reminder, ...s.reminders] }));
        get().addActivity(
          "reminder_drafted",
          `Drafted a reminder for ${customer.shopName} (${formatINR(stats.outstanding)}).`
        );
        return { ok: true, reminderId: reminder.id };
      },

      updateReminderMessage: (id, message) => {
        set((s) => ({
          reminders: s.reminders.map((r) => (r.id === id ? { ...r, message } : r)),
        }));
        get().addActivity("reminder_edited", "Edited a reminder message.");
      },

      toggleReminderSelected: (id, selected) => {
        set((s) => ({
          reminders: s.reminders.map((r) =>
            r.id === id ? { ...r, selected: selected ?? !r.selected } : r
          ),
        }));
      },

      approveReminder: (id) => {
        const r = get().reminders.find((x) => x.id === id);
        set((s) => ({
          reminders: s.reminders.map((x) => (x.id === id ? { ...x, status: "approved" } : x)),
        }));
        if (r) {
          const c = get().customers.find((cu) => cu.id === r.customerId);
          get().addActivity(
            "reminder_approved",
            `Approved reminder for ${c?.shopName ?? "customer"}.`
          );
        }
      },

      approveSelected: () => {
        const { reminders } = get();
        const toApprove = reminders.filter((r) => r.selected && r.status === "draft");
        set((s) => ({
          reminders: s.reminders.map((r) =>
            r.selected && r.status === "draft" ? { ...r, status: "approved" } : r
          ),
        }));
        if (toApprove.length > 0) {
          get().addActivity(
            "reminder_approved",
            `Approved ${toApprove.length} reminder${toApprove.length === 1 ? "" : "s"}.`
          );
        }
      },

      skipReminder: (id) => {
        const r = get().reminders.find((x) => x.id === id);
        set((s) => ({
          reminders: s.reminders.map((x) => (x.id === id ? { ...x, status: "skipped" } : x)),
        }));
        if (r) {
          const c = get().customers.find((cu) => cu.id === r.customerId);
          get().addActivity("reminder_skipped", `Skipped reminder for ${c?.shopName ?? "customer"}.`);
        }
      },

      confirmSend: (id) => {
        const { reminders, transactions, referenceNow, customers } = get();
        const r = reminders.find((x) => x.id === id);
        if (!r) return { ok: false, reason: "Reminder not found." };
        if (r.status === "sent") return { ok: false, reason: "Already sent." };
        if (hasRecentPayment(r.customerId, transactions, referenceNow)) {
          return {
            ok: false,
            reason: "A payment was recorded for this customer in the last 24 hours.",
          };
        }
        set((s) => ({
          reminders: s.reminders.map((x) =>
            x.id === id ? { ...x, status: "sent", sentAt: new Date().toISOString() } : x
          ),
        }));
        const c = customers.find((cu) => cu.id === r.customerId);
        get().addActivity(
          "reminder_sent",
          `Reminder marked Sent (simulated) for ${c?.shopName ?? "customer"} — ${formatINR(r.amountAtDraft)}.`
        );
        return { ok: true };
      },

      confirmSendSelected: () => {
        const { reminders } = get();
        const candidates = reminders.filter((r) => r.selected && r.status === "approved");
        let sent = 0;
        let blocked = 0;
        for (const r of candidates) {
          const result = get().confirmSend(r.id);
          if (result.ok) sent += 1;
          else blocked += 1;
        }
        return { sent, blocked };
      },
    }),
    {
      name: "hisaabai-demo-store",
      version: 1,
    }
  )
);

export { WALK_IN_CUSTOMER_ID };
