import { createClient } from "@/lib/supabase/client";
import { FANSPAGE_BUCKET, WEBSITE_BUCKET, getStoredPublicUrl } from "@/lib/site-settings";
import { compressAndUploadImage, getGalleryImages } from "@/lib/website";

export const WEBSITE = {
  HERO_FOLDER: "hero",
  INFO_FOLDER: "info",
  GALLERY_FOLDER: "gallery",
  ALBUM_COVER: "albums/covers",
  ALBUM_PHOTOS: "albums/photos",
} as const;

export interface WebsiteSettingsRow {
  id: number;
  site_name: string | null;
  logo_url: string | null;
  hero_slides: string[] | null;
  hero_duration_ms: number | null;
  intro_heading: string | null;
  intro_text: string | null;
  info_heading: string | null;
  info_text: string | null;
  info_image: string | null;
  info_button_label: string | null;
  instagram_handle: string | null;
  instagram_url: string | null;
  instagram_grid_count: number | null;
  contact_heading: string | null;
  contact_text: string | null;
  wa_number: string | null;
  wa_button_label: string | null;
  booking_label: string | null;
  booking_url: string | null;
  footer_copyright: string | null;
  updated_at: string;
}

export interface WebsiteGalleryRow {
  id: number;
  title: string;
  subtitle: string;
  image_path: string;
  link_url: string | null;
  category_id?: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebsiteAlbumRow {
  id: number;
  title: string;
  couple_name: string;
  category_id: number | null;
  cover_image_path: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WebsiteAlbumPhotoRow {
  id: number;
  album_id: number;
  image_path: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface WebsiteAlbumItem {
  id: number;
  title: string;
  couple_name: string;
  category_id: number | null;
  cover_image_url: string;
  is_active: boolean;
  sort_order: number;
  photos: WebsiteAlbumPhotoRow[];
}

export interface WebsiteResolvedSettings {
  site_name: string;
  logo_url: string | null;
  hero_slides: string[];
  hero_duration_ms: number;
  intro_heading: string;
  intro_text: string;
  info_heading: string;
  info_text: string;
  info_image: string | null;
  info_button_label: string;
  instagram_handle: string;
  instagram_url: string;
  instagram_grid_count: number;
  contact_heading: string;
  contact_text: string;
  wa_number: string;
  wa_button_label: string;
  booking_label: string;
  booking_url: string;
  footer_copyright: string;
  updated_at: string;
}

export interface WebsiteGalleryItem {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string | null;
  category_id?: number | null;
  sort_order: number;
  is_active: boolean;
}

export interface WebsiteContent {
  settings: WebsiteResolvedSettings;
  gallery: WebsiteGalleryItem[];
  albums: WebsiteAlbumItem[];
}

export const WEBSITE_DEFAULTS: Omit<WebsiteResolvedSettings, "updated_at"> = {
  site_name: "Mstory.id",
  logo_url: null,
  hero_slides: [],
  hero_duration_ms: 3800,
  intro_heading: "Halo, kami Mstory.id",
  intro_text:
    "Kami percaya setiap momen layak dikenang bukan hanya apa adanya, tetapi bagaimana momen itu terasa. Lewat bidikan kamera, kami menghadirkan yang paling berharga — merawat tradisi dan bercerita tanpa kata. Di sini, kenangan diabadikan untuk selamanya.",
  info_heading: "Sampai jumpa di momen Anda",
  info_text:
    "Terima kasih telah meluangkan waktu menelusuri karya kami. Semoga langkah kita bisa bertemu, dan kami diberi kesempatan mengabadikan kisah Anda selanjutnya.",
  info_image: null,
  info_button_label: "Hubungi kami",
  instagram_handle: "mstory.id",
  instagram_url: "https://instagram.com/mstory.id",
  instagram_grid_count: 4,
  contact_heading: "Siap mengabadikan cerita Anda?",
  contact_text:
    "Konsultasi gratis — pilih paket, cek tanggal tersedia, lalu lanjut ke booking.",
  wa_number: "6281234567890",
  wa_button_label: "WhatsApp Admin",
  booking_label: "Booking Online",
  booking_url: "/?booking=true",
  footer_copyright: "Hak cipta dilindungi",
};

const TTL_MS = 60 * 1000;

let cache: { settings?: WebsiteResolvedSettings; gallery?: WebsiteGalleryItem[]; albums?: WebsiteAlbumItem[]; expiresAt: number } | null = null;
let inflight: Promise<WebsiteContent> | null = null;

async function fetchWebsiteContent(): Promise<WebsiteContent> {
  const supabase = createClient();
  const settings: WebsiteResolvedSettings = { ...WEBSITE_DEFAULTS, updated_at: new Date().toISOString() };
  let gallery: WebsiteGalleryItem[] = [];
  let albums: WebsiteAlbumItem[] = [];

  if (supabase) {
    const [settingsRs, galleryRs, albumsRs, albumPhotosRs] = await Promise.allSettled([
      supabase.from("website_settings").select("*").maybeSingle(),
      supabase
        .from("website_gallery_items")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),
      supabase
        .from("website_albums")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),
      supabase
        .from("website_album_photos")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),
    ]);

    if (settingsRs.status === "fulfilled" && settingsRs.value.data) {
      const row = settingsRs.value.data as WebsiteSettingsRow;
      settings.site_name = row.site_name ?? settings.site_name;
      settings.logo_url = row.logo_url ?? settings.logo_url;
      settings.hero_slides = (row.hero_slides ?? []).filter(Boolean) as string[];
      settings.hero_duration_ms = row.hero_duration_ms ?? settings.hero_duration_ms;
      settings.intro_heading = row.intro_heading ?? settings.intro_heading;
      settings.intro_text = row.intro_text ?? settings.intro_text;
      settings.info_heading = row.info_heading ?? settings.info_heading;
      settings.info_text = row.info_text ?? settings.info_text;
      settings.info_image = row.info_image ?? settings.info_image;
      settings.info_button_label = row.info_button_label ?? settings.info_button_label;
      settings.instagram_handle = row.instagram_handle ?? settings.instagram_handle;
      settings.instagram_url = row.instagram_url ?? settings.instagram_url;
      settings.instagram_grid_count = row.instagram_grid_count ?? settings.instagram_grid_count;
      settings.contact_heading = row.contact_heading ?? settings.contact_heading;
      settings.contact_text = row.contact_text ?? settings.contact_text;
      settings.wa_number = row.wa_number ?? settings.wa_number;
      settings.wa_button_label = row.wa_button_label ?? settings.wa_button_label;
      settings.booking_label = row.booking_label ?? settings.booking_label;
      settings.booking_url = row.booking_url ?? settings.booking_url;
      settings.footer_copyright = row.footer_copyright ?? settings.footer_copyright;
      settings.updated_at = row.updated_at ?? settings.updated_at;
    }

    if (galleryRs.status === "fulfilled" && galleryRs.value.data) {
      gallery = (galleryRs.value.data as WebsiteGalleryRow[])
        .filter((r) => r.is_active)
        .map((r) => ({
          id: r.id,
          title: r.title,
          subtitle: r.subtitle,
          image_url: getStoredPublicUrl(r.image_path) ?? r.image_path,
          link_url: r.link_url,
          category_id: r.category_id ?? null,
          sort_order: r.sort_order,
          is_active: r.is_active,
        }));
    }

    if ((albumsRs.status === "fulfilled" && albumsRs.value.data) && (albumPhotosRs.status === "fulfilled" && albumPhotosRs.value.data)) {
      const albumRows = (albumsRs.value.data as WebsiteAlbumRow[]).filter((r) => r.is_active);
      const photos = (albumPhotosRs.value.data as WebsiteAlbumPhotoRow[]).filter((r) => r.is_active);
      albums = albumRows.map((r) => ({
        id: r.id,
        title: r.title,
        couple_name: r.couple_name,
        category_id: r.category_id ?? null,
        cover_image_url: getStoredPublicUrl(r.cover_image_path) ?? r.cover_image_path,
        is_active: r.is_active,
        sort_order: r.sort_order,
        photos: photos
          .filter((p) => p.album_id === r.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((p) => ({
            ...p,
            image_path: getStoredPublicUrl(p.image_path) ?? p.image_path,
          })),
      }));
    }
  }



  // Fallback galeri: listing storage fanspage/gallery bila tabel belum terisi
  if (gallery.length === 0) {
    try {
      const stored = await getGalleryImages();
      gallery = stored.slice(0, 12).map((g) => ({
        id: Number(g.id) || 0,
        title: g.name.replace(/\.[^.]+$/, "").slice(0, 22) || "Gallery",
        subtitle: "portfolio",
        image_url: g.url,
        link_url: null,
        sort_order: 0,
        is_active: true,
      }));
    } catch {
      /* fallback kosong */
    }
  }

  return { settings, gallery, albums };
}

export function getWebsiteContent(): Promise<WebsiteContent> {
  if (cache && cache.expiresAt > Date.now()) {
    return Promise.resolve({
      settings: cache.settings!,
      gallery: cache.gallery!,
      albums: cache.albums!,
    });
  }
  if (!inflight) {
    inflight = fetchWebsiteContent()
      .then((data) => {
        cache = {
          settings: data.settings,
          gallery: data.gallery,
          albums: data.albums,
          expiresAt: Date.now() + TTL_MS,
        };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * Ambil konten ter-cache secara sinkron (tanpa fetch) untuk render instan.
 * Mengembalikan null bila cache belum tersedia / sudah kedaluwarsa.
 */
export function peekWebsiteContent(): WebsiteContent | null {
  if (cache && cache.expiresAt > Date.now() && cache.settings && cache.gallery) {
    return {
      settings: cache.settings,
      gallery: cache.gallery,
      albums: cache.albums ?? [],
    };
  }
  return null;
}

export function clearWebsiteContentCache() {
  cache = null;
  inflight = null;
}

export function makeWebsiteSettingsRow(row: Partial<WebsiteResolvedSettings>): Omit<WebsiteSettingsRow, "id" | "updated_at"> {
  return {
    site_name: row.site_name ?? null,
    logo_url: row.logo_url ?? null,
    hero_slides: row.hero_slides ?? [],
    hero_duration_ms: row.hero_duration_ms ?? WEBSITE_DEFAULTS.hero_duration_ms,
    intro_heading: row.intro_heading ?? null,
    intro_text: row.intro_text ?? null,
    info_heading: row.info_heading ?? null,
    info_text: row.info_text ?? null,
    info_image: row.info_image ?? null,
    info_button_label: row.info_button_label ?? null,
    instagram_handle: row.instagram_handle ?? null,
    instagram_url: row.instagram_url ?? null,
    instagram_grid_count: row.instagram_grid_count ?? WEBSITE_DEFAULTS.instagram_grid_count,
    contact_heading: row.contact_heading ?? null,
    contact_text: row.contact_text ?? null,
    wa_number: row.wa_number ?? null,
    wa_button_label: row.wa_button_label ?? null,
    booking_label: row.booking_label ?? null,
    booking_url: row.booking_url ?? null,
    footer_copyright: row.footer_copyright ?? null,
  };
}

export async function updateWebsiteSettings(
  patch: Partial<WebsiteSettingsRow>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase tidak dikonfigurasi." };
  const { error } = await supabase
    .from("website_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  clearWebsiteContentCache();
  return { ok: true };
}

export async function getWebsiteGalleryItems(): Promise<WebsiteGalleryItem[]> {
  const content = await getWebsiteContent();
  return content.gallery;
}

export async function fetchWebsiteSettingsRow(): Promise<WebsiteSettingsRow | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("website_settings").select("*").maybeSingle();
  if (error || !data) return null;
  return data as WebsiteSettingsRow;
}

export async function fetchWebsiteGalleryRows(): Promise<WebsiteGalleryRow[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("website_gallery_items")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error || !data) return [];
  return data as WebsiteGalleryRow[];
}

export async function addWebsiteGalleryItem(item: {
  title: string;
  subtitle?: string;
  image_path: string;
  link_url?: string | null;
  category_id?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase tidak dikonfigurasi." };
  const { count } = await supabase
    .from("website_gallery_items")
    .select("id", { count: "exact", head: true });
  const { error } = await supabase.from("website_gallery_items").insert({
    title: item.title,
    subtitle: item.subtitle ?? "portfolio",
    image_path: item.image_path,
    link_url: item.link_url ?? null,
    category_id: item.category_id ?? null,
    sort_order: count ?? 0,
    is_active: true,
  });
  if (error) return { ok: false, error: error.message };
  clearWebsiteContentCache();
  return { ok: true };
}

export async function updateWebsiteGalleryItem(
  id: number,
  patch: Partial<Pick<WebsiteGalleryItem, "title" | "subtitle" | "link_url" | "sort_order" | "is_active" | "category_id">>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase tidak dikonfigurasi." };
  const update: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("website_gallery_items").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };
  clearWebsiteContentCache();
  return { ok: true };
}

export async function deleteWebsiteGalleryItem(id: number): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase tidak dikonfigurasi." };
  const { error } = await supabase.from("website_gallery_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  clearWebsiteContentCache();
  return { ok: true };
}

/**
 * Upload gambar ke storage fanspage/<folder>. Mengembalikan full public URL.
 */
export async function uploadWebsiteImage(
  file: File,
  folder: "hero" | "info" | "gallery" | "albums/covers" | "albums/photos",
): Promise<{ url?: string; error?: string }> {
  const url = await compressAndUploadImage(file, WEBSITE_BUCKET, folder);
  if (!url) return { error: "Upload gambar gagal." };
  return { url };
}

/**
 * Hapus file storage berdasarkan full public URL.
 * Support bucket website (baru) + fanspage (legacy).
 */
export async function deleteWebsiteImage(url: string): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const base = url.split("?")[0];
  for (const bucket of [WEBSITE_BUCKET, FANSPAGE_BUCKET]) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = base.indexOf(marker);
    if (idx !== -1) {
      const path = base.slice(idx + marker.length);
      await supabase.storage.from(bucket).remove([path]);
      return;
    }
  }
}

// ==========================================
// ALBUM PORTFOLIO (1 card = 1 album pasangan)
// ==========================================

export async function fetchWebsiteAlbums(): Promise<WebsiteAlbumRow[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("website_albums")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error || !data) return [];
  return data as WebsiteAlbumRow[];
}

export async function fetchWebsiteAlbumPhotos(albumId?: number): Promise<WebsiteAlbumPhotoRow[]> {
  const supabase = createClient();
  if (!supabase) return [];
  let query = supabase
    .from("website_album_photos")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (albumId) query = query.eq("album_id", albumId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as WebsiteAlbumPhotoRow[];
}

export async function addWebsiteAlbum(item: {
  title: string;
  couple_name: string;
  category_id: number | null;
  cover_image_path: string;
}): Promise<{ ok: boolean; error?: string; id?: number }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase tidak dikonfigurasi." };
  const { count } = await supabase
    .from("website_albums")
    .select("id", { count: "exact", head: true });
  const { data, error } = await supabase
    .from("website_albums")
    .insert({
      title: item.title,
      couple_name: item.couple_name,
      category_id: item.category_id,
      cover_image_path: item.cover_image_path,
      sort_order: count ?? 0,
      is_active: true,
    })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  clearWebsiteContentCache();
  return { ok: true, id: data?.id };
}

export async function updateWebsiteAlbum(
  id: number,
  patch: Partial<Pick<WebsiteAlbumRow, "title" | "couple_name" | "category_id" | "cover_image_path" | "is_active" | "sort_order">>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase tidak dikonfigurasi." };
  const { error } = await supabase
    .from("website_albums")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  clearWebsiteContentCache();
  return { ok: true };
}

export async function deleteWebsiteAlbum(id: number): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase tidak dikonfigurasi." };
  const { error } = await supabase.from("website_albums").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  clearWebsiteContentCache();
  return { ok: true };
}

export async function addWebsiteAlbumPhoto(
  albumId: number,
  image_path: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase tidak dikonfigurasi." };
  const { count } = await supabase
    .from("website_album_photos")
    .select("id", { count: "exact", head: true })
    .eq("album_id", albumId);
  const { error } = await supabase.from("website_album_photos").insert({
    album_id: albumId,
    image_path: image_path,
    sort_order: count ?? 0,
    is_active: true,
  });
  if (error) return { ok: false, error: error.message };
  clearWebsiteContentCache();
  return { ok: true };
}

export async function updateWebsiteAlbumPhoto(
  id: number,
  patch: Partial<Pick<WebsiteAlbumPhotoRow, "sort_order" | "is_active">>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase tidak dikonfigurasi." };
  const { error } = await supabase.from("website_album_photos").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  clearWebsiteContentCache();
  return { ok: true };
}

export async function deleteWebsiteAlbumPhoto(id: number): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase tidak dikonfigurasi." };
  const { error } = await supabase.from("website_album_photos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  clearWebsiteContentCache();
  return { ok: true };
}