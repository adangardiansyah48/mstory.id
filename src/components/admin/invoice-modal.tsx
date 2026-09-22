"use client";

import { useState } from "react";
import { Download, FileDown, Send } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import {
  buildDpInvoice,
  buildLunasInvoice,
  buildPelunasanInvoice,
  buildWhatsAppLink,
  formatCurrency,
  normalizeWhatsAppNumber,
} from "@/lib/utils";
import {
  PAYMENT_ACCOUNT,
  PAYMENT_ACCOUNT_HOLDER,
  PAYMENT_BANK,
} from "@/lib/types";
import type { InvoicePdfBooking } from "@/lib/invoice-pdf";

export type InvoiceKind = "DP" | "PELUNASAN" | "LUNAS";

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  booking: InvoicePdfBooking & {
    notes?: string | null;
    client: { full_name: string; whatsapp_number: string };
    addons: {
      add_ons?: { name: string };
      price_at_booking: number;
      qty?: number;
    }[];
  };
  defaultKind?: InvoiceKind;
  logoUrl?: string | null;
  vendorFee?: number;
}

export function InvoiceModal({
  open,
  onClose,
  booking,
  defaultKind = "DP",
  vendorFee,
}: InvoiceModalProps) {
  const [kind, setKind] = useState<InvoiceKind>(defaultKind);

  const pkg = booking.details?.[0]?.packages as unknown as { name: string; sub_categories?: { name: string; categories?: { name: string } | null } | null } | undefined;
  const dpLabel = "DP";
  function fullPkg(p?: typeof pkg): string {
    if (!p) return "Paket";
    const cat = p.sub_categories?.categories?.name?.trim();
    const sub = p.sub_categories?.name?.trim();
    const name = p.name?.trim() ?? "Paket";
    return [cat, sub, name].filter(Boolean).join(" - ");
  }

  const packageLines: string[] = [];
  if (booking.details?.[0]) {
    packageLines.push(
      `• ${fullPkg(pkg)} (${formatCurrency(booking.details[0].price_at_booking)})`,
    );
  }
  (booking.addons ?? []).forEach((a) => {
    packageLines.push(
      `• ${a.add_ons?.name ?? "-"} (${formatCurrency(a.price_at_booking)})`,
    );
  });
  const packageDescription = packageLines.join("\n") || "-";

  const base = {
    invoiceNumber: booking.invoice_number,
    fullName: booking.client?.full_name ?? "-",
    whatsappNumber: booking.client?.whatsapp_number ?? "-",
    eventDate: booking.event_date,
    eventAddress: booking.event_address,
    locationLabel:
      booking.location_type === "KOTA_TASIK"
        ? "Kota Tasikmalaya"
        : "Luar Kota",
    packageDescription,
    subtotal: booking.subtotal ?? 0,
    transportFee: booking.transport_fee ?? 0,
    grandTotal: booking.grand_total ?? 0,
    dpLabel,
    dpAmount: booking.dp_amount ?? 0,
    vendorFee: vendorFee ?? 0,
    vendorName: booking.vendor_name ?? undefined,
    paymentBank: PAYMENT_BANK,
    paymentAccount: PAYMENT_ACCOUNT,
    paymentHolder: PAYMENT_ACCOUNT_HOLDER,
  };

  const message =
    kind === "DP"
      ? buildDpInvoice(base)
      : kind === "PELUNASAN"
        ? buildPelunasanInvoice(base)
        : buildLunasInvoice(base);

const waLink = buildWhatsAppLink(
     normalizeWhatsAppNumber(booking.client?.whatsapp_number ?? ""),
     message,
   );
  const canWa = !!booking.client?.whatsapp_number;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col overflow-hidden">
        <div className="border-b border-white/40 px-6 pb-4 pt-6">
          <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">
            Invoice Booking
          </h2>
          <p className="mt-1 font-mono text-xs text-[var(--muted)]">
            {booking.invoice_number} · {booking.client?.full_name ?? "-"}
          </p>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setKind("DP")}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-widest transition-all",
                kind === "DP"
                  ? "bg-[var(--brand)] text-white shadow-[0_4px_20px_-2px_rgba(192,178,158,0.4)]"
                  : "bg-white/60 text-[var(--muted)] backdrop-blur-md hover:bg-white/85",
              )}
            >
              Invoice DP
            </button>
            <button
              onClick={() => setKind("PELUNASAN")}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-widest transition-all",
                kind === "PELUNASAN"
                  ? "bg-[var(--brand)] text-white shadow-[0_4px_20px_-2px_rgba(192,178,158,0.4)]"
                  : "bg-white/60 text-[var(--muted)] backdrop-blur-md hover:bg-white/85",
              )}
            >
              Tagihan
            </button>
            <button
              onClick={() => setKind("LUNAS")}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-widest transition-all",
                kind === "LUNAS"
                  ? "bg-[var(--brand)] text-white shadow-[0_4px_20px_-2px_rgba(192,178,158,0.4)]"
                  : "bg-white/60 text-[var(--muted)] backdrop-blur-md hover:bg-white/85",
              )}
            >
              Lunas
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="glass-inset rounded-2xl p-4">
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--ink)]">
              {message}
            </pre>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/40 px-6 py-4">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!canWa}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full bg-[#25D366] px-5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-green-500/20 transition-colors hover:bg-[#1eb958]",
              !canWa && "pointer-events-none opacity-40",
            )}
          >
            <Send className="h-3.5 w-3.5" />
            Kirim ke WA
          </a>
        </div>
      </div>
    </Modal>
  );
}

export function invoiceKindMeta(kind: InvoiceKind) {
  if (kind === "LUNAS") {
    return { label: "Invoice Lunas", icon: <Download className="h-3.5 w-3.5" /> };
  }
  return kind === "DP"
    ? { label: "Invoice DP", icon: <Download className="h-3.5 w-3.5" /> }
    : { label: "Invoice Pelunasan", icon: <FileDown className="h-3.5 w-3.5" /> };
}