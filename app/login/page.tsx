"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Receipt, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(searchParams.get("next") || "/");
    router.refresh();
  }

  return (
    <div className="card w-full max-w-sm animate-fade-in-up p-8">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-600 text-white shadow-sm">
          <Receipt size={18} />
        </div>
        <span className="text-xl font-semibold text-ink">Avenor</span>
      </div>
      <h1 className="mt-6 text-lg font-semibold text-ink">Sign in</h1>
      <p className="text-sm text-ink-muted">Welcome back — enter your details below.</p>

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
            className="input mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading && <Loader2 className="animate-spin" size={16} />}
          Sign in
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-muted">
        New to Avenor?{" "}
        <Link href="/signup" className="font-medium text-accent-600 hover:text-accent-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
