/**
 * Hand-written to match supabase/migrations/0001_init.sql and 0002_storage.sql.
 *
 * Once a real Supabase project exists, regenerate this from the live schema
 * instead of maintaining it by hand:
 *
 *   npx supabase gen types typescript --project-id <project-ref> > lib/supabase/types.ts
 */

export type TransactionType = "cash_sale" | "credit_sale" | "payment_received";
export type LedgerDocumentStatus = "uploaded" | "processing" | "extracted" | "confirmed" | "failed";
export type ReminderStatus = "draft" | "approved" | "sent" | "failed" | "skipped";
export type DeliveryStatus = "queued" | "sent" | "delivered" | "read" | "failed";
export type DeliveryProvider = "whatsapp_cloud_api" | "demo";
export type MemberRole = "owner" | "staff";
export type CustomerReplyStatus = "draft" | "approved" | "sent" | "failed" | "skipped";
export type CustomerReplyDraftedBy = "ai" | "template";

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          city: string;
          default_credit_period_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["businesses"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["businesses"]["Row"]>;
      };
      business_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["business_members"]["Row"]> & {
          business_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["business_members"]["Row"]>;
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          shop_name: string;
          phone: string;
          payment_terms_days: number | null;
          is_walk_in: boolean;
          flagged_for_review: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["customers"]["Row"]> & {
          business_id: string;
          name: string;
          shop_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Row"]>;
      };
      ledger_documents: {
        Row: {
          id: string;
          business_id: string;
          storage_path: string;
          uploaded_by: string;
          status: LedgerDocumentStatus;
          extraction_result: unknown | null;
          error_message: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ledger_documents"]["Row"]> & {
          business_id: string;
          storage_path: string;
          uploaded_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["ledger_documents"]["Row"]>;
      };
      transactions: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          ledger_document_id: string | null;
          type: TransactionType;
          amount_paise: number;
          description: string;
          occurred_on: string;
          due_date: string | null;
          reference_number: string | null;
          payment_method: string | null;
          idempotency_key: string | null;
          created_by: string | null;
          voided_at: string | null;
          voided_by: string | null;
          void_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never; // writes only via RPC — see migration comments
        Update: never;
      };
      transaction_line_items: {
        Row: {
          id: string;
          transaction_id: string;
          description: string;
          quantity: number | null;
          unit: string | null;
          amount_paise: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["transaction_line_items"]["Row"]> & {
          transaction_id: string;
          description: string;
          amount_paise: number;
        };
        Update: Partial<Database["public"]["Tables"]["transaction_line_items"]["Row"]>;
      };
      reminders: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          reminder_cycle_key: string;
          message: string;
          amount_paise_at_draft: number;
          days_overdue_at_draft: number;
          status: ReminderStatus;
          created_by: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reminders"]["Row"]> & {
          business_id: string;
          customer_id: string;
          reminder_cycle_key: string;
          message: string;
          amount_paise_at_draft: number;
          days_overdue_at_draft: number;
        };
        Update: Partial<Database["public"]["Tables"]["reminders"]["Row"]>;
      };
      reminder_delivery_attempts: {
        Row: {
          id: string;
          reminder_id: string;
          provider: DeliveryProvider;
          provider_message_id: string | null;
          status: DeliveryStatus;
          error_detail: string | null;
          idempotency_key: string;
          raw_webhook_payload: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reminder_delivery_attempts"]["Row"]> & {
          reminder_id: string;
          provider: DeliveryProvider;
          idempotency_key: string;
        };
        Update: Partial<Database["public"]["Tables"]["reminder_delivery_attempts"]["Row"]>;
      };
      activity_events: {
        Row: {
          id: string;
          business_id: string;
          actor_user_id: string | null;
          event_type: string;
          description: string;
          metadata: unknown | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["activity_events"]["Row"]> & {
          business_id: string;
          event_type: string;
          description: string;
        };
        Update: never;
      };
      customer_replies: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          inbound_message_id: string;
          inbound_text: string;
          inbound_received_at: string;
          draft_reply: string;
          drafted_by: CustomerReplyDraftedBy;
          status: CustomerReplyStatus;
          approved_by: string | null;
          approved_at: string | null;
          sent_by: string | null;
          sent_at: string | null;
          provider_message_id: string | null;
          error_detail: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["customer_replies"]["Row"]> & {
          business_id: string;
          customer_id: string;
          inbound_message_id: string;
          inbound_text: string;
          inbound_received_at: string;
          draft_reply: string;
          drafted_by: CustomerReplyDraftedBy;
        };
        Update: Partial<Database["public"]["Tables"]["customer_replies"]["Row"]>;
      };
      webhook_events: {
        Row: {
          id: string;
          provider: string;
          external_event_id: string;
          payload: unknown;
          processed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["webhook_events"]["Row"]> & {
          provider: string;
          external_event_id: string;
          payload: unknown;
        };
        Update: Partial<Database["public"]["Tables"]["webhook_events"]["Row"]>;
      };
    };
    Functions: {
      create_business_with_owner: {
        Args: { p_name: string; p_city?: string };
        Returns: string;
      };
      confirm_ledger_transactions: {
        Args: { p_business_id: string; p_ledger_document_id: string | null; p_rows: unknown };
        Returns: { id: string; inserted: boolean }[];
      };
      record_payment: {
        Args: {
          p_business_id: string;
          p_customer_id: string;
          p_amount_paise: number;
          p_occurred_on: string;
          p_payment_method: string | null;
          p_reference_number: string | null;
          p_idempotency_key: string;
        };
        Returns: string;
      };
      void_transaction: {
        Args: { p_transaction_id: string; p_reason: string };
        Returns: void;
      };
    };
  };
}
