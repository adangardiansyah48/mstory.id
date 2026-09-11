import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${ymd}-${rand}`;
}

export function normalizeWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }
  if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }
  return cleaned;
}

export function buildWhatsAppLink(
  phoneNumber: string,
  message: string,
): string {
  const normalized = normalizeWhatsAppNumber(phoneNumber);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

interface InvoiceInput {
  invoiceNumber: string;
  fullName: string;
  whatsappNumber: string;
  eventDate: string;
  eventAddress: string;
  locationLabel: string;
  packageDescription: string;
  subtotal: number;
  transportFee: number;
  grandTotal: number;
  dpLabel: string;
  dpAmount: number;
  paymentBank: string;
  paymentAccount: string;
  paymentHolder: string;
}

function invoiceHeader(type: "DP" | "PELUNASAN" | "LUNAS"): string[] {
  const title =
    type === "DP"
      ? "TAGIHAN DP"
      : type === "PELUNASAN"
        ? "TAGIHAN PELUNASAN"
        : "TANDA TERIMA LUNAS";
  return [`*${title} - Mstory.id*`, `━━━━━━━━━━━━━━━━━━`];
}

function invoiceBody(input: InvoiceInput): string[] {
  return [
    `No. Invoice: ${input.invoiceNumber}`,
    ``,
    `*DATA KLIEN*`,
    `Nama: ${input.fullName}`,
    `WhatsApp: ${input.whatsappNumber}`,
    ``,
    `*DETAIL ACARA*`,
    `Tanggal: ${formatDate(input.eventDate)}`,
    `Lokasi: ${input.locationLabel}`,
    `Alamat: ${input.eventAddress}`,
    ``,
    `*PAKET*`,
    input.packageDescription,
    ``,
    `*RINCIAN BIAYA*`,
    `Subtotal: ${formatCurrency(input.subtotal)}`,
    `Transport: ${formatCurrency(input.transportFee)}`,
    `Total: ${formatCurrency(input.grandTotal)}`,
  ];
}

export function buildDpInvoice(input: InvoiceInput): string {
  return [
    ...invoiceHeader("DP"),
    ...invoiceBody(input),
    ``,
    `*YANG HARUS DIBAYAR (DP)*`,
    `${input.dpLabel}: ${formatCurrency(input.dpAmount)}`,
    ``,
    `*PEMBAYARAN KE*`,
    `${input.paymentBank} ${input.paymentAccount}`,
    `A/n ${input.paymentHolder}`,
    ``,
    `*KONFIRMASI*`,
    `Kirim bukti transfer ke admin setelah melakukan pembayaran.`,
    `DP tidak dapat dikembalikan jika dibatalkan setelah invoice dibuat.`,
    ``,
    `Mohon konfirmasi pembayaran dengan mengirim bukti transfer. 🙏`,
    `Terima kasih sudah mempercayakan momen berharga Anda kepada Mstory.id!`,
  ].join("\n");
}

export function buildPelunasanInvoice(input: InvoiceInput): string {
  const remaining = Math.max(input.grandTotal - input.dpAmount, 0);
  return [
    ...invoiceHeader("PELUNASAN"),
    ...invoiceBody(input),
    ``,
    `DP yang telah dibayar: ${formatCurrency(input.dpAmount)}`,
    `*SISA PELUNASAN: ${formatCurrency(remaining)}*`,
    `(Paling lambat H-1 sebelum event tanggal)`,
    ``,
    `*PEMBAYARAN KE*`,
    `${input.paymentBank} ${input.paymentAccount}`,
    `A/n ${input.paymentHolder}`,
    ``,
    `*KONFIRMASI*`,
    `Kirim bukti transfer ke admin setelah melakukan pembayaran. 🙏`,
    `Terima kasih sudah mempercayakan momen berharga Anda kepada Mstory.id!`,
  ].join("\n");
}

export function buildLunasInvoice(input: InvoiceInput): string {
  const paid = Math.max(input.grandTotal - input.dpAmount, 0);
  return [
    ...invoiceHeader("LUNAS"),
    ...invoiceBody(input),
    ``,
    `*RINCIAN PEMBAYARAN*`,
    `DP Dibayar: ${formatCurrency(input.dpAmount)}`,
    `Pelunasan Dibayar: ${formatCurrency(paid)}`,
    `Sisa Tagihan: Rp 0 (LUNAS)`,
    ``,
    `*STATUS: LUNAS*`,
    `Tidak ada tagihan yang tersisa.`,
    ``,
    `Terima kasih sudah mempercayakan momen berharga Anda kepada Mstory.id! 🎉`,
  ].join("\n");
}

export function buildInvoiceMessage(input: {
  invoiceNumber: string;
  fullName: string;
  whatsappNumber: string;
  eventDate: string;
  eventAddress: string;
  locationLabel: string;
  packageDescription: string;
  subtotal: number;
  transportFee: number;
  grandTotal: number;
  dpLabel: string;
  dpAmount: number;
  remainingBalance: number;
  paymentBank: string;
  paymentAccount: string;
  paymentHolder: string;
}): string {
  const lines = [
    `*INVOICE BOOKING - Mstory.id*`,
    `━━━━━━━━━━━━━━━━━━`,
    `No. Invoice: ${input.invoiceNumber}`,
    ``,
    `*DATA KLIEN*`,
    `Nama: ${input.fullName}`,
    `WhatsApp: ${input.whatsappNumber}`,
    ``,
    `*DETAIL ACARA*`,
    `Tanggal: ${formatDate(input.eventDate)}`,
    `Lokasi: ${input.locationLabel}`,
    `Alamat: ${input.eventAddress}`,
    ``,
    `*PAKET YANG DIPILIH*`,
    input.packageDescription,
    ``,
    `*RINCIAN BIAYA*`,
    `Subtotal: ${formatCurrency(input.subtotal)}`,
    `Transport: ${formatCurrency(input.transportFee)}`,
    `Total: ${formatCurrency(input.grandTotal)}`,
    ``,
    `*PEMBAYARAN*`,
    `${input.dpLabel}: ${formatCurrency(input.dpAmount)}`,
    `Sisa Pelunasan: ${formatCurrency(input.remainingBalance)}`,
    `(Paling lambat H-1 event tanggal)`,
    ``,
    `*PEMBAYARAN KE*`,
    `${input.paymentBank} ${input.paymentAccount}`,
    `A/n ${input.paymentHolder}`,
    ``,
    `*SLA (Estimasi Pengerjaan)*`,
    `- Retouch foto: Max 1 minggu setelah event`,
    `- Cetak & video: Max 3 minggu setelah event`,
    ``,
    `*KETENTUAN*`,
    `- DP tidak dapat dikembalikan jika batal setelah invoice dibuat`,
    `- Transport dikenakan untuk lokasi di luar Kota Tasikmalaya`,
    ``,
    `Mohon konfirmasi pembayaran dengan mengirim bukti transfer. 🙏`,
    `Terima kasih sudah mempercayakan momen berharga Anda kepada Mstory.id!`,
  ];
  return lines.join("\n");
}

export function slugify(input: string): string {
  return input
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}