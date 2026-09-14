"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowUp, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getWebsiteContent,
  WEBSITE_DEFAULTS,
  type WebsiteContent,
  type WebsiteResolvedSettings,
} from "@/lib/website-content";
import { parseObjectPosition } from "@/lib/site-settings";
import { getPackages } from "@/lib/website";

export default function WebsitePage() {
  const [content, setContent] = useState<WebsiteContent | null>(null);
  const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const [wc, pkgs] = await Promise.all([getWebsiteContent(), getPackages()]);
        setContent(wc);
        setCats(pkgs.categories);
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
  const gallery = content?.gallery ?? [];
  const year = new Date().getFullYear();
  const logoUrl = settings.logo_url ?? null;

  const bannerSlides = (() => {
    const urls = settings.hero_slides.filter(Boolean) as string[];
    return urls.map((url) => ({ url, pos: parseObjectPosition(url, 50, 50) }));
  })();

  const heroDurationMs = Math.max(1200, settings.hero_duration_ms);

  const galleryItems = gallery.length > 0
    ? gallery.slice(0, 9).map((g) => ({
        title: g.title,
        subtitle: g.subtitle,
        href: g.link_url ?? "/website#paket",
        img: g.image_url,
        pos: { x: 50, y: 50 },
      }))
    : [];

  const paddedGalleryItems = galleryItems.length > 0 && galleryItems.length < 9
    ? [...galleryItems, ...Array.from({ length: 9 - galleryItems.length }, (_, k) => galleryItems[k % galleryItems.length])]
    : galleryItems;

  const featureItems = gallery.length > 0
    ? gallery.slice(0, 9).map((g) => ({
        title: g.title,
        subtitle: g.subtitle,
        href: g.link_url ?? "/website#paket",
        img: g.image_url,
        pos: { x: 50, y: 50 },
      }))
    : bannerSlides.length > 0
      ? bannerSlides.slice(0, 9).map((b) => ({
          title: settings.site_name || "Gallery",
          subtitle: "portfolio",
          href: "/website#paket",
          img: b.url,
          pos: b.pos,
        }))
      : [];

  while (featureItems.length < 9 && featureItems.length > 0) {
    featureItems.push({ ...featureItems[featureItems.length % Math.max(featureItems.length, 1)] });
  }

  useEffect(() => {
    if (bannerSlides.length <= 1) return;
    const id = window.setInterval(() => setSlide((i) => (i + 1) % bannerSlides.length), heroDurationMs);
    return () => window.clearInterval(id);
  }, [bannerSlides.length, heroDurationMs]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const len = paddedGalleryItems.length || 1;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setLightboxIdx(null); setZoom(1); }
      if (e.key === "ArrowRight") setLightboxIdx((i) => i !== null ? (i + 1) % len : i);
      if (e.key === "ArrowLeft") setLightboxIdx((i) => i !== null ? (i - 1 + len) % len : i);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [lightboxIdx, paddedGalleryItems.length]);

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
            <Link href="/website" className="hdr-link hdr-active">
              Home
            </Link>
            <a href="#about" className="hdr-link">
              About
            </a>
            <div className="group relative">
              <button type="button" className="hdr-link inline-flex items-center gap-1">
                Portfolio <span className="text-[10px]">▾</span>
              </button>
              <div className="absolute left-0 top-full hidden min-w-[200px] border border-[#D8D5CC] bg-[#F3F2EE] py-2 shadow-sm group-hover:block">
                {cats.slice(0, 6).map((c) => (
                  <a key={c.id} href="#paket" className="block px-4 py-2 text-[12px] tracking-[0.14em] uppercase hover:bg-white">
                    {c.name}
                  </a>
                ))}
                {cats.length === 0 && (
                  <>
                    <a href="#paket" className="block px-4 py-2 text-[12px] tracking-[0.14em] uppercase hover:bg-white">
                      Wedding
                    </a>
                    <a href="#paket" className="block px-4 py-2 text-[12px] tracking-[0.14em] uppercase hover:bg-white">
                      Couple Session
                    </a>
                    <a href="#paket" className="block px-4 py-2 text-[12px] tracking-[0.14em] uppercase hover:bg-white">
                      Prewedding
                    </a>
                  </>
                )}
              </div>
            </div>
          </nav>

          <Link href="/website" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[#D8D5CC]">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={settings.site_name} className="h-full w-full object-contain p-1.5" />
              ) : (
                <span className="font-serif text-xs tracking-[0.18em]">M</span>
              )}
            </span>
            <span className="font-serif text-[14px] tracking-[0.22em] uppercase">{settings.site_name}</span>
          </Link>

          <nav className="flex items-center gap-7">
            <a href="#contact" className="hdr-link">
              Contact Us
            </a>
          </nav>
        </div>

        <div className="flex h-[56px] items-center justify-between px-4 lg:hidden">
          <Link href="/website" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[#D8D5CC]">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={settings.site_name} className="h-full w-full object-contain p-1.5" />
              ) : (
                <span className="font-serif text-xs">M</span>
              )}
            </span>
            <span className="font-serif text-[13px] tracking-[0.18em] uppercase">{settings.site_name}</span>
          </Link>
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
              <Link href="/website" onClick={() => setNavOpen(false)} className="hdr-link py-3 text-base">
                Home
              </Link>
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

      <section className="bg-[#FCFCF9]">
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
                  className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1100ms] ${i === slide ? "opacity-100 scale-100" : "opacity-0 scale-[1.04]"}`}
                  style={{ objectPosition: `${s.pos.x}% ${s.pos.y}%` }}
                />
              ))
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-[#F3F2EE] to-[#E8DDD0]" />
            )}
            <div className="absolute inset-0 bg-black/[0.06]" />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 font-serif text-[12px] tracking-[0.18em] text-white sm:bottom-6 sm:left-6">
              <span>{String(slide + 1).padStart(2, "0")}</span>
              <span className="opacity-60">—</span>
              <span className="opacity-80">{String(Math.max(bannerSlides.length, 3)).padStart(2, "0")}</span>
            </div>
            {bannerSlides.length > 1 && (
              <div className="absolute bottom-4 right-4 flex gap-2 sm:bottom-6 sm:right-6" onClick={(e) => e.stopPropagation()}>
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
        {featureItems.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-[#D8D5CC] bg-white px-6 py-14 text-center">
            <p className="font-serif text-sm tracking-[0.14em] uppercase text-[#1C1C1A]/60">Belum ada portfolio</p>
            <p className="mx-auto mt-2 max-w-[520px] text-sm font-light text-[#1C1C1A]/60">
              Tambah item di Admin → <strong>Website</strong> → Galeri Portfolio.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
            {paddedGalleryItems.map((it, idx) => (
              <button
                key={`${it.title}-${idx}`}
                type="button"
                onClick={() => { setLightboxIdx(idx); setZoom(1); }}
                className="group relative overflow-hidden rounded-[8px] bg-white text-left ring-1 ring-[#D8D5CC]/60 transition hover:ring-[#B9AA96]/70"
              >
                <div className="relative h-[300px] overflow-hidden bg-[#F3F2EE] sm:h-[320px]">
                  {it.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.img}
                      alt={it.title}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]"
                      style={{ objectPosition: `${it.pos.x}% ${it.pos.y}%` }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#B9AA96]">{it.title.slice(0, 1)}</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent opacity-90 transition group-hover:from-black/60" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/10 group-hover:opacity-100">
                    <span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] tracking-[0.14em] uppercase"><ZoomIn className="mr-1.5 inline h-3.5 w-3.5" />Zoom</span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5 text-center">
                    <p className="font-serif text-[18px] tracking-[-0.01em] text-white drop-shadow">{it.title}</p>
                    <p className="mt-1 text-[11px] font-light tracking-[0.18em] text-white/85 uppercase">{it.subtitle}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <div className="relative overflow-hidden rounded-[10px] bg-[#F3F2EE]">
          <div className="absolute inset-0">
            {(() => {
              const bg = settings.info_image || bannerSlides[0]?.url || "";
              return bg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bg} alt="" className="h-full w-full object-cover" />
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
                href="#contact"
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
        <div className="rounded-[10px] border border-[#D8D5CC]/40 bg-white p-8 text-center sm:p-10">
          <p className="font-serif text-[11px] tracking-[0.2em] uppercase text-[#1C1C1A]/60">Follow our Instagram</p>
          <a
            href={settings.instagram_url || "https://instagram.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-[18px] font-light tracking-wide hover:underline"
          >
            @{settings.instagram_handle}
          </a>
        </div>
      </section>

      <section id="contact" className="border-t border-[#D8D5CC]/30 bg-[#F3F2EE]/40">
        <div className="mx-auto max-w-[1200px] px-6 py-10 text-center sm:py-12">
          <h3 className="font-serif text-[20px] tracking-[-0.01em]">{settings.contact_heading}</h3>
          <p className="mx-auto mt-2 max-w-[560px] whitespace-pre-line text-sm font-light leading-[1.7] text-[#1C1C1A]/70">
            {settings.contact_text}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={`https://wa.me/${String(settings.wa_number || "6281234567890").replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#B9AA96] px-7 py-3 text-xs font-medium uppercase tracking-[0.16em] text-white hover:bg-[#6A655D]"
            >
              {settings.wa_button_label}
            </a>
            <Link
              href={settings.booking_url || "/?booking=true"}
              className="rounded-full border border-[#D8D5CC] bg-white px-7 py-3 text-xs font-medium uppercase tracking-[0.16em] hover:bg-[#FCFCF9]"
            >
              {settings.booking_label}
            </Link>
          </div>
        </div>
      </section>

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
                className="hover:text-[#1C1C1A]"
              >
                IG
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="Tiktok" className="hover:text-[#1C1C1A]">
                TT
              </a>
              <a
                href={`https://wa.me/${String(settings.wa_number || "").replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="hover:text-[#1C1C1A]"
              >
                WA
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style>{`.hdr-link{font-family: ui-serif, Georgia, serif; font-size:12.5px; letter-spacing:0.14em; text-transform:uppercase; color:#1C1C1A; opacity:0.88} .hdr-link:hover{opacity:1} .hdr-active{opacity:1} @keyframes lbIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>

      {lightboxIdx !== null && paddedGalleryItems[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/85 backdrop-blur-sm"
          onClick={() => { setLightboxIdx(null); setZoom(1); }}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6" onClick={(e) => e.stopPropagation()}>
            <p className="truncate font-serif text-sm tracking-wide">
              {paddedGalleryItems[lightboxIdx].title} <span className="font-sans text-xs opacity-60">— {paddedGalleryItems[lightboxIdx].subtitle}</span>
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
              <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
              <button type="button" onClick={() => { setLightboxIdx(null); setZoom(1); }} className="rounded-full bg-white p-2 text-black hover:bg-zinc-100" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-8" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => { setLightboxIdx((i) => i !== null ? (i - 1 + paddedGalleryItems.length) % paddedGalleryItems.length : i); setZoom(1); }}
              className="absolute left-2 z-10 rounded-full bg-white/15 p-2 text-white backdrop-blur hover:bg-white/25 sm:left-6"
              aria-label="Prev"
            ><ChevronLeft className="h-6 w-6" /></button>

            <div className="max-h-[78vh] max-w-[92vw] overflow-auto sm:max-h-[82vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={paddedGalleryItems[lightboxIdx].img}
                alt={paddedGalleryItems[lightboxIdx].title}
                className="max-h-[78vh] max-w-[92vw] cursor-zoom-in select-none rounded-[8px] object-contain shadow-2xl transition duration-300 will-change-transform sm:max-h-[82vh]"
                style={{ transform: `scale(${zoom})`, animation: "lbIn 260ms ease-out" }}
                onClick={() => setZoom((z) => (z >= 2 ? 1 : +(z + 0.5).toFixed(2)))}
                draggable={false}
              />
            </div>

            <button
              type="button"
              onClick={() => { setLightboxIdx((i) => i !== null ? (i + 1) % paddedGalleryItems.length : i); setZoom(1); }}
              className="absolute right-2 z-10 rounded-full bg-white/15 p-2 text-white backdrop-blur hover:bg-white/25 sm:right-6"
              aria-label="Next"
            ><ChevronRight className="h-6 w-6" /></button>
          </div>

          <div className="flex justify-center gap-2 px-4 pb-4" onClick={(e) => e.stopPropagation()}>
            {paddedGalleryItems.slice(0, 12).map((it, i) => (
              <button key={i} type="button" onClick={() => { setLightboxIdx(i); setZoom(1); }}
                className={`h-1.5 rounded-full transition-all ${i === lightboxIdx ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/70"}`} aria-label={`Go ${i+1}`} />
            ))}
          </div>
          <p className="pb-3 text-center text-xs tracking-[0.14em] uppercase text-white/60">{lightboxIdx + 1} / {paddedGalleryItems.length} • klik foto untuk zoom • Esc tutup • ← → navigasi</p>
        </div>
      )}
    </div>
  );
}
