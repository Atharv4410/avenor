import Link from "next/link";
import { Receipt, Users, Clock, MessageCircleMore, Camera, Sparkles, CheckCircle2 } from "lucide-react";
import Reveal from "@/components/marketing/Reveal";

export default function MarketingHomePage() {
  return (
    <div className="bg-white text-ink">
      <nav className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-white shadow-sm">
              <Receipt size={16} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-ink">Avenor</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="#how-it-works"
              className="group relative hidden text-sm font-medium text-ink-muted transition-colors hover:text-ink sm:inline-block"
            >
              How it works
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-ink transition-all duration-300 group-hover:w-full" />
            </a>
            <Link href="/login" className="btn-primary">
              Try product
            </Link>
          </div>
        </div>
      </nav>

      <header className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[3px] text-accent-600">
              AI bookkeeping for wholesale businesses
            </p>
            <h1 className="mt-4 text-5xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Know your numbers.
              <br />
              Move your business.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-muted">
              Avenor turns a photographed handwritten ledger into structured transactions, computes
              real balances instantly, and drafts WhatsApp payment reminders &mdash; so closing time
              doesn&apos;t take three hours anymore.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn-primary !px-6 !py-3 text-base">
                Try product
              </Link>
            </div>
            <p className="mt-6 text-sm text-ink-faint">
              Built on Google Gemini &middot; Meta WhatsApp Cloud API &middot; Postgres with row-level
              security
            </p>
          </div>

          <Reveal delayMs={100}>
            <HeroIllustration />
          </Reveal>
        </div>
      </header>

      <section id="how-it-works" className="border-t border-line bg-paper px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[3px] text-accent-600">
              How it works
            </p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              From ledger photo to paid in full.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {[
              {
                icon: Camera,
                step: "Step 1",
                title: "Photograph the ledger",
                body: "Snap a photo of today's handwritten entries, or let a customer's WhatsApp message start the thread.",
              },
              {
                icon: Sparkles,
                step: "Step 2",
                title: "AI reads, you stay in control",
                body: "Gemini extracts the entries; a deterministic engine computes the real balance. AI never touches the math.",
              },
              {
                icon: CheckCircle2,
                step: "Step 3",
                title: "Approve, then it's done",
                body: "A WhatsApp reminder or reply is drafted for you. Nothing sends until you approve it.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delayMs={i * 100}>
                <div className="border-t-2 border-ink pt-6 transition-transform duration-300 hover:-translate-y-1">
                  <item.icon size={22} className="text-accent-600" />
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[2px] text-ink-faint">
                    {item.step}
                  </p>
                  <h3 className="mt-3 text-2xl font-bold text-ink">{item.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-ink-muted">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink px-6 py-24 text-white">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[3px] text-accent-300">
              The real cost
            </p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Three hours, every single night.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-2xl border border-white/15 bg-white/[0.04] p-10 transition-colors duration-300 hover:bg-white/[0.06]">
                <p className="text-sm text-white/60">Reconciling by hand</p>
                <p className="mt-4 text-3xl font-bold text-white/40 line-through">~90 hrs / month</p>
                <p className="mt-4 text-base leading-relaxed text-white/70">
                  Checking cash sales, credit given, and who paid &mdash; one wholesaler&apos;s own
                  nightly account.
                </p>
              </div>
            </Reveal>
            <Reveal delayMs={100}>
              <div className="h-full rounded-2xl bg-white p-10 shadow-pop transition-transform duration-300 hover:-translate-y-1">
                <p className="text-sm text-ink-muted">With Avenor</p>
                <p className="mt-4 text-3xl font-bold text-brand-600">Minutes, not hours</p>
                <p className="mt-4 text-base leading-relaxed text-ink-muted">
                  Balances update instantly. You just review the draft reminder and approve the send.
                </p>
                <Link href="/login" className="btn-primary mt-6 inline-flex">
                  Try product
                </Link>
              </div>
            </Reveal>
          </div>
          <p className="mt-6 text-sm text-white/40">
            Based on an owner&apos;s own account, r/Indian_Business
          </p>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              Built around how you actually run your shop.
            </h2>
          </Reveal>

          <div className="mt-12 divide-y divide-line border-t border-line">
            {[
              {
                icon: Users,
                title: "You sell on credit (udhaar)",
                body: "Track who owes what without a notebook that can quietly be changed while you're not looking.",
              },
              {
                icon: Clock,
                title: "Evenings are already busy",
                body: "Review and approve in minutes instead of reconciling for hours after close.",
              },
              {
                icon: MessageCircleMore,
                title: "You already message customers on WhatsApp",
                body: "Reminders and replies go out exactly where your customers already are.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delayMs={i * 80}>
                <div className="group -mx-4 flex flex-col gap-4 rounded-xl px-4 py-8 transition-colors duration-200 hover:bg-paper/60 sm:flex-row sm:items-center sm:gap-8">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-paper transition-transform duration-300 group-hover:scale-110">
                    <item.icon size={20} className="text-accent-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-ink">{item.title}</h3>
                    <p className="mt-1 max-w-2xl text-base leading-relaxed text-ink-muted">
                      {item.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <Reveal>
          <div
            className="mx-auto max-w-6xl rounded-3xl border border-line p-14 text-center sm:p-20"
            style={{
              backgroundColor: "#F7F8FA",
              backgroundImage: "radial-gradient(#E3E6EB 1.5px, transparent 1.5px)",
              backgroundSize: "20px 20px",
            }}
          >
            <h2 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              Ready to get your evenings back?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-ink-muted">
              Sign in and upload your first ledger photo in the next five minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/login" className="btn-primary !px-6 !py-3 text-base">
                Try product
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-line bg-paper px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-600 text-white">
                <Receipt size={14} />
              </div>
              <span className="font-semibold text-ink">Avenor</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-ink-muted">
              Know your numbers. Move your business.
            </p>
          </div>
          <FooterColumn
            title="Product"
            links={[
              { label: "Overview", href: "/dashboard" },
              { label: "Customers", href: "/customers" },
              { label: "Ledger", href: "/ledger" },
              { label: "Reminders", href: "/reminders" },
            ]}
          />
          <FooterColumn
            title="Account"
            links={[
              { label: "Sign in", href: "/login" },
              { label: "Create account", href: "/signup" },
            ]}
          />
          <div>
            <p className="text-sm font-semibold text-ink">Built with</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li>Google Gemini</li>
              <li>Meta WhatsApp Cloud API</li>
              <li>Supabase (Postgres + RLS)</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-ink-muted transition-colors hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeroIllustration() {
  return (
    <svg viewBox="0 0 480 420" className="mx-auto w-full max-w-md animate-float" role="img" aria-label="A ledger page with a verified checkmark beside a WhatsApp reminder message">
      <rect x="40" y="40" width="260" height="340" rx="16" fill="#FFFFFF" stroke="#E3E6EB" strokeWidth="2" />
      <rect x="68" y="76" width="140" height="14" rx="4" fill="#15171E" opacity="0.08" />
      {[128, 160, 192, 224, 256, 288].map((y) => (
        <rect key={y} x="68" y={y} width="204" height="10" rx="3" fill="#E3E6EB" />
      ))}
      <circle cx="252" cy="76" r="22" fill="#EEF5EE" />
      <path d="M242 76l7 7 13-14" stroke="#2F6731" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="220" y="150" width="220" height="230" rx="24" fill="#15171E" />
      <rect x="236" y="166" width="188" height="198" rx="16" fill="#F7F8FA" />
      <rect x="252" y="196" width="156" height="60" rx="14" fill="#3E8240" />
      <rect x="266" y="208" width="100" height="8" rx="3" fill="#FFFFFF" opacity="0.85" />
      <rect x="266" y="224" width="128" height="8" rx="3" fill="#FFFFFF" opacity="0.85" />
      <rect x="266" y="240" width="72" height="8" rx="3" fill="#FFFFFF" opacity="0.65" />
      <rect x="252" y="272" width="120" height="34" rx="10" fill="#FFFFFF" stroke="#E3E6EB" strokeWidth="2" />
      <rect x="264" y="283" width="60" height="10" rx="3" fill="#4C63DD" />
    </svg>
  );
}
