"use client";

import { useEffect, useState } from "react";
import {
  getStoredPublicUrl,
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
  WEBSITE,
} from "@/lib/website-content";
import { getPackages } from "@/lib/website";
import { Check, ImagePlus, Loader2, Trash2, X, ArrowUp, ArrowDown } from "lucide-react";

export function WebsiteTab() {
  const [row, setRow] = useState<WebsiteSettingsRow | null>(null);
  const [gallery, setGallery] = useState<WebsiteGalleryRow[]>([]);
  const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [newGalleryCategory, setNewGalleryCategory] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [albums, setAlbums] = useState<WebsiteAlbumRow[]>([]);
  const [albumPhotos, setAlbumPhotos] = useState<WebsiteAlbumPhotoRow[]>([]);
  const [albumUploading, setAlbumUploading] = useState<string | null>(null);
  const [newAlbum, setNewAlbum] = useState({ title: "", couple_name: "", category_id: null as number | null });
  const [expandedAlbum, setExpandedAlbum] = useState<number | null>(null);

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

  function handleHeroMove(idx: number, direction: 1 | -1) {
    if (!row) return;
    const next = [...(row.hero_slides ?? [])];
    const target = idx + direction;
    if (target < 0 || target >= next.length) return;
    const tmp = next[idx];
    next[idx] = next[target];
    next[target] = tmp;
    setRow({ ...row, hero_slides: next });
  }

  async function handleSave() {
    if (!row) return;
    setSaving(true);
    setMessage("");
    const { ok, error } = await updateWebsiteSettings(row);
    setSaving(false);
    if (ok) setMessage("Konten website berhasil disimpan.");
    else setMessage(`Gagal menyimpan: ${error ?? "terjadi kesalahan"}`);
  }

  async function handleHeroUpload(file: File) {
    setUploading("hero");
    setMessage("");
    try {
      const { url, error } = await uploadWebsiteImage(file, WEBSITE.HERO_FOLDER);
      if (error || !url) { setMessage(error ?? "Upload gagal."); return; }
      const next = [...(row?.hero_slides ?? []), url];
      setRow((prev) => (prev ? { ...prev, hero_slides: next } : prev));
      setMessage(`Slide hero ke-${next.length} berhasil diunggah.`);
    } finally { setUploading(null); }
  }

  async function handleHeroRemove(idx: number) {
    if (!row) return;
    const url = (row.hero_slides ?? [])[idx];
    if (!url) return;
    await deleteWebsiteImage(url);
    const next = (row.hero_slides ?? []).filter((_, i) => i !== idx);
    setRow({ ...row, hero_slides: next });
    setMessage("Slide hero dihapus.");
  }

  async function handleInfoUpload(file: File) {
    setUploading("info");
    setMessage("");
    try {
      const { url, error } = await uploadWebsiteImage(file, WEBSITE.INFO_FOLDER);
      if (error || !url) { setMessage(error ?? "Upload gagal."); return; }
      setRow((prev) => (prev ? { ...prev, info_image: url } : prev));
      setMessage("Foto info banner berhasil diunggah.");
    } finally { setUploading(null); }
  }

  async function handleInfoRemove() {
    if (!row?.info_image) return;
    await deleteWebsiteImage(row.info_image);
    setRow({ ...row, info_image: null });
    setMessage("Foto info banner dihapus.");
  }

  async function handleGalleryUpload(file: File) {
    setUploading("gallery");
    setMessage("");
    try {
      const { url, error } = await uploadWebsiteImage(file, WEBSITE.GALLERY_FOLDER);
      if (error || !url) { setMessage(error ?? "Upload gagal."); return; }
      const name = file.name.replace(/\.[^.]+$/, "").slice(0, 22) || "Gallery";
      const { ok, error: err2 } = await addWebsiteGalleryItem({ title: name, subtitle: "portfolio", image_path: url, category_id: newGalleryCategory ?? null });
      if (!ok) { setMessage(err2 ?? "Gagal tambah galeri."); return; }
      const galleryRows = await fetchWebsiteGalleryRows();
      setGallery(galleryRows);
      setNewGalleryCategory(null);
      setMessage(`Foto galeri "${name}" berhasil ditambahkan.`);
    } finally { setUploading(null); }
  }

  async function handleGalleryDelete(id: number, imageUrl: string) {
    await deleteWebsiteImage(imageUrl);
    await deleteWebsiteGalleryItem(id);
    setGallery((prev) => prev.filter((g) => g.id !== id));
    setMessage("Item galeri dihapus.");
  }

  async function handleGalleryMove(id: number, direction: 1 | -1) {
    const idx = gallery.findIndex((g) => g.id === id);
    const target = gallery[idx + direction];
    if (!target) return;
    const a = gallery[idx].sort_order;
    const b = target.sort_order;
    await Promise.all([
      updateWebsiteGalleryItem(id, { sort_order: b }),
      updateWebsiteGalleryItem(target.id, { sort_order: a }),
    ]);
    setGallery((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], sort_order: b };
      next[idx + direction] = { ...next[idx + direction], sort_order: a };
      return next.sort((x, y) => x.sort_order - y.sort_order);
    });
  }

  async function handleGalleryToggle(id: number, isActive: boolean) {
    await updateWebsiteGalleryItem(id, { is_active: isActive });
    setGallery((prev) => prev.map((g) => (g.id === id ? { ...g, is_active: isActive } : g)));
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
      {message && (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-sm text-[var(--muted)]">
          {message}
        </div>
      )}

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
            <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Slide Hero</span>
            <p className="mb-2 text-[11px] text-[var(--muted-3)]">Foto banner slider di halaman /website. Maks 6 slide.</p>
            <div className="flex flex-col gap-2">
              {(row.hero_slides ?? []).map((url, idx) => (
                <div key={idx} className="relative flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`hero ${idx + 1}`} className="h-14 w-14 shrink-0 rounded object-cover" />
                  <span className="flex-1 truncate text-[11px] text-[var(--muted)]">{url.split("/").pop()?.split("?").shift()}</span>
                  <button type="button" onClick={() => handleHeroMove(idx, -1)} disabled={idx === 0} className="rounded p-1 hover:bg-[var(--soft)] disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                  <button type="button" onClick={() => handleHeroMove(idx, 1)} disabled={idx === ((row.hero_slides ?? []).length) - 1} className="rounded p-1 hover:bg-[var(--soft)] disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                  <button type="button" onClick={() => handleHeroRemove(idx)} className="rounded bg-red-50 p-1 text-red-500 hover:bg-red-100"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {(row.hero_slides ?? []).length < 6 && (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--line)] py-3 text-[11px] font-semibold text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
                  {uploading === "hero" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  Tambah slide hero
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHeroUpload(f); e.target.value = ""; }} />
                </label>
              )}
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
          Instagram
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
          <Field label="Jumlah Foto Grid">
            <input type="number" value={row.instagram_grid_count ?? 4} onChange={(e) => field("instagram_grid_count", Number(e.target.value))}
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
          <Field label="Nomor WhatsApp">
            <input type="text" value={row.wa_number ?? ""} onChange={(e) => field("wa_number", e.target.value)}
              className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
          </Field>
          <Field label="Label Tombol WhatsApp">
            <input type="text" value={row.wa_button_label ?? ""} onChange={(e) => field("wa_button_label", e.target.value)}
              className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
          </Field>
          <Field label="Label Tombol Booking">
            <input type="text" value={row.booking_label ?? ""} onChange={(e) => field("booking_label", e.target.value)}
              className="w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-[var(--ink)] outline-none backdrop-blur-md transition-all focus:border-[var(--brand)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--brand)]/20" />
          </Field>
          <Field label="URL Booking">
            <input type="text" value={row.booking_url ?? ""} onChange={(e) => field("booking_url", e.target.value)}
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
        <div className="space-y-2">
          {gallery.filter((g) => filterCategory === null || g.category_id === filterCategory).map((g, idx) => (
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
                <button type="button" onClick={async () => { await updateWebsiteGalleryItem(g.id, { title: g.title, subtitle: g.subtitle, link_url: g.link_url, category_id: g.category_id ?? null }); setMessage(`Item "${g.title}" disimpan.`); }} className="rounded border border-[var(--line)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)] hover:bg-[var(--soft)]">Simpan</button>
              </div>
              <button type="button" onClick={() => handleGalleryMove(g.id, -1)} disabled={idx === 0} className="rounded p-1 hover:bg-[var(--soft)] disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
              <button type="button" onClick={() => handleGalleryMove(g.id, 1)} disabled={idx === gallery.length - 1} className="rounded p-1 hover:bg-[var(--soft)] disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
              <button type="button" onClick={() => handleGalleryDelete(g.id, g.image_path)} className="rounded bg-red-50 p-1 text-red-500 hover:bg-red-100"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
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
              if (!ok) { setMessage(error ?? "Gagal buat album"); setAlbumUploading(null); return; }
              const albumRows = await fetchWebsiteAlbums();
              setAlbums(albumRows);
              setNewAlbum({ title: "", couple_name: "", category_id: null });
              setExpandedAlbum(id ?? null);
              setMessage(`Album "${newAlbum.couple_name}" berhasil dibuat. Upload cover & foto sekarang.`);
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
                      await deleteWebsiteAlbum(album.id);
                      setAlbums((prev) => prev.filter((a) => a.id !== album.id));
                      if (expandedAlbum === album.id) setExpandedAlbum(null);
                      setMessage(`Album "${album.couple_name}" dihapus.`);
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
                      <button onClick={async () => { await updateWebsiteAlbum(album.id, { title: album.title, couple_name: album.couple_name, category_id: album.category_id ?? null }); setMessage(`Album "${album.couple_name}" disimpan.`); }}
                        className="rounded-lg bg-[var(--brand)] px-4 py-2 text-[11px] font-bold uppercase text-white hover:bg-[var(--brand-hover)]">Simpan Album</button>

                      {/* Cover image */}
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Cover Album</p>
                        {album.cover_image_path ? (
                          <div className="relative inline-block">
                            <img src={getStoredPublicUrl(album.cover_image_path) ?? album.cover_image_path} alt="" className="h-28 w-28 rounded-lg object-cover" />
                            <button onClick={() => { updateWebsiteAlbum(album.id, { cover_image_path: "" }); setAlbums((prev) => prev.map((a) => a.id === album.id ? { ...a, cover_image_path: "" } : a)); }}
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
                              const { url } = await uploadWebsiteImage(f, WEBSITE.GALLERY_FOLDER);
                              if (url) { await updateWebsiteAlbum(album.id, { cover_image_path: url }); setAlbums((prev) => prev.map((a) => a.id === album.id ? { ...a, cover_image_path: url } : a)); }
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
                            const { url } = await uploadWebsiteImage(f, WEBSITE.GALLERY_FOLDER);
                            if (url) { await addWebsiteAlbumPhoto(album.id, url); setAlbumPhotos(await fetchWebsiteAlbumPhotos()); }
                            setAlbumUploading(null);
                            e.target.value = "";
                          }} />
                        </label>
                        {photos.length > 0 && (
                          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                            {photos.map((photo) => (
                              <div key={photo.id} className="group relative">
                                <img src={photo.image_path} alt="" className="h-20 w-full rounded-lg object-cover sm:h-24" />
                                <button onClick={async () => { await deleteWebsiteAlbumPhoto(photo.id); setAlbumPhotos((prev) => prev.filter((p) => p.id !== photo.id)); }}
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
