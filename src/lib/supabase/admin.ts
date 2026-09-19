import { createClient } from "@supabase/supabase-js";

const SUPERADMIN_EMAIL = "superadmin@mstory.id";

export function getSuperAdminEmail() {
  return SUPERADMIN_EMAIL;
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isHiddenSuperAdmin(email: string | null | undefined) {
  return email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
}
