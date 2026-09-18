"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, DollarSign } from "lucide-react";
import { cn, formatCurrency, formatShortDate } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/types";
import type { BookingStatus } from "@/lib/types";

interface FinanceRow {
  id: number;
  invoice_number: string;
  event_date: string;
  grand_total: number;
  dp_amount: number;
  status: BookingStatus;
  client: { full_name: string } | null;
  booking_date: string | null;
}

export function FinanceTab() {
  const [rows, setRows] = useState<FinanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const start = `${month}-01`;
      const endDate = new Date(`${month}-01`);
      endDate.setMonth(endDate.getMonth() + 1);
      const end = endDate.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("bookings")
        .select("id, invoice_number, event_date, grand_total, dp_amount, status, booking_date, client:clients(full_name)")
        .neq("status", "CANCELLED")
        .gte("event_date", start)
        .lt("event_date", end)
        .order("event_date", { ascending: true })
        .limit(1000);


      if (cancelled) return;

      if (error) {
        console.error("loadData finance error:", error.message);
        setRows([]);
      } else {
        setRows((data as unknown as FinanceRow[]) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [month]);

  const totals = useMemo(() => {
    let dpDiterima = 0;
    let pelunasanDiterima = 0;

    for (const r of rows) {
      if (r.status === "MENUNGGU_PELUNASAN" || r.status === "LUNAS") {
        dpDiterima += Number(r.dp_amount ?? 0);
      }
      if (r.status === "LUNAS") {
        pelunasanDiterima += Number(r.grand_total ?? 0) - Number(r.dp_amount ?? 0);
      }
    }

    return {
      dpDiterima,
      pelunasanDiterima,
      total: dpDiterima + pelunasanDiterima,
      count: rows.length,
    };
  }, [rows]);

  const monthLabel = new Date(`${month}-01`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

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
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {rows.map((r) => {
              const pelunasan = r.status === "LUNAS" ? Number(r.grand_total) - Number(r.dp_amount) : 0;
              return (
                <tr key={r.id} className="text-sm">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--ink)]">{r.invoice_number}</td>
                  <td className="px-4 py-3 text-[var(--ink)]">{r.client?.full_name ?? "-"}</td>
                  <td className="px-4 py-3 text-[var(--ink)]">{formatShortDate(r.event_date)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--ink)]">{formatCurrency(r.grand_total)}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{r.status !== "MENUNGGU_DP" ? formatCurrency(r.dp_amount) : "-"}</td>
                  <td className="px-4 py-3 text-right text-blue-700">{pelunasan > 0 ? formatCurrency(pelunasan) : "-"}</td>
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
    </div>
  );
}
