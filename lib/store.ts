"use client";

import { create } from "zustand";
import {
  api,
  type CustomerDto,
  type TransactionDto,
  type ReminderDto,
  type ActivityDto,
  type CustomerReplyDto,
} from "./apiClient";

interface AppState {
  loaded: boolean;
  loading: boolean;
  customers: CustomerDto[];
  transactions: TransactionDto[];
  reminders: ReminderDto[];
  customerReplies: CustomerReplyDto[];
  activity: ActivityDto[];
  business: { id: string; name: string; city: string } | null;
  configStatus: { aiExtraction: boolean; aiReminders: boolean; whatsApp: boolean } | null;

  loadAll: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshReminders: () => Promise<void>;
  refreshCustomerReplies: () => Promise<void>;
  refreshActivity: () => Promise<void>;

  recordPayment: (
    customerId: string,
    input: { amountRupees: number; occurredOn: string; paymentMethod?: string; referenceNumber?: string }
  ) => Promise<void>;

  draftReminder: (customerId: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  editReminder: (id: string, message: string) => Promise<void>;
  approveReminder: (id: string) => Promise<void>;
  skipReminder: (id: string) => Promise<void>;
  sendReminder: (id: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  approveSelected: (ids: string[]) => Promise<void>;
  sendSelected: (ids: string[]) => Promise<{ sent: number; blocked: number }>;

  editCustomerReply: (id: string, message: string) => Promise<void>;
  approveCustomerReply: (id: string) => Promise<void>;
  skipCustomerReply: (id: string) => Promise<void>;
  sendCustomerReply: (id: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
}

export const useAppStore = create<AppState>()((set, get) => ({
  loaded: false,
  loading: false,
  customers: [],
  transactions: [],
  reminders: [],
  customerReplies: [],
  activity: [],
  business: null,
  configStatus: null,

  loadAll: async () => {
    set({ loading: true });
    try {
      const [business, customers, transactions, reminders, customerReplies, activity, configStatus] =
        await Promise.all([
          api.business.get(),
          api.customers.list(),
          api.transactions.list(),
          api.reminders.list(),
          api.customerReplies.list(),
          api.activity.list(),
          api.configStatus(),
        ]);
      set({
        business: business.business,
        customers: customers.customers,
        transactions: transactions.transactions,
        reminders: reminders.reminders,
        customerReplies: customerReplies.customerReplies,
        activity: activity.activity,
        configStatus,
        loaded: true,
        loading: false,
      });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  refreshCustomers: async () => {
    const { customers } = await api.customers.list();
    set({ customers });
  },
  refreshTransactions: async () => {
    const { transactions } = await api.transactions.list();
    set({ transactions });
  },
  refreshReminders: async () => {
    const { reminders } = await api.reminders.list();
    set({ reminders });
  },
  refreshCustomerReplies: async () => {
    const { customerReplies } = await api.customerReplies.list();
    set({ customerReplies });
  },
  refreshActivity: async () => {
    const { activity } = await api.activity.list();
    set({ activity });
  },

  recordPayment: async (customerId, input) => {
    await api.customers.recordPayment(customerId, { ...input, clientRequestId: crypto.randomUUID() });
    await Promise.all([get().refreshCustomers(), get().refreshTransactions(), get().refreshActivity()]);
  },

  draftReminder: async (customerId) => {
    try {
      await api.reminders.draft(customerId);
      await Promise.all([get().refreshReminders(), get().refreshActivity()]);
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : "Could not draft a reminder." };
    }
  },

  editReminder: async (id, message) => {
    await api.reminders.edit(id, message);
    await get().refreshReminders();
  },

  approveReminder: async (id) => {
    await api.reminders.approve(id);
    await Promise.all([get().refreshReminders(), get().refreshActivity()]);
  },

  skipReminder: async (id) => {
    await api.reminders.skip(id);
    await Promise.all([get().refreshReminders(), get().refreshActivity()]);
  },

  sendReminder: async (id) => {
    try {
      await api.reminders.send(id, crypto.randomUUID());
      await Promise.all([get().refreshReminders(), get().refreshActivity()]);
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : "Could not send." };
    }
  },

  approveSelected: async (ids) => {
    if (ids.length === 0) return;
    await api.reminders.bulkApprove(ids);
    await Promise.all([get().refreshReminders(), get().refreshActivity()]);
  },

  sendSelected: async (ids) => {
    if (ids.length === 0) return { sent: 0, blocked: 0 };
    const { results } = await api.reminders.bulkSend(ids, crypto.randomUUID());
    await Promise.all([get().refreshReminders(), get().refreshActivity()]);
    return {
      sent: results.filter((r) => r.ok).length,
      blocked: results.filter((r) => !r.ok).length,
    };
  },

  editCustomerReply: async (id, message) => {
    await api.customerReplies.edit(id, message);
    await get().refreshCustomerReplies();
  },

  approveCustomerReply: async (id) => {
    await api.customerReplies.approve(id);
    await Promise.all([get().refreshCustomerReplies(), get().refreshActivity()]);
  },

  skipCustomerReply: async (id) => {
    await api.customerReplies.skip(id);
    await Promise.all([get().refreshCustomerReplies(), get().refreshActivity()]);
  },

  sendCustomerReply: async (id) => {
    try {
      const result = await api.customerReplies.send(id, crypto.randomUUID());
      await Promise.all([get().refreshCustomerReplies(), get().refreshActivity()]);
      if (!result.ok) return { ok: false, reason: result.errorDetail ?? "Could not send." };
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : "Could not send." };
    }
  },
}));
