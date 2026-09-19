"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, DollarSign, Download, X } from "lucide-react";
import { cn, formatCurrency, formatShortDate } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/types";
import type { BookingStatus } from "@/lib/types";
import { VendorFeePdfPreview, downloadVendorFeePdfBlob, type VendorFeeRow } from "./invoice-pdf-view";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

interface FinanceRow {
  id: number;
  invoice_number: string;
  event_date: string;
  grand_total: number;
  dp_amount: number;
  source?: string | null;
  status: BookingStatus;
  client: { full_name: string } | null;
  booking_date: string | null;
}

export function FinanceTab() {
  const [rows, setRows] = useState<FinanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorFee, setVendorFee] = useState(200000);
  const [previewVendor, setPreviewVendor] = useState<{
    vendorName: string;
    monthLabel: string;
    rows: VendorFeeRow[];
  } | null>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  async function loadRows() {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      const { getSiteSettings } = await import("@/lib/site-settings");
      const s = await getSiteSettings();
      if (s.vendor_fee != null) setVendorFee(Number(s.vendor_fee) || 0);
    } catch { /* fallback */ }
    const start = `${month}-01`;
    const endDate = new Date(`${month}-01`);
    endDate.setMonth(endDate.getMonth() + 1);
    const end = endDate.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("bookings")
      .select("id, invoice_number, event_date, grand_total, dp_amount, source, status, booking_date, client:clients(full_name)")
      .neq("status", "CANCELLED")
      .gte("event_date", start)
      .lt("event_date", end)
      .order("event_date", { ascending: true })
      .limit(1000);


    if (error) {
      console.error("loadData finance error:", error.message);
      setRows([]);
    } else {
      setRows((data as unknown as FinanceRow[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadRows();
    }, 0);
    return () => window.clearTimeout(t);
  }, [month]);

  useAutoRefresh(
    async () => {
      if (!rows.length) return;
      await loadRows();
    },
    10000,
    { enabled: rows.length > 0 },
  );

  const totals = useMemo(() => {
    let dpDiterima = 0;
    let pelunasanDiterima = 0;

    for (const r of rows) {
      const isVendor = r.source === "VENDOR";
      const net = Math.max(Number(r.grand_total ?? 0) - (isVendor ? vendorFee : 0), 0);
      const dpNet = Math.min(Number(r.dp_amount ?? 0), net);
      const pelNet = Math.max(net - dpNet, 0);
      if (r.status === "MENUNGGU_PELUNASAN" || r.status === "LUNAS") {
        dpDiterima += dpNet;
      }
      if (r.status === "LUNAS") {
        pelunasanDiterima += pelNet;
      }
    }

    return {
      dpDiterima,
      pelunasanDiterima,
      total: dpDiterima + pelunasanDiterima,
      count: rows.length,
    };
  }, [rows, vendorFee]);

  const monthLabel = new Date(`${month}-01`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const [logoUrlState, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { getSiteSettings, getStoredPublicUrl } = await import("@/lib/site-settings");
        const s = await getSiteSettings();
        if (s.logo_url) setLogoUrl(getStoredPublicUrl(s.logo_url) ?? null);
      } catch {}
    })();
  }, []);

  const vendorInvoices = useMemo(() => {
    const map = new Map<string, { bookings: { invoice_number: string; event_date: string; fee: number }[]; totalFee: number }>();
    for (const r of rows) {
      if (r.source !== "VENDOR") continue;
      const vendorName = (r as unknown as { vendor_name?: string | null }).vendor_name ?? "Vendor";
      if (!map.has(vendorName)) map.set(vendorName, { bookings: [], totalFee: 0 });
      const entry = map.get(vendorName)!;
      entry.bookings.push({
        invoice_number: r.invoice_number,
        event_date: r.event_date,
        fee: vendorFee,
      });
      entry.totalFee += vendorFee;
    }
    return Array.from(map.entries()).map(([vendorName, v]) => ({
      vendorName,
      bookings: v.bookings,
      totalFee: v.totalFee,
    }));
  }, [rows, vendorFee]);

  

  // ambil data vendor fee per bulan via memo vendorInvoices (sudah ada)

  // ...

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">
          Laporan Keuangan
        </h2>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
            <DollarSign className="h-4 w-4 text-amber-700" />
          </div>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            DP Diterima
          </p>
          <p className="mt-1 font-sans text-lg font-bold text-amber-800">
            {formatCurrency(totals.dpDiterima)}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
            <DollarSign className="h-4 w-4 text-blue-700" />
          </div>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-blue-700">
            Pelunasan Diterima
          </p>
          <p className="mt-1 font-sans text-lg font-bold text-blue-800">
            {formatCurrency(totals.pelunasanDiterima)}
          </p>
        </div>
        <div className="rounded-2xl border border-green-200 bg-green-50/60 p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
            <CalendarDays className="h-4 w-4 text-green-700" />
          </div>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-green-700">
            Total Pemasukan ({monthLabel})
          </p>
          <p className="mt-1 font-sans text-lg font-bold text-green-800">
            {formatCurrency(totals.total)}
          </p>
          <p className="mt-1 text-[10px] text-green-600">{totals.count} transaksi aktif</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--soft)]/50 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              <th className="px-4 py-3">No. Invoice</th>
              <th className="px-4 py-3">Klien</th>
              <th className="px-4 py-3">Tanggal Acara</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">DP</th>
              <th className="px-4 py-3 text-right">Pelunasan</th>
              <th className="px-4 py-3 text-right">Diterima Mstory</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {rows.map((r) => {
              const isVendor = r.source === "VENDOR";
              const net = Math.max(Number(r.grand_total) - (isVendor ? vendorFee : 0), 0);
              const pelunasan = r.status === "LUNAS" ? Math.max(net - Math.min(Number(r.dp_amount), net), 0) : 0;
              return (
                <tr key={r.id} className="text-sm">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--ink)]">{r.invoice_number}</td>
                  <td className="px-4 py-3 text-[var(--ink)]">{r.client?.full_name ?? "-"}</td>
                  <td className="px-4 py-3 text-[var(--ink)]">{formatShortDate(r.event_date)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--ink)]">{formatCurrency(r.grand_total)}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{r.status !== "MENUNGGU_DP" ? formatCurrency(r.dp_amount) : "-"}</td>
                  <td className="px-4 py-3 text-right text-blue-700">{pelunasan > 0 ? formatCurrency(pelunasan) : "-"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency(isVendor ? net : Number(r.grand_total))}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                        r.status === "LUNAS"
                          ? "border-green-200 bg-green-100 text-green-700"
                          : r.status === "MENUNGGU_PELUNASAN"
                            ? "border-blue-200 bg-blue-100 text-blue-700"
                            : "border-amber-200 bg-amber-100 text-amber-700",
                      )}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
          {rows.length === 0 && !loading && (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            Tidak ada data transaksi di bulan ini.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
          Bukti Penyerahan Fee Vendor — {monthLabel}
        </h3>
        <p className="mt-1 text-[11px] text-[var(--muted-2)]">1 invoice PDF per vendor, periode bulan terpilih.</p>
        {vendorInvoices.length === 0 ? (
          <p className="mt-4 py-6 text-center text-sm text-[var(--muted)]">Tidak ada booking vendor di bulan ini.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {vendorInvoices.map((v) => (
              <div key={v.vendorName} className="rounded-xl border border-[var(--line)] bg-[var(--soft)]/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[var(--ink)]">{v.vendorName}</p>
                    <p className="text-xs text-[var(--muted)]">{v.bookings.length} booking · Total fee {formatCurrency(v.totalFee)} ({formatCurrency(vendorFee)}/booking)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewVendor({
                      vendorName: v.vendorName,
                      monthLabel,
                      rows: v.bookings.map((b) => ({ invoice_number: b.invoice_number, event_date: b.event_date, fee: b.fee })),
                    })}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[var(--brand-hover)]"
                  >
                    Preview
                  </button>
                </div>
                <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-[var(--line)] bg-white p-2 text-[11px]">
                  {v.bookings.map((b) => (
                    <div key={b.invoice_number} className="flex justify-between py-0.5">
                      <span className="font-mono text-[var(--ink)]">{b.invoice_number}</span>
                      <span className="text-[var(--muted-2)]">{formatShortDate(b.event_date)} · {formatCurrency(b.fee)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewVendor(null)}>
          <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-5 py-3">
              <p className="text-sm font-semibold text-gray-700">
                {previewVendor.vendorName} — {previewVendor.monthLabel} ({previewVendor.rows.length} booking)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await downloadVendorFeePdfBlob({
                      vendorName: previewVendor.vendorName,
                      monthLabel: previewVendor.monthLabel,
                      logoUrl: logoUrlState,
                      rows: previewVendor.rows,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </button>
                <button
                  onClick={() => setPreviewVendor(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-gray-100 p-3">
              <VendorFeePdfPreview
                vendorName={previewVendor.vendorName}
                monthLabel={previewVendor.monthLabel}
                logoUrl={logoUrlState}
                rows={previewVendor.rows}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
