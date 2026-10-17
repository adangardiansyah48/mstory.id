import type { SiteSettings } from "@/lib/site-settings";

export interface BookingWithFeeInfo {
  source?: string | null;
  vendor_id?: number | null;
  vendor_fee_at_booking?: number | null;
  vendor_name?: string | null;
}

export function resolveVendorFee(
  booking: BookingWithFeeInfo,
  siteSettings?: Pick<SiteSettings, "vendor_fee"> | null,
  vendorMap?: Record<number, { fee_per_booking: number }>,
): number {
  if (booking.source !== "VENDOR") return 0;
  if (booking.vendor_id != null && vendorMap && vendorMap[booking.vendor_id]) {
    const m = Number(vendorMap[booking.vendor_id].fee_per_booking);
    if (!Number.isNaN(m)) return m;
  }
  if (booking.vendor_fee_at_booking != null && Number(booking.vendor_fee_at_booking) > 0) {
    return Number(booking.vendor_fee_at_booking);
  }
  return Number(siteSettings?.vendor_fee ?? 200000);
}
