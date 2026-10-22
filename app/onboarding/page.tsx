"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("create_business_with_owner", {
      p_name: name,
      p_city: city,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Receipt size={18} />
          </div>
          <span className="text-xl font-semibold text-ink">Avenor</span>
        </div>
        <h1 className="mt-6 text-lg font-semibold text-ink">Set up your business</h1>
        <p className="text-sm text-ink-muted">
          A couple of details and you&apos;re ready to start uploading your ledger.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-ink-muted">Business name</label>
            <input
              required
              className="input mt-1"
              placeholder="e.g. Shree Balaji Spices & Dry Fruits"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">City</label>
            <input className="input mt-1" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <button type="submit" disabled={loading || !name.trim()} className="btn-primary w-full">
            {loading && <Loader2 className="animate-spin" size={16} />}
            Create business
          </button>
        </form>
      </div>
    </div>
  );
}
