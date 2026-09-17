"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarX2,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileDown,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import { cn, formatCurrency, formatShortDate } from "@/lib/utils";
import Swal from "sweetalert2";
import { STATUS_LABELS } from "@/lib/types";
import type { BookingStatus } from "@/lib/types";
import { InvoiceModal, type InvoiceKind } from "@/components/admin/invoice-modal";
import { InvoicePdfPreview, downloadInvoicePdfBlob } from "@/components/admin/invoice-pdf-view";
import type { InvoicePdfKind } from "@/lib/types";
import { getSiteSettings, getStoredPublicUrl } from "@/lib/site-settings";

interface BookingRow {
  id: number;
  invoice_number: string;
  booking_date?: string | null;
  event_date: string;
  location_type: "KOTA_TASIK" | "LUAR_KOTA";
  event_address: string;
  subtotal: number;
  transport_fee: number;
  grand_total: number;
  dp_amount: number;
  status: BookingStatus;
  notes?: string | null;
  dp_paid_at?: string | null;
  paid_at?: string | null;
  client: { full_name: string; whatsapp_number: string };
  details: {
    price_at_booking: number;
    packages: { name: string; dp_value?: number };
  }[];
  addons: { add_ons?: { name: string }; price_at_booking: number; qty?: number }[];
}

function todayInput(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  MENUNGGU_DP: "bg-amber-100 text-amber-800 border-amber-200",
  MENUNGGU_PELUNASAN: "bg-blue-100 text-blue-800 border-blue-200",
  LUNAS: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

const NEXT_STEP: Record<BookingStatus, string> = {
  MENUNGGU_DP: "Menunggu bukti transfer DP dari pelanggan via WhatsApp.",
  MENUNGGU_PELUNASAN: "Menunggu bukti pelunasan dari pelanggan via WhatsApp.",
  LUNAS: "Tagihan lunas. Atur timeline edit & cetak pada menu SLA Tracker.",
  CANCELLED: "Booking dibatalkan.",
};

export function BookingTab({
  onChanged,
  onNavigate,
}: {
  onChanged: () => void;
  onNavigate: (tab: "overview" | "bookings" | "packages" | "sla" | "settings") => void;
}) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [blockDate, setBlockDate] = useState(() => todayInput());
  const [invoiceFor, setInvoiceFor] = useState<BookingRow | null>(null);
  const [invoiceKind, setInvoiceKind] = useState<InvoiceKind>("DP");
  const [pdfFor, setPdfFor] = useState<{ booking: BookingRow; kind: InvoicePdfKind } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    loadBookings();
    getSiteSettings()
      .then((settings) => setLogoUrl(getStoredPublicUrl(settings.logo_url)))
      .catch(() => {});
    const t = setInterval(loadBookings, 30000);
    return () => clearInterval(t);
  }, []);

  async function loadBookings() {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    let query = supabase
      .from("bookings")
      .select(
        `
        *,
        client:clients(full_name, whatsapp_number),
        details:booking_details(price_at_booking, packages:packages(name, dp_value)),
        addons:booking_addons(add_ons:addons(name), price_at_booking, qty)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== "ALL") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
    } else {
      setBookings((data as unknown as BookingRow[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadBookings();
  }, [page, statusFilter]);

  async function patchBooking(
    id: number,
    patch: Partial<Pick<BookingRow, "status" | "dp_paid_at" | "paid_at">>,
  ) {
    setUpdatingId(id);
    const supabase = createClient();
    if (!supabase) {
      setUpdatingId(null);
      return;
    }
    const { error } = await supabase
      .from("bookings")
      .update(patch)
      .eq("id", id);
    if (error) {
      console.error(error);
      await Swal.fire({
        icon: "error",
        title: "Gagal Memperbarui",
        text: "Cek koneksi atau kebijakan RLS.",
      });
    } else {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      );
      onChanged();
    }
    setUpdatingId(null);
  }

  async function verifyDp(id: number, name: string) {
    const confirmed = await Swal.fire({
      icon: "question",
      title: "Verifikasi DP",
      text: `Verifikasi DP dari "${name}"?\n\nStatus akan berubah menjadi MENUNGGU PELUNASAN.`,
      showCancelButton: true,
      confirmButtonText: "Ya, Verifikasi",
      cancelButtonText: "Batal",
      confirmButtonColor: "#A8967A",
    });
    if (!confirmed.isConfirmed) return;
    await patchBooking(id, {
      status: "MENUNGGU_PELUNASAN",
      dp_paid_at: new Date().toISOString(),
    });
    await Swal.fire({
      icon: "success",
      title: "DP Terverifikasi",
      text: "Status berubah menjadi Menunggu Pelunasan.",
      timer: 1200,
      showConfirmButton: false,
    });
  }

  async function receivePelunasan(id: number, name: string) {
    const confirmed = await Swal.fire({
      icon: "question",
      title: "Terima Pelunasan",
      text: `Terima pelunasan dari "${name}"?\n\nStatus akan berubah menjadi LUNAS (tidak ada tagihan tersisa).`,
      showCancelButton: true,
      confirmButtonText: "Ya, Terima",
      cancelButtonText: "Batal",
      confirmButtonColor: "#16a34a",
    });
    if (!confirmed.isConfirmed) return;
    await patchBooking(id, {
      status: "LUNAS",
      paid_at: new Date().toISOString(),
    });
    await Swal.fire({
      icon: "success",
      title: "Pembayaran Lunas",
      text: "Booking selesai. Atur timeline di SLA Tracker.",
      timer: 1200,
      showConfirmButton: false,
    });
  }

  async function blockDateHandle() {
    if (!blockDate) return;
    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Blokir Tanggal",
      text: `Blokir tanggal ${blockDate}? Tanggal ini tidak bisa di-booking.`,
      showCancelButton: true,
      confirmButtonText: "Ya, Blokir",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmed.isConfirmed) return;
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from("bookings").insert({
      invoice_number: `BLOCK-${Date.now()}`,
      client_id: null,
      event_date: blockDate,
      location_type: "KOTA_TASIK",
      event_address: "Blocked date",
      subtotal: 0,
      transport_fee: 0,
      grand_total: 0,
      dp_amount: 0,
      status: "CANCELLED",
      notes: "Admin memblokir tanggal ini",
    });

    if (error) {
      console.error(error);
      await Swal.fire({
        icon: "error",
        title: "Gagal Memblokir",
        text: error.message,
      });
    } else {
      setBlockDate("");
      loadBookings();
      await Swal.fire({
        icon: "success",
        title: "Tanggal Diblokir",
        timer: 1200,
        showConfirmButton: false,
      });
    }
  }

const filtered = bookings.filter((b) => {
    const q = search.trim().toLowerCase();
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
    const matchesQuery = !q ||
      b.invoice_number.toLowerCase().includes(q) ||
      b.client?.full_name.toLowerCase().includes(q) ||
      b.client?.whatsapp_number.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  function resetPage() { setPage(0); }

  function openInvoice(booking: BookingRow, kind: InvoiceKind) {
    setInvoiceFor(booking);
    setInvoiceKind(kind);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-2)]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            placeholder="Cari invoice / nama / no. WA..."
            className="h-11 w-full rounded-xl border border-[var(--line)] bg-white pl-9 pr-4 text-sm text-[var(--ink)] placeholder:text-[var(--muted-5)] focus:border-[var(--brand)] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as BookingStatus | "ALL");
            resetPage();
          }}
          className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
        >
          <option value="ALL">Semua Status</option>
          <option value="MENUNGGU_DP">Menunggu DP</option>
          <option value="MENUNGGU_PELUNASAN">Menunggu Pelunasan</option>
          <option value="LUNAS">Lunas</option>
          <option value="CANCELLED">Dibatalkan</option>
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={blockDate}
            onChange={(e) => setBlockDate(e.target.value)}
            className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]"
          />
          <button
            onClick={blockDateHandle}
            disabled={!blockDate}
            className="flex h-11 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-40"
          >
            <CalendarX2 className="h-4 w-4" />
            Block
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--brand)] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-10 text-center text-sm text-[var(--muted)]">
          Belum ada booking.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => {
            const remaining = Math.max(
              (booking.grand_total ?? 0) - (booking.dp_amount ?? 0),
              0,
            );
            const isOpen = expanded === booking.id;
            return (
              <div
                key={booking.id}
                className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white"
              >
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => setExpanded(isOpen ? null : booking.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-[var(--ink)]">
                          {booking.client?.full_name ?? "Tanpa nama"}
                        </p>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                            STATUS_STYLES[booking.status],
                          )}
                        >
                          {STATUS_LABELS[booking.status]}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">
                        {booking.invoice_number} · {formatShortDate(booking.event_date)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-[var(--ink)]">
                        {formatCurrency(booking.grand_total)}
                      </p>
                      {booking.status !== "LUNAS" && booking.status !== "CANCELLED" && (
                        <p className="text-[10px] text-[var(--muted)]">
                          Sisa: {formatCurrency(booking.status === "MENUNGGU_DP" ? booking.grand_total : remaining)}
                        </p>
                      )}
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-[var(--muted-2)]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted-2)]" />
                    )}
                  </button>

                  <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
                    {booking.status === "MENUNGGU_DP" && (
                      <>
                        <button
                          onClick={() => verifyDp(booking.id, booking.client?.full_name ?? "")}
                          disabled={updatingId === booking.id}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 text-[11px] font-bold uppercase tracking-widest text-white shadow-[0_4px_20px_-2px_rgba(192,178,158,0.4)] transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Verifikasi DP
                        </button>
                        <button
                          onClick={() => setPdfFor({ booking, kind: "MENUNGGU_DP" })}
                          title="Preview & download PDF invoice DP"
                          className="glass-inset inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold uppercase tracking-widest text-[var(--ink)]"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          PDF
                        </button>
                        <button
                          onClick={() => openInvoice(booking, "DP")}
                          title="Lihat / kirim invoice DP via WhatsApp"
                          className="glass-inset inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold uppercase tracking-widest text-[var(--ink)]"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WA
                        </button>
                      </>
                    )}

                    {booking.status === "MENUNGGU_PELUNASAN" && (
                      <>
                        <button
                          onClick={() => receivePelunasan(booking.id, booking.client?.full_name ?? "")}
                          disabled={updatingId === booking.id}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 text-[11px] font-bold uppercase tracking-widest text-white shadow-[0_4px_20px_-2px_rgba(192,178,158,0.4)] transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Terima Pelunasan
                        </button>
                        <button
                          onClick={() => setPdfFor({ booking, kind: "MENUNGGU_PELUNASAN" })}
                          title="Preview & download PDF tagihan pelunasan"
                          className="glass-inset inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold uppercase tracking-widest text-[var(--ink)]"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          PDF
                        </button>
                        <button
                          onClick={() => openInvoice(booking, "PELUNASAN")}
                          title="Lihat / kirim tagihan pelunasan via WhatsApp"
                          className="glass-inset inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold uppercase tracking-widest text-[var(--ink)]"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WA
                        </button>
                      </>
                    )}

                    {booking.status === "LUNAS" && (
                      <>
                        <button
                          onClick={() => onNavigate("sla")}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 text-[11px] font-bold uppercase tracking-widest text-white shadow-[0_4px_20px_-2px_rgba(192,178,158,0.4)] transition-colors hover:bg-[var(--brand-hover)]"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Atur Edit & Cetak
                        </button>
                        <button
                          onClick={() => setPdfFor({ booking, kind: "LUNAS" })}
                          title="Preview PDF tanda terima lunas"
                          className="glass-inset inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold uppercase tracking-widest text-[var(--ink)]"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          PDF
                        </button>
                        <button
                          onClick={() => openInvoice(booking, "LUNAS")}
                          title="Lihat tanda terima lunas via WhatsApp"
                          className="glass-inset inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold uppercase tracking-widest text-[var(--ink)]"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WA
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-[var(--soft)] px-4 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 text-xs text-[var(--ink)]">
                        <p>
                          <span className="text-[var(--muted)]">WhatsApp:</span>{" "}
                          {booking.client?.whatsapp_number}
                        </p>
                        <p>
                          <span className="text-[var(--muted)]">Paket:</span>{" "}
                          {booking.details?.[0]?.packages?.name ?? "-"}
                        </p>
                        <p>
                          <span className="text-[var(--muted)]">Event:</span>{" "}
                          {booking.location_type === "KOTA_TASIK"
                            ? "Kota Tasikmalaya"
                            : "Luar Kota"}{" "}
                          · {booking.event_address}
                        </p>
                        <p>
                          <span className="text-[var(--muted)]">DP:</span>{" "}
                          {formatCurrency(booking.status === "MENUNGGU_DP" ? 0 : booking.dp_amount)}
                        </p>
                        <p>
                          <span className="text-[var(--muted)]">Sisa:</span>{" "}
                          {formatCurrency(booking.status === "MENUNGGU_DP" ? booking.grand_total : remaining)}
                        </p>
                      </div>
                      <div className="space-y-1.5 text-xs text-[var(--ink)]">
                        <p>
                          <span className="text-[var(--muted)]">Verifikasi DP:</span>{" "}
                          {booking.dp_paid_at
                            ? new Date(booking.dp_paid_at).toLocaleString("id-ID")
                            : "Belum"}
                        </p>
                        <p>
                          <span className="text-[var(--muted)]">Pelunasan:</span>{" "}
                          {booking.paid_at
                            ? new Date(booking.paid_at).toLocaleString("id-ID")
                            : "Belum"}
                        </p>
                        <p className="rounded-lg border border-[var(--line)] bg-[var(--soft)]/60 p-2 text-[var(--muted-2)]">
                          {NEXT_STEP[booking.status]}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {invoiceFor && (
        <InvoiceModal
          open={true}
          onClose={() => setInvoiceFor(null)}
          booking={invoiceFor as ComponentProps<typeof InvoiceModal>["booking"]}
          defaultKind={invoiceKind}
          logoUrl={logoUrl}
        />
      )}

      {pdfFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPdfFor(null)}>
          <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-5 py-3">
              <p className="text-sm font-semibold text-gray-700">
                {pdfFor.booking.invoice_number}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={async () => { await downloadInvoicePdfBlob(pdfFor.booking, pdfFor.kind, logoUrl); }} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white">
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </button>
                <button onClick={() => setPdfFor(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-gray-100 p-3">
              <InvoicePdfPreview booking={pdfFor.booking} kind={pdfFor.kind} logoUrl={logoUrl} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}