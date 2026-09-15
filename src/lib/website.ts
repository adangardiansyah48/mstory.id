import { createClient } from "@/lib/supabase/client";
import { getSiteSettings as getBaseSiteSettings, getStoredPublicUrl, FANSPAGE_BUCKET } from "./site-settings";

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

  if (catRes.error || subRes.error || pkgRes.error) throw new Error("Gagal load data paket");

  return {
    categories: catRes.data ?? [],
    subCategories: subRes.data ?? [],
    packages: pkgRes.data ?? [],
  };
}

/**
 * Daftar gambar galeri dari storage bucket fanspage/gallery
 */
export async function getGalleryImages(): Promise<{ id: string; name: string; url: string }[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.storage.from(FANSPAGE_BUCKET).list("gallery");
  if (error) return [];
  return (data ?? []).map((item) => ({
    id: item.id ?? Math.random().toString(),
    name: item.name,
    url: getStoredPublicUrl(`${FANSPAGE_BUCKET}/gallery/${item.name}`) || "",
  }));
}

/**
 * Kompress gambar menggunakan canvas lalu unggah ke Supabase Storage
 */
export async function compressAndUploadImage(
  file: File,
  bucket: string,
  folder: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/webp",
              });
              const supabase = createClient();
              if (!supabase) {
                resolve(null);
                return;
              }
              const ext = file.name.split(".").pop() ?? "webp";
              const timestamp = Date.now();
              const fileName = `${folder}/${timestamp}_${Math.random()
                .toString(36)
                .substring(2, 8)}.${ext}`;
              const path = fileName;

              (async () => {
                try {
                  const { error: upErr } = await supabase.storage
                    .from(bucket)
                    .upload(path, compressedFile, {
                      upsert: true,
                      cacheControl: "3600",
                    });
                  if (upErr) {
                    resolve(null);
                    return;
                  }
                  const { data } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(path);
                  resolve(data.publicUrl);
                } catch {
                  resolve(null);
                }
              })();
            } else resolve(null);
          },
          "image/webp",
          0.8
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}