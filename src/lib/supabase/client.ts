import { createBrowserClient } from "@supabase/ssr";

/**
 * Create the Supabase browser client. Returns null until the project's
 * environment variables (`NEXT_PUBLIC_SUPABASE_URL` and
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are configured in `.env.local`, so the
 * public site still renders during setup.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createBrowserClient(url, anonKey);
}