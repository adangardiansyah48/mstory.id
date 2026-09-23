"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowUp, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Instagram, Youtube, Facebook, MessageCircle, Globe } from "lucide-react";
import {
  getWebsiteContent,
  peekWebsiteContent,
  WEBSITE_DEFAULTS,
  type WebsiteContent,
  type WebsiteResolvedSettings,
} from "@/lib/website-content";
import { getStoredPublicUrl, parseObjectPosition, getSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { getPackages } from "@/lib/website";
import { normalizeWhatsAppNumber } from "@/lib/utils";

export default function WebsitePage() {
  const cachedInitial = peekWebsiteContent();
  const [content, setContent] = useState<WebsiteContent | null>(() =>
    cachedInitial ?? null,
  );
  const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(() => cachedInitial === null);
  const [slide, setSlide] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [navLogoUrl, setNavLogoUrl] = useState<string | null>(null);
  const [navLogoPos, setNavLogoPos] = useState({ x: 50, y: 30 });
  const [albumLightboxIdx, setAlbumLightboxIdx] = useState<number | null>(null);
  const [albumPhotoIdx, setAlbumPhotoIdx] = useState(0);
  const [albumZoom, setAlbumZoom] = useState(1);
  const [testimonials, setTestimonials] = useState<{ client_name: string; rating: number; message: string; created_at: string }[]>([]);
  const [fanpageSettings, setFanpageSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [wc, pkgs, tm, fp] = await Promise.all([
          getWebsiteContent(),
          getPackages().catch(() => ({ categories: [] as { id: number; name: string }[], subCategories: [] as never[], packages: [] as never[] })),
          fetch("/api/testimonials").then((r) => r.json()).catch(() => ({ data: [] })),
          getSiteSettings().catch(() => null),
        ]);
        setContent(wc);
        setCats(pkgs.categories);
        setTestimonials(tm.data ?? []);
        if (fp) setFanpageSettings(fp as SiteSettings);
        let logo: string | null = wc.settings.logo_url ?? null;
        if (!logo && fp) {
          try { logo = getStoredPublicUrl((fp as SiteSettings).logo_url); } catch { /* fallback kosong */ }
        }
        const full = logo ? (getStoredPublicUrl(logo) ?? logo) : null;
        setNavLogoUrl(full);
        if (full) setNavLogoPos(parseObjectPosition(full, 50, 30));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const settings: WebsiteResolvedSettings =
    content?.settings ??
    ({
      ...WEBSITE_DEFAULTS,
      updated_at: new Date().toISOString(),
    } as WebsiteResolvedSettings);
  const year = new Date().getFullYear();
  const logoUrl = navLogoUrl ?? settings.logo_url ?? null;
  const waNumberRaw = settings.wa_number || fanpageSettings?.wa_number || "6281234567890";
  const waNumber = normalizeWhatsAppNumber(waNumberRaw);
  const tiktokUrl = fanpageSettings?.tiktok_url || "https://tiktok.com";
  const facebookUrl = fanpageSettings?.facebook_url || "https://facebook.com";
  const youtubeUrl = fanpageSettings?.youtube_url || "https://youtube.com";

  const bannerSlides = (() => {
    const urls = settings.hero_slides.filter(Boolean) as string[];
    return urls.map((url) => ({ url, pos: parseObjectPosition(url, 50, 50) }));
  })();

  const heroDurationMs = Math.max(1200, settings.hero_duration_ms);

  const filteredAlbums = (content?.albums ?? []).filter((a) => activeCategory === null || a.category_id === activeCategory);

  useEffect(() => {
    if (bannerSlides.length <= 1) return;
    const id = window.setInterval(() => setSlide((i) => (i + 1) % bannerSlides.length), heroDurationMs);
    return () => window.clearInterval(id);
  }, [bannerSlides.length, heroDurationMs]);

  useEffect(() => {
    if (albumLightboxIdx === null) return;
    const album = content?.albums?.find((a) => a.id === albumLightboxIdx);
    const len = album?.photos.length || 1;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setAlbumLightboxIdx(null); setAlbumZoom(1); }
      if (e.key === "ArrowRight") setAlbumPhotoIdx((i) => (i + 1) % len);
      if (e.key === "ArrowLeft") setAlbumPhotoIdx((i) => (i - 1 + len) % len);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [albumLightboxIdx, content?.albums]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FCFCF9]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#B9AA96] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-[#1C1C1A]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Tenor+Sans&family=Roboto:wght@300;400&display=swap');`}</style>

      <header className="sticky top-0 z-40 border-b border-[#D8D5CC]/0 bg-[#FCFCF9]">
        <div className="mx-auto hidden h-[68px] max-w-[1200px] items-center justify-between px-6 lg:flex">
          <nav className="flex items-center gap-7">
            <a href="#hero" className="hdr-link hdr-active">
              Home
            </a>
            <a href="#about" className="hdr-link">
              About
            </a>
            <div className="group relative">
              <button type="button" className="hdr-link inline-flex items-center gap-1">
                Portfolio <span className="text-[10px]">▾</span>
              </button>
              <div className="absolute left-0 top-full hidden min-w-[200px] border border-[#D8D5CC] bg-[#F3F2EE] py-2 shadow-sm group-hover:block">
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className={`block w-full px-4 py-2 text-left text-[12px] tracking-[0.14em] uppercase hover:bg-white ${activeCategory === null ? "bg-white font-semibold" : ""}`}
                >
                  Semua
                </button>
                {cats.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(c.id);
                      document.getElementById("paket")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`block w-full px-4 py-2 text-left text-[12px] tracking-[0.14em] uppercase hover:bg-white ${activeCategory === c.id ? "bg-white font-semibold" : ""}`}
                  >
                    {c.name}
                  </button>
                ))}
                {cats.length === 0 && (
                  <>
                    <button type="button" onClick={() => { setActiveCategory(null); document.getElementById("paket")?.scrollIntoView({ behavior: "smooth" }); }} className="block w-full px-4 py-2 text-left text-[12px] tracking-[0.14em] uppercase hover:bg-white">
                      Wedding
                    </button>
                    <button type="button" onClick={() => { setActiveCategory(null); document.getElementById("paket")?.scrollIntoView({ behavior: "smooth" }); }} className="block w-full px-4 py-2 text-left text-[12px] tracking-[0.14em] uppercase hover:bg-white">
                      Couple Session
                    </button>
                    <button type="button" onClick={() => { setActiveCategory(null); document.getElementById("paket")?.scrollIntoView({ behavior: "smooth" }); }} className="block w-full px-4 py-2 text-left text-[12px] tracking-[0.14em] uppercase hover:bg-white">
                      Prewedding
                    </button>
                  </>
                )}
              </div>
            </div>
          </nav>

          <a href="#hero" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[#D8D5CC]">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={settings.site_name} className="h-full w-full object-contain p-1.5" style={{ objectPosition: `${navLogoPos.x}% ${navLogoPos.y}%` }} />
              ) : (
                <span className="font-serif text-xs tracking-[0.18em]">M</span>
              )}
            </span>
            <span className="font-serif text-[14px] tracking-[0.22em] uppercase">{settings.site_name}</span>
          </a>

          <nav className="flex items-center gap-7">
            <a href="#contact" className="hdr-link">
              Contact Us
            </a>
          </nav>
        </div>

        <div className="flex h-[56px] items-center justify-between px-4 lg:hidden">
          <a href="#hero" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[#D8D5CC]">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={settings.site_name} className="h-full w-full object-contain p-1.5" style={{ objectPosition: `${navLogoPos.x}% ${navLogoPos.y}%` }} />
              ) : (
                <span className="font-serif text-xs">M</span>
              )}
            </span>
            <span className="font-serif text-[13px] tracking-[0.18em] uppercase">{settings.site_name}</span>
          </a>
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setNavOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D8D5CC]"
          >
            {navOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        {navOpen && (
          <div className="border-t border-[#D8D5CC] bg-[#FCFCF9] px-4 py-5 lg:hidden">
            <div className="flex flex-col">
              <a href="#hero" onClick={() => setNavOpen(false)} className="hdr-link py-3 text-base">
                Home
              </a>
              <a href="#about" onClick={() => setNavOpen(false)} className="hdr-link py-3 text-base">
                About
              </a>
              <a href="#paket" onClick={() => setNavOpen(false)} className="hdr-link py-3 text-base">
                Portfolio
              </a>
              <a href="#contact" onClick={() => setNavOpen(false)} className="hdr-link py-3 text-base">
                Contact Us
              </a>
            </div>
          </div>
        )}
      </header>

      <section id="hero" className="bg-[#FCFCF9]">
        <div className="mx-auto max-w-[1200px] px-0 sm:px-6">
          <div
            className="relative h-[58vh] min-h-[420px] overflow-hidden bg-[#F3F2EE] sm:h-[64vh] sm:min-h-[560px] sm:rounded-[6px]"
          >
            {bannerSlides.length > 0 ? (
              bannerSlides.map((s, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${s.url}-${i}`}
                  src={s.url}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1100ms] ${i === slide ? "opacity-100 scale-100" : "opacity-0 scale-[1.04]"}`}
                  style={{ objectPosition: `${s.pos.x}% ${s.pos.y}%` }}
                />
              ))
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-[#F3F2EE] to-[#E8DDD0]" />
            )}
            <div className="absolute inset-0 bg-black/[0.06]" />
            <div className="absolute bottom-4 right-4 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
              <div className="flex items-center gap-2 font-serif text-[12px] tracking-[0.18em] text-white">
                <span>{String(slide + 1).padStart(2, "0")}</span>
                <span className="opacity-60">—</span>
                <span className="opacity-80">{String(Math.max(bannerSlides.length, 1)).padStart(2, "0")}</span>
              </div>
              {bannerSlides.length > 1 && (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  {bannerSlides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Go ${i + 1}`}
                      onClick={() => setSlide(i)}
                      className={`h-1 rounded-full transition-all ${i === slide ? "w-8 bg-white" : "w-3 bg-white/60"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-[760px] px-6 py-10 text-center sm:py-14">
        <h1 className="font-serif text-[30px] leading-[1.15] tracking-[-0.02em] sm:text-[36px]">{settings.intro_heading}</h1>
        <p className="mx-auto mt-5 max-w-[620px] whitespace-pre-line text-[14px] font-light leading-[1.9] text-[#1C1C1A]/80 sm:text-[15px]">
          {settings.intro_text}
        </p>
      </section>

      <div className="mx-auto max-w-[760px] px-6">
        <div className="mx-auto h-px w-[180px] bg-[#D8D5CC] sm:w-[220px]" />
      </div>

<section id="paket" className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
        {cats.length > 0 && (
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`rounded-full border px-5 py-2 text-xs font-medium uppercase tracking-[0.14em] transition ${activeCategory === null ? "border-[#1C1C1A] bg-[#1C1C1A] text-white" : "border-[#D8D5CC] bg-white text-[#1C1C1A]/70 hover:bg-[#F3F2EE]"}`}
            >
              Semua
            </button>
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={`rounded-full border px-5 py-2 text-xs font-medium uppercase tracking-[0.14em] transition ${activeCategory === c.id ? "border-[#1C1C1A] bg-[#1C1C1A] text-white" : "border-[#D8D5CC] bg-white text-[#1C1C1A]/70 hover:bg-[#F3F2EE]"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {filteredAlbums.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {filteredAlbums.map((album) => (
              <button
                key={album.id}
                type="button"
                onClick={() => { setAlbumLightboxIdx(album.id); setAlbumPhotoIdx(0); setAlbumZoom(1); }}
                className="group relative overflow-hidden rounded-[10px] bg-white text-left ring-1 ring-[#D8D5CC]/60 transition hover:ring-[#B9AA96]/70"
              >
                <div className="relative h-[320px] overflow-hidden bg-[#F3F2EE]">
                  {album.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={album.cover_image_url} alt={album.couple_name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#B9AA96]">{album.couple_name.slice(0, 1)}</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent opacity-90 transition group-hover:from-black/60" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-center">
                    <p className="font-serif text-[18px] tracking-[-0.01em] text-white drop-shadow">{album.couple_name}</p>
                    <p className="mt-1 text-[11px] font-light tracking-[0.18em] text-white/85 uppercase">
                      {cats.find((c) => c.id === album.category_id)?.name ?? album.title} · {album.photos.length} foto
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-[10px] border border-dashed border-[#D8D5CC] bg-white px-6 py-14 text-center">
            <p className="font-serif text-sm tracking-[0.14em] uppercase text-[#1C1C1A]/60">Belum ada portfolio</p>
            <p className="mx-auto mt-2 max-w-[520px] text-sm font-light text-[#1C1C1A]/60">
              Tambah album di Admin → <strong>Website</strong> → Album Portfolio.
            </p>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <div className="relative overflow-hidden rounded-[10px] bg-[#F3F2EE]">
          <div className="absolute inset-0">
            {(() => {
              const bg = settings.info_image || "";
              return bg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bg} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : null;
            })()}
            <div className="absolute inset-0 bg-[#FCFCF9]/70 sm:bg-[#FCFCF9]/60" />
          </div>
          <div className="relative grid grid-cols-1 gap-6 px-6 py-10 sm:grid-cols-2 sm:px-10 sm:py-14">
            <div>
              <h2 className="font-serif text-[28px] leading-[1.1] tracking-[-0.02em] sm:text-[34px]">{settings.info_heading}</h2>
              <div className="mt-4 h-px w-16 bg-[#D8D5CC]" />
              <p className="mt-4 max-w-[460px] whitespace-pre-line text-[14px] font-light leading-[1.8] text-[#1C1C1A]/80">
                {settings.info_text}
              </p>
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(settings.info_button_label || "Halo Mstory.id")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex rounded-full bg-[#1C1C1A] px-6 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-white hover:bg-black"
              >
                {settings.info_button_label}
              </a>
            </div>
            <div className="hidden sm:block" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <a
          href={settings.instagram_url || "https://instagram.com"}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-[10px] border border-[#D8D5CC]/40 bg-white p-8 text-center transition hover:border-[#B9AA96]/50 sm:p-10"
        >
          <p className="font-serif text-[11px] tracking-[0.2em] uppercase text-[#1C1C1A]/60">Follow our Instagram</p>
          <p className="mt-2 inline-block text-[18px] font-light tracking-wide hover:underline">@{settings.instagram_handle}</p>
        </a>
      </section>

      <section id="contact" className="border-t border-[#D8D5CC]/30 bg-[#F3F2EE]/40">
        <div className="mx-auto max-w-[1200px] px-6 py-10 text-center sm:py-12">
          <h3 className="font-serif text-[20px] tracking-[-0.01em]">{settings.contact_heading}</h3>
          <p className="mx-auto mt-2 max-w-[560px] whitespace-pre-line text-sm font-light leading-[1.7] text-[#1C1C1A]/70">
            {settings.contact_text}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#B9AA96] px-7 py-3 text-xs font-medium uppercase tracking-[0.16em] text-white hover:bg-[#6A655D]"
            >
              {settings.wa_button_label}
            </a>
            <Link
              href="/"
              className="rounded-full border border-[#D8D5CC] bg-white px-7 py-3 text-xs font-medium uppercase tracking-[0.16em] text-[#1C1C1A]/70 hover:bg-[#F3F2EE]"
            >
              Fanspage
            </Link>
          </div>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-4 py-10 text-center sm:px-6 sm:py-14">
          <p className="font-serif text-[11px] tracking-[0.2em] uppercase text-[#1C1C1A]/60">Ulasan</p>
          <h3 className="mt-2 font-serif text-[28px] tracking-[-0.02em]">Testimoni Pelanggan</h3>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div key={`${t.client_name}-${t.created_at}`} className="rounded-[10px] border border-[#D8D5CC]/60 bg-white p-5 text-left">
                <p className="text-[13px] tracking-[0.12em] text-amber-500">
                  {"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}
                </p>
                <p className="mt-3 text-sm font-light leading-relaxed text-[#1C1C1A]/80">{t.message}</p>
                <p className="mt-3 font-serif text-sm">{t.client_name}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-[#D8D5CC]/60 bg-[#FCFCF9]">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex flex-col gap-6 py-8 sm:flex-row sm:items-start sm:justify-between">
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] tracking-[0.14em] uppercase">
              <Link href="/website" className="hdr-link hdr-active">
                Home
              </Link>
              <a href="#about" className="hdr-link">
                About
              </a>
              <a href="#paket" className="hdr-link">
                Portfolio
              </a>
            </nav>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] tracking-[0.14em] uppercase">
              <a href="#contact" className="hdr-link">
                Contact Us
              </a>
              <Link href="/website" className="hdr-link">
                {settings.site_name}
              </Link>
            </nav>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D8D5CC] sm:ml-4"
            >
              <ArrowUp className="h-4 w-4" />
            </a>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[#D8D5CC] py-5 sm:flex-row">
            <p className="text-center text-xs font-light text-[#1C1C1A]/60 sm:text-left">
              {settings.footer_copyright} © {year} {settings.site_name}
            </p>
            <div className="flex items-center gap-3 text-[#1C1C1A]/60">
              <a
                href={settings.instagram_url || "https://instagram.com"}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D8D5CC] hover:border-[#1C1C1A] hover:text-[#1C1C1A]"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" aria-label="Tiktok" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D8D5CC] hover:border-[#1C1C1A] hover:text-[#1C1C1A]">
                TT
              </a>
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D8D5CC] hover:border-[#1C1C1A] hover:text-[#1C1C1A]">
                <Facebook className="h-4 w-4" />
              </a>
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D8D5CC] hover:border-[#1C1C1A] hover:text-[#1C1C1A]">
                <Youtube className="h-4 w-4" />
              </a>
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#B9AA96] text-white hover:bg-[#1C1C1A]"
              >
                WA
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style>{`.hdr-link{font-family: ui-serif, Georgia, serif; font-size:12.5px; letter-spacing:0.14em; text-transform:uppercase; color:#1C1C1A; opacity:0.88} .hdr-link:hover{opacity:1} .hdr-active{opacity:1} @keyframes lbIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>

      {/* Album Lightbox */}
      {albumLightboxIdx !== null && (() => {
        const album = content?.albums?.find((a) => a.id === albumLightboxIdx);
        if (!album || album.photos.length === 0) return null;
        const photos = album.photos;
        const catLabel = cats.find((c) => c.id === album.category_id)?.name ?? album.title;
        return (
          <div
            className="fixed inset-0 z-[100] flex flex-col bg-black/85 backdrop-blur-sm"
            onClick={() => { setAlbumLightboxIdx(null); setAlbumZoom(1); }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6" onClick={(e) => e.stopPropagation()}>
              <p className="truncate font-serif text-sm tracking-wide">
                {album.couple_name} <span className="font-sans text-xs opacity-60">— {catLabel}</span>
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setAlbumZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
                <button type="button" onClick={() => setAlbumZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
                <button type="button" onClick={() => { setAlbumLightboxIdx(null); setAlbumZoom(1); }} className="rounded-full bg-white p-2 text-black hover:bg-zinc-100" aria-label="Close"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-8" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => { setAlbumPhotoIdx((i) => (i - 1 + photos.length) % photos.length); setAlbumZoom(1); }}
                className="absolute left-2 z-10 rounded-full bg-white/15 p-2 text-white backdrop-blur hover:bg-white/25 sm:left-6"
                aria-label="Prev"
              ><ChevronLeft className="h-6 w-6" /></button>

              <div className="max-h-[78vh] max-w-[92vw] overflow-auto sm:max-h-[82vh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photos[albumPhotoIdx].image_path}
                  alt={`${album.couple_name} - ${albumPhotoIdx + 1}`}
                  className="max-h-[78vh] max-w-[92vw] cursor-zoom-in select-none rounded-[8px] object-contain shadow-2xl transition duration-300 will-change-transform sm:max-h-[82vh]"
                  style={{ transform: `scale(${albumZoom})`, animation: "lbIn 260ms ease-out" }}
                  onClick={() => setAlbumZoom((z) => (z >= 2 ? 1 : +(z + 0.5).toFixed(2)))}
                  draggable={false}
                />
              </div>

              <button
                type="button"
                onClick={() => { setAlbumPhotoIdx((i) => (i + 1) % photos.length); setAlbumZoom(1); }}
                className="absolute right-2 z-10 rounded-full bg-white/15 p-2 text-white backdrop-blur hover:bg-white/25 sm:right-6"
                aria-label="Next"
              ><ChevronRight className="h-6 w-6" /></button>
            </div>

            <div className="flex justify-center gap-2 px-4 pb-4" onClick={(e) => e.stopPropagation()}>
              {photos.slice(0, 15).map((_, i) => (
                <button key={i} type="button" onClick={() => { setAlbumPhotoIdx(i); setAlbumZoom(1); }}
                  className={`h-1.5 rounded-full transition-all ${i === albumPhotoIdx ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/70"}`} aria-label={`Go ${i+1}`} />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
