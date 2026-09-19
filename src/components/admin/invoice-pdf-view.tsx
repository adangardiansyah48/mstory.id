"use client";

import { Document, Font, Image, Page, PDFViewer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { useMemo } from "react";
import type { InvoicePdfKind } from "@/lib/types";
import type { InvoicePdfBooking } from "@/lib/invoice-pdf";
import { PAYMENT_ACCOUNT, PAYMENT_ACCOUNT_HOLDER, PAYMENT_BANK } from "@/lib/types";

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica", fontWeight: "normal" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

const C = {
  gold: "#A8967A",
  goldDark: "#826E50",
  ink: "#1A1A1A",
  muted: "#736C61",
  line: "#DED4C4",
  green: "#047857",
  white: "#FFFFFF",
  bg: "#F9F7F4",
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: C.ink, backgroundColor: C.white },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 },
  logo: { width: 140, height: 56, objectFit: "contain" },
  titleBlock: { alignItems: "flex-end" },
  title: { fontSize: 26, fontWeight: "bold", color: "#1a237e", letterSpacing: 2 },
  invoiceNo: { fontSize: 12, fontWeight: "bold", marginTop: 5 },
  dates: { fontSize: 9, color: C.muted, marginTop: 4 },
  statusBadge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6, marginBottom: 20, alignSelf: "flex-start", backgroundColor: "#fef3c7" },
  statusText: { fontSize: 10, fontWeight: "bold", color: "#92400e" },
  statusBadgeLunas: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6, marginBottom: 20, alignSelf: "flex-start", backgroundColor: "#DCFCE7" },
  statusTextLunas: { fontSize: 10, fontWeight: "bold", color: "#047857" },
  statusBadgePel: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6, marginBottom: 20, alignSelf: "flex-start", backgroundColor: "#DBEAFE" },
  statusTextPel: { fontSize: 10, fontWeight: "bold", color: "#1D4ED8" },
  sectionTitle: { fontSize: 9, fontWeight: "bold", color: C.muted, textTransform: "uppercase", marginBottom: 8 },
  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 25 },
  colLeft: { width: "48%" },
  colRight: { width: "48%" },
  kvRow: { flexDirection: "row", marginBottom: 4 },
  kvLabel: { width: 70, color: C.muted, fontSize: 9 },
  kvValue: { flex: 1, color: C.ink, fontWeight: "bold", fontSize: 9 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f8f9fa", padding: 10, borderBottomWidth: 1, borderBottomColor: "#e0e0e0" },
  thItem: { flex: 6, fontWeight: "bold", fontSize: 9 },
  thPrice: { flex: 2, fontWeight: "bold", fontSize: 9, textAlign: "right" },
  tableRow: { flexDirection: "row", padding: 10, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  tdItem: { flex: 6, fontSize: 9 },
  tdPrice: { flex: 2, fontSize: 9, textAlign: "right" },
  summary: { marginTop: 20, borderTopWidth: 2, borderTopColor: "#1a237e", paddingTop: 10, width: "100%" },
  sumRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 6 },
  sumLabel: { width: 150, textAlign: "right", marginRight: 20, fontSize: 10, color: C.muted },
  sumValue: { width: 100, textAlign: "right", fontSize: 10, fontWeight: "bold" },
  grandLabel: { width: 150, textAlign: "right", marginRight: 20, fontSize: 12, fontWeight: "bold", color: "#1a237e" },
  grandValue: { width: 100, textAlign: "right", fontSize: 12, fontWeight: "bold", color: "#d32f2f" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: C.muted },
});

interface Props {
  booking: InvoicePdfBooking;
  kind: InvoicePdfKind;
  logoUrl?: string | null;
  vendorFee?: number;
}

function fmt(v: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function fmtDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function subDays(d: string, days: number): string {
  const date = new Date(d);
  date.setDate(date.getDate() - days);
  return date.toDateString();
}

export function InvoicePdfDocument({ booking, kind, logoUrl, vendorFee }: Props) {
  const rows: { name: string; price: number }[] = [];
  if (booking.details?.[0]) {
    rows.push({ name: booking.details[0].packages?.name ?? "Paket", price: Number(booking.details[0].price_at_booking) || 0 });
  }
  (booking.addons ?? []).forEach((a) => {
    rows.push({ name: a.add_ons?.name ?? "-", price: Number(a.price_at_booking) || 0 });
  });

  const subtotal = Number(booking.subtotal) || 0;
  const transport = Number(booking.transport_fee) || 0;
  const total = Number(booking.grand_total) || 0;
  const dpAmount = Number(booking.dp_amount) || 0;
  const remaining = kind === "LUNAS" ? 0 : Math.max(total - dpAmount, 0);

  const statusMap: Record<string, string> = {
    MENUNGGU_DP: "Status: Menunggu DP",
    MENUNGGU_PELUNASAN: "Status: Menunggu Pelunasan",
    LUNAS: "Status: Lunas",
  };

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {logoUrl ? <Image src={logoUrl} style={s.logo} /> : <View style={s.logo} />}
          <View style={s.titleBlock}>
            <Text style={s.title}>I N V O I C E</Text>
            <Text style={s.invoiceNo}>No. {booking.invoice_number}</Text>
            <Text style={s.dates}>Tanggal Booking: {fmtDate(booking.booking_date)}</Text>
          </View>
        </View>

        <View style={kind === "LUNAS" ? s.statusBadgeLunas : kind === "MENUNGGU_PELUNASAN" ? s.statusBadgePel : s.statusBadge}>
          <Text style={kind === "LUNAS" ? s.statusTextLunas : kind === "MENUNGGU_PELUNASAN" ? s.statusTextPel : s.statusText}>{statusMap[kind] || "Status: Menunggu DP"}</Text>
        </View>

        <View style={s.twoCol}>
          <View style={s.colLeft}>
            <Text style={s.sectionTitle}>DITAGIHKAN KEPADA</Text>
            <View style={s.kvRow}><Text style={s.kvLabel}>Nama</Text><Text style={s.kvValue}>: {booking.client?.full_name ?? "-"}</Text></View>
            <View style={s.kvRow}><Text style={s.kvLabel}>No. WhatsApp</Text><Text style={s.kvValue}>: {booking.client?.whatsapp_number ?? "-"}</Text></View>
            <View style={s.kvRow}><Text style={s.kvLabel}>Alamat</Text><Text style={s.kvValue}>: {booking.event_address ?? "-"}</Text></View>
          </View>
          <View style={s.colRight}>
            <Text style={s.sectionTitle}>DETAIL ACARA</Text>
            <View style={s.kvRow}><Text style={s.kvLabel}>Tanggal Acara</Text><Text style={s.kvValue}>: {fmtDate(booking.event_date)}</Text></View>
            <View style={s.kvRow}><Text style={s.kvLabel}>Lokasi</Text><Text style={s.kvValue}>: {booking.location_type === "KOTA_TASIK" ? "Kota Tasikmalaya" : "Luar Kota"}</Text></View>
          </View>
        </View>

        <View style={s.tableHeader}>
          <Text style={s.thItem}>Item / Deskripsi</Text>
          <Text style={s.thPrice}>Jumlah</Text>
        </View>
        {rows.map((r, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={s.tdItem}>{r.name}</Text>
            <Text style={s.tdPrice}>{fmt(r.price)}</Text>
          </View>
        ))}

        <View style={s.summary}>
          <View style={s.sumRow}><Text style={s.sumLabel}>Subtotal</Text><Text style={s.sumValue}>{fmt(subtotal)}</Text></View>
          <View style={s.sumRow}><Text style={s.sumLabel}>Transport</Text><Text style={s.sumValue}>{fmt(transport)}</Text></View>
          <View style={s.sumRow}><Text style={s.sumLabel}>Total</Text><Text style={[s.sumValue, { fontWeight: "bold" }]}>{fmt(total)}</Text></View>
          {vendorFee != null && vendorFee > 0 && (
            <>
              <View style={s.sumRow}><Text style={s.sumLabel}>{booking.vendor_name ? `Fee Vendor (${booking.vendor_name})` : "Fee Vendor"}</Text><Text style={[s.sumValue, { color: "#C45B26" }]}>-{fmt(vendorFee)}</Text></View>
              <View style={s.sumRow}><Text style={s.sumLabel}>Diterima Mstory.id</Text><Text style={[s.sumValue, { fontWeight: "bold", color: "#047857" }]}>{fmt(Math.max(total - vendorFee, 0))}</Text></View>
            </>
          )}
          {kind === "MENUNGGU_PELUNASAN" && (
            <>
              <View style={s.sumRow}><Text style={s.sumLabel}>DP Dibayar</Text><Text style={s.sumValue}>{fmt(dpAmount)}</Text></View>
              <View style={s.sumRow}>
                <Text style={s.grandLabel}>Sisa Pelunasan</Text>
                <Text style={s.grandValue}>{fmt(remaining)}</Text>
              </View>
            </>
          )}
          {kind === "LUNAS" && (
            <>
              <View style={s.sumRow}><Text style={s.sumLabel}>DP Dibayar</Text><Text style={s.sumValue}>{fmt(dpAmount)}</Text></View>
              <View style={s.sumRow}><Text style={s.sumLabel}>Pelunasan Dibayar</Text><Text style={s.sumValue}>{fmt(Math.max(total - dpAmount, 0))}</Text></View>
              <View style={s.sumRow}>
                <Text style={s.grandLabel}>Sisa Bayar</Text>
                <Text style={s.grandValue}>Rp 0</Text>
              </View>
            </>
          )}
          {kind === "MENUNGGU_DP" && (
            <View style={s.sumRow}>
              <Text style={s.grandLabel}>YANG HARUS DIBAYAR</Text>
              <Text style={s.grandValue}>{fmt(dpAmount)}</Text>
            </View>
          )}
          {kind === "LUNAS" && (
            <View style={{ marginTop: 8, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: "#DCFCE7", borderRadius: 6 }}>
              <Text style={{ fontSize: 9, color: "#047857", fontWeight: "bold" }}>LUNAS — Tidak ada tagihan tersisa.</Text>
            </View>
          )}
          {kind === "MENUNGGU_PELUNASAN" && (
            <View style={{ marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: "#DBEAFE", borderRadius: 6 }}>
              <Text style={{ fontSize: 9, color: "#1D4ED8", fontWeight: "bold" }}>PELUNASAN MAKSIMAL H-1</Text>
              <Text style={{ fontSize: 9, color: "#1D4ED8", marginTop: 4 }}>Sisa pelunasan {fmt(remaining)} wajib dibayar paling lambat H-1 (sehari sebelum acara). Batas akhir: {fmtDate(subDays(booking.event_date, 1))}.</Text>
            </View>
          )}
          {kind === "MENUNGGU_DP" && (
            <View style={{ marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: "#fff3cd", borderRadius: 6 }}>
              <Text style={{ fontSize: 9, color: "#856404", fontWeight: "bold" }}>SEGERA BAYARKAN DP</Text>
              <Text style={{ fontSize: 9, color: "#856404", marginTop: 4 }}>Bayarkan DP sebesar {fmt(dpAmount)} sesuai rekening pembayaran yang tersedia di bawah.</Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 30 }}>
          <Text style={s.sectionTitle}>PEMBAYARAN KE</Text>
          <View style={{ borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 6, padding: 12 }}>
            <View style={{ flexDirection: "row", paddingVertical: 3 }}>
              <Text style={{ width: 100, color: C.muted, fontSize: 9 }}>Bank</Text>
              <Text style={{ width: 12, color: C.muted, fontSize: 9 }}>:</Text>
              <Text style={{ flex: 1, fontWeight: "bold", fontSize: 9 }}>{PAYMENT_BANK}</Text>
            </View>
            <View style={{ flexDirection: "row", paddingVertical: 3 }}>
              <Text style={{ width: 100, color: C.muted, fontSize: 9 }}>No. Rekening</Text>
              <Text style={{ width: 12, color: C.muted, fontSize: 9 }}>:</Text>
              <Text style={{ flex: 1, fontWeight: "bold", fontSize: 9, letterSpacing: 1 }}>{PAYMENT_ACCOUNT}</Text>
            </View>
            <View style={{ flexDirection: "row", paddingVertical: 3 }}>
              <Text style={{ width: 100, color: C.muted, fontSize: 9 }}>Atas Nama</Text>
              <Text style={{ width: 12, color: C.muted, fontSize: 9 }}>:</Text>
              <Text style={{ flex: 1, fontWeight: "bold", fontSize: 9 }}>{PAYMENT_ACCOUNT_HOLDER}</Text>
            </View>
          </View>
        </View>

        <Text style={s.footer}>Invoice ini diterbitkan otomatis oleh Mstory Photography.</Text>
      </Page>
    </Document>
  );
}

export function InvoicePdfPreview({ booking, kind, logoUrl, vendorFee }: Props) {
  const doc = useMemo(() => <InvoicePdfDocument booking={booking} kind={kind} logoUrl={logoUrl} vendorFee={vendorFee} />, [booking, kind, logoUrl, vendorFee]);
  return (
    <PDFViewer width="100%" height="100%" showToolbar={false}>
      {doc}
    </PDFViewer>
  );
}

export async function downloadInvoicePdfBlob(booking: InvoicePdfBooking, kind: InvoicePdfKind, logoUrl?: string | null, vendorFee?: number) {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(<InvoicePdfDocument booking={booking} kind={kind} logoUrl={logoUrl} vendorFee={vendorFee} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const suffix = kind === "MENUNGGU_DP" ? "invoice-dp" : kind === "MENUNGGU_PELUNASAN" ? "tagihan-pelunasan" : "tanda-terima-lunas";
  a.href = url;
  a.download = `${booking.invoice_number}-${suffix}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface VendorFeeRow {
  invoice_number: string;
  event_date: string;
  fee: number;
}

interface VendorFeeProps {
  vendorName: string;
  monthLabel: string;
  logoUrl?: string | null;
  rows: VendorFeeRow[];
}

function slugifyVendor(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function VendorFeePdfDocument({ vendorName, monthLabel, logoUrl, rows }: VendorFeeProps) {
  const totalFee = rows.reduce((s, r) => s + (Number(r.fee) || 0), 0);
  const feeEach = rows[0]?.fee ?? 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {logoUrl ? <Image src={logoUrl} style={s.logo} /> : <View style={s.logo} />}
          <View style={s.titleBlock}>
            <Text style={s.title}>BUKTI PENYERAHAN</Text>
            <Text style={s.title}>FEE VENDOR</Text>
            <Text style={s.dates}>Periode: {monthLabel}</Text>
          </View>
        </View>

        <View style={{ backgroundColor: C.bg, borderRadius: 6, padding: 12, marginBottom: 20 }}>
          <Text style={s.sectionTitle}>DISERAHKAN KEPADA VENDOR</Text>
          <Text style={{ fontSize: 16, fontWeight: "bold" }}>{vendorName}</Text>
          <Text style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>
            Akumulasi fee vendor bulan {monthLabel} — {rows.length} booking × {fmt(feeEach)}. Mstory.id menyatakan telah menyerahkan fee atas booking yang ditangani {vendorName}.
          </Text>
        </View>

        <View style={s.tableHeader}>
          <Text style={[s.thItem, { flex: 1 }]}>No</Text>
          <Text style={[s.thItem, { flex: 5 }]}>No. Invoice / Booking</Text>
          <Text style={[s.thItem, { flex: 4 }]}>Tanggal Event</Text>
          <Text style={[s.thPrice, { flex: 3 }]}>Fee</Text>
        </View>
        {rows.map((r, i) => (
          <View key={r.invoice_number} style={[s.tableRow, { backgroundColor: i % 2 === 1 ? C.bg : C.white }]}>
            <Text style={[s.tdItem, { flex: 1, color: C.muted }]}>{i + 1}</Text>
            <Text style={[s.tdItem, { flex: 5, fontWeight: "bold" }]}>{r.invoice_number}</Text>
            <Text style={[s.tdItem, { flex: 4 }]}>{fmtDate(r.event_date)}</Text>
            <Text style={[s.tdPrice, { flex: 3, fontWeight: "bold" }]}>{fmt(Number(r.fee) || 0)}</Text>
          </View>
        ))}

        <View style={s.summary}>
          <View style={s.sumRow}>
            <Text style={s.grandLabel}>TOTAL FEE DISERAHKAN</Text>
            <Text style={s.grandValue}>{fmt(totalFee)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={s.sectionTitle}>KETERANGAN</Text>
          <Text style={{ fontSize: 9, marginBottom: 4 }}>1. Dokumen ini merupakan tanda/bukti penyerahan fee dari Mstory.id kepada vendor terkait atas pekerjaan bulan bersangkutan.</Text>
          <Text style={{ fontSize: 9, marginBottom: 4 }}>2. Total fee diserahkan = jumlah booking ditangani vendor × fee per booking.</Text>
          <Text style={{ fontSize: 9, marginBottom: 4 }}>3. Fee sudah memperhitungkan pengurangan (kewajiban) vendor sesuai kesepakatan. Tidak ada tagihan lain terkait periode ini.</Text>
          <Text style={{ fontSize: 9 }}>4. Dokumen dicetak otomatis dari sistem Mstory.id.</Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 36 }}>
          <View style={{ width: "40%", alignItems: "center" }}>
            <Text style={{ fontSize: 9, color: C.muted }}>Mstory.id,</Text>
            <Text style={{ fontSize: 9, color: C.muted, marginTop: 48 }}>( ............................ )</Text>
          </View>
          <View style={{ width: "40%", alignItems: "center" }}>
            <Text style={{ fontSize: 9, color: C.muted }}>Vendor ({vendorName}),</Text>
            <Text style={{ fontSize: 9, color: C.muted, marginTop: 48 }}>( ............................ )</Text>
          </View>
        </View>

        <Text style={s.footer}>Dokumen ini dibuat otomatis oleh Sistem Booking Mstory.id</Text>
      </Page>
    </Document>
  );
}

export function VendorFeePdfPreview(props: VendorFeeProps) {
  const doc = useMemo(
    () => <VendorFeePdfDocument vendorName={props.vendorName} monthLabel={props.monthLabel} logoUrl={props.logoUrl} rows={props.rows} />,
    [props.vendorName, props.monthLabel, props.logoUrl, props.rows],
  );
  return (
    <PDFViewer width="100%" height="100%" showToolbar={false}>
      {doc}
    </PDFViewer>
  );
}

export async function downloadVendorFeePdfBlob(input: VendorFeeProps) {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(
    <VendorFeePdfDocument vendorName={input.vendorName} monthLabel={input.monthLabel} logoUrl={input.logoUrl} rows={input.rows} />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fileSafe = slugifyVendor(input.vendorName) || "vendor";
  a.href = url;
  a.download = `fee-vendor-${fileSafe}-${slugifyVendor(input.monthLabel)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
