import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { executeLocally } from "@/lib/db/executor-server";
import { wrapClient } from "@/lib/db/shim";

const SUPERADMIN_EMAIL = "superadmin@mstory.id";

export function getSuperAdminEmail() {
  return SUPERADMIN_EMAIL;
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  const real = createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  if (!process.env.SUPABASE_DB_PASSWORD) return real;
  return wrapClient(real, executeLocally);
}

export function isHiddenSuperAdmin(email: string | null | undefined) {
  return email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
}
