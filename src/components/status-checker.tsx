"use client";

import { useState } from "react";
import {
  Brush,
  ExternalLink,
  Loader2,
  PackageSearch,
  Printer,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatShortDate,
  normalizeWhatsAppNumber,
} from "@/lib/utils";
import type { BookingWithRelations } from "@/lib/types";
import {
  PRINTING_STATUS_LABELS,
  RETOUCH_STATUS_LABELS,
  STATUS_LABELS,
} from "@/lib/types";

interface StatusCheckerProps {
  open: boolean;
  onClose: () => void;
}

type SearchResult = BookingWithRelations | null;
type SearchState = "idle" | "loading" | "found" | "notfound" | "error";

const STATUS_STYLES: Record<string, string> = {
  MENUNGGU_DP: "bg-amber-100 text-amber-800",
  MENUNGGU_PELUNASAN: "bg-blue-100 text-blue-800",
  LUNAS: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export function StatusSearchPanel() {
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [result, setResult] = useState<SearchResult>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSearch() {
    if (!query.trim()) return;
    setSearchState("loading");
    setResult(null);
    setErrorMsg("");

    const supabase = createClient();
    if (!supabase) {
      setSearchState("error");
      setErrorMsg("Supabase belum dikonfigurasi. Isi .env.local terlebih dahulu.");
      return;
    }
    const normalized = normalizeWhatsAppNumber(query.trim());

    try {
      const bookingQuery = supabase
        .from("bookings")
        .select(
          `
          *,
          client:clients(*),
          details:booking_details(*, packages:packages(*)),
          addons:booking_addons(*, add_ons:addons(*)),
          project_progress(*)
        `,
        )
        .or(`invoice_number.eq.${query.trim().toUpperCase()}`)
        .single();

      const { data, error } = await bookingQuery;

      if (error || !data) {
        const clientRes = await supabase
          .from("clients")
          .select("id")
          .eq("whatsapp_number", normalized)
          .maybeSingle();

        if (!clientRes.data) {
          setSearchState("notfound");
          return;
        }

        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select(
            `
            *,
            client:clients(*),
            details:booking_details(*, packages:packages(*)),
            addons:booking_addons(*, add_ons:addons(*)),
            project_progress(*)
          `,
          )
          .eq("client_id", clientRes.data.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (bookingError) {
          setSearchState("notfound");
          return;
        }
        setSearchState("found");
        setResult(bookingData);
      } else {
        setSearchState("found");
        setResult(data);
      }
    } catch (err) {
      console.error(err);
      setSearchState("error");
      setErrorMsg("Terjadi kesalahan. Silakan coba lagi.");
    }
  }

  const progress = result?.project_progress?.[0];
  const bookingPkg = result?.details?.[0]?.packages;
  const dpLabel =
    bookingPkg?.dp_type === "PERCENTAGE"
      ? `DP terbayar (${bookingPkg.dp_value}%): ${formatCurrency(
          result?.dp_amount ?? 0,
        )}`
      : bookingPkg?.dp_type === "FIXED"
        ? `DP terbayar (nominal): ${formatCurrency(result?.dp_amount ?? 0)}`
        : `DP terbayar: ${formatCurrency(result?.dp_amount ?? 0)}`;
  const remaining = Math.max(
    (result?.grand_total ?? 0) - (result?.dp_amount ?? 0),
    0,
  );
  const isLunas = result?.status === "LUNAS";

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="border-b border-white/40 px-6 pb-4 pt-6">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
          Cek Status Pesanan
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Masukkan No. Invoice atau No. WhatsApp
        </p>
        <div className="mt-4 flex gap-2">
          <Input
            placeholder="INV-20260701-1234 / 08123456789"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchState("idle");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={!query.trim()}>
            <Search className="h-4 w-4" />
            Cari
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {searchState === "loading" && (
          <div className="flex flex-col items-center gap-3 py-12 text-[var(--muted)]">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
            <p className="text-sm">Mencari pesanan Anda...</p>
          </div>
        )}

        {searchState === "idle" && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="glass-inset flex h-16 w-16 items-center justify-center rounded-full">
              <PackageSearch className="h-7 w-7 text-[var(--brand)]" />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-[var(--muted)]">
              Masukkan nomor invoice atau nomor WhatsApp yang digunakan saat
              booking untuk melihat progres pengerjaan.
            </p>
          </div>
        )}

        {searchState === "notfound" && (
          <div className="rounded-2xl border border-red-100 bg-red-50/70 p-6 text-center backdrop-blur-md">
            <p className="text-sm font-semibold text-red-700">
              Pesanan tidak ditemukan
            </p>
            <p className="mt-1 text-xs text-red-500">
              Periksa kembali nomor invoice atau nomor WhatsApp Anda.
            </p>
          </div>
        )}

        {searchState === "error" && (
          <div className="rounded-2xl border border-red-100 bg-red-50/70 p-6 text-center backdrop-blur-md">
            <p className="text-sm font-semibold text-red-700">{errorMsg}</p>
          </div>
        )}

        {searchState === "found" && result && (
          <div className="space-y-4">
            <div className="glass rounded-[1.75rem] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-[var(--muted)]">
                    {result.invoice_number}
                  </p>
                  <h3 className="mt-1 font-serif text-xl font-semibold text-[var(--ink)]">
                    {result.client?.full_name}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Event: {formatShortDate(result.event_date)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    STATUS_STYLES[result.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {STATUS_LABELS[result.status] ?? result.status}
                </span>
              </div>

              <div className="mt-4 border-t border-white/50 pt-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-2)]">
                  Total
                </p>
                <p className="mt-0.5 font-sans text-lg font-bold text-[var(--ink)]">
                  {formatCurrency(result.grand_total)}
                </p>
                <p className="text-xs text-[var(--muted-2)]">{dpLabel}</p>
                {result.status === "MENUNGGU_DP" && (
                  <p className="mt-2 rounded-lg bg-amber-50/80 px-3 py-2 text-xs font-semibold text-amber-700">
                    Belum ada pembayaran. Menunggu transfer DP.
                  </p>
                )}
                {result.status === "MENUNGGU_PELUNASAN" && (
                  <p className="mt-2 rounded-lg bg-blue-50/80 px-3 py-2 text-xs font-semibold text-blue-700">
                    DP diterima · Sisa pelunasan: {formatCurrency(remaining)}
                  </p>
                )}
                {isLunas && (
                  <p className="mt-2 rounded-lg bg-green-50/80 px-3 py-2 text-xs font-semibold text-green-700">
                    Lunas · Tidak ada tagihan tersisa.
                  </p>
                )}
              </div>
            </div>

            {result.status === "CANCELLED" ? (
              <div className="rounded-2xl border border-red-100 bg-red-50/70 p-5 text-center backdrop-blur-md">
                <p className="text-sm font-semibold text-red-700">
                  Booking ini telah dibatalkan.
                </p>
              </div>
            ) : (
              <>
                <div className="glass rounded-[1.75rem] p-5">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    <Brush className="h-3.5 w-3.5" /> Status Retouch Foto
                  </h4>
                  <div className="mt-3">
                    <Progress
                      status={progress?.retouch_status ?? "PENDING"}
                      labels={RETOUCH_STATUS_LABELS}
                      steps={["PENDING", "IN_PROGRESS", "DONE"]}
                    />
                  </div>
                  {progress?.retouch_drive_link && (
                    <a
                      href={progress.retouch_drive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Buka Link Foto (Google Drive)
                    </a>
                  )}
                  {progress?.retouch_deadline && (
                    <p className="mt-2 text-[11px] text-[var(--muted-2)]">
                      Target selesai: {formatShortDate(progress.retouch_deadline)}
                    </p>
                  )}
                </div>

                <div className="glass rounded-[1.75rem] p-5">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    <Printer className="h-3.5 w-3.5" /> Status Cetak
                  </h4>
                  <div className="mt-3">
                    <Progress
                      status={progress?.printing_status ?? "NOT_STARTED"}
                      labels={PRINTING_STATUS_LABELS}
                      steps={[
                        "NOT_STARTED",
                        "IN_PRINTING",
                        "READY_FOR_PICKUP",
                        "DELIVERED",
                      ]}
                    />
                  </div>
                  {progress?.printing_deadline && (
                    <p className="mt-2 text-[11px] text-[var(--muted-2)]">
                      Target selesai: {formatShortDate(progress.printing_deadline)}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusChecker({ open, onClose }: StatusCheckerProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <StatusSearchPanel />
    </Modal>
  );
}

export function StatusSearchContent() {
  return <StatusSearchPanel />;
}

function Progress({
  status,
  labels,
  steps,
}: {
  status: string;
  labels: Record<string, string>;
  steps: string[];
}) {
  const idx = steps.indexOf(status);
  return (
    <div>
      <div className="flex items-center">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  i <= idx
                    ? "bg-[var(--brand)] text-white"
                    : "bg-[var(--line-2)] text-[var(--muted-2)]"
                }`}
              >
                {i + 1}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 rounded ${
                  i < idx ? "bg-[var(--brand)]" : "bg-[var(--line-2)]"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-sm font-semibold text-[var(--ink)]">
        {labels[status] ?? status}
      </p>
    </div>
  );
}