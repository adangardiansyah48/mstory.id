-- ==========================================
-- Migration: Alur Pembayaran Booking
-- MENUNGGU_DP -> MENUNGGU_PELUNASAN -> LUNAS
--
-- PENTING: jalankan dalam 2 BATCH terpisah di Supabase SQL Editor.
-- (ALTER TYPE ADD VALUE tidak boleh langsung dipakai di transaction yang sama)
-- ==========================================

-- ============ BATCH 1 (jalankan dulu, lalu klik Run) ============
ALTER TYPE booking_status_type ADD VALUE IF NOT EXISTS 'MENUNGGU_DP';
ALTER TYPE booking_status_type ADD VALUE IF NOT EXISTS 'MENUNGGU_PELUNASAN';
ALTER TYPE booking_status_type ADD VALUE IF NOT EXISTS 'LUNAS';

-- ============ BATCH 2 (jalankan setelah Batch 1 sukses) ============
-- Migrasi data lama ke alur baru
UPDATE bookings SET status = 'MENUNGGU_DP' WHERE status IN ('CONSULTATION', 'BOOKED');
UPDATE bookings SET status = 'LUNAS' WHERE status = 'COMPLETED';

-- Kolom waktu verifikasi pembayaran
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dp_paid_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Default status booking baru
ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'MENUNGGU_DP';