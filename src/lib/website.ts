import { createClient } from "@/lib/supabase/client";
import { getSiteSettings as getBaseSiteSettings, getStoredPublicUrl, WEBSITE_BUCKET } from "./site-settings";

export interface Package {
  id: number;
  sub_category_id: number;
  name: string;
  price: number;
  duration_hours?: number | null;
  crew_info?: string | null;
  inclusions: string;
  dp_value: number;
  is_active?: boolean;
}

export interface PackageSubCategory {
  id: number;
  category_id: number;
  name: string;
}
export interface PackageCategory {
  id: number;
  name: string;
}

export interface WebsiteSettings {
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
  theme_fanpage: string | null;
  theme_admin: string | null;
  updated_at: string;
}

/**
 * Ambil pengaturan fanspage (website)
 */
export async function getWebsiteSettings(): Promise<WebsiteSettings> {
  const base = await getBaseSiteSettings();
  return base as WebsiteSettings;
}

/**
 * Ambil semua paket + kategori + subkategori
 */
export async function getPackages(): Promise<{
  categories: PackageCategory[];
  subCategories: PackageSubCategory[];
  packages: Package[];
}> {
  const supabase = createClient();
  if (!supabase) return { categories: [], subCategories: [], packages: [] };
  const [catRes, subRes, pkgRes] = await Promise.all([
    supabase.from("categories").select("*").order("id"),
    supabase.from("sub_categories").select("*").order("id"),
    supabase.from("packages").select("*").eq("is_active", true).order("id"),
  ]);

  if (catRes.error || subRes.error || pkgRes.error) {
    console.error("Gagal load data paket", catRes.error ?? subRes.error ?? pkgRes.error);
    return { categories: [], subCategories: [], packages: [] };
  }

  return {
    categories: catRes.data ?? [],
    subCategories: subRes.data ?? [],
    packages: pkgRes.data ?? [],
  };
}

/**
 * Daftar gambar galeri dari storage bucket website/gallery
 */
export async function getGalleryImages(): Promise<{ id: string; name: string; url: string }[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.storage.from(WEBSITE_BUCKET).list("gallery");
  if (error) return [];
  return (data ?? []).map((item) => ({
    id: item.id ?? Math.random().toString(),
    name: item.name,
    url: getStoredPublicUrl(`${WEBSITE_BUCKET}/gallery/${item.name}`) || "",
  }));
}

/**
 * Kompress gambar (WebP, maxBytes kecil, tetap jelas) lalu unggah ke bucket.
 * Folder yang benar: website/HERO | INFO | GALLERY — bukan di root.
 */
export async function compressAndUploadImage(
  file: File,
  bucket: string,
  folder: string
): Promise<string | null> {
  const { compressImage, getWebsiteCompressOpts } = await import("@/lib/image-compress");
  const opts = bucket === WEBSITE_BUCKET
    ? getWebsiteCompressOpts(folder)
    : { maxWidth: 1600, maxHeight: 1200, quality: 0.7, maxBytes: 240 * 1024 };
  let payload: File;
  try {
    payload = await compressImage(file, opts);
  } catch {
    return null;
  }
  const supabase = createClient();
  if (!supabase) return null;
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 6);
  const base = payload.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 40) || "img";
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  const path = `${cleanFolder}/${timestamp}_${rand}_${base}.webp`;
  try {
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, payload, {
      upsert: true,
      cacheControl: "31536000",
      contentType: "image/webp",
    });
    if (upErr) {
      console.error("Storage upload error:", upErr);
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error("Upload exception:", err);
    return null;
  }
}