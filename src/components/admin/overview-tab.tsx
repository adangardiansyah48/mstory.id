"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  Camera,
  ChevronRight,
  DollarSign,
  Package,
  Users,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/types";

interface Stats {
  totalBookings: number;
  menungguDp: number;
  menungguPelunasan: number;
  lunas: number;
  cancelled: number;
  upcomingEvents: number;
  revenue: number;
  totalClients: number;
}

export function OverviewTab({
  refreshKey,
  onNavigate,
}: {
  refreshKey: number;
  onNavigate: (tab: "bookings" | "packages" | "sla") => void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshKeyLocal, setRefreshKeyLocal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        setErrorMsg("Supabase belum dikonfigurasi. Isi .env.local terlebih dahulu.");
        return;
      }

      try {
        const [bookingCount, clientCount] = await Promise.all([
          supabase.from("bookings").select("status, grand_total, event_date"),
          supabase.from("clients").select("id", { count: "exact", head: true }),
        ]);

        if (bookingCount.error) throw bookingCount.error;
        if (clientCount.error) throw clientCount.error;
        const bookings = bookingCount.data ?? [];

        const today = new Date().toISOString().slice(0, 10);
        const upcoming = bookings.filter(
          (b) => b.event_date >= today && b.status !== "CANCELLED",
        ).length;

        if (cancelled) return;
        setStats({
          totalBookings: bookings.length,
          menungguDp: bookings.filter((b) => b.status === "MENUNGGU_DP").length,
          menungguPelunasan: bookings.filter((b) => b.status === "MENUNGGU_PELUNASAN").length,
          lunas: bookings.filter((b) => b.status === "LUNAS").length,
          cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
          upcomingEvents: upcoming,
          revenue: bookings
            .filter(
              (b) => b.status === "MENUNGGU_PELUNASAN" || b.status === "LUNAS",
            )
            .reduce((s, b) => s + Number(b.grand_total), 0),
          totalClients: clientCount.count ?? 0,
        });
      } catch (err) {
        const e = err as Error & { code?: string; status?: number };
        const message =
          (e && typeof e === "object" && "message" in e) || (e && typeof e === "object" && "code" in e)
            ? (e.message || e.code || "Terjadi kesalahan saat memuat data.")
            : "Terjadi kesalahan saat memuat data (koneksi atau CORS).";
        console.error(`OverviewTab gagal memuat data: ${message}`, err);
        if (!cancelled) setErrorMsg(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, refreshKeyLocal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--brand)] border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600">
        Gagal memuat ringkasan admin: {errorMsg}
        <button
          onClick={() => setRefreshKeyLocal((k) => k + 1)}
          className="mx-auto mt-3 block rounded-lg bg-red-100 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-200"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  const cards = [
    { label: "Total Booking", value: String(stats.totalBookings), icon: <CalendarDays className="h-5 w-5" /> },
    { label: "Menunggu DP", value: String(stats.menungguDp), icon: <Package className="h-5 w-5" /> },
    { label: "Event Mendatang", value: String(stats.upcomingEvents), icon: <Users className="h-5 w-5" /> },
    { label: "Pendapatan (DP Diterima)", value: formatCurrency(stats.revenue), icon: <DollarSign className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)]/15 text-[var(--muted-2)]">
              {c.icon}
            </div>
            <p className="mt-3 font-sans text-lg font-bold text-[var(--ink)] leading-tight break-words">
              {c.value}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[var(--muted)]">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Status Booking
          </h3>
          <div className="mt-4 space-y-3">
            {(
              [
                { status: "MENUNGGU_DP", key: "menungguDp", color: "amber" },
                { status: "MENUNGGU_PELUNASAN", key: "menungguPelunasan", color: "blue" },
                { status: "LUNAS", key: "lunas", color: "green" },
                { status: "CANCELLED", key: "cancelled", color: "red" },
              ] as const
            ).map(({ status, key, color }) => (
              <div key={status}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[var(--ink)]">
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="text-[var(--muted)]">
                    {stats[key]}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--soft)]">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      color === "amber" && "bg-amber-400",
                      color === "blue" && "bg-blue-400",
                      color === "green" && "bg-green-400",
                      color === "red" && "bg-red-400",
                    )}
                    style={{
                      width: `${stats.totalBookings ? (stats[key] / stats.totalBookings) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Total Klien
          </h3>
          <p className="mt-3 font-sans text-3xl font-bold text-[var(--ink)]">
            {stats.totalClients}
          </p>
          <div className="mt-4 flex items-center gap-3 text-xs text-[var(--muted)]">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--muted-2)]">
              <Camera className="h-3.5 w-3.5" />
            </span>
            <span>Client yang telah melakukan booking</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              onClick={() => onNavigate("bookings")}
              className="flex items-center justify-center gap-1 rounded-xl bg-[var(--brand)]/10 px-4 py-3 text-xs font-semibold text-[var(--muted-2)] transition-colors hover:bg-[var(--brand)]/20"
            >
              Kelola Booking <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onNavigate("sla")}
              className="flex items-center justify-center gap-1 rounded-xl bg-[var(--brand)]/10 px-4 py-3 text-xs font-semibold text-[var(--muted-2)] transition-colors hover:bg-[var(--brand)]/20"
            >
              Update SLA <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}