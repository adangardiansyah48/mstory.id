# Product Requirement Document (PRD)

**Project: Mstory.id — Interactive Mobile Booking & Link-in-Bio System**

---

## 1. Document Overview

| Item | Detail |
| --- | --- |
| **Project Name** | Mstory.id — Interactive Mobile Booking & Link-in-Bio System |
| **Brand Aesthetic** | Minimalist, Warm-Editorial Photography (Inspired by Link.id/Imagenic) |
| **Target Audience** | Klien fotografi & videografi di Tasikmalaya dan sekitarnya (User awam / Mobile-first) |
| **Core Philosophy** | Private Pricing (Kalkulator Kuotasi Interaktif tanpa mengumbar tabel harga publik) + Seamless Admin Workflow via WhatsApp |

---

## 2. Tech Stack & Infrastructure

| Layer | Stack |
| --- | --- |
| **Frontend** | Next.js 16 (App Router), React, Tailwind CSS, Lucide React Icons |
| **Backend & Database** | Supabase (PostgreSQL Database, Supabase Auth, Supabase Storage) |
| **Hosting & Deployment** | GitHub Repository → Vercel |
| **Integrations** | WhatsApp Direct API (wa.me dengan URI encoding) |

---

## 3. Brand & Visual Design System

**Warna**

| Elemen | Nilai |
| --- | --- |
| Background Color | Warm Ivory / Off-White (`#FAF8F5`) |
| Primary Button Fill | Warm Taupe / Muted Beige (`#C0B29E`) — Hover: `#B3A48F` |
| Text Colors | Primary Dark (`#1A1A1A`), Muted Text (`#666666`), Button Text (`#FFFFFF`) |

**Layout Structure**

- **Header:** Hero Banner (Landscape) + Profile Avatar Overlap (-50% margin).
- **Identity:** Title `Mstory.id`, Subtitle `PHOTOGRAPHY & VIDEOGRAPHY`, Tagline *"tell us your story journey"*.
- **Action Buttons:** Vertically stacked container (`max-w-md`), full-width buttons dengan rounded corners (`rounded-xl`), uppercase typography dengan wide letter-spacing (`tracking-widest`).

---

## 4. Key Features & Functional Requirements

### 4.1 Client-Facing Features (Public Site)

#### A. Interactive Link-in-Bio Home Page

Tombol-tombol utama pada tampilan depan:

| Tombol | Aksi |
| --- | --- |
| 📅 **BOOKING ONLINE** | Membuka Modal/Drawer Wizard 3-Step |
| 🔍 **CEK STATUS EDIT & CETAK FOTO** | Membuka Modal Tracking SLA |
| 💬 **WHATSAPP ADMIN** | Redirect langsung ke WA Admin |
| 🌐 **WEBSITE** | Link ke domain resmi Mstory.id |
| 📸 **INSTAGRAM** | Link Profil Instagram |
| 🎵 **TIKTOK** | Link Profil TikTok |
| 🔵 **FACEBOOK** | Link Halaman Facebook |
| 🔴 **YOUTUBE** | Link Channel YouTube |

#### B. 3-Step Interactive Booking & Estimator Wizard

**Step 1: Opsi Layanan & Estimasi Harga (Dynamic Pricing)**

- User memilih Kategori: `WEDDING`, `PRAWEDDING`, `ENGAGEMENT`, `EVENT`, `WEDDING CONTENT CREATOR`.
- User memilih Sub-kategori/Paket (Misal: Photo Only, Photo & Video, Studio MUA).
- User memilih Add-ons opsional (Siraman, Video Teaser, Extra Cetak, MUA, dll).
- System secara real-time menghitung Subtotal Estimasi.

**Step 2: Jadwal & Informasi Klien**

- **Tanggal Acara:** Kalender interaktif (mengecek ketersediaan; tanggal yang statusnya `BOOKED` di Supabase otomatis ter-disable).
- **Form Klien:** Nama Lengkap, Nomor WhatsApp, Tipe Lokasi (Kota Tasikmalaya / Luar Kota), Alamat Lengkap Acara.

**Step 3: Ringkasan Invoice & Checkout WA**

- Tampilan Ringkasan: Total Biaya, Minimal DP (dihitung dinamis berdasarkan `dp_type` dan `dp_value` paket yang dipilih), Sisa Pelunasan (Maksimal H-1 Acara).
- Catatan SLA: Soft file retouch max 1 minggu, Hasil cetak & video max 3 minggu.
- Checkbox Persetujuan Syarat & Ketentuan (termasuk aturan DP non-refundable jika batal).
- Tombol CTA: **📤 KONFIRMASI & KIRIM VIA WHATSAPP**.
- **Aturan:** Menggunakan JavaScript `encodeURIComponent()` untuk mengarahkan pengguna ke aplikasi WhatsApp Admin dengan teks draf invoice yang sudah terformat rapi.

#### C. Order Status Checker (Modal di halaman beranda)

- **Akses:** Tombol 🔍 **CEK STATUS EDIT & CETAK FOTO** pada halaman beranda membuka modal pencarian.
- **Input:** Nomor WhatsApp Klien atau Nomor Invoice (contoh: `MST-20260910-001`).
- **Output:**
  - Status Edit Foto: `PENDING`, `IN_PROGRESS`, `DONE` (Jika `DONE`, tampilkan tombol buka Google Drive).
  - Status Cetak Album/Video: `NOT_STARTED`, `IN_PRINTING`, `READY_FOR_PICKUP`, `DELIVERED`.

### 4.2 Admin Features (Protected Dashboard)

#### A. Auth & Security

- URL Akses: `/admin/login` & `/admin/dashboard`.
- Dilindungi oleh **Supabase Auth** (Email & Password).

#### B. Pricelist & Master Data Management (CRUD)

- Atur Kategori, Sub-kategori, Paket, dan Add-ons (Tambah, Edit Harga, Nonaktifkan, Hapus).
- **Pengaturan Minimal DP Per Paket:** Admin dapat menyetel tipe DP (`PERCENTAGE` / `FIXED`) beserta nilainya (contoh: 50% atau Rp 500.000) pada tiap paket.

#### C. Booking & Schedule Management

- Melihat seluruh pesanan masuk.
- Mengubah Status Pesanan: `CONSULTATION` → `BOOKED` (setel transfer DP) → `COMPLETED` / `CANCELLED`.
- **Fitur Blokir Tanggal Manual:** Admin dapat memblokir tanggal libur/booking offline secara langsung di kalender.

#### D. SLA Tracker Editor

- Input deadline edit & cetak (otomatis terhitung dari `event_date`).
- Update status progres pengerjaan editor/percetakan.
- Input & Simpan URL Link Google Drive hasil retouch.

---

## 5. Business Logic & Rules

| Param | Rule Specification |
| --- | --- |
| **SLA Retouch** | Maksimal 1 minggu setelah Tanggal Acara (`event_date`) |
| **SLA Cetak/Video** | Maksimal 3 minggu setelah Tanggal Acara (`event_date`) |
| **Aturan DP** | Dihitung dinamis per paket (PERCENTAGE dari Total atau nominal FIXED) |
| **Aturan Pelunasan** | Maksimal H-1 sebelum Tanggal Acara (`event_date`) |
| **Kebijakan Pembatalan** | Pembatalan setelah booking/invoice terbit = DP Hangus (Non-refundable) |
| **Rekening Resmi** | Bank BRI `436901012188537` A/n **Irna Martiana** |