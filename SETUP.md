# Avenor — Setup Guide

## 1. Supabase (required — the app will not run without this)

1. Create a project at https://supabase.com/dashboard.
2. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — it
     bypasses every authorization check in the app)
3. Run the migrations against your project:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

   This applies `supabase/migrations/0001_init.sql` (schema, RLS policies,
   RPC functions) and `0002_storage.sql` (the private `ledger-documents`
   storage bucket and its access policies), in order.

   If you don't want to install the Supabase CLI, you can instead paste the
   contents of both files, in order, into the Supabase dashboard's SQL
   Editor and run them.

4. In **Authentication → Providers**, email/password sign-up is enabled by
   default — no further config needed for the MVP's auth flow.
5. (Optional) In **Authentication → URL Configuration**, set the Site URL
   and add `/auth/callback` as a redirect URL once you have a deployed
   domain, so email confirmation links work in production.

**What was actually tested:** the full schema, every RLS policy, and all
four RPC functions (`create_business_with_owner`, `confirm_ledger_transactions`,
`record_payment`, `void_transaction`) were run against a real local Postgres
instance with a hand-built stand-in for Supabase's `auth`/`storage` schemas —
including a genuine cross-tenant isolation test (a second business's owner
could not read or write the first business's data) and idempotency tests
(retried requests do not create duplicate rows). This is not the same as
testing against a live Supabase project; see the final report for exactly
what that local testing covered and what it couldn't (real PostgREST/GoTrue
behavior, real Storage API, real HTTP auth).

## 2. Google Gemini (optional — ledger extraction & AI reminder drafting)

1. Get a free-tier API key at https://aistudio.google.com/apikey.
2. Set `GEMINI_API_KEY`.
3. **Know the tradeoff first**: Gemini's free tier lets Google use your
   prompts/responses (here: photographed ledger pages with real customer
   names and amounts) to improve their products. The paid tier doesn't. The
   app works identically either way — this is a decision about where your
   business data goes, not a configuration detail.
4. Without it: uploading a ledger photo still works (it's stored), but
   extraction returns "not configured" and the owner enters transactions
   manually instead — the UI says so explicitly. Reminder drafting falls
   back to a deterministic template instead of calling Gemini, and the
   drafted reminder is never presented as AI-generated in that case.

## 3. Meta WhatsApp Business Platform Cloud API (optional — real sending)

1. Create a Meta App at https://developers.facebook.com/apps/ and add the
   **WhatsApp** product.
2. From the WhatsApp → API Setup page, grab:
   - A temporary (or permanent, via a System User) access token →
     `WHATSAPP_ACCESS_TOKEN`
   - The test/production phone number's ID → `WHATSAPP_PHONE_NUMBER_ID`
   - The WhatsApp Business Account ID → `WHATSAPP_BUSINESS_ACCOUNT_ID`
3. Pick a webhook verify token yourself (any random string) →
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. In the Meta App dashboard, under
   WhatsApp → Configuration, set the webhook URL to
   `https://<your-domain>/api/webhooks/whatsapp` and the verify token to the
   same value, then subscribe to the `messages` field (this is what delivers
   delivery/read/failed status updates).
4. Under App Settings → Basic, copy the **App Secret** →
   `WHATSAPP_APP_SECRET` (used to verify webhook signatures — without it the
   webhook handler refuses all incoming events rather than trusting
   unverified ones).
5. **Message templates**: Meta only allows free-form text messages within a
   24-hour window after the customer messages you first. A payment reminder
   is business-initiated, so for reliable delivery you need an **approved
   message template** (WhatsApp Manager → Message Templates). Create one
   with a single body variable, e.g.:

   > Namaste {{1}}

   and set `WHATSAPP_REMINDER_TEMPLATE_NAME` to its name once approved
   (approval can take from minutes to a day). Without a template configured,
   reminders send as plain session messages, which will fail outside an
   active customer-initiated window — this is a Meta platform rule, not a
   limitation of this code.
6. Without any of this configured, sending stays in **demo mode**: reminders
   can be fully drafted, edited, approved, and "sent," but every send is
   simulated and recorded as `provider: 'demo'` in the database — it is never
   presented as a real delivery.

## 4. Local development

```bash
npm install
cp .env.example .env.local   # fill in at least the Supabase values
npm run dev
```

Open http://localhost:3000, sign up, confirm your email (check Supabase
Auth logs if using a test project with no real email delivery), then create
your business on the onboarding screen.

## 5. Running tests

```bash
npm test
```

Runs the Vitest suite covering the deterministic accounting engine (FIFO
aging, partial payments, overpayments, cash vs. credit vs. payment
semantics), the reminder eligibility/guardrail rules (zero balance, 24h
payment suppression, duplicate-cycle suppression, review-flag suppression),
customer name matching, and idempotency-key generation — all pure functions,
no database required. See the final report for what additionally needs a
live Supabase project to exercise (RLS over real HTTP, Storage, real auth).

## 6. Deployment (Vercel)

1. Push this repo to GitHub (already done if you're reading this from the
   repo) and import it in Vercel.
2. Add every variable from `.env.example` in Vercel's Project Settings →
   Environment Variables, for Production (and Preview/Development as
   needed) — use **separate Supabase projects and separate WhatsApp/Gemini
   credentials for production vs. any preview/staging environment** so a
   bug in a preview deploy can never touch real customer data or send real
   messages.
3. Deploy. Vercel builds with `next build`, matching what was run locally
   during development.
4. Run the Supabase migrations against your production project the same way
   as step 1 above, pointed at the production project ref.
5. Point the Meta WhatsApp webhook at your production domain once it's live.

## 7. Health & logs

- `GET /api/config-status` reports, without leaking secrets, whether Gemini
  and WhatsApp are configured — use this to confirm a deployment's
  integration status at a glance.
- Server errors are logged with `console.error` and returned to the client
  as a generic "Something went wrong" message (see
  `lib/server/apiHelpers.ts`) — check your hosting provider's function logs
  for the real error; the client response deliberately never includes stack
  traces, connection strings, or key material.
