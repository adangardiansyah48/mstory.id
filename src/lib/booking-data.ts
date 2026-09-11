import { createClient } from "@/lib/supabase/client";
import type { Addon, Category, Package, SubCategory } from "@/lib/types";

export interface BookingData {
  categories: Category[];
  subCategories: SubCategory[];
  packages: Package[];
  addons: Addon[];
  bookedCounts: Record<string, number>;
}

const TTL_MS = 10 * 60 * 1000;

let cached: { data: BookingData; expiresAt: number } | null = null;
let inflight: Promise<BookingData> | null = null;

async function fetchBookingData(): Promise<BookingData> {
  const supabase = createClient();
  if (!supabase) {
    return { categories: [], subCategories: [], packages: [], addons: [], bookedCounts: {} };
  }

  const [catRes, subRes, pkgRes, addonRes, bookingRes] = await Promise.all([
    supabase.from("categories").select("*").order("id"),
    supabase.from("sub_categories").select("*").order("id"),
    supabase.from("packages").select("*").eq("is_active", true).order("id"),
    supabase.from("addons").select("*").eq("is_active", true).order("id"),
    supabase
      .from("bookings")
      .select("event_date, status")
      .neq("status", "CANCELLED")
      .order("event_date"),
  ]);

  if (catRes.error) throw catRes.error;
  if (subRes.error) throw subRes.error;
  if (pkgRes.error) throw pkgRes.error;
  if (addonRes.error) throw addonRes.error;

  const bookedCounts: Record<string, number> = {};
  for (const booking of bookingRes.data ?? []) {
    const dateKey = new Date(booking.event_date).toISOString().slice(0, 10);
    bookedCounts[dateKey] = (bookedCounts[dateKey] ?? 0) + 1;
  }

  return {
    categories: catRes.data ?? [],
    subCategories: subRes.data ?? [],
    packages: pkgRes.data ?? [],
    addons: addonRes.data ?? [],
    bookedCounts,
  };
}

export function getBookingData(): Promise<BookingData> {
  const cachedData = peekBookingData();
  if (cachedData) {
    return Promise.resolve(cachedData);
  }

  if (!inflight) {
    inflight = fetchBookingData()
      .then((data) => {
        cached = { data, expiresAt: Date.now() + TTL_MS };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}

export function peekBookingData(): BookingData | null {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  return null;
}

export function clearBookingDataCache() {
  cached = null;
  inflight = null;
}