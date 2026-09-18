"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CalendarOff,
  Car,
  MapPin,
  MessageCircle,
  User,
} from "lucide-react";
import { cn, formatCurrency, whatsAppValidationMessage } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  MAX_BOOKINGS_PER_DATE,
  OUTSIDE_CITY_TRANSPORT_FEE,
  type WizardClientDetails,
} from "@/lib/types";

interface Step2Props {
  bookedCounts: Record<string, number>;
  client: WizardClientDetails;
  setClient: React.Dispatch<React.SetStateAction<WizardClientDetails>>;
  transportFeeDefault?: number;
}

function toLocalDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function Step2Schedule({
  bookedCounts,
  client,
  setClient,
  transportFeeDefault,
}: Step2Props) {
  const FEE_LABEL = formatCurrency(transportFeeDefault ?? OUTSIDE_CITY_TRANSPORT_FEE);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const clientInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (client.eventDate && clientInfoRef.current) {
      clientInfoRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [client.eventDate]);

  function bookingCount(date: Date) {
    return bookedCounts[toLocalDateKey(date)] ?? 0;
  }

  function isDateFull(date: Date) {
    return bookingCount(date) >= MAX_BOOKINGS_PER_DATE;
  }

  function showCalendar(forMonth: Date) {
    const start = new Date(forMonth.getFullYear(), forMonth.getMonth(), 1);
    const firstDay = start.getDay();
    const daysInMonth = new Date(
      forMonth.getFullYear(),
      forMonth.getMonth() + 1,
      0,
    ).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++)
      days.push(new Date(forMonth.getFullYear(), forMonth.getMonth(), d));
    return days;
  }

  function isDateInPast(date: Date) {
    return date < today;
  }

  function isDateSelectable(date: Date) {
    return !isDateFull(date) && !isDateInPast(date);
  }

  function selectDate(date: Date) {
    if (!isDateSelectable(date)) return;
    setClient({ ...client, eventDate: toLocalDateKey(date) });
  }

  function changeMonth(delta: number) {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  }

  const monthLabel = currentMonth.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          <CalendarDays className="h-4 w-4" /> Pilih Tanggal Acara
        </h3>
        <p className="mt-1 text-xs text-[var(--muted-2)]">
          Satu tanggal maksimal diisi {MAX_BOOKINGS_PER_DATE} pelanggan. Tanggal
          penuh ditandai taupe (tidak tersedia).
        </p>

        <div className="mt-3 rounded-[1.75rem] border border-white/50 bg-white/60 p-4 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => changeMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-white/70"
              aria-label="Bulan sebelumnya"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-[var(--ink)]">
              {monthLabel}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-white/70"
              aria-label="Bulan berikutnya"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {["Mn", "Sn", "Sl", "Rb", "Km", "Jm", "Sb"].map((d) => (
              <span
                key={d}
                className="py-1 text-[10px] font-semibold uppercase text-[var(--muted-2)]"
              >
                {d}
              </span>
            ))}
            {showCalendar(currentMonth).map((date, i) =>
              date === null ? (
                <span key={`empty-${i}`} />
              ) : (
                <button
                  key={toLocalDateKey(date)}
                  onClick={() => selectDate(date)}
                  disabled={!isDateSelectable(date)}
                  className={cn(
                    "relative flex h-9 w-full items-center justify-center rounded-lg text-xs font-medium transition-all",
                    !isDateSelectable(date) &&
                      "cursor-not-allowed text-[var(--muted-4)] line-through",
                    isDateSelectable(date) &&
                      client.eventDate === toLocalDateKey(date) &&
                      "bg-[var(--brand)] font-bold text-white shadow-sm",
                    isDateSelectable(date) &&
                      client.eventDate !== toLocalDateKey(date) &&
                      "text-[#9ca3af] hover:bg-white/70",
                    isDateFull(date) && !isDateInPast(date) &&
                      "bg-[var(--brand)] text-white line-through",
                  )}
                >
                  {date.getDate()}
                  {isDateSelectable(date) &&
                    bookingCount(date) > 0 &&
                    !isDateFull(date) && (
                      <span className="absolute right-0 top-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--brand)] px-0.5 text-[8px] font-bold leading-none text-white">
                        {MAX_BOOKINGS_PER_DATE - bookingCount(date)}
                      </span>
                    )}
                </button>
              ),
            )}
          </div>

          <div className="mt-3 flex items-center gap-4 border-t border-white/40 pt-3 text-[11px] text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#9ca3af]" /> Tersedia
            </span>
            <span className="flex items-center gap-1.5">
              <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--brand)] px-0.5 text-[8px] font-bold text-white">
                {MAX_BOOKINGS_PER_DATE - 1}
              </span>
              Sisa slot
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[var(--brand)]" /> Penuh ({MAX_BOOKINGS_PER_DATE} booking)
            </span>
          </div>
        </div>

      {client.eventDate && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/50 bg-white/60 px-4 py-3 backdrop-blur-md">
          <CalendarOff className="h-4 w-4 text-[var(--muted-2)]" />
          <p className="text-sm font-semibold text-[var(--ink)]">
            {new Date(client.eventDate + "T00:00:00").toLocaleDateString(
              "id-ID",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              },
            )}
          </p>
        </div>
      )}
    </div>

    <div ref={clientInfoRef}>
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        <User className="h-4 w-4" /> Data Diri
      </h3>
        <div className="mt-3 space-y-4">
          <Input
            placeholder="Nama Lengkap"
            value={client.fullName}
            onChange={(e) =>
              setClient({ ...client, fullName: e.target.value })
            }
            label="Nama Lengkap"
          />
          <Input
            placeholder="Contoh: 08123456789"
            value={client.whatsappNumber}
            onChange={(e) =>
              setClient({ ...client, whatsappNumber: e.target.value })
            }
            label="No. WhatsApp"
            type="tel"
            inputMode="numeric"
            error={client.whatsappNumber ? whatsAppValidationMessage(client.whatsappNumber) ?? undefined : undefined}
          />
        </div>
      </div>

      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          <MapPin className="h-4 w-4" /> Lokasi Acara
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(
            [
              { value: "KOTA_TASIK", label: "Kota Tasikmalaya" },
              { value: "LUAR_KOTA", label: "Luar Kota" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                setClient({
                  ...client,
                  locationType: opt.value,
                  travelHours: opt.value === "KOTA_TASIK" ? "" : client.travelHours,
                })
              }
              className={cn(
                "rounded-[1.5rem] border-2 px-3 py-3 text-xs font-semibold transition-all",
                client.locationType === opt.value
                  ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--ink)]"
                  : "border-white/50 bg-white/60 text-[var(--muted)] backdrop-blur-md hover:border-[var(--brand)] hover:bg-white/85",
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                {opt.value === "KOTA_TASIK" ? (
                  <MapPin className="h-3.5 w-3.5" />
                ) : (
                  <Car className="h-3.5 w-3.5" />
                )}
                {opt.label}
              </span>
            </button>
          ))}
        </div>
        {client.locationType === "LUAR_KOTA" && (
          <div className="mt-3 space-y-3">
            <Input
              label="Waktu Jarak Tempuh (jam)"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              placeholder="Contoh: 2"
              value={client.travelHours}
              onChange={(e) =>
                setClient({ ...client, travelHours: e.target.value })
              }
            />
            <div className="rounded-[1.5rem] border border-white/50 bg-white/60 px-4 py-3 text-xs text-[var(--muted)] backdrop-blur-md">
              Tarif: {FEE_LABEL}/jam × {client.travelHours || "0"} jam = <strong>{formatCurrency((Number(client.travelHours) || 0) * (transportFeeDefault ?? OUTSIDE_CITY_TRANSPORT_FEE))}</strong>
            </div>
          </div>
        )}
        <div className="mt-3">
          <Input
            placeholder="Tuliskan alamat lengkap lokasi acara"
            value={client.eventAddress}
            onChange={(e) =>
              setClient({ ...client, eventAddress: e.target.value })
            }
            label="Alamat Langkap"
          />
        </div>
      </div>

      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          <MessageCircle className="h-4 w-4" /> Catatan (Opsional)
        </h3>
        <textarea
          value={client.notes}
          onChange={(e) => setClient({ ...client, notes: e.target.value })}
          placeholder="Tuliskan permintaan khusus / detail acara"
          className="mt-3 h-24 w-full resize-none rounded-[1.5rem] border border-white/50 bg-white/60 px-4 py-3 text-sm text-[var(--ink)] backdrop-blur-md placeholder:text-[var(--muted-5)] transition-all focus:border-[var(--ink)] focus:bg-white/80 focus:outline-none focus:ring-2 focus:ring-white/60"
        />
      </div>
    </div>
  );
}
