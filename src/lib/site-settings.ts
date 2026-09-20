import { createClient } from "@/lib/supabase/client";

export interface SiteSettings {
  id: number;
  banner_url: string | null;
  banner_urls: string[] | null;
  logo_url: string | null;
  subtitle: string | null;
  tagline: string | null;
  booking_label: string | null;
  status_label: string | null;
  wa_label: string | null;
  wa_number: string | null;
  website_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  footer_text: string | null;
  city_text: string | null;
  transport_fee: number | null;
  vendor_fee: number | null;
  theme_fanpage: string | null;
  theme_admin: string | null;
  updated_at: string;
}

export const DEFAULT_SETTINGS: Omit<SiteSettings, "id" | "updated_at"> = {
  banner_url: null,
  banner_urls: null,
  logo_url: null,
  subtitle: "Photography & Videography",
  tagline: "tell us your story journey",
  booking_label: "Booking Online",
  status_label: "Cek Status Edit & Cetak Foto",
  wa_label: "WhatsApp Admin",
  wa_number: "6281234567890",
  website_url: "https://mstory.id",
  instagram_url: "https://instagram.com/mstory.id",
  tiktok_url: "https://tiktok.com/@mstory.id",
  facebook_url: "https://facebook.com/mstory.id",
  youtube_url: "https://youtube.com/@mstory.id",
  footer_text: "Photography & Videography",
  city_text: "Tasikmalaya",
  transport_fee: 250000,
  vendor_fee: 200000,
  theme_fanpage: "CLASSIC",
  theme_admin: "CLASSIC",
};

export const FANSPAGE_BUCKET = "fanspage";
export const BANNER_FOLDER = "banners";
export const LOGO_FOLDER = "logos";
export const GALLERY_FOLDER = "gallery";

const TTL_MS = 60 * 1000;

let cached: { data: SiteSettings; expiresAt: number } | null = null;
let inflight: Promise<SiteSettings> | null = null;

async function fetchSiteSettings(): Promise<SiteSettings> {
  const supabase = createClient();
  if (!supabase) {
    return { id: 1, ...DEFAULT_SETTINGS, updated_at: new Date().toISOString() };
  }

  const { data, error } = await supabase.from("linktree_settings").select("*").maybeSingle();

  if (error) {
    console.error("Gagal mengambil pengaturan:", error.message);
    return { id: 1, ...DEFAULT_SETTINGS, updated_at: new Date().toISOString() };
  }

  return { id: 1, ...DEFAULT_SETTINGS, ...(data ?? {}), updated_at: data?.updated_at ?? new Date().toISOString() };
}

export function getSiteSettings(): Promise<SiteSettings> {
  const cachedData = peekSiteSettings();
  if (cachedData) {
    return Promise.resolve(cachedData);
  }

  if (!inflight) {
    inflight = fetchSiteSettings()
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

export function peekSiteSettings(): SiteSettings | null {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  return null;
}

export function clearSiteSettingsCache() {
  cached = null;
  inflight = null;
}

export async function updateSiteSettings(
  patch: Partial<Omit<SiteSettings, "id" | "updated_at">>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  if (!supabase) {
    return { ok: false, error: "Supabase tidak dikonfigurasi." };
  }

  const { error } = await supabase
    .from("linktree_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) {
    return { ok: false, error: error.message };
  }
  clearSiteSettingsCache();
  return { ok: true };
}

export function getStoredPublicUrl(bucketPath: string | null | undefined): string | null {
  if (!bucketPath) return null;
  if (/^(https?:)?\/\//.test(bucketPath)) return bucketPath;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return `${url}/storage/v1/object/public/${bucketPath}`;
}

export function makeStoragePath(
  kind: "banner" | "logo",
  _fileName: string,
  slot?: number,
): string {
  if (kind === "banner") {
    const n = typeof slot === "number" && slot > 0 && slot <= 3 ? slot : 1;
    return `${BANNER_FOLDER}/${n}.webp`;
  }
  return `${LOGO_FOLDER}/logo.webp`;
}

export function parseObjectPosition(
  url: string | null | undefined,
  fallbackX = 50,
  fallbackY = 50,
): { x: number; y: number } {
  if (!url) return { x: fallbackX, y: fallbackY };
  try {
    const u = new URL(url);
    const x = Number(u.searchParams.get("x"));
    const y = Number(u.searchParams.get("y"));
    return {
      x: Number.isFinite(x) && x >= 0 && x <= 100 ? x : fallbackX,
      y: Number.isFinite(y) && y >= 0 && y <= 100 ? y : fallbackY,
    };
  } catch {
    return { x: fallbackX, y: fallbackY };
  }
}

export function withPosition(
  url: string | null | undefined,
  x: number,
  y: number,
): string {
  if (!url) return "";
  const base = url.split("?")[0];
  return `${base}?v=${Date.now()}&x=${Math.round(Math.max(0, Math.min(100, x)))}&y=${Math.round(Math.max(0, Math.min(100, y)))}`;
}