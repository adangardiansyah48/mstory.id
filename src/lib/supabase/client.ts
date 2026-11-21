import { createBrowserClient } from "@supabase/ssr";
import { executeViaApi } from "@/lib/db/executor-client";
import { wrapClient } from "@/lib/db/shim";

/**
 * Klien Supabase untuk browser.
 *
 * Auth & Storage tetap memakai Supabase asli. Query tabel (`from`) dan `rpc`
 * dialihkan ke API route `/api/db` yang terhubung langsung ke Postgres via
 * Supavisor — karena Data API/PostgREST project sedang bermasalah (PGRST002).
 *
 * Mengembalikan null sampai env Supabase diisi agar halaman publik tetap
 * bisa dirender saat setup.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const real = createBrowserClient(url, anonKey);
  return wrapClient(real, executeViaApi);
}
