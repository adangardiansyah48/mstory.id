"use client";

import {
  CalendarCheck,
  Clock,
  CreditCard,
  Info,
  MapPin,
  Palette,
  Printer,
  ScrollText,
  User,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CheckboxField } from "@/components/ui/checkbox";
import { AddonIcon } from "@/components/ui/icons";
import {
  PAYMENT_ACCOUNT,
  PAYMENT_ACCOUNT_HOLDER,
  PAYMENT_BANK,
  SLA_PRINT_WEEKS,
  SLA_RETOUCH_WEEKS,
  type WizardClientDetails,
} from "@/lib/types";
import type { Addon, Category, Package, SubCategory } from "@/lib/types";

interface Step3Props {
  selection: {
    category: Category | null;
    subCategory: SubCategory | null;
    selectedPackage: Package | null;
    addons: Addon[];
  };
  client: WizardClientDetails;
  setClient: React.Dispatch<React.SetStateAction<WizardClientDetails>>;
  subtotal: number;
  transportFee: number;
  grandTotal: number;
  dpLabel: string;
  dpAmount: number;
  remainingBalance: number;
}

export function Step3Summary({
  selection,
  client,
  setClient,
  subtotal,
  transportFee,
  grandTotal,
  dpLabel,
  dpAmount,
  remainingBalance,
}: Step3Props) {
  const pkg = selection.selectedPackage;

  return (
    <div className="space-y-6 px-6 py-6">
      <div className="rounded-[1.75rem] border border-white/50 bg-white/65 p-5 backdrop-blur-md">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          <ScrollText className="h-4 w-4" /> Ringkasan Pesanan
        </h3>
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-sm font-bold text-[var(--ink)]">
              {selection.category?.name} · {selection.subCategory?.name}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {pkg?.name} · {formatCurrency(pkg?.price || 0)}
            </p>
            {pkg?.duration_hours && (
              <p className="text-xs text-[var(--muted-2)]">
                Durasi: {pkg.duration_hours} jam
              </p>
            )}
          </div>
          {selection.addons.length > 0 && (
            <div className="border-t border-dashed border-white/50 pt-3">
              {selection.addons.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-0.5 text-sm"
                >
                  <span className="flex items-center gap-1.5 text-[var(--muted)]">
                    <AddonIcon
                      name={a.name}
                      className="h-4 w-4 shrink-0"
                    />
                    {a.name}
                  </span>
                  <span className="font-semibold text-[var(--ink)]">
                    {formatCurrency(a.price)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-white/50 bg-white/65 p-5 backdrop-blur-md">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          <User className="h-4 w-4" /> Data Klien & Acara
        </h3>
        <div className="mt-3 space-y-2 text-sm text-[var(--ink)]">
          <p>
            <span className="font-semibold">Nama:</span> {client.fullName}
          </p>
          <p>
            <span className="font-semibold">WhatsApp:</span>{" "}
            {client.whatsappNumber}
          </p>
          <p className="flex items-start gap-1.5">
            <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-2)]" />
            <span>
              {client.eventDate
                ? new Date(
                    client.eventDate + "T00:00:00",
                  ).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "-"}
            </span>
          </p>
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-2)]" />
            <span>
              {client.locationType === "KOTA_TASIK"
                ? "Kota Tasikmalaya"
                : "Luar Kota"}{" "}
              · {client.eventAddress}
            </span>
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-[var(--ink)] p-5 text-white">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-3)]">
          <Wallet className="h-4 w-4" /> Rincian Biaya
        </h3>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted-3)]">Subtotal Paket</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-3)]">Biaya Transport</span>
            <span className="font-medium">{formatCurrency(transportFee)}</span>
          </div>
          <div className="my-2 border-t border-white/15" />
          <div className="flex justify-between text-base font-bold">
            <span>Grand Total</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
          <div className="mt-3 space-y-1 rounded-xl bg-white/10 p-3">
            <div className="flex justify-between">
              <span className="text-[var(--muted-3)]">{dpLabel} Wajib</span>
              <span className="font-bold text-[#7fd6a8]">
                {formatCurrency(dpAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-3)]">Sisa Pelunasan (H-1)</span>
              <span className="font-bold">{formatCurrency(remainingBalance)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-xs leading-relaxed text-[var(--muted-6)]">
          <p className="flex items-start gap-2">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Retouching foto: maksimal {SLA_RETOUCH_WEEKS} minggu setelah event
          </p>
          <p className="flex items-start gap-2">
            <Printer className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Cetak & video: maksimal {SLA_PRINT_WEEKS} minggu setelah event
          </p>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-white/50 bg-white/65 p-5 backdrop-blur-md">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          <CreditCard className="h-4 w-4" /> Pembayaran
        </h3>
        <div className="mt-3 rounded-2xl border border-white/50 bg-white/70 px-4 py-3 backdrop-blur-md">
          <p className="font-semibold text-[var(--ink)]">
            {PAYMENT_BANK} {PAYMENT_ACCOUNT}
          </p>
          <p className="text-xs text-[var(--muted)]">A/n {PAYMENT_ACCOUNT_HOLDER}</p>
        </div>
        <div className="mt-3 rounded-2xl bg-amber-100/60 px-4 py-3 text-xs leading-relaxed text-amber-900 backdrop-blur-md">
          <p className="flex items-start gap-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            DP tidak dapat dikembalikan (non-refundable) jika booking dibatalkan
            setelah invoice dibuat.
          </p>
        </div>
      </div>

      <div>
        <CheckboxField
          label="Saya menyetujui seluruh ketentuan layanan Mstory.id, termasuk kebijakan DP sesuai paket terpilih, pelunasan maksimal H-1 event, biaya transport luar kota, dan SLA pengerjaan."
          checked={client.agreedToTerms}
          onChange={(checked) => setClient({ ...client, agreedToTerms: checked })}
        />
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--muted-2)]">
        <Palette className="h-3 w-3" />
        Setelah klik Kirim, Anda akan diarahkan ke WhatsApp admin dengan pesan
        invoice otomatis.
      </p>
    </div>
  );
}