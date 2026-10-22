# HisaabAI — Prototype

AI-powered bookkeeping and payment follow-up assistant for small Indian wholesale
businesses. This is a demo-ready prototype, not a production app — see
**What's simulated** below.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Data lives in `localStorage` (key `hisaabai-demo-store`); refreshing keeps your
changes. To reset the demo to its original seed state, clear site data for
`localhost:3000` (or open the browser's dev tools → Application → Local
Storage → delete the `hisaabai-demo-store` key) and reload.

## What's real vs. simulated

**Real / fully functional:**
- All navigation, search, filters, and the Customer detail panel.
- The financial model: every balance, KPI, and status badge is computed live
  from the transaction list (`lib/utils.ts` → `computeCustomerStats`), not
  hardcoded. Adding a transaction immediately recalculates balances, overdue
  status, and every dashboard figure.
- The ledger-upload review table: customer-name matching (exact / partial /
  ambiguous / new-customer detection) runs for real against the live
  customer list.
- Reminder editing, selection, approval, skip, and the guardrails (no
  reminder for a zero-balance customer, no duplicate reminder per customer,
  no send within 24h of a recorded payment).
- `localStorage` persistence across refreshes.

**Simulated (clearly labelled in the UI):**
- **OCR / ledger extraction** — no image is actually read. Uploading a photo
  or clicking "Try demo ledger" populates a fixed, editable mock dataset
  after a short artificial delay. The modal says this explicitly.
- **AI reminder drafting** — messages come from a template function
  (`lib/reminderTemplates.ts`) that varies tone by days-overdue, not a live
  LLM call.
- **Sending** — "Confirm send" marks a reminder `Sent` in local state only;
  no message is actually delivered. The "Open in WhatsApp" button does build
  a real `wa.me` deep link, but the phone numbers are fictional.

**Illustrative constants:** the Overview page's business-scale headline
figures (today's sales breakdown, total/overdue outstanding, 24 customers)
were used to author the seed dataset in `lib/seedData.ts` so that they are
also fully derived from real seeded transactions — see the comment block at
the top of that file for exactly how each figure is constructed.

No API keys, database, or external services are required.
