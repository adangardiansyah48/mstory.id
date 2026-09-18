export type BookingStatus =
  | "MENUNGGU_DP"
  | "MENUNGGU_PELUNASAN"
  | "LUNAS"
  | "CANCELLED";
export type LocationType = "KOTA_TASIK" | "LUAR_KOTA";
export type WorkflowStatus = "SHOOTING" | "EDIT" | "PRINTING" | "READY" | "DELIVERED";

export interface Category {
  id: number;
  name: string;
  icon?: string | null;
}

export interface SubCategory {
  id: number;
  category_id: number;
  name: string;
}

export interface Package {
  id: number;
  sub_category_id: number;
  name: string;
  price: number;
  duration_hours?: number | null;
  crew_info?: string | null;
  inclusions: string;
  dp_value: number;  // Nilai DP nominal (Rupiah)
  is_active?: boolean;
}

export interface Addon {
  id: number;
  name: string;
  price: number;
  is_active?: boolean;
}

export interface Client {
  id: number;
  full_name: string;
  whatsapp_number: string;
  created_at: string;
}

export interface Booking {
  id: number;
  invoice_number: string;
  client_id: number;
  event_date: string;
  booking_date?: string;
  location_type: LocationType;
  event_address: string;
  subtotal: number;
  transport_fee: number;
  grand_total: number;
  dp_amount: number;
  status: BookingStatus;
  notes?: string | null;
  created_at: string;
  dp_paid_at?: string | null;
  paid_at?: string | null;
}

export interface BookingDetail {
  id: number;
  booking_id: number;
  package_id: number;
  price_at_booking: number;
}

export interface BookingAddon {
  id: number;
  booking_id: number;
  addon_id: number;
  price_at_booking: number;
  qty: number;
}

export interface ProjectProgress {
  id: number;
  booking_id: number;
  progress_status: WorkflowStatus;
  notes?: string | null;
  drive_link?: string | null;
  expected_date?: string | null;
  updated_at: string;
}

export interface BookingWithRelations extends Booking {
  client?: Client;
  details?: (BookingDetail & { 
    packages?: Package & { 
      sub_categories?: SubCategory & { categories?: Category } 
    } 
  })[];
  addons?: (BookingAddon & { add_ons?: Addon })[];
  project_progress?: ProjectProgress[];
}

export interface WizardClientDetails {
  fullName: string;
  whatsappNumber: string;
  locationType: "KOTA_TASIK" | "LUAR_KOTA";
  eventAddress: string;
  eventDate: string;
  notes: string;
  agreedToTerms: boolean;
}

export const WHATSAPP_ADMIN_NUMBER = "6281234567890";
export const PAYMENT_ACCOUNT = "436901012188537";
export const PAYMENT_ACCOUNT_HOLDER = "Irna Martiana";
export const PAYMENT_BANK = "BRI";

export const OUTSIDE_CITY_TRANSPORT_FEE = 250000;

export type DownPaymentType = "FIXED";

/**
 * Hitung nominal DP berdasarkan pengaturan DP per paket.
 * Nilai DP diambil langsung dari paket sebagai nominal tetap (Rupiah).
 */
export function calcDownPayment(dpValue: number): number {
  return dpValue;
}

export const SLA_RETOUCH_WEEKS = 1;
export const SLA_PRINT_WEEKS = 3;

export const MAX_BOOKINGS_PER_DATE = 3;

export const STATUS_LABELS: Record<BookingStatus, string> = {
  MENUNGGU_DP: "Menunggu DP",
  MENUNGGU_PELUNASAN: "Menunggu Pelunasan",
  LUNAS: "Lunas",
  CANCELLED: "Dibatalkan",
};

export type InvoicePdfKind = "MENUNGGU_DP" | "MENUNGGU_PELUNASAN" | "LUNAS";

export const INVOICE_PDF_META: Record<InvoicePdfKind, string> = {
  MENUNGGU_DP: "INVOICE DP - BELUM DIBAYAR",
  MENUNGGU_PELUNASAN: "TAGIHAN PELUNASAN - DP DITERIMA",
  LUNAS: "TANDA TERIMA - LUNAS",
};

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  SHOOTING: "Mulai Shooting",
  EDIT: "Proses Edit",
  PRINTING: "Proses Cetak",
  READY: "Siap Kirim",
  DELIVERED: "Terkirim",
};

export const ADDON_ICONS: Record<string, string> = {
  SIRAMAN: "🛁",
  EXTRA_PRINTS: "🖼️",
  TEASER_VIDEO: "🎬",
  "TRADITIONAL_CEREMONY_(SIRAMAN)_PHOTO_ONLY": "🛁",
  "TRADITIONAL_CEREMONY_(SIRAMAN)_PHOTO_&_VIDEO": "🛁",
  "PENAMBAHAN_BACKGROUND_OUTDOOR_3X4": "🎨",
  "PENAMBAHAN_MINI_STUDIO_6X6": "🏠",
  "PENAMBAHAN_CLIP_VIDEO_1_MENIT": "🎬",
  "VIDEO_TEASER_1_MENIT": "🎬",
  "VIDEO_CINEMATIC_2_MENIT": "🎬",
  "VIDEO_CINEMATIC_3_MENIT": "🎬",
  "VIDEO_CINEMATIC_3_MENIT_(DRONE)": "🎥",
  MAKEUP: "💄",
  "1_WARDROBE": "👗",
  "2_WARDROBE": "👗",
  "CETAK_PEMBESARAN_16RP": "🖼️",
  "CETAK_PEMBESARAN_12RP": "🖼️",
  "CETAK_PEMBESARAN_8RP": "🖼️",
};

export function addonIcon(name: string): string {
  return ADDON_ICONS[name.replace(/\s+/g, "_").toUpperCase()] ?? "✨";
}