# HisaabAI

AI-powered bookkeeping and payment follow-up assistant for small wholesale
businesses in Bengaluru, India — turns a photographed handwritten ledger page
into structured transactions, computes customer balances and overdue amounts
deterministically, and drafts WhatsApp payment reminders for the owner to
review and approve.

**Setup instructions (Supabase, Gemini, WhatsApp, deployment): see [SETUP.md](SETUP.md).**

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase: Postgres, Auth, Storage, Row Level Security
- Google Gemini (vision extraction + reminder drafting), optional
- Meta WhatsApp Business Platform Cloud API, optional
- Vitest for the business-logic test suite

## Architecture

```
Browser (React client components)
   │  fetch()
   ▼
Next.js Route Handlers (app/api/**)        ← auth + business-membership check on every request
   │                                          (lib/server/apiHelpers.ts)
   ├─ lib/accounting/ledger.ts               ← pure, DB-agnostic FIFO accounting engine
   ├─ lib/accounting/reminderEligibility.ts  ← pure eligibility/guardrail rules
   ├─ lib/ai/geminiExtraction.ts             ← Gemini vision → structured rows
   ├─ lib/ai/geminiReminders.ts              ← Gemini text → reminder draft
   ├─ lib/whatsapp/*                         ← provider interface (Cloud API | demo)
   ▼
Supabase (Postgres + RLS + RPCs, Storage, Auth)
```

Money is stored and computed as integer paise end to end — see
`lib/accounting/money.ts`. The accounting engine is a pure TypeScript module
with no database dependency, which is what makes it unit-testable without a
live Postgres instance (see `lib/accounting/ledger.test.ts`).

## Database

Schema, RLS policies, and RPC functions live in `supabase/migrations/`:

- `0001_init.sql` — businesses, business_members, customers, ledger_documents,
  transactions, transaction_line_items, reminders, reminder_delivery_attempts,
  activity_events, webhook_events, plus `create_business_with_owner`,
  `confirm_ledger_transactions`, `record_payment`, `void_transaction`.
- `0002_storage.sql` — the private `ledger-documents` storage bucket.

Every business-owned table has RLS enabled, scoped by `business_members`.
Transactions are never deleted — corrections go through `void_transaction`,
which marks a row voided with a required reason and keeps it in the audit
trail. See the comments at the top of `0001_init.sql` for the full design
rationale, including why some writes go through SECURITY DEFINER RPCs
instead of direct table policies.

## Running locally

```bash
npm install
cp .env.example .env.local   # at minimum, fill in the Supabase values
npm run dev
```

## Tests

```bash
npm test
```

## What's real vs. what needs your credentials

| Capability | Status |
|---|---|
| Auth, business isolation, RLS | Real — schema + RLS + RPCs tested against a real local Postgres instance (see final report delivered in chat for exactly what that covered) |
| Accounting (FIFO aging, partial/overpayments, cash vs. credit) | Real, pure-function, unit-tested (`npm test`) |
| Ledger photo upload & storage | Real (Supabase Storage, private bucket) |
| Ledger AI extraction | Real when `GEMINI_API_KEY` is set; otherwise falls back to manual entry, labelled as such |
| Reminder AI drafting | Real when `GEMINI_API_KEY` is set; otherwise a template fallback, never presented as AI-generated |
| WhatsApp sending | Real via Meta Cloud API when configured; otherwise demo mode, recorded as `provider: 'demo'` and never claimed as delivered |
| Delivery status | Only ever reported from the verified webhook — an accepted send is never presented as "delivered" |

No feature in this app claims to be live or AI-generated when it isn't —
`GET /api/config-status` and the in-UI badges reflect actual configuration.
