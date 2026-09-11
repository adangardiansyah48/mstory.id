"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase belum dikonfigurasi. Isi .env.local terlebih dahulu.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-x-hidden bg-[var(--bg)] px-5">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#EADFD0]/40 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-[#E4D9C8]/45 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#EFE6D8]/50 blur-3xl" />
      </div>

      <div className="glass-strong relative z-10 w-full max-w-sm rounded-[2rem] p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand)]/15">
            <Lock className="h-7 w-7 text-[var(--muted-2)]" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-semibold text-[var(--ink)]">
            Admin Mstory.id
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Masuk untuk mengelola booking dan pesanan
          </p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <Input
            type="email"
            label="Email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && (
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Masuk
          </Button>
        </form>
      </div>
    </div>
  );
}