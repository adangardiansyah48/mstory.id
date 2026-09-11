# Mstory.id — Interactive Booking & Link-in-Bio System

Link-in-bio system untuk bisnis photography & videography di Tasikmalaya. Dibangun dengan **Next.js 16 (App Router)**, **Tailwind CSS**, dan **Supabase** (PostgreSQL + Auth). Style desain mengikuti Imagenic link-in-bio: minimalis, warm-editorial, warna krem gading (`#FAF8F5` background, `#C0B29E` tombol).

## Fitur

### Landing Page (`/`)
- Cover banner (foto dapat diunggah) + avatar logo + brand identity
- 8 tombol aksi: Booking, Cek Status, WhatsApp, Website, Instagram, TikTok, Facebook, YouTube
- Semua teks, tautan medsos, dan footer dapat diedit dari **Admin → Pengaturan**

### 3-Step Booking & Kalkulator Estimasi (Modal)
1. **Step 1 – Paket** — Pilih kategori (Wedding/PreWedding/Engagement/Event/Wedding Content Creator) → sub-kategori → paket → add-on. Harga dihitung dinamis.
2. **Step 2 – Jadwal & Data Klien** — Date picker interaktif (tanggal yang sudah dibooking otomatis nonaktif), nama, no WhatsApp, lokasi (Kota Tasikmalaya / Luar Kota + biaya transport), alamat.
3. **Step 3 – Ringkasan & Invoice** — Grand total, DP dinamis per paket (`dp_type`/`dp_value`: persentase atau nominal tetap), sisa pelunasan (H-1), SLA (retouch 1 minggu, cetak 3 minggu), T&C, lalu kirim invoice otomatis ke WhatsApp admin.

### Cek Status Pesanan (Modal `/status`)
Cari berdasarkan No. Invoice atau No. WhatsApp → tampil status booking, progres retouch (PENDING → IN_PROGRESS → DONE + link Google Drive), dan progres cetak (NOT_STARTED → IN_PRINTING → READY_FOR_PICKUP → DELIVERED). Tersedia sebagai modal di beranda dan halaman mandiri di `/status`.

### Admin Dashboard (`/admin/login` & `/admin/dashboard`)
- **Ringkasan** — statistik booking, pendapatan, klien
- **Booking** — ubah status (CONSULTATION → BOOKED → COMPLETED → CANCELLED), block tanggal
- **Paket** — CRUD kategori, sub-kategori, paket, add-on
- **SLA Tracker** — perbarui status retouch/cetak + link Google Drive + deadline otomatis
- **Pengaturan** — upload foto banner & logo, edit teks fanspage & tautan medsos, pilih tema preset untuk fanspage dan dashboard admin

> **Theme via CSS variable.** Semua warna (mis. `--brand`, `--bg`, `--muted`) didefinisikan di `src/app/globals.css` dan dapat ditimpa per preset (`CLASSIC` default, `SAGE`, `NAVY`, `ROSE`) melalui atribut `data-theme` pada `<html>` (fanspage) atau wrapper admin. Untuk memakai warna token, gunakan class Tailwind arbitrary var: `bg-[var(--brand)]`.

## Setup

### 1. Buat Project Supabase

1. Buka [supabase.com](https://supabase.com) → New Project.
2. Buka **SQL Editor**, jalankan seluruh konten [schema_db.sql](schema_db.sql) — membuat tabel, enum, seed data, RLS, dan trigger — lalu [schema_fanspage_settings.sql](schema_fanspage_settings.sql) untuk tabel `linktree_settings` (pengaturan fanspage) dan bucket storage `fanspage` untuk upload foto.
3. **Auth → Users → Add user** untuk akun admin, lalu buka **Authentication → URL Configuration** dan set Site URL ke `http://localhost:3000`.

### 2. Konfigurasi Environment

```bash
cp .env.example .env.local
```

Isi `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_WHATSAPP_ADMIN=62xxx  # nomor WhatsApp admin Mstory.id
NEXT_PUBLIC_WEBSITE_URL=https://mstory.id
NEXT_PUBLIC_INSTAGRAM_URL=https://instagram.com/mstory.id
NEXT_PUBLIC_TIKTOK_URL=https://tiktok.com/@mstory.id
NEXT_PUBLIC_FACEBOOK_URL=https://facebook.com/mstory.id
NEXT_PUBLIC_YOUTUBE_URL=https://youtube.com/@mstory.id
```

Anon key & URL dapat diambil dari **Supabase Dashboard → Settings → API**.

### 3. Jalankan

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Admin di [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

> Untuk build lokal: `npm run build -- --webpack`. Di Vercel gunakan default `npm run build`.

## Kebijakan Bisnis (ter-encode di aplikasi & database)

| Aturan | Nilai |
|---|---|
| Status awal booking | `CONSULTATION` |
| Pembayaran | BRI `436901012188537` A/n **Irna Martiana** |
| DP minimum | **Dinamis per paket** (`PERCENTAGE` % atau `FIXED` Rp, default 50% – konfigurasi via admin) |
| Pelunasan sisa | Maksimal **H-1 event** |
| Pembatalan setelah invoice | DP **non-refundable** |
| SLA retouch foto | Maks **1 minggu** setelah event |
| SLA cetak & video | Maks **3 minggu** setelah event |
| Transport luar kota | +Rp250.000 |

> Ubah konstanta ini di `src/lib/types.ts` dan `src/components/booking/booking-wizard.tsx`.

## Struktur

```
src/
  app/
    page.tsx                  # Landing page (link-in-bio)
    status/page.tsx           # Cek status pesanan (/status)
    admin/login/page.tsx      # Login admin (Supabase Auth)
    admin/dashboard/page.tsx  # Dashboard admin (server-protected)
  components/
    booking/                  # Booking wizard + 3 step
    admin/                    # Tab admin (overview, booking, paket, SLA, pengaturan)
    ui/                       # Button, Modal, Input, Checkbox
    link-tree-content.tsx     # Landing content
    status-checker.tsx        # Cek status pesanan (panel + modal)
  lib/
    supabase/                 # Client, server, middleware (proxy)
    types.ts                  # TypeScript types + konstanta bisnis
    utils.ts                  # formatCurrency, invoice, wa link
    booking-data.ts           # Cache data booking (ringan & cepat)
    site-settings.ts          # Pengaturan fanspage + storage upload
    themes.ts                 # Definisi tema preset
    use-site-settings.ts      # Hook fanspage (muat settings + tema)
schema_db.sql                 # DDL, seed, RLS, trigger (jalankan di SQL Editor)
schema_fanspage_settings.sql  # linktree_settings + bucket storage fanspage
```