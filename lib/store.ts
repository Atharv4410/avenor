"use client";

import { create } from "zustand";
import { api, type CustomerDto, type TransactionDto, type ReminderDto, type ActivityDto } from "./apiClient";

interface AppState {
  loaded: boolean;
  loading: boolean;
  customers: CustomerDto[];
  transactions: TransactionDto[];
  reminders: ReminderDto[];
  activity: ActivityDto[];
  business: { id: string; name: string; city: string } | null;
  configStatus: { claudeExtraction: boolean; claudeReminders: boolean; whatsApp: boolean } | null;

  loadAll: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshReminders: () => Promise<void>;
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
}

export const useAppStore = create<AppState>()((set, get) => ({
  loaded: false,
  loading: false,
  customers: [],
  transactions: [],
  reminders: [],
  activity: [],
  business: null,
  configStatus: null,

  loadAll: async () => {
    set({ loading: true });
    try {
      const [business, customers, transactions, reminders, activity, configStatus] = await Promise.all([
        api.business.get(),
        api.customers.list(),
        api.transactions.list(),
        api.reminders.list(),
        api.activity.list(),
        api.configStatus(),
      ]);
      set({
        business: business.business,
        customers: customers.customers,
        transactions: transactions.transactions,
        reminders: reminders.reminders,
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
}));
