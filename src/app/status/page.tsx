"use client";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { StatusSearchContent } from "@/components/status-checker";
import { useFanpageSettings } from "@/lib/use-site-settings";

export default function StatusPage() {
  useFanpageSettings();
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[var(--bg)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -left-20 -top-16 h-80 w-80 rounded-full bg-[#EADFD0]/40 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-[#E4D9C8]/45 blur-3xl" />
        <div className="absolute bottom-12 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#EFE6D8]/50 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:text-[var(--muted)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Beranda
          </Link>
          <span className="font-serif text-base font-semibold tracking-tight text-[var(--ink)]">
            Mstory.id
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-md flex-1 pb-8 pt-2">
        <StatusSearchContent />
      </main>

      <footer className="relative z-10 border-t border-[var(--line)] bg-[var(--bg)]/80 py-5">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-2 px-5">
          <p className="text-[11px] tracking-wide text-[var(--muted-2)]">
            Mstory.id · Photography & Videography
          </p>
          <Link
            href="/"
            className="glass-inset flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-[var(--ink)]"
          >
            <Home className="h-3.5 w-3.5" />
            Kembali ke Beranda
          </Link>
        </div>
      </footer>
    </div>
  );
}