import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { executeLocally } from "@/lib/db/executor-server";
import { wrapClient } from "@/lib/db/shim";

export async function createClient() {
  const cookieStore = await cookies();

  const real = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Dipanggil dari Server Component; sesi diperbarui middleware.
          }
        },
      },
    },
  );

  // Pakai koneksi Postgres langsung hanya jika kredensial tersedia.
  // Jika tidak, tetap pakai klien Supabase apa adanya (perilaku lama).
  if (!process.env.SUPABASE_DB_PASSWORD) return real;
  return wrapClient(real, executeLocally);
}
