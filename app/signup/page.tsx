"use client";

import { useState } from "react";
import Link from "next/link";
import { Receipt, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <div className="card w-full max-w-sm p-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <MailCheck size={20} />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-ink">Check your email</h1>
          <p className="mt-1 text-sm text-ink-muted">
            We sent a confirmation link to <strong>{email}</strong>. Click it to finish creating
            your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Receipt size={18} />
          </div>
          <span className="text-xl font-semibold text-ink">Avenor</span>
        </div>
        <h1 className="mt-6 text-lg font-semibold text-ink">Create your account</h1>
        <p className="text-sm text-ink-muted">You&apos;ll set up your business next.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-ink-muted">Email</label>
            <input
              type="email"
              required
              className="input mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="input mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-ink-faint">At least 8 characters.</p>
          </div>
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 className="animate-spin" size={16} />}
            Create account
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
