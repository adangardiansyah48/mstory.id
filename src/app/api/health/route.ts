import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Endpoint ringan untuk memverifikasi koneksi database di environment
 * (lokal / Vercel). Tidak menampilkan nilai rahasia env.
 */
export async function GET() {
  const dbDirect = Boolean(process.env.SUPABASE_DB_PASSWORD);
  let db: { ok: boolean; rows?: number; error?: string } = { ok: false };

  if (dbDirect) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("linktree_settings")
        .select("id")
        .maybeSingle();
      db = error
        ? { ok: false, error: error.message }
        : { ok: true, rows: data ? 1 : 0 };
    } catch (e) {
      db = { ok: false, error: e instanceof Error ? e.message : "unknown error" };
    }
  }

  return NextResponse.json({
    app: "mstory.id",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "missing",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "configured" : "missing",
    dbDirect,
    db,
  });
}
