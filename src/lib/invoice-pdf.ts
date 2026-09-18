import { jsPDF } from "jspdf";
import type { InvoicePdfKind } from "@/lib/types";
import { PAYMENT_ACCOUNT, PAYMENT_ACCOUNT_HOLDER, PAYMENT_BANK } from "@/lib/types";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface InvoicePdfBooking {
  invoice_number: string;
  booking_date?: string | null;
  event_date: string;
  location_type: "KOTA_TASIK" | "LUAR_KOTA";
  event_address: string;
  source?: string | null;
  vendor_name?: string | null;
  subtotal: number;
  transport_fee: number;
  grand_total: number;
  dp_amount: number;
  dp_paid_at?: string | null;
  paid_at?: string | null;
  client: { full_name: string; whatsapp_number: string };
  details: {
    price_at_booking: number;
    packages?: {
      name: string;
      dp_value?: number;
      inclusions?: string | null;
    };
  }[];
  addons: {
    add_ons?: { name: string };
    price_at_booking: number;
    qty?: number;
  }[];
}

const INK: [number, number, number] = [26, 26, 26];
const MUTED: [number, number, number] = [115, 108, 97];
const BRAND_C: [number, number, number] = [168, 150, 122];
const BRAND_DARK: [number, number, number] = [130, 110, 80];
const LINE_C: [number, number, number] = [222, 212, 196];
const GREEN_TXT: [number, number, number] = [4, 120, 87];

const PAGE_W = 210;
const MARGIN = 15;
const RIGHT = PAGE_W - MARGIN;
const CONTENT_W = RIGHT - MARGIN;

function fmt(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function fmtInvoiceDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const BADGE: Record<InvoicePdfKind, { line1: string; line2: string; text: [number, number, number] }> = {
  MENUNGGU_DP: { line1: "UNPAID", line2: "MENUNGGU DP", text: [146, 64, 14] },
  MENUNGGU_PELUNASAN: { line1: "PARTIALLY PAID", line2: "DP RECEIVED", text: [29, 78, 216] },
  LUNAS: { line1: "PAID IN FULL", line2: "LUNAS", text: [4, 120, 87] },
};

function loadLogoDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const size = 320;
          const bg = 64;
          const c = document.createElement("canvas");
          c.width = size;
          c.height = size;
          const ctx = c.getContext("2d");
          if (!ctx) return resolve(null);
          const scale = Math.min((size - bg * 2) / img.width, (size - bg * 2) / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          resolve(c.toDataURL("image/png"));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

export async function downloadInvoicePdf(input: {
  booking: InvoicePdfBooking;
  kind: InvoicePdfKind;
  logoUrl?: string | null;
  note?: string | null;
  vendorFee?: number;
}): Promise<void> {
  const { booking, kind, logoUrl, note, vendorFee } = input;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logoDataUrl = logoUrl ? await loadLogoDataUrl(logoUrl) : null;
  const badge = BADGE[kind];
  const remaining = Math.max(Number(booking.grand_total) - Number(booking.dp_amount), 0);

  // ============ HEADER ============
  const logoW = 34;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", MARGIN, 12, logoW, logoW);
    } catch {
      /* logo opsional */
    }
  }

  // Right block: INVOICE (besar, rata kanan) + nomor + tanggal
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...BRAND_DARK);
  doc.text("INVOICE", RIGHT, 26, { align: "right", charSpace: 0.8 });

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(`No. ${booking.invoice_number}`, RIGHT, 34.5, { align: "right" });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text(`Tanggal Booking :  ${fmtDate(booking.booking_date)}`, RIGHT, 43, { align: "right" });
  doc.text(`Tanggal Acara   :  ${fmtDate(booking.event_date)}`, RIGHT, 48.5, { align: "right" });

  // Double rule
  doc.setDrawColor(...BRAND_C);
  doc.setLineWidth(1.1);
  doc.line(MARGIN, 57, RIGHT, 57);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 59, RIGHT, 59);

  // ============ CLIENT & PAYMENT ============
  let y = 70;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("DITAGIHKAN KEPADA", MARGIN, y);
  doc.text("PEMBAYARAN KEPADA", MARGIN + 118, y);
  y += 8;

  // Left: Nama / Alamat / WhatsApp with labels
  const labelX = MARGIN;
  const valueX = MARGIN + 40;
  const leftW = (MARGIN + 118) - valueX - 2;

  function kv(label: string, value: string): number {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(label, labelX, y + 2.5);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(value || "-", leftW) as string[];
    doc.text(lines, valueX, y + 2.5);
    return (lines.length - 1) * 4.6;
  }

  kv("Nama :", booking.client?.full_name ?? "-");
  y += 7.5;
  y += kv("Alamat :", booking.event_address ?? "-");
  y += 8;
  kv("WhatsApp :", booking.client?.whatsapp_number ?? "-");

  // Right: bank + A/N + status (tanpa kotak, teks lebih besar)
  const payX = MARGIN + 118;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(`${PAYMENT_BANK} ${PAYMENT_ACCOUNT}`, payX, 78);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`A/N  ${PAYMENT_ACCOUNT_HOLDER}`, payX, 84);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...badge.text);
  doc.text(badge.line1, RIGHT, 94, { align: "right" });
  doc.setFontSize(11);
  doc.text(badge.line2, RIGHT, 101, { align: "right" });

  // ============ ORDER TABLE ============
  const tableTop = Math.max(y + 8, 108);
  let ty = tableTop;

  const cItem = MARGIN;
  const cQty = MARGIN + 108;
  const cSat = MARGIN + 132;
  const cJml = RIGHT;

  doc.setFillColor(...BRAND_C);
  doc.rect(MARGIN, ty - 9, CONTENT_W, 10, "F");
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("NAMA PAKET / ADD-ON", cItem + 5, ty - 2.4);
  doc.text("BANYAK", (cQty + cSat) / 2, ty - 2.4, { align: "center" });
  doc.text("HARGA SATUAN", cSat + 3, ty - 2.4, { align: "right" });
  doc.text("JUMLAH", cJml - 5, ty - 2.4, { align: "right" });

  const rows: { name: string; qty: number; unit: number }[] = [];
  if (booking.details?.[0]) {
    rows.push({
      name: booking.details[0].packages?.name ?? "Paket",
      qty: 1,
      unit: Number(booking.details[0].price_at_booking) || 0,
    });
  }
  (booking.addons ?? []).forEach((a) => {
    rows.push({
      name: a.add_ons?.name ?? "Add-on",
      qty: a.qty ?? 1,
      unit: Number(a.price_at_booking) || 0,
    });
  });

  ty += 3;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  rows.forEach((r, idx) => {
    const nameLines = doc.splitTextToSize(r.name, cQty - cItem - 10) as string[];
    const bodyH = Math.max(1, nameLines.length) * 5.2;
    const rowH = bodyH + 5;
    doc.text(nameLines, cItem + 5, ty + 4.2);
    doc.text(String(r.qty), (cQty + cSat) / 2, ty + 4.2, { align: "center" });
    doc.text(fmt(r.unit), cSat + 3, ty + 4.2, { align: "right" });
    doc.text(fmt(r.unit * r.qty), cJml - 5, ty + 4.2, { align: "right" });
    ty += rowH;
    if (idx < rows.length - 1) {
      doc.setDrawColor(...LINE_C);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, ty - 0.5, RIGHT, ty - 0.5);
    }
  });

  ty += 10;

  // ============ FINANCIAL BREAKDOWN (bottom right) ============
  const bxTotal = MARGIN + 78;

  function sumLine(label: string, value: string, color?: [number, number, number], weight: "normal" | "bold" = "normal") {
    doc.setFont("Helvetica", weight === "bold" ? "bold" : "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...(color ?? INK));
    doc.text(label, bxTotal, ty + 4.5);
    doc.setFont("Helvetica", weight === "bold" ? "bold" : "normal");
    doc.text(value, RIGHT, ty + 4.5, { align: "right" });
    ty += 8;
  }

  const subtotal = Number(booking.subtotal) || 0;
  const transport = Number(booking.transport_fee) || 0;

  sumLine("Subtotal", fmt(subtotal));
  if (transport > 0) {
    sumLine("Transport", fmt(transport));
  }
  sumLine("Total", fmt(Number(booking.grand_total) || 0));

  if (vendorFee && vendorFee > 0) {
    const net = Math.max(Number(booking.grand_total || 0) - vendorFee, 0);
    const feeLabel = booking.vendor_name ? `Fee Vendor (${booking.vendor_name})` : "Fee Vendor";
    sumLine(feeLabel, `-${fmt(vendorFee)}`, [196, 96, 26], "bold");
    sumLine("Diterima Mstory.id", fmt(net), GREEN_TXT, "bold");
  }

  if (kind === "LUNAS") {
    sumLine("DP Dibayar", fmt(Number(booking.dp_amount) || 0));
    sumLine("Pelunasan Dibayar", fmt(remaining));
  } else if (kind === "MENUNGGU_PELUNASAN") {
    sumLine("DP Dibayar", fmt(Number(booking.dp_amount) || 0));
  } else {
    sumLine("DP", fmt(Number(booking.dp_amount) || 0), BRAND_DARK, "bold");
  }

  const finalLabel = kind === "LUNAS" ? "SISA TAGIHAN" : "TOTAL YANG HARUS DIBAYAR";
  const finalValue = kind === "LUNAS" ? "Rp 0,00 (LUNAS)" : fmt(remaining);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...(kind === "LUNAS" || remaining <= 0 ? GREEN_TXT : INK));
  doc.text(finalLabel, bxTotal, ty + 4.5);
  doc.text(finalValue, RIGHT, ty + 4.5, { align: "right" });
  ty += 12;

  if (note) {
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const nl = doc.splitTextToSize(`Catatan Admin: ${note}`, CONTENT_W) as string[];
    doc.text(nl, MARGIN, ty + 2);
    ty += nl.length * 4.8 + 4;
  }

  // ============ TERMS & SLA FOOTER ============
  let fy = Math.max(ty + 6, 216);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text("CATATAN", MARGIN, fy);
  fy += 1.5;
  doc.setDrawColor(...BRAND_C);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, fy, RIGHT, fy);
  fy += 5.5;

  const catatan: string[] =
    kind === "LUNAS"
      ? [
          "Invoice ini merupakan tanda terima pembayaran LUNAS untuk seluruh tagihan.",
          "Setelah invoice diterima, package & tanggal yang dipilih tidak bisa diubah.",
          "Album / cetakan dikirim ekspedisi atau bisa diambil di office Mstory.id.",
          "Terima kasih telah mempercayakan momen berharga Anda bersama Mstory.id.",
        ]
      : [
          "Pelunasan Maksimal H-1.",
          `Booking tanpa DP kita anggap konsultasi, untuk DP dikirim ke rekening ${PAYMENT_BANK} ${PAYMENT_ACCOUNT} A/n ${PAYMENT_ACCOUNT_HOLDER}. Selain rekening tersebut bukan tanggung jawab kita.`,
          "Setelah invoice diterima, package & tanggal yang dipilih tidak bisa diubah ya.",
          "Cancel Tanggal Setelah Invoice Keluar, DP Hangus.",
        ];

  fy = drawBullets(doc, catatan, MARGIN, fy, CONTENT_W, 8);

  fy += 7;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text("KETENTUAN", MARGIN, fy);
  fy += 1.5;
  doc.setDrawColor(...BRAND_C);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, fy, RIGHT, fy);
  fy += 5.5;

  const ketentuan = [
    "Soft file RETOUCH (EDIT) maksimal 5 Hari dari waktu pengambilan photo wedding.",
    "Output cetakan & video maksimal 4 MINGGU KERJA.",
    "Pembesaran sudah termasuk frame & laminasi. Album dikirim ekspedisi atau bisa diambil di office Mstory.id.",
    "Booking tanggal tanpa DP kita anggap KONSULTASI.",
  ];
  fy = drawBullets(doc, ketentuan, MARGIN, fy, CONTENT_W, 8);

  fy += 5;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `Dokumen ini dibuat otomatis oleh Sistem Booking Mstory.id - ${fmtInvoiceDateTime(new Date().toISOString())}`,
    PAGE_W / 2,
    fy,
    { align: "center" },
  );

  const suffix =
    kind === "MENUNGGU_DP"
      ? "invoice-dp"
      : kind === "MENUNGGU_PELUNASAN"
        ? "tagihan-pelunasan"
        : "tanda-terima-lunas";
  doc.save(`${booking.invoice_number}-${suffix}.pdf`);
}

function drawBullets(
  doc: jsPDF,
  items: string[],
  left: number,
  y: number,
  width: number,
  fontSize: number,
): number {
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...INK);
  let cursor = y;
  items.forEach((item) => {
    const text = item.startsWith("- ") ? item : `- ${item}`;
    const lines = doc.splitTextToSize(text, width - 5) as string[];
    doc.text(lines, left + 4, cursor + 2);
    cursor += lines.length * 4.5 + 2.5;
  });
  return cursor;
}

export function downloadVendorFeeMonthlyInvoice(input: {
  vendorName: string;
  monthLabel: string;
  logoUrl?: string | null;
  rows: {
    invoice_number: string;
    event_date: string;
    fee: number;
  }[];
}): Promise<void> {
  const { vendorName, monthLabel, logoUrl, rows } = input;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const feeEach = rows[0]?.fee ?? 0;
  const totalFee = rows.reduce((s, r) => s + r.fee, 0);

  async function build(): Promise<void> {
    const logoDataUrl = logoUrl ? await loadLogoDataUrl(logoUrl) : null;
    const logoW = 50;
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", MARGIN, 10, logoW, logoW);
      } catch {
        /* logo opsional */
      }
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...BRAND_DARK);
    doc.text("BUKTI PENYERAHAN", RIGHT, 26, { align: "right", charSpace: 0.8 });
    doc.text("FEE VENDOR", RIGHT, 34, { align: "right", charSpace: 0.8 });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text("Periode :", RIGHT, 43.5, { align: "right" });
    doc.setFont("Helvetica", "bold");
    doc.text(monthLabel, RIGHT, 49, { align: "right" });

    doc.setDrawColor(...BRAND_C);
    doc.setLineWidth(1.1);
    doc.line(MARGIN, 57, RIGHT, 57);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 59, RIGHT, 59);

    let y = 70;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("DISERAHKAN KEPADA VENDOR", MARGIN, y);
    y += 8;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...INK);
    const vendorLines = doc.splitTextToSize(vendorName, CONTENT_W) as string[];
    doc.text(vendorLines, MARGIN, y);
    y += vendorLines.length * 5.5 + 3;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(`Akumulasi fee vendor bulan ${monthLabel} · Mstory.id menyatakan telah menyerahkan fee atas booking yang ditangani ${vendorName}.`, MARGIN, y);
    y += 8;

    const tableTop = Math.max(y, 100);
    let ty = tableTop;
    const cItem = MARGIN;
    const cTanggal = MARGIN + 95;
    const cFee = RIGHT;

    doc.setFillColor(...BRAND_C);
    doc.rect(MARGIN, ty - 9, CONTENT_W, 10, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("NO. INVOICE / BOOKING", cItem + 5, ty - 2.4);
    doc.text("TANGGAL EVENT", cTanggal + 5, ty - 2.4);
    doc.text("FEE", cFee - 5, ty - 2.4, { align: "right" });

    ty += 3;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    let totalCol = 0;
    rows.forEach((r, idx) => {
      doc.text(String(r.invoice_number), cItem + 5, ty + 4.2);
      doc.setFont("Helvetica", "normal");
      doc.text(fmtDate(r.event_date), cTanggal + 5, ty + 4.2);
      doc.setFont("Helvetica", "bold");
      doc.text(fmt(Number(r.fee) || 0), cFee - 5, ty + 4.2, { align: "right" });
      doc.setFont("Helvetica", "normal");
      totalCol += Number(r.fee) || 0;
      ty += 8;
      if (idx < rows.length - 1) {
        doc.setDrawColor(...LINE_C);
        doc.setLineWidth(0.2);
        doc.line(MARGIN, ty - 0.5, RIGHT, ty - 0.5);
      }
    });

    ty += 8;
    doc.setDrawColor(...BRAND_C);
    doc.setLineWidth(1.1);
    doc.line(MARGIN, ty - 5, RIGHT, ty - 5);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text("TOTAL FEE DISERAHKAN", MARGIN, ty + 3);
    doc.text(fmt(totalCol), RIGHT, ty + 3, { align: "right" });
    ty += 9;

    let fy = Math.max(ty + 6, 216);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text("KETERANGAN", MARGIN, fy);
    fy += 1.5;
    doc.setDrawColor(...BRAND_C);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, fy, RIGHT, fy);
    fy += 5.5;

    fy = drawBullets(
      doc,
      [
        "Dokumen ini merupakan tanda/bukti penyerahan fee dari Mstory.id kepada vendor terkait atas pekerjaan bulan bersangkutan.",
        "Total fee diserahkan = jumlah booking ditangani vendor × fee per booking.",
        "Fee sudah memperhitungkan pengurangan (kewajiban) vendor sesuai kesepakatan. Tidak ada tagihan lain terkait periode ini.",
        "Dokumen dicetak otomatis dari sistem Mstory.id.",
      ],
      MARGIN,
      fy,
      CONTENT_W,
      8,
    );

  fy += 6;

    const fileSafe = slugify(vendorName) || "vendor";
    doc.save(`fee-vendor-${fileSafe}-${slugify(monthLabel)}.pdf`);
  }

  return build();
}