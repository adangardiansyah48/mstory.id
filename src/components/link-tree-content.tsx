"use client";

import React, { useEffect, useState } from "react";
import {
  Camera,
  Search,
  MessageCircle,
  Globe,
  Instagram,
  Music2,
  Youtube,
} from "lucide-react";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { StatusChecker } from "@/components/status-checker";
import { useFanpageSettings } from "@/lib/use-site-settings";
import { getStoredPublicUrl, parseObjectPosition } from "@/lib/site-settings";
import { normalizeWhatsAppNumber } from "@/lib/utils";

export function LinkTreeContent() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const { settings } = useFanpageSettings();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("booking") === "true") setBookingOpen(true);
  }, []);

  const bannerSlides = (() => {
    const raw =
      Array.isArray(settings.banner_urls) && settings.banner_urls.length > 0
        ? settings.banner_urls
        : settings.banner_url
          ? [settings.banner_url]
          : [];
    return raw
      .map((url) => getStoredPublicUrl(url))
      .filter((u): u is string => Boolean(u))
      .map((url) => ({ url, pos: parseObjectPosition(url, 50, 50) }));
  })();
  const logoUrl = getStoredPublicUrl(settings.logo_url);
  const logoPos = parseObjectPosition(logoUrl, 50, 30);
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    if (bannerSlides.length <= 1) return;
    const id = window.setInterval(() => {
      setBannerIndex((i) => (i + 1) % bannerSlides.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, [bannerSlides.length]);

  const waNumber = normalizeWhatsAppNumber(
    settings.wa_number || "6281234567890",
  );
  const subtitle = settings.subtitle || "Photography & Videography";
  const tagline = settings.tagline || "tell us your story journey";
  const statusLabel = settings.status_label || "Cek Status Edit & Cetak Foto";

  return (
    <>
      {/* Ambient Floating Gradient Blur Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -left-20 -top-16 h-80 w-80 rounded-full bg-[var(--soft-2)]/40 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-[var(--soft)]/45 blur-3xl" />
        <div className="absolute bottom-12 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[var(--soft-2)]/50 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-between pb-10">
        {/* Cover Banner & Profile Header */}
        <header className="w-full">
          <div className="relative h-48 w-full overflow-hidden rounded-b-[2.5rem] shadow-sm">
            {bannerSlides.length > 0 ? (
              bannerSlides.map((slide, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={slide.url}
                  src={slide.url}
                  alt="Mstory.id Studio Cover"
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                    i === bannerIndex ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ objectPosition: `${slide.pos.x}% ${slide.pos.y}%` }}
                />
              ))
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-[var(--soft-2)] via-[var(--brand)]/50 to-[var(--bg)]">
                <div className="absolute inset-0 flex items-center justify-center opacity-40">
                  <Camera className="h-20 w-20 text-[var(--muted)]" strokeWidth={1.5} />
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[var(--bg)]/60" />
            {bannerSlides.length > 1 && (
              <div className="absolute bottom-3 right-3 z-10 flex gap-1.5">
                {bannerSlides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Banner ${i + 1}`}
                    onClick={() => setBannerIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === bannerIndex ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="-mt-14 flex flex-col items-center px-4 text-center">
            <div className="group relative animate-logo-breathe">
              <div className="h-28 w-28 overflow-hidden rounded-full bg-[var(--card)] shadow-lg ring-4 ring-white transition-transform duration-300 group-hover:scale-105">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Mstory.id Studio Avatar"
                    className="h-full w-full object-contain p-2"
                    style={{ objectPosition: `${logoPos.x}% ${logoPos.y}%` }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--soft-2)] text-3xl font-serif text-[var(--brand)]">
                    M
                  </div>
                )}
              </div>
            </div>

            <h1 className="sr-only">Mstory.id</h1>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              {subtitle}
            </p>
            <p className="mt-2 max-w-xs font-serif text-sm italic leading-relaxed text-[var(--muted)]">
              &ldquo;{tagline}&rdquo;
            </p>

            <div className="mt-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-2)]">
                WEDDING&nbsp;PREWEDDING&nbsp;ENGAGEMENT&nbsp;EVENT
              </p>
            </div>
          </div>
        </header>

        {/* Main Interactive Button Stack */}
        <main className="mt-6 flex w-full flex-col gap-3.5 px-4">
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="glass fade-in-item group flex min-h-[48px] items-center justify-between rounded-2xl px-4 py-4 text-[13px] font-medium text-[var(--ink)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="flex items-center gap-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line-2)] bg-[var(--soft)]">
                <MessageCircle className="h-5 w-5" />
              </span>
              <span className="text-left">
                <span className="block text-[12px] font-bold uppercase tracking-wider text-[var(--ink)]">
                  WHATSAPP ADMIN
                </span>
                <span className="mt-0.5 block text-[11px] font-normal normal-case tracking-normal text-[var(--muted)]">
                  {settings.wa_label || "Konsultasi langsung & kustom konsep acara"}
                </span>
              </span>
            </span>
            <span className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)]/5 text-[var(--muted-2)] transition-all duration-300 group-hover:bg-[var(--ink)] group-hover:text-white group-hover:translate-x-1">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </a>

          <a
            href="/website"
            className="glass fade-in-item group flex min-h-[48px] items-center justify-between rounded-2xl px-4 py-4 text-[13px] font-medium text-[var(--ink)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{ animationDelay: "0.2s" }}
          >
            <span className="flex items-center gap-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line-2)] bg-[var(--soft)]">
                <Globe className="h-5 w-5" />
              </span>
              <span className="text-left">
                <span className="block text-[12px] font-bold uppercase tracking-wider text-[var(--ink)]">
                  WEBSITE RESMI
                </span>
                <span className="mt-0.5 block text-[11px] font-normal normal-case tracking-normal text-[var(--muted)]">
                  Galeri Portofolio & Telusuri karya-karya kami
                </span>
              </span>
            </span>
            <span className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)]/5 text-[var(--muted-2)] transition-all duration-300 group-hover:bg-[var(--ink)] group-hover:text-white group-hover:translate-x-1">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </a>

          <button
            onClick={() => setStatusOpen(true)}
            className="glass fade-in-item group flex min-h-[48px] cursor-pointer items-center justify-between rounded-2xl px-4 py-4 text-[13px] font-medium text-[var(--ink)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{ animationDelay: "0.3s" }}
          >
            <span className="flex items-center gap-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line-2)] bg-[var(--soft)]">
                <Search className="h-5 w-5" />
              </span>
              <span className="text-left">
                <span className="block text-[12px] font-bold uppercase tracking-wider text-[var(--ink)]">
                  CEK STATUS EDIT &amp; CETAK FOTO
                </span>
                <span className="mt-0.5 block text-[11px] font-normal normal-case tracking-normal text-[var(--muted)]">
                  {statusLabel}
                </span>
              </span>
            </span>
            <span className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)]/5 text-[var(--muted-2)] transition-all duration-300 group-hover:bg-[var(--ink)] group-hover:text-white group-hover:translate-x-1">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        </main>

        {/* Social Media Icon Grid */}
        <section className="mt-8 flex w-full flex-col items-center px-4">
          <p className="mb-3 text-[10.5px] font-medium uppercase tracking-widest text-[var(--muted-3)]">
            Connect With Our Gallery
          </p>
          <div className="flex w-full items-center justify-center gap-3.5">
            <SocialIconBtn
              href={settings.instagram_url || "https://instagram.com"}
              label="Instagram Mstory.id"
            >
              <Instagram className="h-5 w-5" />
            </SocialIconBtn>
            <SocialIconBtn
              href={settings.tiktok_url || "https://tiktok.com"}
              label="TikTok Mstory.id"
            >
              <Music2 className="h-5 w-5" />
            </SocialIconBtn>
            <SocialIconBtn
              href={settings.facebook_url || "https://facebook.com"}
              label="Facebook Mstory.id"
            >
              <FacebookIcon className="h-5 w-5" />
            </SocialIconBtn>
            <SocialIconBtn
              href={settings.youtube_url || "https://youtube.com"}
              label="YouTube Mstory.id"
            >
              <Youtube className="h-5 w-5" />
            </SocialIconBtn>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 px-4 text-center">
          <div className="mx-auto mb-3 h-px w-16 bg-[var(--line-4)]/60" />
          <p className="text-[11px] tracking-wide text-[var(--muted-3)]">
            © {new Date().getFullYear()} Mstory.id —{" "}
            {settings.footer_text ||
              settings.city_text ||
              "Photography & Videography"}
          </p>
        </footer>
      </div>

      {statusOpen && <StatusChecker open={true} onClose={() => setStatusOpen(false)} />}
      {bookingOpen && <BookingWizard open={true} onClose={() => setBookingOpen(false)} waNumber={waNumber} transportFeeDefault={settings.transport_fee ?? 250000} />}
    </>
  );
}

function SocialIconBtn({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      aria-label={label}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="glass-inset flex h-12 w-12 items-center justify-center rounded-full text-[var(--ink)] transition-all duration-300 active:scale-95"
    >
      {children}
    </a>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}