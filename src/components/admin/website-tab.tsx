"use client";

import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  getStoredPublicUrl,
  parseObjectPosition,
  withPosition,
} from "@/lib/site-settings";
import {
  WebsiteSettingsRow,
  WebsiteGalleryRow,
  WebsiteAlbumRow,
  WebsiteAlbumPhotoRow,
  fetchWebsiteSettingsRow,
  fetchWebsiteGalleryRows,
  fetchWebsiteAlbums,
  fetchWebsiteAlbumPhotos,
  updateWebsiteSettings,
  addWebsiteGalleryItem,
  updateWebsiteGalleryItem,
  deleteWebsiteGalleryItem,
  uploadWebsiteImage,
  deleteWebsiteImage,
  addWebsiteAlbum,
  updateWebsiteAlbum,
  deleteWebsiteAlbum,
  addWebsiteAlbumPhoto,
  deleteWebsiteAlbumPhoto,
  clearWebsiteContentCache,
  WEBSITE,
} from "@/lib/website-content";
import { getPackages } from "@/lib/website";
import { Check, ImagePlus, Loader2, Trash2, X, ArrowUp, ArrowDown, Camera } from "lucide-react";

function notify(icon: "success" | "error" | "warning" | "info", title: string, text?: string) {
  void Swal.fire({ icon, title, text, timer: icon === "success" ? 1600 : undefined, showConfirmButton: icon !== "success" });
}

function confirmDelete(title: string, text: string) {
  return Swal.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    confirmButtonColor: "#dc2626",
  });
}

export function WebsiteTab() {
  const [row, setRow] = useState<WebsiteSettingsRow | null>(null);
  const [gallery, setGallery] = useState<WebsiteGalleryRow[]>([]);
  const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [newGalleryCategory, setNewGalleryCategory] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [albums, setAlbums] = useState<WebsiteAlbumRow[]>([]);
  const [albumPhotos, setAlbumPhotos] = useState<WebsiteAlbumPhotoRow[]>([]);
  const [albumUploading, setAlbumUploading] = useState<string | null>(null);
  const [newAlbum, setNewAlbum] = useState({ title: "", couple_name: "", category_id: null as number | null });
  const [expandedAlbum, setExpandedAlbum] = useState<number | null>(null);
  const [heroBanners, setHeroBanners] = useState<{ url: string | null; pos: { x: number; y: number } }[]>([
    { url: null, pos: { x: 50, y: 50 } },
    { url: null, pos: { x: 50, y: 50 } },
    { url: null, pos: { x: 50, y: 50 } },
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [settings, galleryRows, pkgs, albumRows] = await Promise.all([
          fetchWebsiteSettingsRow(),
          fetchWebsiteGalleryRows(),
          getPackages(),
          fetchWebsiteAlbums(),
        ]);
        if (!cancelled) {
          setRow(settings);
          setGallery(galleryRows);
          setCats(pkgs.categories);
          setAlbums(albumRows);
          // load all photos
          if (albumRows.length > 0) {
            const allPhotos = await fetchWebsiteAlbumPhotos();
            if (!cancelled) setAlbumPhotos(allPhotos);
          }
          const slides = settings?.hero_slides ?? [];
          const padded = [...slides, ...Array(Math.max(0, 3 - slides.length)).fill(null)].slice(0, 3);
          setHeroBanners(padded.map((url: string | null) => ({
            url: url ?? null,
            pos: parseObjectPosition(url, 50, 50),
          })));
        }
      } catch (e) {
        console.error("Gagal load website content:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

function field<K extends keyof WebsiteSettingsRow>(key: K, value: WebsiteSettingsRow[K]) {
    setRow((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function syncHeroSlides(
    banners: { url: string | null; pos: { x: number; y: number } }[],
  ) {
    const slides = banners
      .filter((b) => b.url)
      .map((b) => withPosition(b.url!, b.pos.x, b.pos.y));
    setRow((prev) => (prev ? { ...prev, hero_slides: slides } : prev));
  }

  async function handleHeroSlotUpload(slot: number, file: File) {
    setUploading(`hero-${slot}`);
    try {
      const { url, error } = await uploadWebsiteImage(file, WEBSITE.HERO_FOLDER);
      if (error || !url) {
        notify("error", "Upload gagal", error ?? "Cek koneksi atau izin bucket storage.");
        return;
      }
      const next = heroBanners.map((b, i) =>
        i === slot ? { url, pos: { x: 50, y: 50 } } : b,
      );
      setHeroBanners(next);
      syncHeroSlides(next);
      notify("success", `Foto hero ${slot + 1} berhasil diunggah.`);
    } catch (err) {
      notify("error", "Upload gagal", err instanceof Error ? err.message : "terjadi kesalahan");
    } finally {
      setUploading(null);
    }
  }

  async function handleHeroSlotRemove(slot: number) {
    const r = await confirmDelete(`Hapus foto hero ${slot + 1}?`, "Foto akan dihapus dari storage.");
    if (!r.isConfirmed) return;
    const url = heroBanners[slot]?.url;
    if (url) await deleteWebsiteImage(url);
    const next = heroBanners.map((b, i) =>
      i === slot ? { url: null, pos: { x: 50, y: 50 } } : b,
    );
    setHeroBanners(next);
    syncHeroSlides(next);
    notify("success", `Foto hero ${slot + 1} dihapus.`);
  }

  function handleHeroPositionChange(slot: number, x: number, y: number) {
    const next = heroBanners.map((b, i) =>
      i === slot ? { ...b, pos: { x, y } } : b,
    );
    setHeroBanners(next);
    syncHeroSlides(next);
  }

  async function handleSave() {
    if (!row) return;
    setSaving(true);
    const slides = heroBanners
      .filter((b) => b.url)
      .map((b) => withPosition(b.url!, b.pos.x, b.pos.y));
    const payload = { ...row, hero_slides: slides };
    const { ok, error } = await updateWebsiteSettings(payload);
    setSaving(false);
    if (ok) notify("success", "Konten website berhasil disimpan.");
    else notify("error", "Gagal menyimpan", error ?? "terjadi kesalahan");
  }

  async function handleInfoUpload(file: File) {
    setUploading("info");
    try {
      const { url, error } = await uploadWebsiteImage(file, WEBSITE.INFO_FOLDER);
      if (error || !url) { notify("error", "Upload gagal", error ?? "Gagal upload info banner."); return; }
      setRow((prev) => (prev ? { ...prev, info_image: url } : prev));
      notify("success", "Foto info banner berhasil diunggah.");
    } finally { setUploading(null); }
  }

  async function handleInfoRemove() {
    const r = await confirmDelete("Hapus foto info banner?", "Foto akan dihapus dari storage.");
    if (!r.isConfirmed) return;
    if (!row?.info_image) return;
    await deleteWebsiteImage(row.info_image);
    setRow({ ...row, info_image: null });
    notify("success", "Foto info banner dihapus.");
  }

  async function handleGalleryUpload(file: File) {
    setUploading("gallery");
    try {
      const { url, error } = await uploadWebsiteImage(file, WEBSITE.GALLERY_FOLDER);
      if (error || !url) { notify("error", "Upload gagal", error ?? "Gagal upload galeri."); return; }
      const name = file.name.replace(/\.[^.]+$/, "").slice(0, 22) || "Gallery";
      const { ok, error: err2 } = await addWebsiteGalleryItem({ title: name, subtitle: "portfolio", image_path: url, category_id: newGalleryCategory ?? null });
      if (!ok) { notify("error", "Gagal tambah galeri", err2 ?? "unknown"); return; }
      const galleryRows = await fetchWebsiteGalleryRows();
      setGallery(galleryRows);
      setNewGalleryCategory(null);
      notify("success", `Foto galeri "${name}" berhasil ditambahkan.`);
    } finally { setUploading(null); }
  }

  async function handleGalleryDelete(id: number, imageUrl: string) {
    const r = await confirmDelete("Hapus item galeri?", "Foto dan data galeri akan dihapus.");
    if (!r.isConfirmed) return;
    await deleteWebsiteImage(imageUrl);
    const { ok, error } = await deleteWebsiteGalleryItem(id);
    if (!ok) { notify("error", "Gagal hapus", error ?? "unknown"); return; }
    setGallery((prev) => prev.filter((g) => g.id !== id));
    notify("success", "Item galeri dihapus.");
  }

  async function handleGalleryMove(id: number, direction: 1 | -1) {
    const visible = filterCategory === null ? gallery : gallery.filter((g) => g.category_id === filterCategory);
    const vIdx = visible.findIndex((g) => g.id === id);
    const targetVisible = visible[vIdx + direction];
    if (!targetVisible) return;
    const idx = gallery.findIndex((g) => g.id === id);
    const tIdx = gallery.findIndex((g) => g.id === targetVisible.id);
    if (idx === -1 || tIdx === -1) return;
    const a = gallery[idx].sort_order;
    const b = gallery[tIdx].sort_order;
    const r1 = await updateWebsiteGalleryItem(id, { sort_order: b });
    const r2 = await updateWebsiteGalleryItem(targetVisible.id, { sort_order: a });
    if (!r1.ok || !r2.ok) {
      notify("error", "Gagal urutkan", r1.error ?? r2.error ?? "unknown");
      return;
    }
    setGallery((prev) => {
      const next = [...prev];
      const i = next.findIndex((g) => g.id === id);
      const j = next.findIndex((g) => g.id === targetVisible.id);
      if (i === -1 || j === -1) return prev;
      next[i] = { ...next[i], sort_order: b };
      next[j] = { ...next[j], sort_order: a };
      return next.sort((x, y) => x.sort_order - y.sort_order);
    });
  }

  async function handleGalleryToggle(id: number, isActive: boolean) {
    const { ok, error } = await updateWebsiteGalleryItem(id, { is_active: isActive });
    if (!ok) { notify("error", "Gagal toggle", error ?? "unknown"); return; }
    setGallery((prev) => prev.map((g) => (g.id === id ? { ...g, is_active: isActive } : g)));
    clearWebsiteContentCache();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat konten website...
      </div>
    );
  }

  if (!row) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Tabel <code className="rounded bg-amber-100 px-1">website_settings</code> belum ada. Jalankan <code className="rounded bg-amber-100 px-1">schema_website_content.sql</code> di Supabase SQL Editor, lalu refresh.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* === IDENTITAS & HERO === */}
      <div className="rounded-2xl p-5 glass">
        <h3 className="mb-4 font-serif text-sm font-semibold text-[var(--ink)]">
          Identitas & Hero
        </h3>
        <div className="space-y-3">
          <Field label="Nama Situs" hint="Tampil di header & title">
            <input type="text" value={row.site_name ?? ""}
              onChange={(e) => field("site_name", e.target.value)}
              className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
          </Field>

          <div>
            <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Slide Hero (3 slot tetap)</span>
            <p className="mb-3 text-[11px] text-[var(--muted-3)]">3 slot upload hero tetap — upload atau ganti foto di masing-masing slot. Klik gambar untuk mengganti, geser untuk atur posisi tampilan.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {heroBanners.map((banner, idx) => (
                <BannerSlotHero key={idx} slot={idx} banner={banner} uploading={uploading === `hero-${idx}`} onUpload={(f) => handleHeroSlotUpload(idx, f)} onRemove={() => handleHeroSlotRemove(idx)} onPosition={(x, y) => handleHeroPositionChange(idx, x, y)} />
              ))}
            </div>
          </div>

          <Field label="Durasi Auto-Slide (ms)">
            <input type="number" value={row.hero_duration_ms ?? 3800}
              onChange={(e) => field("hero_duration_ms", Number(e.target.value))}
              className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
          </Field>
        </div>
      </div>

      {/* === INTRO / ABOUT === */}
      <div className="rounded-2xl p-5 glass">
        <h3 className="mb-4 font-serif text-sm font-semibold text-[var(--ink)]">
          Intro / About (#about)
        </h3>
        <div className="space-y-3">
          <Field label="Heading">
            <input type="text" value={row.intro_heading ?? ""} onChange={(e) => field("intro_heading", e.target.value)}
              className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
          </Field>
          <Field label="Teks">
            <textarea value={row.intro_text ?? ""} onChange={(e) => field("intro_text", e.target.value)} rows={3}
              className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
          </Field>
        </div>
      </div>

      {/* === INFO BANNER === */}
      <div className="rounded-2xl p-5 glass">
        <h3 className="mb-4 font-serif text-sm font-semibold text-[var(--ink)]">
          Info Banner (&quot;We&apos;ll see you soon&quot;)
        </h3>
        <div className="space-y-3">
          <Field label="Heading">
            <input type="text" value={row.info_heading ?? ""} onChange={(e) => field("info_heading", e.target.value)}
              className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
          </Field>
          <Field label="Teks">
            <textarea value={row.info_text ?? ""} onChange={(e) => field("info_text", e.target.value)} rows={2}
              className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
          </Field>
          <Field label="Label Tombol">
            <input type="text" value={row.info_button_label ?? ""} onChange={(e) => field("info_button_label", e.target.value)}
              className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
          </Field>
          <ImageField
            title="Foto Background Info Banner"
            url={row.info_image ? getStoredPublicUrl(row.info_image) : null}
            uploading={uploading === "info"}
            onFile={(f) => f && handleInfoUpload(f)}
            onRemove={handleInfoRemove}
          />
        </div>
      </div>

      {/* === INSTAGRAM === */}
      <div className="rounded-2xl p-5 glass">
        <h3 className="mb-4 font-serif text-sm font-semibold text-[var(--ink)]">
          Instagram (tampil #follow)
        </h3>
        <div className="space-y-3">
          <Field label="Handle (@)">
            <input type="text" value={row.instagram_handle ?? ""} onChange={(e) => field("instagram_handle", e.target.value)}
              className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
          </Field>
          <Field label="URL">
            <input type="url" value={row.instagram_url ?? ""} onChange={(e) => field("instagram_url", e.target.value)}
              className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
          </Field>
        </div>
      </div>

      {/* === CONTACT / CTA === */}
      <div className="rounded-2xl p-5 glass">
        <h3 className="mb-4 font-serif text-sm font-semibold text-[var(--ink)]">
          Contact / CTA
        </h3>
        <div className="space-y-3">
          <Field label="Heading">
            <input type="text" value={row.contact_heading ?? ""} onChange={(e) => field("contact_heading", e.target.value)}
              className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
          </Field>
          <Field label="Teks">
            <textarea value={row.contact_text ?? ""} onChange={(e) => field("contact_text", e.target.value)} rows={2}
              className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
          </Field>
          <Field label="Label Tombol WhatsApp">
            <input type="text" value={row.wa_button_label ?? ""} onChange={(e) => field("wa_button_label", e.target.value)}
              className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
          </Field>
        </div>
      </div>

      {/* === FOOTER === */}
      <div className="rounded-2xl p-5 glass">
        <h3 className="mb-4 font-serif text-sm font-semibold text-[var(--ink)]">
          Footer
        </h3>
        <Field label="Copyright Teks">
          <input type="text" value={row.footer_copyright ?? ""} onChange={(e) => field("footer_copyright", e.target.value)}
            className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
        </Field>
      </div>

      {/* === GALERI PORTFOLIO === */}
      <div className="rounded-2xl p-5 glass">
        <h3 className="mb-4 font-serif text-sm font-semibold text-[var(--ink)]">
          Galeri Portfolio (Grid #paket)
        </h3>
        <p className="mb-4 text-[11px] text-[var(--muted-3)]">
          Upload & urutkan item yang tampil di grid 3×3 halaman /website. Tentukan kategori foto (Wedding / Prewedding / Engagement / Event / WCC) — kategori digunakan untuk filter di menu Portfolio. Edit nama & subtitle, klik Simpan untuk menyimpan.
        </p>

        {/* Filter per kategori */}
        {cats.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Filter:</span>
            <button
              type="button"
              onClick={() => setFilterCategory(null)}
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition ${filterCategory === null ? "bg-[var(--brand)] text-white" : "border border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--brand)]"}`}
            >
              Semua
            </button>
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilterCategory(c.id)}
                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition ${filterCategory === c.id ? "bg-[var(--brand)] text-white" : "border border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--brand)]"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--line)] py-3 text-[11px] font-semibold text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
            {uploading === "gallery" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Tambah foto galeri
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleGalleryUpload(f); e.target.value = ""; }} />
          </label>
          <select
            value={newGalleryCategory ?? ""}
            onChange={(e) => setNewGalleryCategory(e.target.value ? Number(e.target.value) : null)}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-xs font-semibold text-[var(--muted)] outline-none focus:border-[var(--brand)]"
          >
            <option value="">Kategori (opsional)</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {(() => { const visibleGallery = gallery.filter((g) => filterCategory === null || g.category_id === filterCategory); return (
        <div className="space-y-2">
          {visibleGallery.map((g, idx) => (
            <div key={g.id} className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getStoredPublicUrl(g.image_path) ?? g.image_path} alt={g.title} className="h-14 w-14 shrink-0 rounded object-cover" />
              <div className="flex-1 space-y-1">
                <input type="text" value={g.title} onChange={(e) => { const v = e.target.value; setGallery((prev) => prev.map((r) => r.id === g.id ? { ...r, title: v } : r)); }}
                  className="w-full rounded border border-[var(--line)] bg-white px-2 py-1 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]" />
                <input type="text" value={g.subtitle} onChange={(e) => { const v = e.target.value; setGallery((prev) => prev.map((r) => r.id === g.id ? { ...r, subtitle: v } : r)); }}
                  className="w-full rounded border border-[var(--line)] bg-white px-2 py-1 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]" />
                <select
                  value={g.category_id ?? ""}
                  onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setGallery((prev) => prev.map((r) => r.id === g.id ? { ...r, category_id: v } : r)); }}
                  className="w-full rounded border border-[var(--line)] bg-white px-2 py-1 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                >
                  <option value="">Tanpa Kategori</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input type="text" value={g.link_url ?? ""} onChange={(e) => { const v = e.target.value; setGallery((prev) => prev.map((r) => r.id === g.id ? { ...r, link_url: v } : r)); }}
                  placeholder="link (opsional)"
                  className="w-full rounded border border-[var(--line)] bg-white px-2 py-1 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)] placeholder:text-[var(--muted-3)]" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <label className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
                  <input type="checkbox" checked={g.is_active} onChange={(e) => handleGalleryToggle(g.id, e.target.checked)} />
                  aktif
                </label>
                <button type="button" onClick={async () => { const { ok, error } = await updateWebsiteGalleryItem(g.id, { title: g.title, subtitle: g.subtitle, link_url: g.link_url, category_id: g.category_id ?? null }); if (ok) notify("success", `Item "${g.title}" disimpan.`); else notify("error", "Gagal simpan", error ?? "unknown"); }} className="rounded border border-[var(--line)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)] hover:bg-[var(--soft)]">Simpan</button>
              </div>
              <button type="button" onClick={() => handleGalleryMove(g.id, -1)} disabled={idx === 0} className="rounded p-1 hover:bg-[var(--soft)] disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
              <button type="button" onClick={() => handleGalleryMove(g.id, 1)} disabled={idx === visibleGallery.length - 1} className="rounded p-1 hover:bg-[var(--soft)] disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
              <button type="button" onClick={() => handleGalleryDelete(g.id, g.image_path)} className="rounded bg-red-50 p-1 text-red-500 hover:bg-red-100"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
        );})()}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[var(--brand)] px-6 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-sm transition-all hover:bg-[var(--brand-hover)] active:scale-[0.98] disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Simpan Konten Website
        </button>
      </div>

      {/* === ALBUM PORTFOLIO === */}
      <div className="rounded-2xl p-5 glass">
        <h3 className="mb-2 font-serif text-sm font-semibold text-[var(--ink)]">
          Album Portfolio
        </h3>
        <p className="mb-4 text-[11px] text-[var(--muted-3)]">
          1 album = 1 card di halaman /website. Setiap album berisi nama pasangan + cover + beberapa foto (10-20 foto). Klik card untuk membuka album galeri.
        </p>

        {/* Form tambah album baru */}
        <div className="mb-4 rounded-xl border border-dashed border-[var(--line)] p-4">
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Nama Pasangan">
              <input type="text" placeholder="Pasangan & Mempelai" value={newAlbum.couple_name}
                onChange={(e) => setNewAlbum({ ...newAlbum, couple_name: e.target.value })}
                className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]" />
            </Field>
            <Field label="Judul Album">
              <input type="text" placeholder="Wedding, Prewedding..." value={newAlbum.title}
                onChange={(e) => setNewAlbum({ ...newAlbum, title: e.target.value })}
                className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]" />
            </Field>
            <Field label="Kategori">
              <select value={newAlbum.category_id ?? ""} onChange={(e) => setNewAlbum({ ...newAlbum, category_id: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]">
                <option value="">Pilih Kategori</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <button
            type="button"
            disabled={!newAlbum.couple_name.trim() || albumUploading !== null}
            onClick={async () => {
              setAlbumUploading("creating");
              const { ok, error, id } = await addWebsiteAlbum({
                title: newAlbum.title || "Album",
                couple_name: newAlbum.couple_name,
                category_id: newAlbum.category_id,
                cover_image_path: "",
              });
              if (!ok) { notify("error", "Gagal buat album", error ?? "unknown"); setAlbumUploading(null); return; }
              const albumRows = await fetchWebsiteAlbums();
              setAlbums(albumRows);
              setNewAlbum({ title: "", couple_name: "", category_id: null });
              setExpandedAlbum(id ?? null);
              notify("success", `Album "${newAlbum.couple_name}" berhasil dibuat.`);
              void Swal.fire({ icon: "info", title: "Upload cover & foto sekarang", timer: 1500, showConfirmButton: false });
              setAlbumUploading(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[var(--brand-hover)] disabled:opacity-50"
          >
            {albumUploading === "creating" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
            Buat Album
          </button>
        </div>

        {/* List albums */}
        {albums.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-[var(--muted-3)]">Belum ada album.</p>
        ) : (
          <div className="space-y-3">
            {albums.map((album) => {
              const isExpanded = expandedAlbum === album.id;
              const photos = albumPhotos.filter((p) => p.album_id === album.id);
              return (
                <div key={album.id} className="rounded-xl border border-[var(--line)] bg-white">
                  <div className="flex items-center gap-3 px-4 py-3">
                    {album.cover_image_path ? (
                      <img src={getStoredPublicUrl(album.cover_image_path) ?? album.cover_image_path} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--soft)] text-[var(--muted-3)]">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-bold text-[var(--ink)]">{album.couple_name}</p>
                      <p className="text-[10px] text-[var(--muted)]">
                        {cats.find((c) => c.id === album.category_id)?.name ?? "Tanpa kategori"} · {photos.length} foto
                      </p>
                    </div>
                    <button type="button" onClick={() => setExpandedAlbum(isExpanded ? null : album.id)}
                      className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[10px] font-semibold text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
                      {isExpanded ? "Tutup" : "Kelola"}
                    </button>
                    <button type="button" onClick={async () => {
                      const r = await confirmDelete(`Hapus album "${album.couple_name}"?`, "Cover & semua foto album juga akan terhapus.");
                      if (!r.isConfirmed) return;
                      await deleteWebsiteAlbum(album.id);
                      setAlbums((prev) => prev.filter((a) => a.id !== album.id));
                      if (expandedAlbum === album.id) setExpandedAlbum(null);
                      notify("success", `Album "${album.couple_name}" dihapus.`);
                    }} className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[var(--soft)] px-4 py-4 space-y-4">
                      {/* Edit identitas */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <input type="text" value={album.couple_name} placeholder="Nama Pasangan"
                          onChange={(e) => { const v = e.target.value; setAlbums((prev) => prev.map((a) => a.id === album.id ? { ...a, couple_name: v } : a)); }}
                          className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]" />
                        <input type="text" value={album.title} placeholder="Judul Album"
                          onChange={(e) => { const v = e.target.value; setAlbums((prev) => prev.map((a) => a.id === album.id ? { ...a, title: v } : a)); }}
                          className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]" />
                        <select value={album.category_id ?? ""} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setAlbums((prev) => prev.map((a) => a.id === album.id ? { ...a, category_id: v } : a)); }}
                          className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]">
                          <option value="">Tanpa Kategori</option>
                          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-semibold text-[var(--muted)]">Aktif:</label>
                        <input type="checkbox" checked={album.is_active} onChange={(e) => { const v = e.target.checked; setAlbums((prev) => prev.map((a) => a.id === album.id ? { ...a, is_active: v } : a)); updateWebsiteAlbum(album.id, { is_active: v }); }} />
                      </div>
                      <button onClick={async () => { const { ok, error } = await updateWebsiteAlbum(album.id, { title: album.title, couple_name: album.couple_name, category_id: album.category_id ?? null }); if (ok) notify("success", `Album "${album.couple_name}" disimpan.`); else notify("error", "Gagal simpan", error ?? "unknown"); }}
                        className="rounded-lg bg-[var(--brand)] px-4 py-2 text-[11px] font-bold uppercase text-white hover:bg-[var(--brand-hover)]">Simpan Album</button>

                      {/* Cover image */}
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Cover Album</p>
                        {album.cover_image_path ? (
                          <div className="relative inline-block">
                            <img src={getStoredPublicUrl(album.cover_image_path) ?? album.cover_image_path} alt="" className="h-28 w-28 rounded-lg object-cover" />
                            <button onClick={async () => { const r = await confirmDelete("Hapus cover album?", "Cover akan dihapus."); if (!r.isConfirmed) return; await updateWebsiteAlbum(album.id, { cover_image_path: "" }); setAlbums((prev) => prev.map((a) => a.id === album.id ? { ...a, cover_image_path: "" } : a)); notify("success", "Cover dihapus."); }}
                              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[var(--line)] px-4 py-3 text-[10px] font-semibold text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
                            {albumUploading === `cover-${album.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                            Upload Cover
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const f = e.target.files?.[0]; if (!f) return;
                              setAlbumUploading(`cover-${album.id}`);
                              const { url, error } = await uploadWebsiteImage(f, WEBSITE.ALBUM_COVER);
                              if (error || !url) { notify("error", "Upload cover gagal", error ?? "Gagal upload cover."); setAlbumUploading(null); e.target.value = ""; return; }
                              const { ok, error: err2 } = await updateWebsiteAlbum(album.id, { cover_image_path: url });
                              if (!ok) notify("error", "Gagal simpan cover", err2 ?? "unknown");
                              else { setAlbums((prev) => prev.map((a) => a.id === album.id ? { ...a, cover_image_path: url } : a)); notify("success", "Cover berhasil diunggah."); }
                              setAlbumUploading(null);
                              e.target.value = "";
                            }} />
                          </label>
                        )}
                      </div>

                      {/* Photos */}
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Foto Album ({photos.length})</p>
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[var(--line)] px-4 py-2 text-[10px] font-semibold text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
                          {albumUploading === `photo-${album.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                          Tambah Foto
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const f = e.target.files?.[0]; if (!f) return;
                            setAlbumUploading(`photo-${album.id}`);
                            const { url, error } = await uploadWebsiteImage(f, WEBSITE.ALBUM_PHOTOS);
                            if (error || !url) { notify("error", "Upload gagal", error ?? "Gagal upload foto album."); setAlbumUploading(null); e.target.value = ""; return; }
                            const { ok, error: err2 } = await addWebsiteAlbumPhoto(album.id, url);
                            if (!ok) notify("error", "Gagal simpan foto", err2 ?? "unknown");
                            else { setAlbumPhotos(await fetchWebsiteAlbumPhotos()); notify("success", "Foto album ditambahkan."); }
                            setAlbumUploading(null);
                            e.target.value = "";
                          }} />
                        </label>
                        {photos.length > 0 && (
                          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                            {photos.map((photo) => (
                              <div key={photo.id} className="group relative">
                                <img src={getStoredPublicUrl(photo.image_path) ?? photo.image_path} alt="" className="h-20 w-full rounded-lg object-cover sm:h-24" />
                                <button onClick={async () => { const r = await confirmDelete("Hapus foto?", "Foto akan dihapus dari album."); if (!r.isConfirmed) return; await deleteWebsiteImage(photo.image_path); await deleteWebsiteAlbumPhoto(photo.id); setAlbumPhotos((prev) => prev.filter((p) => p.id !== photo.id)); notify("success", "Foto dihapus."); }}
                                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ImageField({
  title, url, uploading, onFile, onRemove,
}: {
  title: string; url: string | null; uploading: boolean;
  onFile: (file: File) => void; onRemove: () => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">{title}</span>
      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--soft)] text-[var(--muted-3)]">—</div>
        )}
        <div className="flex gap-2">
          <label className="cursor-pointer rounded-md border border-[var(--line)] bg-white px-2 py-1 text-[10px] font-semibold text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
            {uploading ? <Loader2 className="inline h-3 w-3 animate-spin" /> : "Ganti"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
          </label>
          {url && <button type="button" onClick={onRemove} className="rounded bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-500 hover:bg-red-100">Hapus</button>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[var(--muted-3)]">{hint}</span>}
    </label>
  );
}

function BannerSlotHero({
  slot,
  banner,
  uploading,
  onUpload,
  onRemove,
  onPosition,
}: {
  slot: number;
  banner: { url: string | null; pos: { x: number; y: number } };
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onPosition: (x: number, y: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function updateFromPointer(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    onPosition(x, y);
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-3">
      <span className="text-[11px] font-semibold text-[var(--muted-3)]">Foto {slot + 1}</span>
      <div
        className="relative mt-2 h-28 w-full cursor-grab touch-none select-none overflow-hidden rounded-lg border border-dashed border-[var(--line)] bg-[var(--soft)]"
        onPointerDown={(e) => {
          if (!banner.url) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          updateFromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) updateFromPointer(e);
        }}
      >
        {uploading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
          </div>
        ) : banner.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={banner.url}
            alt={`Hero ${slot + 1}`}
            className="pointer-events-none h-full w-full object-cover"
            style={{ objectPosition: `${banner.pos.x}% ${banner.pos.y}%` }}
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-[var(--muted)] hover:text-[var(--brand)]"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Tambah</span>
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-1">
        {banner.url ? (
          <>
            <p className="text-[9px] text-[var(--muted-3)]">
              Geser · {Math.round(banner.pos.x)}%, {Math.round(banner.pos.y)}%
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-md border border-[var(--line)] bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                Ganti
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-500 hover:bg-red-100"
              >
                Hapus
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-[var(--line)] bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            <Camera className="h-3 w-3" />
            Pilih Foto
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
